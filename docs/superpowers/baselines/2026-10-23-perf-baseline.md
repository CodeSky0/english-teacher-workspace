# 性能基线（2026-10-23）

> 测量环境：Next.js 16.4.2（Turbopack）· React 19 · pnpm · Windows
> 测量命令：`pnpm build`（干净重建：构建前删除了 `.next`，剔除旧 webpack 构建残留产物）
> 结论速览：所有路由每页均加载 **3 个 CSS 共约 151.3 kB（gzip）**；JS First Load JS 范围 **132.4–202.6 kB（gzip）**，dashboard 路由普遍在 185 kB 以上。

## 路由 First Load JS（修复前）

### `pnpm build` 原始输出（逐字粘贴）

> 注意：Next.js 16 的 Turbopack 构建**不再输出 Size / First Load JS 列**，仅输出路由与渲染方式。体积数据见下一节（由构建产物计算）。

```text
▲ Next.js 16.4.2 (Turbopack)
✓ Running next.config.ts took 62ms
  Creating an optimized production build ...
✓ Compiled successfully in 9.0s
  Running TypeScript ...
  Finished TypeScript in 16.6s ...
  Collecting page data using 15 workers ...
  Generating static pages using 15 workers (6/6) in 469ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/[[...route]]
├ ƒ /api/auth/[...all]
├ ○ /classroom
├ ƒ /dashboard/ai
├ ƒ /dashboard/classroom
├ ƒ /dashboard/dictation
├ ƒ /dashboard/grades
├ ƒ /dashboard/help
├ ƒ /dashboard/homework
├ ƒ /dashboard/overview
├ ƒ /dashboard/plans
├ ƒ /dashboard/research
├ ƒ /dashboard/resources
├ ƒ /dashboard/schedule
├ ƒ /dashboard/settings
├ ƒ /dashboard/students
├ ƒ /dashboard/vocab
├ ○ /login
└ ○ /register


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### 每路由 JS 体积（由构建产物计算，gzip 口径）

计算方法（与 Next.js 经典 "First Load JS" 口径对齐，不含 nomodule polyfill 与 CSS）：

- 共享集 = `.next/build-manifest.json` 的 `rootMainFiles`（每路由必加载的运行时 chunk）∪ 所有路由 `entryJSFiles` 的交集；
- 路由 First Load JS = (共享集 ∪ 该路由 `.next/server/app/**/page_client-reference-manifest.js` 的 `entryJSFiles` 各 chunk) 逐个 gzip 后求和；
- "路由自身 Size" = First Load JS 减去共享集部分。

| Route | 路由自身 Size | First Load JS |
|---|---|---|
| /dashboard/students | 70.3 kB | 202.6 kB |
| /dashboard/grades | 68.6 kB | 201.0 kB |
| /dashboard/classroom | 67.9 kB | 200.3 kB |
| /dashboard/dictation | 63.9 kB | 196.3 kB |
| /dashboard/overview | 61.8 kB | 194.2 kB |
| /dashboard/vocab | 60.3 kB | 192.7 kB |
| /dashboard/resources | 58.4 kB | 190.8 kB |
| /dashboard/research | 57.7 kB | 190.1 kB |
| /dashboard/plans | 57.7 kB | 190.1 kB |
| /dashboard/homework | 57.5 kB | 189.9 kB |
| /dashboard/settings | 57.1 kB | 189.5 kB |
| /dashboard/schedule | 56.8 kB | 189.2 kB |
| /dashboard/ai | 56.7 kB | 189.1 kB |
| /dashboard/help | 53.0 kB | 185.4 kB |
| /classroom | 44.3 kB | 176.7 kB |
| /register | 43.0 kB | 175.4 kB |
| /login | 42.9 kB | 175.3 kB |
| / | 17.4 kB | 149.8 kB |
| /_not-found | 17.4 kB | 149.8 kB |
| /_global-error | 0 B | 132.4 kB |

（`/api/[[...route]]` 与 `/api/auth/[...all]` 为纯服务端路由，无客户端 JS，不列。）

## 共享 chunk（First Load JS shared by all）

| chunk（`.next/static/chunks/`） | gzip | 原始 | 来源（按特征串推断） |
|---|---|---|---|
| `0irkc4a2scn5y.js` | 70.3 kB | 224.4 kB | **react-dom**（React 19 vendor，含 `react-dom` / `react.element` 特征） |
| `3-anr6uc3d4dc.js` | 43.0 kB | 154.9 kB | **Next App Router 客户端运行时 + react-dom client/scheduler**（含 `app-router`、`scheduler` 特征） |
| `44imsnah9-_s3.js` | 8.2 kB | 29.9 kB | `next/dist` App Router 入口（client components 边界加载器） |
| `turbopack-3-ry682tkyiqk.js` | 3.8 kB | 9.8 kB | Turbopack chunk 运行时 |
| `1cl0qz4cmiwnk.js` | 3.6 kB | 13.0 kB | React 运行时辅助（无特征串） |
| `0qa1s0ll_f56y.js` | 3.4 kB | 13.5 kB | 根 layout 共享入口 chunk（含 providers 等） |

**First Load JS 最大的 3 个共享 chunk：`0irkc4a2scn5y.js`（react-dom，70.3 kB gz）、`3-anr6uc3d4dc.js`（App Router 运行时，43.0 kB gz）、`44imsnah9-_s3.js`（next/dist 入口，8.2 kB gz）。**

另：nomodule polyfill `0cz1d0mv5g_q7.js`（gzip 38.7 kB / 原始 110.0 kB）仅旧浏览器加载，不计入常规 First Load JS，但对老设备是真实成本。

### 每路由加载的 CSS（所有路由相同，全量加载）

| chunk（`.next/static/chunks/`） | gzip | 原始 |
|---|---|---|
| `3ltiua1kplqsx.css` | 132.6 kB | 362.6 kB |
| `2jxkt8z9xcdm_.css` | 18.0 kB | 113.9 kB |
| `2qghj-87zvt7j.css` | 0.7 kB | 1.9 kB |
| **合计** | **151.3 kB** | **478.4 kB** |

## 构建警告（构建输出摘要）

- `⚠ No build cache found. Please configure build caching for faster rebuilds.`
- `[db] DATABASE_URL not set — database operations will fail at runtime. (Use DUMMY_URL only to allow module loading during build.)`（构建期多次输出，环境变量缺失，非本任务范围）
- `[better-auth] Base URL is not set. Set the baseURL option or BETTER_AUTH_URL env ...`（构建期多次 WARN）
- `[Error [BetterAuthError]: You are using the default secret. Please set BETTER_AUTH_SECRET ...]`（构建期多次输出）
- 构建配置使用了实验特性：`Experiments (use with caution): optimizePackageImports`

## 已知事实

- recharts 未使用；dragon-rollcall/thunder-drum 为死代码（不影响 bundle）
- Next.js 16 Turbopack 构建不再输出 Size / First Load JS 列 → 本基线的体积数字为构建产物计算值（方法见上），Task 6 对比时须用同一方法重算
- `next build --webpack` 在本仓库不可用：`next/font` 的 Google 字体加载器（`Noto_Serif_SC`，`src/app/layout.tsx`）抛 `TypeError: Cannot read properties of null (reading '1')`，构建失败 —— 本项目只能以 Turbopack 构建为口径
- 测量前的 `.next` 中存在旧 webpack 构建的残留 chunk（`framework-*`、`app/layout-*` 等），已删除 `.next` 干净重建后测量；对比时同样应清理后构建
- 首次构建提示无 build cache（`No build cache found`），本次编译 9.0s + TypeScript 16.6s

## 运行时基线（修复前）

> 测量环境：生产服务器 `pnpm start`（Next.js 16.4.2，`http://localhost:3000`，Ready 508ms，沿用上文同一份 `.next` 生产构建）
> 测量工具：Chrome DevTools MCP —— `lighthouse_audit`（navigation / desktop；**该版本不含 performance 类别**，FCP/LCP/TBT/CLS 由 performance trace 与页面内 Performance API（buffered LCP / longtask）采集）+ `performance_start_trace`（CLS 与 insight）
> 测量条件：desktop，无 CPU / 网络节流；"冷加载" = reload + ignoreCache（绕过 HTTP 缓存）；同页多次冷加载取值范围一并记录
> 测量日期：2026-10-23

