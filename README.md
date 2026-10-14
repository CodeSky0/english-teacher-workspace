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
- 各模块支持 CSV 导入导出。

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
