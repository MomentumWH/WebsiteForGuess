# MATCHDAY · 赛事比分预测

项目 GPT 规则见 [AGENTS.md](AGENTS.md) 和 [调用规则说明](docs/gpt-rules.md)：禁止爬取网页数据，禁止输出违禁词汇；具体词库待补充。官方 JSON API 可继续使用，UEFA 名单网页抓取已停用。

以阿森纳为重点的英超与欧冠赛事预测工作台。打开 `/` 即可使用，无需登录；原有后台模板保留于 `/admin/dashboard`。

- **赛事总览**：焦点赛事、联赛筛选、阿森纳关注、球队搜索。
- **比分预测**：填写比分、信心与理由，本机保存；开赛前修改，开赛后锁定。
- **球队阵容**：`/squad` 按位置展示阿森纳球员、参考阵型和球队近五场表现，支持球员明细、位置筛选、搜索与排序；下方个人阵容板提供五套模板、拖入/互换球员和本机保存。数据使用 FPL、UEFA 官方 JSON API 和已有本地名单缓存。
- **预测复盘**：对比常规时间赛果，区分比分命中、仅胜平负命中与未命中。
- **数据统计**：从已结算记录计算命中率，可切换仅个人记录，支持 JSON 导出。
- **响应式布局**：桌面侧栏、手机底部导航、键盘可操作的原生对话框。

赛程与赛果已接入 **Premier League 和 UEFA 官网结构化 JSON 接口**，分页同步两个赛事全部已公布的比赛。默认开启“只看阿森纳”，关闭后显示全部球队；赛事和搜索筛选可叠加使用。页面分批加载赛程与赛果，支持自动检查更新和手动同步；接口异常时保留上次成功数据、显示来源及更新时间。个人预测保存在当前浏览器，清除浏览器数据会丢失。旧演示预测可导出，不参与真实赛事统计。账户与不可篡改的预测锁定仍需正式账号后端。

接口地址、字段映射、缓存策略与部署说明见 [官方数据接入文档](docs/official-football-api.md)。开发使用 `pnpm dev`；生产使用 Node.js 24，先 `pnpm build` 再 `pnpm start`，同时提供页面和数据接口。单独静态部署 `dist` 时需额外转发比赛接口。

Netlify 部署已通过 `netlify.toml` 配置：使用 Node.js 24 执行 `pnpm build`，仅发布 `dist`，并为前端 history 路由提供回退。`netlify/functions/football.mts` 在 `/api/*` 提供赛事、阵容及比赛详情接口，优先于页面回退匹配；官方 JSON 数据响应使用 Netlify Blobs 缓存，复用原有数据校验与异常降级逻辑，无需运行 `pnpm start`。可选的 `FOOTBALL_SEASON` 运行时配置用于指定赛季起始年份；未设置时自动选择当前赛季。

赛程卡片、焦点赛事及赛果列表可进入 `/matches/:matchId` 比赛详情页。已完赛展示比分、赛季、轮次、时间、球场及可用的半场比分、观众人数；未开赛展示近五次交手和双方最近五场胜平负。历史统计范围为当前及前三个赛季的英超和欧冠（含资格赛），不足五场显示实际记录，来源异常明确提示，其他赛事不计入近况。

已完赛详情新增双方技术统计对比：控球率、射门、射正、犯规、红黄牌、越位、角球、扑救、传球及传球成功率，欧冠可显示普通进攻次数。数据通过英超与 UEFA 官方 JSON 接口按需同步，显示来源与更新时间；接口缺少的预期进球 xG、威胁进攻等指标标记“官方未提供”，不填入估算数据。`pnpm test:statistics` 验证字段、主客队身份、缺失值、缓存与异常降级。

技术统计上方提供比赛赛况时间线，记录进球者、可用的助攻者和换人双方，支持“全部赛况 / 进球与助攻 / 换人记录”筛选。英超助攻显示在进球下；欧冠的助攻由官方单独记录，按独立事件展示，不按时间邻近自动配对。`pnpm test:events` 检查时间、名单身份、完整分页、缓存和异常保留。

阵容页的流程、官方来源、缺失字段和统计口径见 [阿森纳球员数据文档](docs/arsenal-squad.md)。`pnpm test:squad` 验证逐场合计、赛季隔离和数据同步缓存；综合视图不合计 FPL 与 UEFA 不同口径的助攻，独立拦截未提供时显示 `—`。