### 重要限制：dashboard 路由无法测量（环境缺数据库）

- 仓库无 `.env`（仅 `.env.example`），运行期日志复现构建期警告：
  - `[db] DATABASE_URL not set — database operations will fail at runtime.`
  - `[Error [BetterAuthError]: You are using the default secret. Please set BETTER_AUTH_SECRET ...]`
- 本机 `docker` 命令不存在（`docker-compose.yml` 无法启动 PG/Redis），`localhost:5432` 无监听 → 数据库不可达
- 实测后果：
  - `/register` 页面可渲染（静态 200），但提交注册表单返回 toast「**注册失败**」（DB 写入失败）→ 无法获得登录态
  - `/dashboard/overview`、`/dashboard/classroom`、`/dashboard/dictation` 未登录访问均返回 **HTTP 500**（Next.js 错误页 "This page couldn't load"，digest 与服务器日志 `BetterAuthError` 一致）
- 因此任务计划中的 dashboard 三页 FCP/LCP/TBT 与两项交互追踪（随机点名动画 ~5s、听写网格点击）**全部无法测量**；补齐环境（`.env` 的 `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` + 可用 PG 实例）后须按同法补测
- 降级说明：生产服务器本身可正常启动并服务静态页，故未切换 `pnpm dev`（dev 模式同样无法解决数据库缺失，且会引入 dev 开销使数值失真）

