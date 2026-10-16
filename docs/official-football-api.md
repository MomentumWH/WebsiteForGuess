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
- “只看阿森纳”默认开启，筛选主队或客队编号为 `arsenal` 的比赛；关闭后显示当前赛事、搜索条件下的全部球队。赛程区域同时包含已完赛和未完赛，按时间排列，默认定位近期赛程，向上滚动回看比分；也可使用“向上查看已完赛场次”和“回到近期赛程”。总览的历史/未来方向各显示首批 6 场，预测页各显示首批 24 场，历史到顶后继续加载更早赛果，未来通过按钮继续加载；切换筛选重置数量和定位。复盘页每批 25 场。阵容页仍只统计阿森纳最近五场。
- 保留 `GET /api/football/arsenal` 兼容接口，返回 `scope: 'arsenal'` 的阿森纳子集；新页面使用完整比赛接口。

页面默认使用真实赛程，真实比赛使用 `pl-<matchId>` / `ucl-<id>` 稳定编号。个人预测单独保存在原来的 `matchday.predictions.v1`，同步不改写预测。旧演示比赛预测仍保留、可导出，不自动迁移到真实比赛或混入统计。接口失败不会填入虚构赛程。

## 配置与运行

### 比赛详情

- 页面路径 `/matches/:matchId`，支持直接打开、刷新和浏览器前进后退；从赛程、焦点赛事或赛果列表进入。原有预测与复盘弹窗继续使用。
- `GET /api/football/matches/:matchId`：只接受当前已公布赛程的稳定比赛编号。返回 `match`、`checkedAt`、`seasons`、按赛季标识的 `sources`、`headToHead`、`homeForm`、`awayForm`。未找到返回 404；只支持 GET。
- 已完赛直接复用当前赛程，不额外请求历史赛季。基本字段包括常规时间比分、开球时间、球场、赛事、赛季和轮次；半场比分、观众人数仅在官方 JSON 提供有效字段时显示，缺失明确标记。欧冠含加时比分单独展示，不替代常规时间赛果。
- 未开赛、进行中和延期场次按需查询当前及前三个赛季的英超与欧冠（含资格赛）。不计足总杯、联赛杯、欧联、友谊赛等其他赛事，因此“最近五场”指此统计范围内的最近五场。
- 历史记录仅选取本场开球前、且截至查询时间已结束并有比分的比赛，按稳定编号去重、日期倒序取最多五场。胜平负从对应球队视角计算；主客队互换的交锋计入同一组。不足五场不补造。
- `server/football/details.ts` 复用现有官方 API 分页和缓存。历史赛季成功数据缓存 24 小时；异常来源保留此前缓存并标记，随后一分钟后可重试。并发详情请求共享上游请求，已完赛和不存在的编号不触发历史查询。首次打开先显示基础信息和当前赛季记录，历史同步期间显示加载提示；浏览器超时 35 秒。
- 缺失官方来源时列出对应赛季和赛事；不抓取网页，也不使用演示数据替代。`pnpm test:details` 验证历史筛选、主客胜负、重复/未来记录排除、字段校验、按需加载、共享请求与缓存降级。

### 完赛技术统计

2026-10-16 实测以下官方结构化 JSON 端点；只在进入已完赛详情时请求，通过详情响应的 `statistics` 返回，不增加首页加载请求。

