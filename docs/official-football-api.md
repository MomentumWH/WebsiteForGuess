# 官方赛程与赛果同步

已于 **2026-10-15（北京时间）**实测两个官方结构化 JSON 接口。2026/27 赛季完整分页返回 **380 场英超、234 场欧冠（含资格赛）**；其中阿森纳为 **38 场英超、8 场欧冠**。数量随官方公布和比赛进展变化，尚未公布的对阵不补造。

## 接口与来源

### Premier League

- 官网赛程页：<https://www.premierleague.com/en/matches/premier-league/2026-27>
- 官网网页实际使用的比赛接口：`https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches`
- [英超 2026/27 赛季首分页](https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches?competition=8&season=2026&_limit=100)
- 参数：`competition=8`（英超）、`season=2026`（起始年份）、`_limit=100`；不再发送 `team` 限制球队。
- 返回 `data[]`：`matchId`、`matchWeek`、`homeTeam/awayTeam`、`kickoff`、`kickoffTimezoneString`、`period`、`ground`、主客队 `score`。
- `kickoff` 是伦敦本地时间，必须使用比赛日期对应的 GMT/BST 转为 UTC。页面统一展示北京时间。`FullTime` 才写入完赛比分，`PreMatch` 不读取比分作为结果。
- 将响应 `pagination._next` 游标原样作为下一页的 `_next` 参数，直到返回空游标。游标循环、分页字段缺失或任意页失败时，整项来源保留此前缓存，不发布半份赛程。

### UEFA Champions League

- 官网阿森纳赛程页：<https://www.uefa.com/uefachampionsleague/clubs/52280--arsenal/matches/>
- 官网配置声明的比赛服务：`https://match.uefa.com/`；实测比赛端点：`v5/matches`。
- [欧冠 2026/27 赛季首分页](https://match.uefa.com/v5/matches?competitionId=1&seasonYear=2027&limit=100&offset=0&order=ASC)
- 参数：`competitionId=1`（欧冠）、`seasonYear=2027`（结束年份）、`limit=100`、`offset=0`、`order=ASC`；不再发送 `teamId`。每页递增 `offset` 100，直到返回不足 100 场；整百场时继续读取空终页。
- 返回数组：`id`、`homeTeam/awayTeam`、`kickOffTime.dateTime`、`matchday`、`stadium`、`status`、`score.regular`、`score.total`。球队名称优先读取官方中文翻译；球队简称缺失时显示官方名称，不编造简称。
- 仅 `FINISHED` 使用 **`score.regular`** 结算，排除加时与点球。缺失常规时间比分时保留缓存并显示同步失败，不用总比分代替。
- 比赛时间已携带 UTC 时区；延期、取消和时间未定的比赛锁定预测，进行中比分只作赛况显示，不进入命中率。

这两个端点在核实时均可匿名返回 JSON，无需个人账号或 API Key。它们属于官网自身使用的服务；此次检索未找到对应的公开开发者文档、版本兼容承诺或商用授权说明。生产使用需关注接口及使用条款变更，不能视作有服务保障的开放 API。

## 项目接入方式

```text
英超 / UEFA 官网
  → Node 服务（超时、校验、按来源缓存）
  → GET /api/football/matches
  → useFootballMatches
  → 赛程、焦点赛事、预测复盘、统计
```

- `server/football/adapters.ts`：分别转换两个接口的数据格式、比分和时区。
- `server/football/pagination.ts`：读取完整分页、按稳定比赛编号去重，检测重复页和游标循环。每个来源最多 12 页、总超时 25 秒，浏览器请求超时 30 秒。
- `server/football/service.ts`：并行请求；合并重复同步请求；默认每 5 分钟更新上游，进行中的比赛每分钟更新，失败后每分钟重试。没有页面访问时不持续轮询。
- 服务端缓存写入 `.cache/football/competitions-<season>-v2.json`，数据契约包含 `scope: 'competitions'`；浏览器缓存键为 `matchday.official-fixtures.v2`。旧的阿森纳专属缓存不作为完整赛程读取。各来源独立降级：英超失败不阻止欧冠更新，反之亦然。缓存按赛季隔离。
- 浏览器页面可见时每分钟检查一次本地服务，恢复到前台及点击“同步赛程”也会检查；上游请求仍受服务端缓存间隔限制。
- 浏览器保留最近一份有效数据，页面先展示缓存再后台同步。来源状态明确显示“已同步 / 使用缓存 / 同步失败”和成功更新时间，不将缓存标成实时数据。
- `.cache` 已从文件监听、Git、格式与代码检查中排除，避免重新引入缓存目录监听造成的卡顿。
- “只看阿森纳”默认开启，筛选主队或客队编号为 `arsenal` 的比赛；关闭后显示当前赛事、搜索条件下的全部球队。总览显示前 6 场，预测页每批 24 场，复盘页每批 25 场；切换筛选重置显示数量。阵容页仍只统计阿森纳最近五场。
- 保留 `GET /api/football/arsenal` 兼容接口，返回 `scope: 'arsenal'` 的阿森纳子集；新页面使用完整比赛接口。

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

`pnpm start` 运行 `server/start.ts`，同时提供 `dist` 页面和比赛接口，默认 `127.0.0.1:4446`。`PORT` / `HOST` 可通过环境变量或 `.env.local` 修改。对外部署可在其前面使用现有 HTTPS 反向代理。仅上传 `dist` 到静态托管不会运行比赛接口，需要同时部署此 Node 服务，或把 `/api/football/` 路径下的请求转发给它。

## 验证

- `pnpm test:football`：完整分页、重复页与游标循环、后续页失败保留完整缓存、旧数据范围隔离、API 格式、时区/夏令时、赛季映射、常规时间赛果、进行中不结算、延期锁定、请求合并、单来源失败、磁盘缓存及跨赛季隔离。
- `pnpm test:matchday`：原有 9 项预测与复盘口径检查。
- `pnpm check` / `pnpm build`：类型、规范和生产构建。
- 本地 `GET /api/football/matches` 应返回两个来源状态和全部比赛；切换“只看阿森纳”、英超、欧冠与搜索，确认数量及球队同步变化，加载更多后切换筛选应回到首批。个人预测存储不受筛选和同步影响。