### 公开页实测数据

| 页面 | HTTP | FCP（冷加载） | LCP（冷加载） | CLS | TBT | 长任务 >50ms | 冷加载传输 | Lighthouse（desktop） |
|---|---|---|---|---|---|---|---|---|
| `/login` | 200 | 148–164 ms（2 次冷加载区间） | 196 ms | 0.00 | ≈0 ms（无长任务） | 0 | ≈605 KB / 23 请求 | A11y 98 · BP 100 · SEO 100 · Agentic 100 |
| `/register` | 200 | 156 ms | 240 ms | 0.00 | ≈0 ms（无长任务） | 0 | ≈676 KB / 24 请求 | 未单独跑（与 /login 同构） |

补充观察：

- `/login` Lighthouse 唯一失败项：`landmark-one-main`（文档缺少 main landmark，A11y 98 → 100 的差距）
- `/login` 与 `/register` 的 performance trace 均命中两类 insight：
  - **RenderBlocking**：存在阻塞首屏渲染的请求（与构建基线"3 个 CSS 共 151.3 kB 全量加载"相互印证）
  - **LegacyJavaScript**：约 14.6 kB 可避免的转译/ polyfill 体积（对应构建基线中的 nomodule polyfill 38.7 kB gz）
- `/register` 注册提交在 DB 不可达时失败（toast「注册失败」），该页仅加载性能数据有效

### Dashboard 路由（未能测得，原因记录）

| 页面 | 结果 | 原因 |
|---|---|---|
| `/dashboard/overview` | HTTP 500 | 缺 `.env`（`DATABASE_URL`/`BETTER_AUTH_SECRET`），better-auth 会话查询抛 `BetterAuthError`；无 docker、本地无 PG，无法建库注册登录 |
| `/dashboard/classroom`（含随机点名动画 ~5s 交互追踪） | HTTP 500，交互追踪未执行 | 同上——无登录态 |
| `/dashboard/dictation`（含网格点击交互追踪） | HTTP 500，交互追踪未执行 | 同上——无登录态 |

参考值（非基线）：`/dashboard/overview` 的 500 错误页本身 FCP 208 ms、长任务 0（资源命中浏览器缓存，transferSize≈0）——错误页无性能信号，**不作为** dashboard 性能基线。

### 运行时结论速览（修复前）