- 英超：`https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches/<matchId>/stats`。响应数组按 `side: Home/Away` 分配，并校验 `teamId`，不依赖数组顺序。使用 `possessionPercentage`、`totalScoringAtt`、`ontargetScoringAtt`、`fkFoulLost`、`totalYelCard`、`totalRedCard`、`totalOffside`、`cornerTaken`、`saves`、`totalPass`。黄牌必须使用总数 `totalYelCard`；`yellowCard` 并非该总数字段。传球成功率由 `accuratePass / totalPass × 100` 计算并保留一位小数，缺失或分母无效时不计算。
- 欧冠：`https://matchstats.uefa.com/v2/team-statistics/<matchId>`。按官方球队编号匹配双方，读取 `statistics[].name/value`：`ball_possession`、`attempts`、`attempts_on_target`、`fouls_committed`、`yellow_cards`、`red_cards`、`offsides`、`corners`、`saves`、`passes_attempted`、`passes_accuracy`、`attacks`。数值字符串经过类型和范围校验。
- 当前两个实测端点没有提供预期进球 xG 或威胁进攻。两项均保留为 `null` 并显示“官方未提供”；普通 `attacks` 单列为进攻次数，不能作为威胁进攻。真实零值显示 `0`，缺失或无效值不转成零。
- 统计使用官方全场口径，可能包含加时，不含点球大战；不改变预测复盘所使用的常规时间比分。`period: 'full-match'` 在契约中明确区分统计口径。
- `server/football/statisticsAdapters.ts` 负责字段映射；`server/football/statistics.ts` 负责按需同步、8 秒超时、并发请求合并、24 小时成功缓存，以及空数据/异常后 1 分钟重试。点击“更新统计”遵循同一缓存间隔。
- 磁盘缓存为 `.cache/football/statistics-<season>-<matchId>-v1.json`，读取时校验比赛、赛季、主客队身份；内存最多保留 64 场。同步失败保留最近成功数据并标为缓存；没有缓存时显示缺失，不阻塞比分等基础信息。
- 球队保留官方 `officialId`，旧赛程缓存可从经校验的官方队徽地址恢复供应方编号；无法确认身份时不发布可能错位的数据。个人预测与自选阵容不受影响。
- `pnpm test:statistics` 验证字段映射、主客队顺序、总牌数、零值/缺失区别、身份校验、缓存合并、过期重试、异常保留与赛季隔离。

### 完赛事件时间线

- 技术统计上方新增“比赛赛况”，可切换全部、进球与助攻、换人记录，按发生时间排列，保留补时与加时；点球大战不计入时间线。只在打开完赛详情时请求，与技术统计并行加载，不增加首页请求。
- 英超事件：`https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches/<matchId>/commentary?lang=en&_limit=100`。名单：同一比赛的 `/lineups`。已于 2026-10-16 核验 `goal` 的 `player1` 为进球者、`player2` 为助攻者，`substitution` 的 `player1` 为上场、`player2` 为下场；通过本场名单的官方 ID 取得姓名并核对球队。只使用结构化字段，不解析或展示原始解说文本。
- 英超遵循 `pagination._next` 完整读取；最多 12 页，重复页、游标循环、后续页失败或缺失分页信息均不发布不完整分页结果。事件按类型、时间、球队和球员去重，避免同一记录的语言版本重复。
- 欧冠事件：`https://match.uefa.com/v5/matches/<matchId>/events?filter=ALL&limit=500&offset=0&order=ASC`；比赛信息：`https://match.uefa.com/v5/matches/<matchId>`。`offset` 必填，按 500 递增，读取不足 500 条的终页；整页继续请求，最多 12 页，检测重复页。
- 欧冠 `GOAL` 使用比赛信息 `playerEvents.scorers` 的 ID 确认，避免展示未确认进球；`ASSIST` 独立显示。`GOAL.secondaryActor` 在实测响应中为对方门将，不能当作助攻者。接口没有直接关联某次助攻与某粒进球，因此不自动配对。`SUBSTITUTION.primaryActor` 为下场、`secondaryActor` 为上场，已与本场官方首发/替补名单核对，方向与英超字段不同。
- UEFA 时间使用 `time.minute`、`time.injuryMinute`、`time.second`；英超解析结构化 `time` 的 `45+2'` 等格式，并转换官方伦敦时间用于顺序排列。字段缺失明确显示，不由比分补出事件或姓名，不推算中途比分。
- 详情接口返回可选 `timeline`：比赛、赛季、双方身份、事件列表、来源状态和完整性。官方已记录进球数量与最终比分不一致，或缺少姓名/时间时标记资料不完整，不声称已取得全部赛况。
- `server/football/events.ts` 提供 12 秒总超时、并发合并、64 场内存缓存；完整成功结果缓存 24 小时，缺失或失败后一分钟可重试。磁盘为 `.cache/football/events-<season>-<matchId>-v1.json`，按比赛、赛季与球队校验，异常或不完整刷新保留已有完整结果并标记使用缓存。“更新赛况”遵循相同缓存间隔。
- 事件与技术统计独立降级；一个来源不可用不清除另一个来源的有效数据。赛程、比分、个人预测和自选阵容不受影响。`pnpm test:events` 验证球员字段、换人方向、补时、重复事件、确认进球、独立助攻、分页、缓存与失败处理。

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
