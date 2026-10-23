# 网页性能优化实施计划（体检先行）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按数据驱动的「诊断 → 修复 → 验证」流程优化英语教师工作台的首屏加载、页面切换与交互帧率。

**Architecture:** 先建立构建体积与运行时性能基线，再做静态代码审计定位瓶颈，按「收益/风险比」逐项修复并复测验证。所有修复不改变视觉与功能行为。

**Tech Stack:** Next.js 16 (App Router)、React 19、TanStack Query、Drizzle/PostgreSQL、chrome-devtools MCP（测量）。

**Spec:** `docs/superpowers/specs/2026-10-23-web-performance-design.md`

**预审计已知事实**（已由计划编写者确认，供执行者参考）：
- `recharts` 在 `src/` 中无任何导入（已安装未使用，不进 bundle，记录即可）
- `src/lib/excel/client.ts` 不含 exceljs，客户端导出走 API 下载，无重包风险
- `src/server/api/routes/overview.ts` 已用 `Promise.all` + 90s Redis 缓存
- `src/components/classroom/dragon-rollcall.tsx`、`thunder-drum.tsx` 已无人引用（死代码，不影响 bundle）
- `src/app/dashboard/classroom/page.tsx:20` 与 `src/app/classroom/page.tsx:14` **静态导入** `nebula-rollcall`（38KB canvas 组件）→ Task 4 修复

---

### Task 1: 构建基线测量

**Files:**
- Create: `docs/superpowers/baselines/2026-10-23-perf-baseline.md`

- [ ] **Step 1: 运行生产构建**

Run: `pnpm build`
Expected: 构建成功，输出各路由的 Size / First Load JS 表格

- [ ] **Step 2: 记录路由体积基线**

创建 `docs/superpowers/baselines/2026-10-23-perf-baseline.md`，写入构建输出中的完整路由体积表，并标注：
- First Load JS 最大的 3 个共享 chunk 及其来源（构建输出中 `First Load JS shared by all` 部分）
- 构建产物中的警告（如有）

```markdown
# 性能基线（2026-10-23）

## 路由 First Load JS（修复前）
<!-- 粘贴 pnpm build 输出的路由表 -->

## 共享 chunk
<!-- 粘贴 shared chunks 部分 -->

## 已知事实
- recharts 未使用；dragon-rollcall/thunder-drum 为死代码（不影响 bundle）
```

- [ ] **Step 3: 提交基线**

```bash
git add docs/superpowers/baselines/2026-10-23-perf-baseline.md
git commit -m "chore: 记录性能优化前构建基线"
```

---

### Task 2: 运行时基线测量（Lighthouse / Performance）

**Files:**
- Modify: `docs/superpowers/baselines/2026-10-23-perf-baseline.md`（追加运行时数据）

- [ ] **Step 1: 启动生产服务器**

Run: `pnpm start`（后台运行）
Expected: `http://localhost:3000` 可访问。
**降级处理**：若因缺少 `.env`/数据库无法启动，则改为 `pnpm dev` 并在基线文档注明「dev 模式测量，数值偏高仅供参考」，继续下一步。

- [ ] **Step 2: 测量公开页 `/login`**

使用 chrome-devtools MCP：`new_page` 打开 `http://localhost:3000/login` → `lighthouse_audit` 收集 FCP/LCP/TBT/CLS。

- [ ] **Step 3: 测量仪表盘页（需登录）**

在浏览器中登录（若本地无账户，先在 `/register` 注册，再 `pnpm db:seed` 可选）。依次对以下页面执行 `lighthouse_audit` 与 `performance_start_tra` 交互追踪：
- `/dashboard/overview`
- `/dashboard/classroom`（进入后触发随机点名动画，录制 5 秒交互追踪观察帧率）
- `/dashboard/dictation`（点击若干格子录制交互追踪）

每页记录：FCP、LCP、TBT、交互追踪中的长任务（>50ms）数量。

- [ ] **Step 4: 追加基线文档并提交**

在基线文档追加 `## 运行时基线（修复前）` 小节，记录上述数值与长任务清单。

```bash
git add docs/superpowers/baselines/2026-10-23-perf-baseline.md
git commit -m "chore: 记录性能优化前运行时基线"
```

