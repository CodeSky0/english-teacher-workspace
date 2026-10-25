# 视觉效果升级方向 · Washi Aurora（和纸流光）

> 目标：把当前「克制精致的和纸风」推进到「令人震撼」的层次。
> 保持既有品牌基底（暖羊皮纸 #f9f8f5 / 梅色 #c56473 / 和色），不推翻重来；
> 通过 **氛围层、材质层、光效层、动效层、数据可视化、排版对比度** 六个维度做加法和精修。

## 一、总体气质

- 关键词：**和纸 · 极光 · 釉光 · 墨流 · 呼吸**。
- 观感目标：页面像一张会呼吸的宣纸，背后有极缓流动的彩色光晕；卡片有厚度与釉面反光；
  数字有金属般的渐变光泽；交互有弹性与聚光。
- 禁忌：霓虹赛博风、纯黑背景、刺眼的纯饱和色、满屏动画（每屏 ≤ 3 处持续动效）。

## 二、六层视觉体系（必须跨页面一致）

### 1. 氛围层（Ambient）
- 固定层 `.ambient`：4 个大尺寸径向渐变光斑（梅 / 縹蓝 / 若竹 / 朽葉），超慢漂移（46–74s，alternate）。
- 顶部天光 `.ambient__beam`：柔和白色椭圆光，mix-blend-mode: soft-light。
- 边缘暗角 `.ambient__vignette`：极淡，聚焦内容。
- 和纸噪点保留在 body 背景。

### 2. 材质层（Material）
- 纸（默认卡片）、玻璃（顶栏 / 侧栏 / 浮层）、釉面（强调卡、统计卡）。
- 所有卡片：`edge-lit` 渐变描边 + `inner-lit` 内高光 + `surface` 阴影。
- 强调卡可用 `.glaze`（釉面：顶部高光 + 色彩微渐变 + 更强描边）。

### 3. 光效层（Light）
- `.spotlight`：鼠标跟随的柔光（全局单监听，CSS 变量 `--mx/--my`）。
- `text-gradient-* `：标题渐变（梅→縹→若竹）。
- 数字高光：大数字用 `--font-display`（Cormorant Garamond）+ 渐变 + tabular-nums。
- 焦点元素带梅色光晕 `shadow-glow`。

### 4. 动效层（Motion）
- 入场：`animate-fade-in-up` / 错峰 `stagger`（`--i`）。
- 滚动驱动显现：`.reveal`（animation-timeline: view()，Chromium 原生，无需 JS）。
- 悬浮：卡片 -2px 抬升 + 阴影加深 + 聚光；按钮光泽扫过。
- 持续动效：极光漂移、呼吸光斑（每屏 ≤ 3 处）。
- 数字滚动：`<CountUp />`。
- 必须尊重 `prefers-reduced-motion`。

### 5. 数据可视化
- 迷你 sparkline（SVG 手绘，渐变填充 + 发光描边）。
- 环形进度 `<ProgressRing />`（渐变 stroke + 圆角线帽）。
- Recharts 图表统一：渐变面积填充、发光折线、玻璃 tooltip、隐藏多余网格。
- 排行 / 分布用横向进度条 + 渐变色阶，替代纯表格数字。

### 6. 排版层（Typography）
- 字阶拉开：页面大标题 28–32px 衬线；Hero 40–56px。
- 英文小标：`tracking-[0.22em]` 大写 10–11px，neutral-5。
- 数字：`--font-display`（Cormorant Garamond）或 tabular-nums，强调时用渐变。
- 中英混排：英文用 display serif 做点缀（呼应「英语」主题）。

## 三、共享基础设施（Lead 维护，其他人直接使用，勿改）

| 资源 | 位置 | 说明 |
| --- | --- | --- |
| 氛围层 | `src/components/common/ambient.tsx` | 全局固定光晕层 |
| 鼠标聚光 | `src/components/common/pointer-glow.tsx` | 给任意元素加 `spotlight` 类即可 |
| 数字滚动 | `src/components/common/count-up.tsx` | `<CountUp value={123} />` |
| 迷你趋势 | `src/components/charts/sparkline.tsx` | `<Sparkline data={[..]} />` |
| 环形进度 | `src/components/charts/progress-ring.tsx` | `<ProgressRing value={86} />` |
| 工具类 | `src/app/globals.css` | `.ambient` `.spotlight` `.reveal` `.glaze` `.halo` `.text-gradient-aurora` `.glass` `.edge-lit` … |

## 四、分工与文件边界

- **Lead**：设计系统（globals.css / tokens）、共享 UI 原子（card/button/badge/states/input/dialog）、
  外壳（app-shell/sidebar/topbar/page-header）、总览页。
- **shell-auth**：登录 / 注册页 + AuthBrandPanel。
- **data-viz**：学情分析（grades/analytics-panel/score-distribution）、学生管理、作业、听写成绩相关可视化。
- **feature-pages**：学期规划、课表、备课、教研、词汇、听写、资源库、AI、设置、帮助、课堂互动。

## 五、验收标准

1. 截图对比（`node scripts/shots.mjs <label>`）：每页桌面 1440×900。
2. 首屏必须有 ≥ 1 个「哇」点（Hero / 图表 / 动效 / 光效）。
3. 不出现布局跳动、文字截断、对比度不足（正文对比 ≥ 4.5:1）。
4. `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build` 全绿。
5. 页面滚动流畅（无长列表 box-shadow 动画）。