- 公开页性能良好：FCP < 170 ms、LCP < 250 ms、CLS 0.00、无 >50 ms 长任务（本机无节流口径）
- 关键缺口：dashboard 三页因缺数据库环境全为 500，**登录态加载指标与交互长任务基线缺失**——这是本基线与 Task 6 对比时最大的不确定项，修复阶段应先补环境再补测
- 渲染阻塞请求与 legacy JS（≈14.6 kB）在两个公开页均存在，与构建基线的 CSS/体积结论一致

## 静态审计结论（2026-10-23）

> 审计方式：Grep 全量检索 + 逐文件人工读码核实（`src/server/api/routes/` 全部 19 个文件、`src/app/dashboard/` 全部 14 个 page.tsx、27 个 `"use client"` 文件的 import、3 个构建 CSS chunk 实际内容解剖）
> 结论标注：「已确认」= 读码核实存在该问题；「误报」= 检索命中但读码排除。修复模式编号 A1–A4 见任务计划；本次新增 A5（见 §6）。

### 1. 重依赖静态导入（Step 1a）

| 依赖 | 检索结果 | 核实结论 | 证据 |
|---|---|---|---|
| recharts | src/ 零引用 | 误报（不进 bundle）。属「已安装未使用」，建议后续清理依赖（package.json:46） | 全库 grep `from "recharts"` 无命中 |
| @tanstack/react-table | src/ 零引用 | 误报。页面表格为手写 + `@tanstack/react-virtual`（grades 页），无 react-table | 全库 grep 无命中 |
| @dnd-kit/core | 仅 1 处 | 误报（A1 已应用）：唯一引用 `src/app/dashboard/overview/sortable-cards.tsx:8-14`（"use client"），且该组件已经由 `next/dynamic` + `ssr: false` 动态引入（`src/app/dashboard/overview/page.tsx:16-19`） | 读码核实 |
| exceljs | 仅 1 处 | 误报：仅服务端 `src/server/excel/workbook.ts:1`；`src/lib/excel/client.ts` 不依赖 exceljs | 与已知事实一致 |

**本项无已确认问题。** 唯一未做代码分割的重组件是 nebula-rollcall，归入 §3。

### 2. "use client" 文件误引服务端模块（Step 1b）

**误报 / 无发现。** 全部 27 个 `"use client"` 文件逐一核查：无任何 `@/server/*`、drizzle、better-auth 服务端、redis 导入。app 目录中引用 `@/server/*` 的 3 个文件（`(auth)/login/page.tsx:1`、`(auth)/register/page.tsx:1`、`dashboard/layout.tsx:2`）均为服务端组件（无 "use client"），属正常用法；`src/lib/auth-client.ts:1` 走 `better-auth/react` 客户端入口，合法。全库亦无相对路径跨层引用 server/db。

### 3. 死代码与未分割重组件（Step 1c）

| 文件 | 体积 | 引用情况 | 结论 |
|---|---|---|---|
| `src/components/classroom/dragon-rollcall.tsx` | 15.8 KB | 全库零引用 | 已确认死代码（无引用即不打包，不影响 bundle；建议删除以免误导维护） |
| `src/components/classroom/thunder-drum.tsx` | 11.6 KB | 全库零引用 | 已确认死代码（同上） |
| `src/components/classroom/nebula-rollcall.tsx` | 37.9 KB | 被两页**静态顶层导入**：`src/app/classroom/page.tsx:14`、`src/app/dashboard/classroom/page.tsx:20` | **已确认 A1**（37.9 KB > 20KB 阈值；两页 First Load JS 176.7 / 200.3 kB）。修复归 Task 4，此处仅记录 |

### 4. 服务端串行 await 瀑布（Step 1d）

**已确认（轻微，A2）：`src/server/api/routes/backup.ts:38`** — `/backup/export` 先串行 `await db.select().from(user)`，再在第 42 行以 `Promise.all` 并行 16 路数据集查询。userData 与这 16 路查询完全独立，仅用于响应负载 `data.user`（backup.ts:65），可并入同一 Promise.all（16 → 17 路）。属低频管理操作，收益小。

**误报（读码排除，逐类说明）：**

