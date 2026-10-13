# 阿森纳阵容与近五场表现

## 当前数据规则

项目现已禁止网页抓取，UEFA 名单页面请求与解析已移除。名单仅使用同赛季本地缓存；无缓存时使用 FPL 官方名单，缺失的 UEFA 关联、号码和头像不补造。下文官方来源记录历史调研，网页名单不再是活动数据源。官方 JSON API 同步继续保留，见 [GPT 调用规则](gpt-rules.md)。

## 页面逻辑

入口是侧栏“球队阵容”，地址 `/squad`。复用现有工作台外壳，阵容模块按需加载；首页不加载球员组件、不请求球员统计，不增加赛事首页的等待时间。

1. 选统计赛事：英超＋欧冠、仅英超、仅欧冠。
2. 球场按前锋、中场、后卫、门将排列；4–3–3 和 4–2–3–1 可切换。按每个位置近期出场分钟数选参考球员，明确显示“参考阵容 · 非官方首发”，不作为实际首发或出场预测。
3. 点击场上球员，右侧展示身份、关键数据、最近比赛轨迹和官方档案链接。
4. 下方完整名单按位置分组，支持位置筛选、姓名/号码搜索、按分钟/进球/出场次数排序；可取消“仅英超名单球员”查看 UEFA 青年注册球员。
5. 同步球员会重新检查本地数据服务；优先展示浏览器缓存，后台更新。来源详情显示独立成功/缓存/失败状态及最近成功更新时间。

## 我的阵容

参考阵容下方新增独立的个人战术板，使用现有球员名单，不发起新的外部请求。

- 提供 4–3–3、3–4–2–1、5–3–2、4–2–3–1、4–4–2，每套模板含 11 个位置。
- 从球员席拖入空位；拖到已占位置时，场上球员互换位置，候选球员替换原球员。每名球员只占一个位置，允许自由跨位置安排。
- 手机可拖动球员席右侧手柄，也可点击球员后点击位置；键盘可用 Tab 和 Enter 完成同样安排。Escape 取消选择与拖动。
- 球员可拖回球员席、点击位置上的移出按钮，或移出所选球员；清空阵容需在区域内确认。
- 切换模板优先保留相同位置，再优先把其余已选球员安排到同位置类型的相邻空位；不丢弃球员，门将保留。位置变动带平滑排布动画。
- 浏览器保存键为 `matchday.personal-lineup.v1`，刷新或离开页面后恢复。保存失败会提示；损坏数据恢复为空阵容。官方名单暂缺的已选球员保留位置并提示，可以主动移出。
- 个人阵容与统计赛事筛选、官方参考阵容和比分预测相互独立。清除浏览器存储会丢失个人阵容。

组件划分：`PersonalLineup` 组合个人战术板，输入完整名单；`LineupPitch` 展示位置并发送安排/移出/拖动事件；`LineupBench` 提供候选名单筛选与选择/拖动事件；`usePersonalLineup` 管理本机保存；`useLineupDrag` 处理鼠标、触摸和笔拖动及取消清理；`data/lineup.ts` 定义模板、唯一性、互换和模板转换规则。`pnpm test:lineup` 验证这些领域规则。

组件职责：`SquadWorkspace` 管理筛选和数据组合；`SquadPitch` 接收球员合计、阵型和选中 ID，发出选择事件；`PlayerDetail` 展示单个球员的合计与逐场轨迹；`PlayerMatchLog` 提供可展开的逐场全字段统计；`SquadTable` 接收筛选后的列表，向上发送选择/排序/筛选变更；`PlayerPortrait` 处理官方头像与失败回退。`useArsenalSquad` 管理请求、浏览器缓存、定期检查与卸载取消。

## 核实过的官方来源（2026-10-13）

阿森纳官网 <https://www.arsenal.com/men/players> 在本环境请求返回 HTTP 503，暂不依赖该页面，也未核实到可公开使用的俱乐部逐场统计 API。

### 英超官方 FPL

- 名单、球队编号和 FPL 位置：<https://fantasy.premierleague.com/api/bootstrap-static/>
- 比赛编号映射：<https://fantasy.premierleague.com/api/fixtures/>
- 球员逐场数据：`https://fantasy.premierleague.com/api/element-summary/{FPL element id}/`
- 已实测的球员请求：<https://fantasy.premierleague.com/api/element-summary/12/>

动态查找 `teams.short_name=ARS`，不硬编码 FPL 阿森纳编号，也不将 FPL 编号与英超比赛服务的球队编号混用。以稳定的球员 `code` 生成页面 ID。通过 `fixtures.code` 精确映射既有英超服务的 `matchId`，再通过 `fixtures.id` 匹配球员 `history.fixture`；不使用模糊日期映射。