产品流程与组件划分见 [设计文档](docs/matchday-product.md)。使用 `pnpm dev` 启动页面，默认开发端口为 **4444**；`pnpm test:matchday` 验证结算、锁定和时区规则，`pnpm build` 检查类型并构建生产页面。

加载速度问题和优化数据见 [性能记录](docs/loading-performance.md)。`pnpm perf:dev` 可复测启动与首屏模块响应；本地依赖缓存 `.pnpm-store` 已排除出开发监听，后台组件与会话在进入后台时才加载。

球场氛围照片来自 Unsplash，球队标识来自 football-data.org，仅用于本地演示。页面不提供投注或金钱交易。

---

## 原有后台模板

基于 **Vue 3 + TypeScript + Vite** 的轻量中后台前端模板，提供登录、角色路由、后台布局和常用页面示例。

> 原有管理模板仍未连接账号后端或数据库，其首页统计、用户管理和角色管理为静态示例。新接入的 Node 服务仅负责公共赛事数据同步与页面托管。

## 功能概览

| 模块       | 当前能力                                                      |
| ---------- | ------------------------------------------------------------- |
| 登录与会话 | 表单校验、防重复提交、Token 保存、刷新恢复用户信息、失败回滚  |
| 权限路由   | 按角色递归过滤、动态注册、退出时移除、权限菜单生成            |
| 后台布局   | 折叠侧栏、面包屑、个人中心入口、退出确认                      |
| 主题       | 浅色 / 深色切换，保存主题与侧栏偏好                           |
| 页面缓存   | `meta.keepAlive` 按需缓存，最多保留 10 个页面                 |
| 接口基础   | Bearer Token、15 秒超时、响应解包、HTTP / 业务码 401 会话清理 |
| 示例页面   | 首页、用户管理、角色管理、个人中心、403、404                  |

## 技术栈

| 类别       | 方案                                     |
| ---------- | ---------------------------------------- |
| 框架       | Vue 3.5，Composition API，TypeScript SFC |
| 路由与状态 | Vue Router 5、Pinia 4，Setup Store       |
| UI 与样式  | Naive UI、Ionicons、Sass                 |
| 请求与工具 | Axios、VueUse、NProgress                 |
| 构建       | Vite 7、按需组件导入、API 自动导入       |
| 质量检查   | TypeScript strict、ESLint、Prettier      |

精确依赖以 `package.json` 和 `pnpm-lock.yaml` 为准。

## 快速开始

推荐使用 **Node.js 24** 与 **pnpm 10.27.0**。允许的 Node 版本范围见 `package.json` 的 `engines`；Node 18 不受当前工具链支持。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

开发服务默认端口为 5173，实际地址以终端输出为准。

| 命令                                | 用途                             |
| ----------------------------------- | -------------------------------- |
| `pnpm dev`                          | 启动开发服务，默认启用 Mock      |
| `pnpm typecheck`                    | 检查 TypeScript 和 Vue 模板类型  |
| `pnpm lint` / `pnpm lint:fix`       | 检查 / 自动修复 ESLint 问题      |
| `pnpm format` / `pnpm format:check` | 格式化 / 检查代码格式            |
| `pnpm check`                        | 依次执行类型、Lint 和格式检查    |
| `pnpm build`                        | 类型检查并生成生产产物 `dist`    |
| `pnpm preview`                      | 本地预览生产产物，不是生产服务器 |

目前未配置单元测试或端到端测试框架。

## 演示账号

仅在 Mock 模式下可用；真实接口模式不预填账号密码，也不显示演示账号提示。

| 账号  | 密码   | 角色  | 可见菜单                 |
| ----- | ------ | ----- | ------------------------ |
| admin | 123456 | admin | 首页、系统管理、个人中心 |
| user  | 123456 | user  | 首页、个人中心           |

Mock 独立放在 `src/mock`，仅用于开发演示。生产配置关闭 Mock，相应分支在构建时移除。

## 环境配置

| 变量                | 用途                           | 默认值                |
| ------------------- | ------------------------------ | --------------------- |
| `VITE_APP_TITLE`    | 登录标题、侧栏名称、浏览器标题 | WebsiteForGuess Admin |
| `VITE_API_BASE_URL` | 浏览器接口基础路径             | /api                  |
| `VITE_USE_MOCK`     | 本地模拟登录与用户信息         | 开发 true，生产 false |
| `API_PROXY_TARGET`  | 仅开发服务器使用的后端代理目标 | http://localhost:8080 |