- `overview.ts`：已知事实核实一致——主查询 Promise.all + 90s Redis 缓存，无串行瀑布。
- `classroom.ts`、`import-export.ts`、`dictation.ts`、`exams.ts`、`homework.ts`、`profile.ts` 等的连续 await 均为**守卫短路模式**（先查归属做 404 短路，再查/写数据），如 `classroom.ts:82-87`（poll 归属校验 → options）、`classroom.ts:168-184`（班级校验 → 既有考勤）；依赖前值（如 `classroom.ts:117-121` 的 pollId 来自 opt）不构成可并行瀑布。
- `import-export.ts` 三个导入处理器写路径已是「批量 insert（138/252/306 行）+ Promise.all updates（140/254/308 行）」；六个导出处理器全部 `Promise.all`（331/373/425/515/584/656 行）。
- `backup.ts` import 事务（111-296 行）内顺序 delete/insert 为 **FK 顺序依赖**，不应并行。
- `schedule.ts`、`vocab.ts`、`recycle.ts`、`ai.ts`、`excel.ts`、`_factory.ts`：单记录 CRUD / 缓存读写 / 单查询，无多查询串行。

### 5. 路由级数据获取瀑布（Step 2）

**机制（已确认）：** `useWorkspace` 为纯内存 zustand、无 persist（`src/stores/workspace.ts:15-24`，`currentClassId` 初始 null）；`useClasses` 在 `/classes` 查询 resolve 后经 useEffect 才 `setCurrentClassId`（`src/hooks/use-classes.ts:23-27`）。因此所有 `enabled: !!classId / !!currentClass` 的下游查询形成「`/classes` 请求 → effect 二次渲染 → 数据请求」的两级瀑布，**每次页面加载都发生**（非仅首访）。

**已确认 A4 的页面**（体积引自本基线构建表）：

| 页面 | 瀑布形态 | 证据 | First Load JS |
|---|---|---|---|
| /dashboard/students | classes → students | page.tsx:35,47-51 | 202.6 kB |
| /dashboard/grades | classes → exams；students/scores 再等用户选中考试 | page.tsx:34,40-58 | 201.0 kB |
| /dashboard/classroom | classes → students + points（att/fb 按 tab 懒加载） | page.tsx:48-50,77-109 | 200.3 kB |
| /dashboard/dictation* | 见下「边界说明」 | page.tsx:74-115 | 196.3 kB |
| /dashboard/plans | 双请求：query 无 `enabled`，先以 `classId=undefined` 请求一次，classId 就绪后 queryKey 变化**二次请求** | page.tsx:42-45 | 190.1 kB |
| /dashboard/homework | 同 plans 双请求模式 | page.tsx:40-43 | 189.9 kB |
| /dashboard/schedule | classes → cells | page.tsx:36-40 | 189.2 kB |

\* dictation 边界说明：lists 无条件查询；words/students/results 均由**用户点选词表**触发（`enabled: !!selectedList`，page.tsx:83/99/114），属主从交互而非自动瀑布；仅 `currentClass` 兜底链（page.tsx:94）间接经过 classes。归为「轻微/部分 A4」。

**误报页面：**

- `/dashboard/overview`：`/classes`（班级切换器用）与 `/overview` 相互独立、并行发出（page.tsx:27-33，overview 查询 90s staleTime）。
- `/dashboard/vocab`：units 无条件，words 由用户选单元触发（page.tsx:39-46），主从模式。
- `/dashboard/resources`、`/dashboard/research`：单条无条件查询（resources:46、research:43）。
- `/dashboard/settings`：回收站按需加载（`enabled: recycleOpen`，page.tsx:25-28）。
- `/dashboard/ai`、`/dashboard/help`：无 useQuery（ai 仅 useMutation，page.tsx:35,41）。

**修复方向（A4 通用）：** workspace store 加 persist（消除 effect 二级跳）；或 `/classes` 与下游数据合并为一次聚合接口；plans/homework 加 `enabled` 消除双请求。

### 6. CSS 151.3 kB 异常根因（已确认 · 新发现 · 编号 A5）

对 `.next/static/chunks/` 三个 CSS chunk 逐一解剖（生产构建实测）：

