# 网页性能全面优化设计（体检先行）

日期：2026-10-23
状态：已确认

## 背景

英语教师工作台（Next.js 16 App Router + React 19 + Hono + Drizzle + react-query，部署于 Vercel）。
用户反馈三类问题：首屏加载慢、页面切换卡、交互掉帧。项目此前已经历多轮性能优化
（`05b62e3`、`8c3e10e` 等提交：optimizePackageImports、代码分割、虚拟化、rAF 节流），
低垂果实大概率已被摘过，因此采用**数据驱动**的体检先行方案，而非套用通用清单。

## 目标

- 降低各路由 First Load JS 体积与首屏时间（LCP/FCP）
- 消除页面切换的请求瀑布与预加载缺失
- 消除高频交互（听写录入、神龙点名动画）的掉帧
- 服务端聚合页（overview 等）响应提速
- 全部优化以实测数据验证收益，不改变任何视觉与功能行为

## 方案选择

在「体检先行（A）」「清单式全面优化（B）」「聚焦热点页面（C）」中选定 **方案 A**，
并以 C 中三个热点作为体检重点检查对象：

1. 总览页 `/dashboard/overview`（多班级聚合查询多）
2. 听写录入 `/dashboard/dictation`（格子高频更新、自动保存）
3. 神龙点名动画 `src/components/classroom/nebula-rollcall.tsx`（约 1060 行 canvas 组件，最新拉取代码）

## 阶段 1：诊断（测量瓶颈）

| 检查项 | 方法 | 产出 |
|---|---|---|
| 包体积 | `pnpm build` 读取各路由 First Load JS 输出；对可疑大件用 bundle 分析确认 | 各路由体积基线 |
| 首屏/切换 | DevTools Performance + Lighthouse 跑 `/login`、`/dashboard/overview`、`/dashboard/classroom`、`/dashboard/dictation` | LCP/FCP/TBT 基线 |
| 交互掉帧 | Performance 面板剖析神龙点名动画与听写录入格子高频更新 | 掉帧热点定位 |
| 服务端 | 审查 overview 等聚合页 API：串行请求瀑布、N+1 查询、缺失 DB 索引、缺失缓存 | 慢查询清单 |

产出：带数据的瓶颈清单，按「收益/风险比」排序。

## 阶段 2：修复（以实测瓶颈为准，预期高频项）

- **首屏**
  - 重组件动态导入（`next/dynamic`：recharts、canvas 动画、exceljs 相关导入路径）
  - 页面 Server Component 化，数据获取下移服务端
  - Suspense 流式渲染首屏关键内容
  - 公共依赖分包，避免单 bundle 过大
- **页面切换**
  - 侧边导航 `prefetch` 路由预加载
  - react-query 数据预取（`prefetchQuery`/hydration）、请求并行化，消除路由级请求瀑布
- **交互掉帧**
  - canvas 动画 rAF 循环生命周期管理（离开页面/组件卸载停止循环）
  - 高频更新节流（rAF 级）、稳定数组/对象引用避免大范围重渲染
- **服务端**
  - 聚合 API 用 `Promise.all` 并行化独立查询
  - N+1 查询合并为批量查询；缺失的查询列补 DB 索引
  - 合理设置 HTTP 缓存（如静态资源、不常变数据）

## 阶段 3：验证

- 修复前后对比：路由包体积（build 输出）、Lighthouse 分数、关键交互帧率
- 回归保障：`pnpm test`、`pnpm typecheck`、`pnpm lint` 全部通过
- 交付：性能优化前后对比报告

## 约束

- 不改变任何视觉与功能行为
- 遵循现有代码模式（App Router + Hono + Drizzle + react-query + Zustand）
- 不做清单外的无关重构
- 每项修复先有测量数据支撑，修复后复测验证
