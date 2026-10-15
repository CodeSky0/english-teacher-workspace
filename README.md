# 英语教师工作台 (English Teacher Workspace)

中小学英语教师备课、教学、教研、学情分析一体化全栈工作台。

## 技术栈

- **前端**: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS
- **后端 API**: Hono (通过 Next.js Route Handlers 集成)
- **认证**: Better Auth (邮箱+密码)
- **数据库**: PostgreSQL + Drizzle ORM
- **缓存/限流**: Redis (Upstash, serverless 友好)
- **图表**: Recharts
- **测试**: Vitest (单元) + Playwright (E2E)

## 运行环境

- Node.js >= 20
- pnpm >= 10
- PostgreSQL (本地 / Neon / Vercel Postgres / Supabase)
- Redis (本地 / Upstash)

## 依赖安装

```bash
pnpm install
```

## 数据库配置

1. 复制环境变量文件：

```bash
cp .env.example .env
```

2. 编辑 `.env`，填入你的 PostgreSQL 连接串和 Redis 配置：

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
KV_REST_API_URL=https://your-upstash.upstash.io
KV_REST_API_TOKEN=your-upstash-token
BETTER_AUTH_SECRET=your-secret-key-at-least-32-chars
```

### 本地 Docker 开发（可选）

如果本机有 Docker，可用 docker-compose 启动 PostgreSQL 和 Redis：

```bash
docker compose up -d
# 此时 DATABASE_URL=postgresql://etw:etw_dev_pass@localhost:5432/etw_dev
```

## 初始化数据库

```bash
# 生成迁移文件
pnpm db:generate

# 执行迁移
pnpm db:migrate

# 初始化示例数据（需要先注册账户，然后设置 SEED_USER_ID）
SEED_USER_ID=your-user-id pnpm db:seed
```

## 启动开发服务器

```bash
pnpm dev
```

浏览器访问 http://localhost:3000

## 执行测试

```bash
# 单元测试
pnpm test

# E2E 测试（需要先启动开发服务器）
pnpm test:e2e

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
```

## 生成生产构建

```bash
pnpm build
pnpm start
```

## 部署 (Vercel)

1. 将项目推送到 GitHub。
2. 在 Vercel 导入项目。
3. 配置环境变量（DATABASE_URL, KV_REST_API_URL, KV_REST_API_TOKEN, BETTER_AUTH_SECRET 等）。
4. 推送代码自动部署。

### 推荐的 Serverless 数据库

- **PostgreSQL**: [Neon](https://neon.tech) 或 Vercel Postgres
- **Redis**: [Upstash](https://upstash.com)

## 备份与恢复

- 在「设置」页面点击「导出 JSON 备份」可下载全量数据。
- 点击「导入 JSON 备份」可恢复数据，支持追加和覆盖两种模式。

## Excel 导入导出

- **学生管理**：导入 Excel / CSV 批量建学生档案，支持「追加」与「追加并更新」（按学号或姓名匹配），可下载导入模板、导出班级名单。
- **词汇中心**：按单元导入单词（可边导入边新建单元），支持导出单个单元或全部词汇。
- **听写词表**：单词可手动添加、Excel 导入，也可从词汇单元一键导入。
- **听写成绩导出**：导出「成绩汇总 + 逐词明细」两个工作表；另可导出班级「历次听写正确率汇总」。

表头支持中英文混写（如 `姓名` / `name` / `学号` / `student_no`），解析后会在导入前给出预览，错误行可一键跳过。

| 模块 | 导入 | 导出 | 模板 |
| --- | --- | --- | --- |
| 学生 | `.xlsx` / `.csv` | 班级名单 | 学生名单 |
| 词汇单词 | `.xlsx` / `.csv` | 单元 / 全部 | 词汇表 |
| 听写单词 | `.xlsx` / `.csv` / 词汇单元 | — | 听写词表 |
| 听写成绩 | 页面内录入 | 汇总 + 明细 / 历次汇总 | — |

## 听写成绩录入

1. 在「听写词表」中新建词表并关联班级，导入或添加单词。
2. 切到「成绩录入」页签，选择班级后点击格子循环切换：正确 → 错误 → 未批改。
3. 支持按学生「全对 / 清空」、全班「全对 / 清空」，改动约 0.4 秒后自动保存。
4. 表头显示每个词的错误次数，右侧显示学生正确数与正确率。
5. 点击「导出成绩」得到 Excel（成绩汇总 + 明细两个工作表）。

## 多班级总览

「总览」页汇总所有班级：各班人数、听写次数、平均正确率、最近一次听写；今日课表、最近听写、
高频错词 TOP 10 以及教学数据概况，适合同时带多个班的教师快速掌握全局。

## 常见问题

**Q: 数据保存在哪里？**
A: 所有数据保存在服务器端的 PostgreSQL 数据库中，登录后自动同步。

**Q: 更换电脑后数据还在吗？**
A: 是的，只需登录同一账户即可访问全部数据。

**Q: 如何初始化示例数据？**
A: 注册账户后，在设置页面点击「初始化示例数据」。

**Q: AI 功能如何使用？**
A: 不配置 AI API Key 时使用本地模板生成；配置后可调用 AI 模型。

## 项目结构

```
src/
  app/           # Next.js App Router 页面和 API 路由
  components/    # React 组件 (layout, ui, common)
  server/        # 服务端代码 (auth, api, db, redis)
  db/            # 数据库 Schema、迁移、Seed
  lib/           # 工具函数
  stores/        # Zustand 状态管理
```