| chunk | gzip | 原始 | 实际内容 |
|---|---|---|---|
| `3ltiua1kplqsx.css` | 132.6 kB | 371,302 字符（362.6 kB） | **404 条 `Noto Serif SC` @font-face**（101 个 unicode-range 子集 × 4 个 weight 400/500/600/700，实测各 weight 恰好 101 条）——不是 Tailwind |
| `2jxkt8z9xcdm_.css` | 18.0 kB | 113.9 kB | 真正的 Tailwind v4 utilities + yohaku tokens + globals 自定义层（约 1,362 条规则） |
| `2qghj-87zvt7j.css` | 0.7 kB | 1.9 kB | Inter 可变字体声明（单条 `font-weight:100 900` × 若干子集，作为对照：可变字体声明极紧凑） |

**根因：`src/app/layout.tsx:14-21`** 以 next/font/google 加载 `Noto_Serif_SC` 且 `weight: ["400","500","600","700"]` 四档——每档生成 101 个按 unicode-range 切片的 @font-face 规则，共 404 条 / 362.6 kB raw / 132.6 kB gz，经 root layout 进入**每一条路由**的渲染阻塞 CSS（与运行时基线 RenderBlocking insight 相互印证）。151.3 kB gz 总量中约 87.6% 是字体声明。

**修正本基线上文的一处解读：** 构建基线章节曾把 362.6 kB 归因为「Tailwind main CSS」——不准确，Tailwind 实际仅 18.0 kB gz，大头是字体声明 CSS。

**附带发现：** `@yohaku/design-system@^0.0.2`（package.json:31）在 src/ 中零引用——tokens 已 vendor 到 `src/styles/yohaku-tokens.css`（4.2 KB，注释注明 npm 包缺 typography-scale）；与 recharts 同属「已安装未使用」依赖。

**修复方向（A5）：** Noto Serif SC 减 weight（仅 400 + 700 → 声明减半）或改用可变字体（参照 Inter 模式）→ 预计去除约 66–99 kB gz 渲染阻塞 CSS；浏览器虽按 unicode-range 只下载命中的 woff2 分片，但 404 条声明本身仍全量阻塞渲染。

### 7. 附：nebula-rollcall canvas 动画（已确认 A3，修复归 Task 4）

`src/components/classroom/nebula-rollcall.tsx`：rAF 循环挂载期间持续运行（1029/1032 行 `requestAnimationFrame(frame)`），仅在卸载时 `cancelAnimationFrame`（1035 行）；**无 IntersectionObserver / visibilitychange 暂停**——1036 行断开的 `observer` 实为 ResizeObserver（970 行），与可见性无关。且该组件以 `min-h-[400px]` 内嵌于 dashboard/classroom 页卡片（page.tsx:337），页面打开即持续逐帧渲染。A1（静态导入）+ A3（无暂停）双问题叠加，均在 Task 4 修复范围。

### 静态审计结论速览

| # | 发现 | 结论 | 模式 | 去向 |
|---|---|---|---|---|
| 1 | recharts / react-table 未使用；exceljs、@dnd-kit 引用合法 | 误报 | — | 依赖清理（非本轮） |
| 2 | 客户端误引服务端模块 | 无发现 | — | — |
| 3 | dragon-rollcall / thunder-drum 死代码 | 已确认 | — | 建议删除 |
| 4 | nebula-rollcall 37.9 KB 静态导入两页 | 已确认 | A1 | Task 4 |
| 5 | nebula-rollcall rAF 无可见性暂停 | 已确认 | A3 | Task 4 |
| 6 | backup.ts export userData 串行于 16 路并行前 | 已确认（轻微） | A2 | 低优先 |
| 7 | 7 个 dashboard 页 classes→数据 两级瀑布（每次加载）；plans/homework 双请求 | 已确认 | A4 | 后续修复任务 |
| 8 | 362.6 kB「CSS」实为 Noto Serif SC 四 weight × 101 子集字体声明；Tailwind 仅 18 kB gz | 已确认 | A5（新） | 后续修复任务 |
| 9 | @yohaku/design-system 零引用 | 已确认 | — | 依赖清理（非本轮） |

