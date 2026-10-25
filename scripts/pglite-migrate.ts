/**
 * 初始化 / 迁移本地 PGlite 数据库（仅开发用，不连真实 Postgres）。
 *
 * 用法：pnpm db:pglite:migrate
 *
 * 说明：src/server/db.ts 在 PGlite 模式下首次被 import 时会自动跑迁移，
 * 这个脚本用于首次搭建或迁移失败时手动重试/排查。
 */
import { sql } from "drizzle-orm";
import { db, pgliteReady } from "@/server/db";
import { user } from "@/db/schema";

async function main() {
  if (!pgliteReady) {
    console.error(
      "✗ 当前不是 PGlite 模式：请在 .env.local 里把 DATABASE_URL 设为 pglite://.data/pglite（或设置 PGLITE=1）"
    );
    process.exit(1);
  }

  try {
    await pgliteReady;
  } catch (err) {
    console.error("✗ PGlite 迁移失败：", err);
    process.exit(1);
  }

  // 迁移失败时不抛错（dev server 需要存活），所以这里再核对一次表是否真的建好了
  try {
    await db.execute(sql`select 1 from ${user} limit 1`);
  } catch (err) {
    console.error("✗ PGlite 表结构缺失，迁移可能未成功：", err);
    process.exit(1);
  }

  console.log("✓ PGlite 数据库已就绪（.data/pglite）");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