---

### Task 3: 静态代码审计

**Files:**
- Modify: `docs/superpowers/baselines/2026-10-23-perf-baseline.md`（追加审计结论）

- [ ] **Step 1: 审计重依赖静态导入**

逐项执行以下搜索（Grep），确认结果并记录：

| 搜索模式 | 关注点 |
|---|---|
| `from ["']recharts|@tanstack/react-table|@dnd-kit/core|exceljs` | 是否被客户端组件顶层静态导入 |
| `"use client"` 文件中 `import` 服务端模块 | 客户端误引服务端代码 |
| `src/components/classroom/.*rollcall|thunder-drum` 的 import 引用 | 确认死代码无引用 |
| `src/server/api/routes/*.ts` 中连续多行 `await `（无 `Promise.all` 包裹） | 服务端串行请求瀑布 |

- [ ] **Step 2: 审计路由级数据获取瀑布**

检查每个 `src/app/dashboard/*/page.tsx`：页面是否为 `"use client"` 且 `useQuery` 串行依赖（如先 `useClasses` 再发起依赖 classId 的查询）。记录存在两级以上请求瀑布的页面清单。

- [ ] **Step 3: 记录审计结论并提交**

在基线文档追加 `## 静态审计结论` 小节：每条发现标注「已确认/误报」+ 对应修复模式编号（见附录 A）。

```bash
git add docs/superpowers/baselines/2026-10-23-perf-baseline.md
git commit -m "chore: 记录静态审计结论"
```

---

### Task 4: 修复 — 动态导入 NebulaRollCall

两个 classroom 页面仅在 `activeTool === "rollcall"` 时渲染动画组件，38KB canvas 代码应按需加载。

**Files:**
- Modify: `src/app/classroom/page.tsx:14`
- Modify: `src/app/dashboard/classroom/page.tsx:20`

- [ ] **Step 1: 改为 next/dynamic 导入（dashboard 页）**

将 `src/app/dashboard/classroom/page.tsx:20` 的：

```tsx
import { NebulaRollCall } from "@/components/classroom/nebula-rollcall";
```

替换为（置于其他静态 import 之后、组件定义之前的模块顶层）：

```tsx
const NebulaRollCall = dynamic(
  () => import("@/components/classroom/nebula-rollcall").then((m) => m.NebulaRollCall),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-muted">
        正在准备点名动画…
      </div>
    ),
  },
);
```

并在文件顶部 import 中确认包含 `import dynamic from "next/dynamic";`（若无则添加）。

- [ ] **Step 2: 同样修改 `/classroom` 页**

对 `src/app/classroom/page.tsx:14` 执行 Step 1 相同的替换。

- [ ] **Step 3: 验证**

Run: `pnpm typecheck`
Expected: 无错误
Run: `pnpm build`
Expected: 构建成功；`/classroom` 与 `/dashboard/classroom` 路由的 First Load JS 较 Task 1 基线下降，新增一个按需 chunk

- [ ] **Step 4: 提交**

```bash
git add src/app/classroom/page.tsx src/app/dashboard/classroom/page.tsx
git commit -m "perf: 按需加载神龙点名动画组件"
```

---

### Task 5: 诊断驱动的补充修复

**Files:** 以 Task 1-3 的审计结论为准，动到的文件在执行时确定。

**决策门**：仅当审计/测量确认了对应问题才执行，每个修复独立提交。修复模式见附录 A，代码以附录为准。
- [ ] **Step 1:** 逐条核对基线文档 `## 静态审计结论` 与运行时长任务清单
- [ ] **Step 2:** 对每条「已确认」的发现，按附录 A 对应模式实施修复；实施前用基线数据预估收益，预估收益低于 10KB bundle 或 100ms LCP 的问题记录为「不修」并说明理由（YAGNI）
- [ ] **Step 3:** 每项修复后运行 `pnpm typecheck` + `pnpm test`，全绿后单独提交：

```bash
git add <修改的文件>
git commit -m "perf: <具体修复项>"
```

---

### Task 6: 验证与对比报告

**Files:**
- Modify: `docs/superpowers/baselines/2026-10-23-perf-baseline.md`（追加修复后数据）
- Create: `docs/superpowers/reports/2026-10-23-perf-report.md`