---

# 修复后复测（2026-10-23 · Task 6）

> 复测命令：`pnpm build`（构建前删除 `.next` 干净重建，与基线同口径）；提交范围 `77aef5e..eb216f4`（9 个提交，见对比报告）
> 构建警告与基线一致（无 build cache、DATABASE_URL/BETTER_AUTH 缺失警告）；编译 9.6s + TypeScript 17.2s
> 代码仅测量、未改动；chunk hash 每次构建会变，对比看每路由合计值

## 路由 First Load JS（修复后）

计算方法与基线完全相同：共享集 = `build-manifest.json` 的 `rootMainFiles` ∪ 所有路由 `entryJSFiles` 交集，路由 First Load JS =（共享集 ∪ 该路由 entryJSFiles）逐个 gzip 求和（不含 polyfill 与 CSS）。

共享集（6 chunks，gzip 合计 132.4 kB）与基线**逐字节一致**（chunk hash 未变）：react-dom 70.3 + App Router 运行时 43.0 + next/dist 入口 8.2 + turbopack 运行时 3.8 + React 辅助 3.6 + 根 layout 入口 3.4。

| Route | 路由自身 Size | First Load JS（后） | First Load JS（前） | Δ | Δ% |
|---|---|---|---|---|---|
| /dashboard/students | 71.1 kB | 203.5 kB | 202.6 kB | +0.9 kB | +0.5% |
| /dashboard/grades | 69.5 kB | 201.8 kB | 201.0 kB | +0.8 kB | +0.4% |
| /dashboard/classroom | 64.2 kB | **196.6 kB** | 200.3 kB | **−3.7 kB** | **−1.8%** |
| /dashboard/dictation | 64.7 kB | 197.1 kB | 196.3 kB | +0.8 kB | +0.4% |
| /dashboard/overview | 62.7 kB | 195.1 kB | 194.2 kB | +0.9 kB | +0.5% |
| /dashboard/vocab | 61.2 kB | 193.6 kB | 192.7 kB | +0.9 kB | +0.5% |
| /dashboard/resources | 59.3 kB | 191.7 kB | 190.8 kB | +0.9 kB | +0.5% |
| /dashboard/research | 58.6 kB | 191.0 kB | 190.1 kB | +0.9 kB | +0.5% |
| /dashboard/plans | 58.6 kB | 191.0 kB | 190.1 kB | +0.9 kB | +0.5% |
| /dashboard/homework | 58.4 kB | 190.8 kB | 189.9 kB | +0.9 kB | +0.5% |
| /dashboard/settings | 57.9 kB | 190.3 kB | 189.5 kB | +0.8 kB | +0.4% |
| /dashboard/schedule | 57.7 kB | 190.1 kB | 189.2 kB | +0.9 kB | +0.5% |
| /dashboard/ai | 57.6 kB | 190.0 kB | 189.1 kB | +0.9 kB | +0.5% |
| /dashboard/help | 53.9 kB | 186.3 kB | 185.4 kB | +0.9 kB | +0.5% |
| /classroom | 40.8 kB | **173.2 kB** | 176.7 kB | **−3.5 kB** | **−2.0%** |
| /register | 42.9 kB | 175.3 kB | 175.4 kB | −0.1 kB | −0.0% |
| /login | 42.9 kB | 175.3 kB | 175.3 kB | −0.0 kB | −0.0% |
| / | 17.4 kB | 149.8 kB | 149.8 kB | −0.0 kB | −0.0% |
| /_not-found | 17.4 kB | 149.8 kB | 149.8 kB | −0.0 kB | −0.0% |
| /_global-error | 0 B | 132.4 kB | 132.4 kB | −0.0 kB | −0.0% |

**解读（诚实口径）：JS 不是本轮修复的主要收益点。**