加载优先级：进程环境变量 > `.env.[mode].local` > `.env.[mode]` > `.env.local` > `.env`。

开发时连接真实后端，可在本地创建 `.env.development.local`：

```dotenv
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://localhost:8080
```

修改环境变量后需要重启开发服务；生产变量在构建时写入产物，修改后必须重新构建。

`VITE_` 前缀的变量会暴露给浏览器，禁止放入密钥、数据库密码等秘密信息。`*.local` 文件已被 Git 忽略。

## 目录结构

```text
src/
├── api/modules/          按业务划分的真实接口入口
├── assets/styles/        全局样式与 Sass 变量
├── components/auth/      登录表单组件
├── composables/          登录等有状态的组合式逻辑
├── config/               应用标题、接口地址等统一配置
├── layout/               后台外壳与布局组件
│   └── components/       AppSidebar / AppHeader / AppContent
├── mock/                 本地模拟接口，与真实接口分离
├── router/               静态路由、动态路由、导航守卫
├── services/             跨 Store 的会话协调逻辑
├── stores/modules/       user / permission / app
├── types/                用户、响应、RouteMeta 与自动生成类型
├── utils/                请求、存储、权限过滤、菜单和路径工具
├── views/                路由页面，优先负责页面组合
├── App.vue               全局 Provider、主题与路由出口
└── main.ts               应用启动，先注册 Pinia 再注册路由
```

依赖方向：页面 / 组件调用 composables、services 或 stores；stores 调用 api；api 调用请求工具。请求层不直接依赖 Store 或 Router，权限 Store 不导入 Router 单例。

## 登录与权限约定

1. 登录后获取用户信息；任一步骤失败都撤销本次登录态。
2. 刷新后先使用 Token 恢复用户信息，再按 roles 注册动态路由；恢复失败则清理会话并回到登录页。
3. 默认页面需要登录，仅 `meta.requiresAuth: false` 允许匿名访问。
4. `meta.roles` 为空表示所有已登录角色可访问；子路由权限与父路由权限同时生效。
5. 菜单来自已过滤路由，`meta.hidden: true` 时隐藏；隐藏不等于禁止访问。
6. `meta.keepAlive: true` 时缓存布局内页面，以路径为缓存键；查询参数变化复用页面实例，需由页面自行监听刷新数据。
7. 未匹配的页面及未注册的无权限页面显示 404；403 页面作为后续业务权限提示入口预留。

新增页面时，在 `views` 创建页面，在 `router/dynamic.ts` 配置路由、title、icon 和 roles。跨组件解构 Store 状态时使用 `storeToRefs()`。

前端角色与菜单只改善交互，不能替代后端鉴权。当前 Token 保存在 localStorage；生产后端需结合会话策略评估存储方式。尚未实现 Token 刷新、按钮权限与数据权限。

## 接口契约

请求封装位于 `src/utils/request.ts`，统一返回业务 data，不向页面暴露 AxiosResponse。

| 接口          | 方法 | 请求 / 返回数据                            |
| ------------- | ---- | ------------------------------------------ |
| `/auth/login` | POST | 提交 username、password；返回 token        |
| `/user/info`  | GET  | 返回 id、username、nickname、avatar、roles |

后端响应示例：

```json
{
  "code": 0,
  "data": { "token": "your-access-token" },
  "message": "success"
}
```

`code: 0` 表示成功；非 0 抛出 `ApiError`。HTTP 401 或业务 `code: 401` 时统一清理登录态；已进入页面的用户返回登录页并保留原路径。请求携带 `Authorization: Bearer <token>`。

开发代理移除 `/api` 前缀，例如 `/api/auth/login` 转发为后端 `/auth/login`；若后端本身包含 `/api` 前缀，请调整 `vite.config.ts` 的 `rewrite`。

## 生产部署

```bash
pnpm check
pnpm build
```

部署 `dist` 目录，并确认：

- 后端已经实现上述接口；生产环境默认不使用演示账号。
- `/api` 请求由部署服务器转发到后端。Vite 开发代理不会进入生产产物。
- 使用 History 路由，页面请求需要回退到 `index.html`；API 请求不得回退到前端页面。
- 默认部署在域名根路径；子目录部署需同步设置 Vite `base` 与服务器路径。
- 使用 HTTPS，并让后端对每个受保护接口独立鉴权。

建议至少手工回归：管理员登录并刷新管理页、普通用户登录、退出后切换账号、无效 Token、接口 401、主题切换后刷新，以及直接访问不存在的路径。
