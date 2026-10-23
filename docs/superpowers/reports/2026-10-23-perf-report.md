# 性能优化前后对比报告（2026-10-23）

> 优化范围：提交 `77aef5e..eb216f4`（含 `1dc2eb9` 起的 7 项修复 + `3581c4b` 守卫，共 9 个提交，仅客户端/服务端代码，无测量相关改动）
> 数据来源：`docs/superpowers/baselines/2026-10-23-perf-baseline.md`（同文件含修复后复测数据，构建与运行时均为同一测量方法、干净重建、同机同口径）
> 回归保障：`pnpm test` 33/33 通过（3 个测试文件）· `pnpm typecheck` 通过 · `pnpm lint` 0 errors（29 warnings 均为修复前已存在的历史遗留：unused-vars ×18、set-state-in-effect ×8、incompatible-lib ×2、impure-render ×1；与基线提交逐条比对确认无新增）

## 总览

| 维度 | 修复前 | 修复后 | 变化 |
|---|---|---|---|
| 每路由渲染阻塞 CSS（gzip） | 151.3 kB（404 条字体声明） | **84.9 kB（202 条）** | **−66.4 kB / −43.9%** |
| CSS 实际传输（公开页实测） | ≈151.3 kB | **85.8 kB** | **−65.5 kB** |
| `/classroom` First Load JS | 176.7 kB | 173.2 kB | −3.5 kB / −2.0% |
| `/dashboard/classroom` First Load JS | 200.3 kB | 196.6 kB | −3.7 kB / −1.8% |
| `/register` LCP（冷加载） | 240 ms | 208 ms | −32 ms |
| `/login` FCP / LCP | 148–164 / 196 ms | 148–152 / 200 ms | 持平（噪声内） |
| CLS / 长任务（公开页） | 0.00 / 0 | 0.00 / 0 | 持平（无退化） |
| 其余 dashboard 路由 JS | 185.4–202.6 kB | 186.3–203.5 kB | +0.8~0.9 kB（新逻辑代价） |
| dashboard 登录态指标 | 无法测量（无数据库，HTTP 500） | 同左 | 环境限制，用户批准跳过 |

**本轮最大单项收益是字体声明 CSS 减半（A5）**；点名动画动态导入（A1）带来 classroom 两页 JS 下降与首屏减负；其余修复（A2/A3/A4、守卫）为运行时行为优化，无法在本环境量化，见各项说明。

## 逐项对比

### 1. 动态导入点名动画（A1）— `1dc2eb9` + `7a5421f`

- **问题：** `nebula-rollcall.tsx`（37.9 KB 源码）被 `/classroom` 与 `/dashboard/classroom` 两页**静态顶层导入**（基线 §3），页面打开即加载并执行全部动画代码。
- **措施：** `next/dynamic` + `ssr: false` 按需加载，交互触发时才拉取动画 chunk；`7a5421f` 对齐加载兜底的外边距并注释别名原因。
- **修复前数值：** `/classroom` 176.7 kB、`/dashboard/classroom` 200.3 kB First Load JS，动画代码全量内含。
- **修复后数值：** 173.2 / 196.6 kB（−3.5 / −3.7 kB gz）。已验证懒加载 chunk（`3l40vdn-v6dkk.js`，min 后 18.5 KB）**不在任何路由 entryJSFiles 中**，交互时才加载。
- **结论：** ✅ 生效。字节收益小于源码体积（37.9 KB TSX 经 minify+gzip 后仅 ≈5.5 kB，再扣除 dynamic 包装器），额外收益是首屏不再解析/执行动画代码；首帧渲染与交互期长任务都受益于延迟执行。

### 2. 思源宋体字重精简（A5）— `32b1b01` + `eb216f4`

- **问题：** `src/app/layout.tsx` 以 next/font/google 加载 `Noto_Serif_SC` 四档 weight（400/500/600/700），每档 101 个 unicode-range 子集 = **404 条 @font-face / 132.6 kB gz** 渲染阻塞 CSS，经 root layout 进入**每一条路由**（基线 §6）。
- **措施：** `32b1b01` 精简为两档字重；`eb216f4` 将请求字重与实际渲染（`font-serif` 的 400/600）对齐，避免字形回退。
- **修复前数值：** 字体 CSS 132.6 kB gz / 362.6 kB raw（404 条）；每路由 CSS 合计 151.3 kB gz / 478.4 kB raw。
- **修复后数值：** 字体 CSS **66.2 kB gz / 181.4 kB raw（202 条，实测 400/600 各恰好 101 条）**；每路由 CSS 合计 **84.9 kB gz / 297.3 kB raw**。运行时实测每页 CSS 传输 85.8 kB，与构建计算值吻合。
- **结论：** ✅ 本轮最大收益。渲染阻塞 CSS −66.4 kB gz（−43.9%），基线运行时 RenderBlocking insight 的主因基本消除；`/register` LCP 240 → 208 ms 与之相符（`/login` 本就更快，变化在噪声内）。

### 3. currentClassId 持久化（A4-瀑布）— `7d2ff7d`

