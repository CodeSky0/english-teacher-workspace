# 本地预览与截图环境（PGlite + Playwright）

> 目标：本机没有 PostgreSQL / Docker 时，也能把完整 dashboard 跑起来，并生成可前后对比的截图。
> 面向：视觉改版、交互调整后的自查；也可作为 CI 之外的本地回归手段。

## 1. 一次性搭建

```powershell
cd D:/68
pnpm install
pnpm preview:setup      # 重置 .data/pglite → 跑迁移 → 建演示账号 → 灌示例数据
```

`preview:setup` 会依次执行：

1. `scripts/preview-bootstrap.ts --reset`：清空 `.data/pglite`，用 `src/db/migrations` 建表，并用 better-auth 的 `hashPassword` 直接写入演示账号（不依赖 HTTP）；
2. `scripts/seed-preview.ts`：先跑仓库自带的 `pnpm db:seed`，再补充课表 / 学期周计划 / 听写词与批改结果 / 考试成绩 / 课堂积分 / 考勤等。

`.env.local` 已配置好（不入库）。若需要重建，见第 7 节。

## 2. 启动开发服务器

```powershell
pnpm dev      # http://localhost:3000
```

- 日志里出现 `[db] PGlite 开发模式已启用（pid=xxxx），数据目录：.../pglite` 和 `[db] PGlite 迁移完成` 即为正常。
- 健康检查：`GET /api/health` 返回 `{"ok":true,"checks":{"db":"ok","redis":"skip"}}`（未配置 Redis 时 redis=skip，缓存会自动降级为直连，不影响功能）。
- 首次请求需要初始化 PGlite（约 1~3 秒），之后是内存级速度。

## 3. 截图

```powershell
pnpm shots baseline                         # 输出到 shots/baseline/
pnpm shots latest                           # 输出到 shots/latest/
node scripts/shots.mjs my-change            # 自定义 label
$env:SHOT_ONLY="overview,grades"; pnpm shots latest   # 只截指定页面
```

产物：

| 视口 | 页面 | 文件名 |
| --- | --- | --- |
| 1440x900 | login、register + 15 个 dashboard 页面（overview/semester/schedule/plans/research/students/homework/grades/classroom/vocab/dictation/resources/ai/settings/help） | `shots/<label>/<page>-desktop.png`（17 张） |
| 390x844 | overview、login | `shots/<label>/<page>-mobile.png`（2 张） |

另外会写 `shots/<label>/manifest.json`：记录每张图的最终 URL、页面文字长度、SVG/canvas 数量、控制台错误、是否被重定向到 login，方便判断「是不是空白页 / 是不是没登录」。

截图稳定策略（`scripts/shots.mjs`）：

- 复用一次登录：通过 `POST /api/auth/sign-in/email` 拿 cookie 写成 `.data/shots-state.json`（storageState），不依赖登录页 DOM；
- `emulateMedia({ reducedMotion: "reduce", colorScheme: "light" })`；
- 等待 `document.fonts.ready`、`load` + `networkidle`、骨架屏/加载圈消失；
- 页面内滚动到底再回顶，触发懒加载与进入动画，然后回到顶部；
- `caret: "hide"` + 注入 `caret-color: transparent`，`animations: "disabled"`；
- 隐藏 Next.js 开发浮层（`nextjs-portal`），避免 dev 指示器污染截图；
- 预置 `workspace.currentClassId`（localStorage + `classId` cookie），保证课表/学情等「按班级」页面不是空态。

对比两次改版：直接比较 `shots/before/<page>-desktop.png` 与 `shots/after/<page>-desktop.png`。

## 4. 演示账号

| 项目 | 值 |
| --- | --- |
| 邮箱 | `teacher@demo.local` |
| 密码 | `demo1234` |
| 姓名 | 李老师 |
| user.id | 见 `.data/demo-user.json`（每次 `pnpm preview:setup` 重建会变化） |

登录后可访问 `/dashboard/overview` 等全部页面。注册页 `/register` 也可用（`ALLOW_REGISTER=1`）。

## 5. 数据相关命令

| 命令 | 作用 | 需要先停 dev？ |
| --- | --- | --- |
| `pnpm preview:setup` | 重置 + 迁移 + 建账号 + 灌种子数据（一条龙） | 是 |
| `pnpm preview:bootstrap -- --reset` | 清空 PGlite 并重建表 + 演示账号 | 是 |
| `pnpm preview:bootstrap` | 不动数据，只补建/修复演示账号密码 | 是 |
| `pnpm db:seed:preview` | 跑 `db:seed` + 补充预览数据（幂等） | 是 |
| `pnpm preview:status` | 打印各表行数 + 校验演示账号密码 | 是 |
| `pnpm db:pglite:migrate` | 只跑迁移 | 是 |

