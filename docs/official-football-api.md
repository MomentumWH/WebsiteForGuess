# 阿森纳官方赛程与赛果同步

已于 **2026-10-13（北京时间）**核实、接入并实测两个官网数据接口。当前 2026/27 赛季返回 **38 场英超、8 场欧冠**，其中 7 场已完赛。后续数量随官方赛程和比赛进展变化。

## 接口与来源

### Premier League

- 官网赛程页：<https://www.premierleague.com/en/matches/premier-league/2026-27>
- 官网网页实际使用的比赛接口：`https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches`
- [阿森纳 2026/27 赛季实际请求](https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches?competition=8&season=2026&team=3&_limit=100)
- 参数：`competition=8`（英超）、`season=2026`（起始年份）、`team=3`（该接口的阿森纳编号）、`_limit=100`。
- 返回 `data[]`：`matchId`、`matchWeek`、`homeTeam/awayTeam`、`kickoff`、`kickoffTimezoneString`、`period`、`ground`、主客队 `score`。
- `kickoff` 是伦敦本地时间，必须使用比赛日期对应的 GMT/BST 转为 UTC。页面统一展示北京时间。`FullTime` 才写入完赛比分，`PreMatch` 不读取比分作为结果。
- 响应 `pagination._next` 非空时拒绝替换缓存，避免只同步前几场。目前阿森纳单赛季 38 场可在一次请求中完整取得。

### UEFA Champions League

- 官网阿森纳赛程页：<https://www.uefa.com/uefachampionsleague/clubs/52280--arsenal/matches/>
- 官网配置声明的比赛服务：`https://match.uefa.com/`；实测比赛端点：`v5/matches`。
- [阿森纳 2026/27 赛季实际请求](https://match.uefa.com/v5/matches?competitionId=1&seasonYear=2027&teamId=52280&limit=100&offset=0&order=ASC)
- 参数：`competitionId=1`（欧冠）、`seasonYear=2027`（结束年份）、`teamId=52280`（阿森纳）、`limit=100`、`offset=0`、`order=ASC`。
- 返回数组：`id`、`homeTeam/awayTeam`、`kickOffTime.dateTime`、`matchday`、`stadium`、`status`、`score.regular`、`score.total`。球队名称优先读取官方中文翻译。
- 仅 `FINISHED` 使用 **`score.regular`** 结算，排除加时与点球。缺失常规时间比分时保留缓存并显示同步失败，不用总比分代替。
- 比赛时间已携带 UTC 时区；延期、取消和时间未定的比赛锁定预测，进行中比分只作赛况显示，不进入命中率。

这两个端点在核实时均可匿名返回 JSON，无需个人账号或 API Key。它们属于官网自身使用的服务；此次检索未找到对应的公开开发者文档、版本兼容承诺或商用授权说明。生产使用需关注接口及使用条款变更，不能视作有服务保障的开放 API。

## 项目接入方式

```text
英超 / UEFA 官网
  → Node 服务（超时、校验、按来源缓存）
  → GET /api/football/arsenal
  → useFootballMatches
  → 赛程、焦点赛事、预测复盘、统计
```

- `server/football/adapters.ts`：分别转换两个接口的数据格式、比分和时区。
- `server/football/service.ts`：并行请求；合并重复同步请求；默认每 5 分钟更新上游，进行中的比赛每分钟更新，失败后每分钟重试。没有页面访问时不持续轮询。
- 服务端缓存写入 `.cache/football/arsenal-<season>.json`，重启后仍可在官网故障时保留最近成功数据。各来源独立降级：英超失败不阻止欧冠更新，反之亦然。缓存按赛季隔离。
- 浏览器页面可见时每分钟检查一次本地服务，恢复到前台及点击“同步赛程”也会检查；上游请求仍受服务端缓存间隔限制。
- 浏览器保留最近一份有效数据，页面先展示缓存再后台同步。来源状态明确显示“已同步 / 使用缓存 / 同步失败”和成功更新时间，不将缓存标成实时数据。
- `.cache` 已从文件监听、Git、格式与代码检查中排除，避免重新引入缓存目录监听造成的卡顿。

页面默认使用真实赛程，真实比赛使用 `pl-<matchId>` / `ucl-<id>` 稳定编号。个人预测单独保存在原来的 `matchday.predictions.v1`，同步不改写预测。旧演示比赛预测仍保留、可导出，不自动迁移到真实比赛或混入统计。接口失败不会填入虚构赛程。

## 配置与运行

`pnpm dev` 和 `pnpm preview` 都已接入同源数据接口，不需要另开后端端口。网页不会直接请求跨域官方服务。

可选配置见根目录 `.env.football.example`。将需要的项放入 `.env.local` 后重启：

```dotenv
# 不设置则按北京时间、7 月分界自动选择赛季。
FOOTBALL_SEASON=2026
FOOTBALL_CACHE_DIR=.cache/football
```

`FOOTBALL_SEASON` 始终填写起始年份；程序自动把 UEFA 年份换成 `+1`。没有公布的赛季会显示暂无赛事，不回填上一赛季。自动选择在服务启动时执行，跨赛季持续运行的服务应重启或明确设置赛季。

生产环境使用 **Node.js 24**：

```bash
pnpm build
pnpm start
```

`pnpm start` 运行 `server/start.ts`，同时提供 `dist` 页面和比赛接口，默认 `127.0.0.1:4446`。`PORT` / `HOST` 可通过环境变量或 `.env.local` 修改。对外部署可在其前面使用现有 HTTPS 反向代理。仅上传 `dist` 到静态托管不会运行比赛接口，需要同时部署此 Node 服务，或把 `/api/football/arsenal` 转发给它。

## 验证

- `pnpm test:football`：API 格式、时区/夏令时、赛季映射、常规时间赛果、进行中不结算、延期锁定、请求合并、单来源失败、磁盘缓存及跨赛季隔离。
- `pnpm test:matchday`：原有 9 项预测与复盘口径检查。
- `pnpm check` / `pnpm build`：类型、规范和生产构建。
- 本地 `GET /api/football/arsenal` 应返回两个来源状态及阿森纳比赛；浏览器分别切换英超、欧冠、复盘并点击同步，确认来源和比赛变化一致。