- 仅两个 classroom 路由下降（−3.5 / −3.7 kB gz）：nebula-rollcall（37.9 KB 源码 → min 后 18.5 KB → gzip ≈5.5 kB）移出 First Load JS，扣除 dynamic 包装器后净减如此。已验证懒加载 chunk（`3l40vdn-v6dkk.js`，18.5 KB raw）不在任何路由 entryJSFiles 中。
- 其余 dashboard 路由 +0.8~0.9 kB（+0.4~0.5%）：persist 中间件（7d2ff7d）、enabled 门控（c0e7db0）、班级删除守卫（3581c4b）等新增运行时代码的体积代价。属「字节换请求/换正确性」的合理交换。
- JS 大头（react-dom 70.3 + App Router 运行时 43.0 kB gz）本轮修复不针对框架体积，故共享部分零变化。

### 每路由加载的 CSS（修复后，所有路由相同）

| chunk（`.next/static/chunks/`） | gzip | 原始 | 内容 |
|---|---|---|---|
| `0cks901yr4k6k.css` | **66.2 kB** | 181.4 kB | Noto Serif SC @font-face **202 条**（实测 400/600 各 101 条；基线为 404 条） |
| `02rkecx14bz5e.css` | 18.1 kB | 114.0 kB | Tailwind v4 utilities + tokens（与基线 18.0/113.9 持平） |
| `2qghj-87zvt7j.css` | 0.7 kB | 1.9 kB | Inter 可变字体（与基线一致） |
| **合计** | **84.9 kB** | **297.3 kB** | 基线 151.3 / 478.4 → **−66.4 kB gz（−43.9%）** |

对应源码变更：`src/app/layout.tsx` 的 `Noto_Serif_SC` weight 从 `["400","500","600","700"]` 精简为 `["400","600"]`（32b1b01 精简 + eb216f4 与实际渲染对齐）。

## 运行时基线（修复后）

> 测量环境与方法与基线相同：生产服务器 `pnpm start`（Ready 301ms，沿用上文同一份修复后 `.next` 构建）+ Chrome DevTools MCP 页面内 Performance API（buffered LCP / longtask / layout-shift + paint entries），冷加载 = reload + ignoreCache，desktop 无节流
> 同样的限制：无 `.env`/数据库，dashboard 路由仍为 HTTP 500，登录态指标与交互追踪**未测量**（用户批准跳过）

### 公开页实测数据（修复后）

| 页面 | HTTP | FCP（冷加载） | LCP（冷加载） | CLS | 长任务 >50ms | 冷加载传输 | CSS 传输 |
|---|---|---|---|---|---|---|---|
| `/login` | 200 | 148–152 ms（3 次冷加载区间） | 200 ms | 0.00 | 0 | ≈546 KB / 24 请求 | **85.8 kB**（3 个文件） |
| `/register` | 200 | 140 ms | 208 ms | 0.00 | 0 | ≈617 KB / 25 请求 | 85.8 kB（同 3 文件） |

对比基线（修复前）：

- `/login`：FCP 148–164 → 148–152 ms；LCP 196 → 200 ms（±4 ms，本机噪声范围内，两者均已远低于 2.5s 阈值）；传输 ≈605 → ≈546 KB（CSS −66 kB + woff2 分片命中集不同）
- `/register`：FCP 156 → 140 ms；LCP 240 → 208 ms（−32 ms）；传输 ≈676 → ≈617 KB
- CSS 传输：151.3 kB gz（构建口径）/ 每页实测 3 个 CSS → 修复后实测 **85.8 kB/页**（1.0 + 66.4 + 18.4），与构建产物计算值 84.9 kB 吻合——字体声明 CSS 减半得到运行时验证
- LCP 采集说明：`/login` 3 次冷加载中 1 次有效捕获 LCP 条目（后两次 buffered 观测器未回放条目，原因未查明，FCP/CLS/长任务均正常）；`/register` 单次冷加载正常捕获

### 运行时结论速览（修复后）

- 公开页保持优良：FCP < 155 ms、LCP < 210 ms、CLS 0.00、无长任务；`/register` LCP 改善 32 ms
- 渲染阻塞 CSS 大幅下降（−66 kB gz），RenderBlocking insight 的主因（字体声明）已消除大半
- dashboard 登录态指标仍缺失（环境限制同基线），persist/门控/并行化/rAF 暂停四项修复的运行时收益待补环境后按同法补测