> ⚠️ **PGlite 是单进程内嵌 Postgres：同一数据目录同一时间只能有一个进程打开。**
> dev server 开着的时候跑上面任何脚本，都可能让数据库进入 `RuntimeError: Aborted()` 的坏状态。
> 正确顺序始终是：**停 dev → 跑数据脚本 → 起 dev**。

## 6. 已知限制

1. **单进程独占**（最重要）：dev server 与数据脚本不能同时打开 `.data/pglite`；也不要同时起两个 dev server。
2. **仅开发用**：`src/server/db.ts` 的 PGlite 分支只在 `DATABASE_URL` 以 `pglite:` 开头（或 `PGLITE=1`）且**非构建期**时启用；`next build` 期间强制走原来的 postgres-js + DUMMY_URL 逻辑，生产路径行为不变。
3. **性能与并发**：PGlite 是 WASM 版 Postgres，单连接、无真实并发；只适合本地预览，不能当生产库。
4. **数据不持久化到仓库**：`.data/`（PGlite 数据 + 登录态）与 `shots/` 都已加入 `.gitignore`。
5. **截图视口固定**：只覆盖 1440x900 与 390x844；响应式断点（sm/md/lg/xl）只用这两个视口抽样。
6. **图表/动画**：截图用 `animations: "disabled"` + reducedMotion，颜色与布局稳定，但「动画过程」本身不在截图里。
7. **Redis 未配置**：`/api/health` 里 redis=skip，缓存层自动降级为直连；不影响截图，但 overview 缓存语义与线上略有差异。
8. **PGlite 迁移**：依赖 `src/db/migrations/meta/_journal.json` 与对应 `*.sql`；改了 schema 后要先 `pnpm db:generate` 生成新迁移，再 `pnpm preview:bootstrap -- --reset`。
9. **端口**：默认 3000；如被占用，Next 会换端口，此时截图要设 `SHOT_BASE_URL` 指向实际地址。

## 7. 环境变量（.env.local，不入库）

```ini
# 本地 PGlite（WASM Postgres，无需安装服务）
DATABASE_URL=pglite://.data/pglite

# Better Auth（secret 需 >= 32 字符）
BETTER_AUTH_SECRET=<至少 32 位的随机串>
BETTER_AUTH_URL=http://localhost:3000

ALLOW_REGISTER=1
APP_TIMEZONE=Asia/Shanghai
```

生成 secret 示例：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 8. 故障排查

| 现象 | 原因 / 处理 |
| --- | --- |
| `/api/health` 返回 503，checks.db=fail | PGlite 打不开：多半是另一个进程占着数据目录，或数据目录损坏。停掉所有 dev / tsx 进程后执行 `pnpm preview:setup` |
| 日志出现 `RuntimeError: Aborted()` | 同上（并发打开导致数据目录损坏），需要重置数据目录 |
| 截图 17 张全是 login 页面 | 演示账号登录失败：确认已跑 `pnpm preview:setup`、`.env.local` 的 `BETTER_AUTH_URL` 与访问地址一致；看 `shots/<label>/manifest.json` 里的 login 报错 |
| 页面能开但列表全是空态 | 没灌预览数据，或 `classId` cookie 未生效；先 `pnpm preview:status` 看行数 |
| `pnpm preview:setup` 报删除目录失败 | dev server 还开着，PGlite 文件被占用；先停 dev |
| `pnpm dev` 起不来 / 端口占用 | 停掉旧的 dev 进程再起；确认只有一个 dev server |
| 截图脚本报 `Executable doesn't exist ... chromium_headless_shell` | 本机 Playwright 与已下载浏览器版本不匹配。脚本会自动回退到系统 Chrome；也可执行 `pnpm exec playwright install chromium` 补齐 |
| 截图后 `/api/health` 变成 503 | dev server 被强杀导致 PGlite 未正常关闭：停掉所有进程后执行 `pnpm preview:setup` 重建数据 |

## 9. 相关文件

| 文件 | 说明 |
| --- | --- |
| `src/server/db.ts` | PGlite 开发分支 + 自动迁移（生产仍走 postgres-js） |
| `scripts/preview-bootstrap.ts` | 重置数据目录 / 迁移 / 建演示账号 |
| `scripts/seed-preview.ts` | 基础 seed + 预览数据 |
| `scripts/preview-status.ts` | 数据体检 |
| `scripts/pglite-migrate.ts` | 只跑迁移 |
| `scripts/shots.mjs` | Playwright 截图脚本 |
| `.data/pglite` | PGlite 数据目录（忽略提交） |
| `shots/<label>` | 截图产物（忽略提交） |