FPL 为当前赛季接口，检查第一轮时间与项目赛季一致；不把当前赛季球员统计填入其他赛季。逐场读取 `minutes`、`goals_scored`、`assists`、`saves`、`tackles`、`recoveries`、`clearances_blocks_interceptions`。出场次数仅在官方记录明确的 `minutes>0` 时记为 1。

### UEFA 官网

- 带赛季的注册名单、位置、球衣号码和头像：<https://www.uefa.com/uefachampionsleague/clubs/52280--arsenal/squad/>
- 官方逐场统计端点：`https://matchstats.uefa.com/v2/player-statistics/{matchId}`
- 已实测的比赛请求：<https://matchstats.uefa.com/v2/player-statistics/2049563>
- 官方字段定义：<https://compstats.uefa.com/v2/definitions>

端点依据官网实际加载的 `live-stats` 及统计服务组件核实，实测匿名请求返回 JSON，无需私人密钥。响应按 `teamId=52280` 筛选阿森纳，再按 `playerId` 映射官网注册名单。采用 `matches_appearance`、`minutes_played_official`、`goals`、`assists`、`clearance_completed`、`saves`、`tackles`、`recovered_ball`。未返回的球员/字段保留缺失值，不据此推断出场或零次动作。

这些属于官网使用的内部公共访问接口，此次未找到版本稳定性或商业授权保证；UEFA 名单现仅使用已有本地缓存，不再请求或解析名单网页。位置和号码优先用 UEFA 足球注册分类，FPL 位置作为回退。跨来源姓名只在完整姓名精确匹配或唯一的规范化姓氏匹配时关联；未匹配球员独立保留，不强行合并。

## 统计口径

- “近五场”指**球队在所选赛事范围内最近五场已完赛比赛**，不是球员个人最近五次出场。球员未出场不会向前补场。当前赛季不足五场时显示实际场次数量。
- 使用已有官方比赛服务的 `finished` 状态界定完赛；不采纳未完赛、延期或取消赛事。
- 独立拦截：本次核实的 FPL 与 UEFA 字段均未提供可直接使用的独立拦截数，显示 `—`。
- 解围：UEFA `clearance_completed` 为完成解围；FPL 的解围、封堵、拦截是合并字段，只在“英超防守合计”中显示，不拆分或冒充独立解围。
- 助攻：FPL Fantasy 与 UEFA 官方助攻规则不同，综合视图不合计助攻，切换单项赛事后展示各自口径。
- 出场时间：保留各来源官方分钟数；UEFA 可能包含加时，与预测结算的常规时间口径分开。
- 官方明确的零保留为 `0`；缺失显示 `—`；部分场次/部分来源的数值合计标记 `*`，并提供已取得场次覆盖数。
- 伤停状态来自 FPL；只有 UEFA 注册记录的球员显示“状态未提供”，不把注册等同于健康可出场。

## 服务与运行

`GET /api/football/arsenal/squad` 在开发、预览及 Node 生产服务中均可用。无需配置额外密钥，沿用 `FOOTBALL_SEASON`、`FOOTBALL_CACHE_DIR`。

服务端成功缓存 10 分钟、失败后 1 分钟重试；并发网页请求共享一次刷新；FPL 球员请求并发上限 4，UEFA 比赛并发上限 2。每个来源可独立失败，尽可能保留同赛季、同球员、同比赛的最近成功记录。磁盘缓存：`.cache/football/arsenal-squad-<season>.json`，不混入其他赛季。浏览器缓存键为 `matchday.arsenal-squad.v1`，页面显示时每五分钟检查、恢复前台时检查，离开模块清理请求和定时器。

生产使用 `pnpm build` 后重启 `pnpm start`，即可同时提供页面和新接口。现有比赛同步、个人预测存储和开场动画独立保留。

## 验证

- `pnpm test:squad`：姓名/位置关联、赛季隔离、逐场字段、缺失与零、球队共享窗口、不同助攻口径、参考阵型、比赛 ID 映射、并发合并、缓存恢复、部分来源失败。
- `pnpm test:football` / `pnpm test:matchday`：已有赛事和预测回归。
- `pnpm check` / `pnpm build`：类型、代码规范、格式及生产构建。
- 浏览器：侧栏进入、直接打开 `/squad`、赛事与阵型切换、球员选择、搜索、位置筛选、号码搜索、手机端布局与统计表横向滚动。
