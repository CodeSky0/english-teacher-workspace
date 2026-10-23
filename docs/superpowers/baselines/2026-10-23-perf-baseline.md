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