- **问题：** workspace store 为纯内存 zustand、无 persist，`currentClassId` 初始 null；所有 `enabled: !!classId` 下游查询形成「`/classes` → effect 二次渲染 → 数据请求」两级瀑布，**每次页面加载都发生**（基线 §5，波及 7 个 dashboard 页）。
- **措施：** store 加 persist 中间件，刷新/切页后直接命中上次班级发起数据请求，消除 effect 二级跳。
- **修复前数值：** 每次进页 2 跳（classes → 数据），首数据请求被阻塞一整个 RTT + effect 周期。
- **修复后数值：** 逻辑上 1 跳（静态代码核实）；**bundle 代价 +0.8~0.9 kB/路由**（persist 中间件进入 dashboard 公共 chunk）。运行时请求数无法在本环境实测（dashboard 因缺数据库 HTTP 500，登录态指标跳过——用户批准）。
- **结论：** ✅ 机制成立（代码核实），量化收益待补环境后按基线方法补测；代价可接受。

### 4. plans/homework 查询 enabled 门控（A4-双请求）— `c0e7db0` + `eb216f4`

- **问题：** `/dashboard/plans`、`/dashboard/homework` 的列表 query 无 `enabled`，先以 `classId=undefined` 发一次**注定无效**的请求，classId 就绪后 queryKey 变化再发第二次（基线 §5）。
- **措施：** 加 `enabled: !!classId` 门控，杜绝无效首请求；`eb216f4` 修复门控引入的空态闪烁。
- **修复前数值：** 每次进页 2 次 `/plans`（或 `/homework`）请求，1 次必然浪费。
- **修复后数值：** 1 次（静态代码核实；运行时同上无法实测）。
- **结论：** ✅ 消除 50% 无效列表请求与对应的服务端查询开销。

### 5. 备份导出并行化（A2）— `328082b`

- **问题：** `/backup/export` 先串行 `await` 用户查询，再并行 16 路数据集查询（基线 §4），userData 与 16 路完全独立。
- **措施：** 用户查询并入同一 `Promise.all`（16 → 17 路）。
- **修复前/后数值：** 导出总时延省一个串行 RTT（服务端 DB 往返）；无登录态无法实测，量级为每次导出数十 ms。
- **结论：** ✅ 低频管理操作，收益小但零风险，代码更一致。

### 6. 点名动画 rAF 可见性暂停（A3）— `7a9a90f`

- **问题：** 动画 rAF 循环挂载期间持续逐帧运行，无 IntersectionObserver / visibilitychange 暂停（基线 §7）；页面滚出视口或切后台仍满帧渲染。
- **措施：** 离开视口或页面隐藏时暂停 rAF 循环，恢复可见时续跑。
- **修复前/后数值：** CPU/GPU 占用优化，无直接 bundle/加载指标；本环境无法实测（交互追踪跳过）。定性收益：动画不可见期间主线程占用 → 0。
- **结论：** ✅ 与 A1 互补：A1 管「要不要加载」，本项管「加载后不看不烧」。

### 7. 班级删除回退守卫 — `3581c4b`

- **问题：** 配套 7d2ff7d 的正确性守卫：`currentClassId` 持久化后，若所指班级已被删除（其他设备/回收站清理），页面会落在失效班级上。
- **措施：** 检测持久化班级不存在时自动回退到首个班级。
- **修复前/后数值：** 修复前该场景不存在（无 persist）——本提交是让修复 3 安全落地的必要件；代价计入上文 +0.9 kB。
- **结论：** ✅ 必要配套，防止 persist 引入新故障面。

## 发现但不修（及理由）

| 发现 | 不修理由 |
|---|---|
| recharts 已安装未使用 | 全库零引用，**不进 bundle**，对性能零影响；清理属依赖治理独立任务（package.json:46） |
| `dragon-rollcall.tsx`（15.8 KB）、`thunder-drum.tsx`（11.6 KB）死代码 | 零引用即不打包，不影响 bundle；删除属代码清理独立任务 |
| `@yohaku/design-system@^0.0.2` 零引用（package.json:31） | tokens 已 vendor 进 `src/styles/yohaku-tokens.css`，npm 包不进 bundle；依赖清理独立任务 |
| `/login` Lighthouse `landmark-one-main`（A11y 98 → 100 差距） | 语义改进项非性能项；收益远低于 10KB/100ms 优化门槛 |
| ≈14.6 kB LegacyJavaScript（nomodule polyfill，构建口径 38.7 kB gz） | 仅旧浏览器实际加载，现代浏览器零成本；压缩该体积需降 target，影响面大于收益 |
| dashboard 登录态指标缺失 | 无 `.env`/数据库环境（无 docker、本地无 PG），dashboard 路由 HTTP 500；用户批准跳过，补环境后须按基线方法补测 |

## 回归验证记录

| 检查 | 命令 | 结果 |
|---|---|---|
| 单元测试 | `pnpm test`（vitest run） | ✅ 3 个文件 33/33 通过，1.96s |
| 类型检查 | `pnpm typecheck`（tsc --noEmit） | ✅ 无错误 |
| 代码规范 | `pnpm lint`（eslint .） | ✅ 0 errors（29 warnings 均为修复前已存在的历史遗留，与基线提交逐条比对确认无新增） |

## 遗留与后续建议

1. **补测登录态指标**（最大不确定项）：配置 `.env`（`DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`）+ PG 实例后，按基线方法补测 dashboard 各页 FCP/LCP/TBT、随机点名动画与听写网格两项交互追踪，验证修复 3/4/6 的运行时收益。
2. **JS 大头不动**：First Load JS 的 132.4 kB 共享部分（react-dom 70.3 + App Router 运行时 43.0 kB gz）为框架成本，本轮未针对；如需继续压 JS 应调研 RSC 边界细化或升级 Next。
3. **依赖与死代码清理**：recharts、@yohaku/design-system、dragon-rollcall/thunder-drum，独立任务处理。