- [ ] **Step 1: 复测构建体积**

Run: `pnpm build`
将修复后路由表追加到基线文档 `## 路由 First Load JS（修复后）` 小节，与修复前逐路由对比。

- [ ] **Step 2: 复测运行时指标**

按 Task 2 相同方法复测 `/login`、`/dashboard/overview`、`/dashboard/classroom`（含点名动画交互）、`/dashboard/dictation`，追加 `## 运行时基线（修复后）` 小节。

- [ ] **Step 3: 回归保障**

Run: `pnpm test`
Expected: 全部 PASS
Run: `pnpm typecheck`
Expected: 无错误
Run: `pnpm lint`
Expected: 无错误

- [ ] **Step 4: 撰写对比报告**

创建 `docs/superpowers/reports/2026-10-23-perf-report.md`：每个修复项一行「问题 → 措施 → 修复前数值 → 修复后数值 → 结论」；列出「发现但不修」的项及理由。

- [ ] **Step 5: 提交**

```bash
git add docs/superpowers/baselines/2026-10-23-perf-baseline.md docs/superpowers/reports/2026-10-23-perf-report.md
git commit -m "docs: 性能优化前后对比报告"
```

---

## 附录 A：修复模式

### A1 重组件动态导入（客户端重组件，如 canvas 动画、对话框）

```tsx
import dynamic from "next/dynamic";

const HeavyComp = dynamic(
  () => import("@/components/x/heavy-comp").then((m) => m.HeavyComp),
  {
    ssr: false, // 组件依赖 window/canvas 时
    loading: () => <div className="text-sm text-muted">加载中…</div>,
  },
);
```

适用条件：组件 >20KB 且首屏渲染非必需。参照 Task 4 已有实现。

### A2 服务端串行 await 并行化（API 路由内相互独立的查询）

```tsx
// 修复前：串行瀑布
const classes = await db.select()...;
const students = await db.select()...;

// 修复后：并行
const [classes, students] = await Promise.all([
  db.select()...,
  db.select()...,
]);
```

约束：仅合并相互独立的查询；有依赖关系的查询保持原序。

### A3 canvas rAF 循环可见性暂停（动画离开视口后仍空转耗电）

在 rAF 循环内用 IntersectionObserver 标志位短路（`nebula-rollcall.tsx` 已实现 `observer.disconnect()` 清理，若其他动画组件缺失此模式则照搬）：

```tsx
let visible = true;
const observer = new IntersectionObserver(([e]) => {
  visible = e.isIntersecting;
  if (visible && raf == null) {
    raf = requestAnimationFrame(frame);
  }
}, { threshold: 0.05 });
observer.observe(canvas);

// frame 内部：
// if (!visible) { raf = null; return; }  // 不再排下一帧，恢复时由 observer 重新启动
```

### A4 react-query 请求瀑布消除（页面内串行依赖查询）

同页面相互独立的 `useQuery` 无需合并；仅当 B 查询依赖 A 结果时，检查 B 是否可由服务端一次返回（后端合并接口）或用 `enabled` 显式声明依赖避免额外渲染循环：

```tsx
const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: ... });
const { data: detail } = useQuery({
  queryKey: ["detail", classes?.[0]?.id],
  queryFn: () => apiClient.get(`/detail?classId=${classes![0].id}`),
  enabled: !!classes?.[0]?.id, // 避免 classes 未就绪时空请求
});
```

若瀑布不可避免且页面为切换单元（如听写页），考虑在 `staleTime` 内复用缓存（现有 `["overview", tz]` 的 `staleTime: 90_1000` 模式）。

---

## 自审记录

- **Spec 覆盖**：spec 阶段 1（诊断）→ Task 1/2/3；阶段 2（修复）→ Task 4/5 + 附录 A；阶段 3（验证）→ Task 6。三个热点页（overview/dictation/classroom+点名）均已列入测量清单。✅
- **占位符扫描**：Task 5 为显式决策门，所有修复均指向附录 A 的完整代码模式，无 TBD/TODO。✅
- **类型一致性**：Task 4 的动态导入写法与项目现有 4 处 `dynamic()` 用法一致（`import-dialog`、`sortable-cards`）。✅
