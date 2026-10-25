import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import * as schema from "@/db/schema";

// 让 tsx 脚本（pnpm db:seed / db:pglite:migrate 等）也能读到 .env.local；
// Next 运行时已经注入环境变量，这里不会重复加载。
if (!process.env.DATABASE_URL && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // .env.local 不存在时忽略
  }
}

type Db = PostgresJsDatabase<typeof schema>;

type PgliteInstance = {
  db: Db;
  ready: Promise<void>;
};

const globalForDb = globalThis as unknown as {
  db: Db | undefined;
  pgClient: ReturnType<typeof postgres> | undefined;
  pglite: PgliteInstance | undefined;
};

const DUMMY_URL = "postgresql://dummy:dummy@localhost:5432/dummy";

/** 迁移 SQL 目录（drizzle-kit 生成，journal + *.sql），相对应用根目录 */
const MIGRATIONS_FOLDER = path.join(process.cwd(), "src", "db", "migrations");
/** 本地预览用的默认 PGlite 数据目录；已在 .gitignore 中忽略 */
const DEFAULT_PGLITE_DIR = ".data/pglite";

/**
 * 是否启用「仅开发用」的 PGlite 分支：
 * - DATABASE_URL 以 pglite: 开头（如 pglite://.data/pglite）
 * - 或显式设置 PGLITE=1
 *
 * 构建期（next build）强制关闭：build 会并行起多个 worker，共享同一个 PGlite 数据目录不安全，
 * 且构建期本就不该连库；此时回退到 postgres-js + DUMMY_URL 的原有逻辑。
 */
const pgliteEnabled =
  process.env.NEXT_PHASE !== "phase-production-build" &&
  (process.env.PGLITE === "1" || (process.env.DATABASE_URL ?? "").startsWith("pglite:"));

/** 从 DATABASE_URL / PGLITE_DATA_DIR 解析 PGlite 数据目录 */
function resolvePgliteDataDir(): string {
  const explicit = process.env.PGLITE_DATA_DIR;
  if (explicit) return path.resolve(explicit);

  const raw = (process.env.DATABASE_URL ?? "").trim();
  if (raw.startsWith("pglite:")) {
    let rest = raw.slice("pglite:".length);
    if (rest.startsWith("//")) rest = rest.slice(2);
    rest = rest.split(/[?#]/)[0] ?? "";
    if (rest) {
      try {
        return path.resolve(decodeURIComponent(rest));
      } catch {
        return path.resolve(rest);
      }
    }
  }
  return path.resolve(DEFAULT_PGLITE_DIR);
}

/**
 * 创建 PGlite 实例并在后台跑完迁移。
 *
 * 这里刻意用 createRequire 从应用根目录按需加载 @electric-sql/pglite：
 * 它是 devDependency，且运行时要从 node_modules 读取 .wasm 资源，静态 import 会被
 * Next 打包器内联导致 wasm 路径失效。只有 pglite 分支才会执行到这里，
 * 生产（postgres-js）路径完全不受影响。
 */
function createPglite(): PgliteInstance {
  const requireFromApp = createRequire(path.join(process.cwd(), "package.json"));
  const { PGlite: PGliteCtor } = requireFromApp("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
  const { drizzle: drizzlePglite } = requireFromApp("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
  const { migrate } = requireFromApp("drizzle-orm/pglite/migrator") as typeof import("drizzle-orm/pglite/migrator");

  const dataDir = resolvePgliteDataDir();
  // PGlite 只创建最后一级目录，父目录 .data 需要先建好
  mkdirSync(dataDir, { recursive: true });
  console.log(`[db] PGlite 开发模式已启用（pid=${process.pid}），数据目录：${dataDir}`);

  const client = new PGliteCtor(dataDir);
  const pgliteDb = drizzlePglite(client, { schema });

  // PGlite 内部按 FIFO 执行查询：这里先排队迁移，后续请求的查询自然排在后面。
  // 迁移失败不抛出（避免 dev server 因未处理的 rejection 崩溃），只打印日志。
  const ready = (async () => {
    await client.waitReady;
    await migrate(pgliteDb, { migrationsFolder: MIGRATIONS_FOLDER });
    console.log("[db] PGlite 迁移完成");
  })();

  // 兜底处理：dev server 里没人 await 这个 Promise，失败时只打印日志、不崩溃；
  // 同时保留 ready 的 rejected 状态，脚本可以 await 它拿到错误。
  ready.catch((err: unknown) => {
    console.error("[db] PGlite 初始化或迁移失败（可运行 pnpm db:pglite:migrate 重试）：", err);
  });

  return { db: pgliteDb as unknown as Db, ready };
}

function createClient() {
  if (!process.env.DATABASE_URL && !pgliteEnabled) {
    console.warn(
      "[db] DATABASE_URL not set — database operations will fail at runtime. " +
        "(Use DUMMY_URL only to allow module loading during build.)"
    );
  }
  // 生产路径保持原样：真正的 DATABASE_URL 原样使用；
  // 只有在构建期（PGlite 分支被禁用）遇到 pglite: 形式时才退回 DUMMY_URL，
  // 避免 postgres.js 解析非法连接串导致 next build 失败。
  const envUrl = process.env.DATABASE_URL;
  const url = envUrl && !envUrl.startsWith("pglite:") ? envUrl : DUMMY_URL;
  return postgres(url, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: url.includes("sslmode=require") ? "require" : false,
  });
}

let pgliteInstance: PgliteInstance | undefined;
let pgClient: ReturnType<typeof postgres> | undefined;
let db: Db;

if (pgliteEnabled) {
  // HMR / 多个模块图下复用实例：同一进程不能对同一数据目录开两个 PGlite
  const existingPglite = globalForDb.pglite;
  pgliteInstance = existingPglite ?? createPglite();
  globalForDb.pglite = pgliteInstance;
  if (existingPglite) {
    console.log(`[db] PGlite 实例复用（pid=${process.pid}）`);
  }
  db = pgliteInstance.db;
} else {
  pgClient = globalForDb.pgClient ?? createClient();
  db = globalForDb.db ?? drizzle(pgClient, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.pgClient = pgClient;
    globalForDb.db = db;
  }
}

/** PGlite 初始化 + 迁移完成的 Promise；非 PGlite 模式下为 undefined，供脚本等待 */
const pgliteReady = pgliteInstance?.ready;

export { db, pgClient, pgliteReady };
