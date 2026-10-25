/**
 * 本地预览环境一键初始化（仅开发用）：
 *   1) 可选清空 .data/pglite（--reset，用于数据目录损坏后重来）
 *   2) 建表（迁移）
 *   3) 用 better-auth 的密码哈希直接在库里创建/修复演示账号
 *   4) 把演示账号信息写到 .data/demo-user.json，供 seed 脚本读取
 *
 * 注意：PGlite 是单进程内嵌 Postgres，同一数据目录同一时间只能有一个进程打开。
 * 运行本脚本前请先停掉 pnpm dev。
 *
 * 用法：
 *   pnpm preview:bootstrap            # 不清数据，只补建账号
 *   pnpm preview:bootstrap -- --reset # 清空 .data/pglite 后重建（推荐）
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const shouldReset = args.has("--reset");
const DEMO = {
  email: process.env.DEMO_EMAIL || "teacher@demo.local",
  password: process.env.DEMO_PASSWORD || "demo1234",
  name: process.env.DEMO_NAME || "李老师",
};
const dataDir = path.resolve(process.env.PGLITE_DATA_DIR || ".data/pglite");

if (shouldReset) {
  try {
    rmSync(dataDir, { recursive: true, force: true });
  } catch (err) {
    console.error("✗ 删除 " + dataDir + " 失败（多半是 dev server 还开着，PGlite 文件被占用）。请先停掉 pnpm dev 再试。", err);
    process.exit(1);
  }
  console.log("✓ 已重置 PGlite 数据目录：" + dataDir);
}
mkdirSync(dataDir, { recursive: true });

// 先动态 import，避免在清目录前就打开 PGlite
const { db, pgliteReady } = await import("@/server/db");
const schema = await import("@/db/schema");
const { eq } = await import("drizzle-orm");
const { hashPassword } = await import("better-auth/crypto");

if (!pgliteReady) {
  console.error("✗ 当前不是 PGlite 模式：请确认 .env.local 中 DATABASE_URL 以 pglite: 开头（或设置 PGLITE=1）");
  process.exit(1);
}
try {
  await pgliteReady;
} catch (err) {
  console.error("✗ PGlite 迁移失败：", err);
  process.exit(1);
}

const passwordHash = await hashPassword(DEMO.password);

const existingUsers = await db.select().from(schema.user).where(eq(schema.user.email, DEMO.email));
let userId: string;

if (existingUsers.length > 0) {
  userId = existingUsers[0].id;
  await db
    .update(schema.user)
    .set({ name: DEMO.name, emailVerified: true, updatedAt: new Date() })
    .where(eq(schema.user.id, userId));
  console.log("✓ 演示账号已存在，已更新姓名：" + DEMO.email);
} else {
  userId = randomUUID();
  await db.insert(schema.user).values({
    id: userId,
    name: DEMO.name,
    email: DEMO.email,
    emailVerified: true,
    timezone: "Asia/Shanghai",
  });
  console.log("✓ 已创建演示账号：" + DEMO.email);
}

// credential 账号：accountId 与 userId 相同，password 用 better-auth 默认哈希（scrypt）
const existingAccounts = await db.select().from(schema.account).where(eq(schema.account.userId, userId));
const credentialAccount = existingAccounts.find((a) => a.providerId === "credential");
if (credentialAccount) {
  await db
    .update(schema.account)
    .set({ password: passwordHash, updatedAt: new Date() })
    .where(eq(schema.account.id, credentialAccount.id));
} else {
  await db.insert(schema.account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
  });
}
console.log("✓ 密码已设置为：" + DEMO.password);

const info = { id: userId, email: DEMO.email, password: DEMO.password, name: DEMO.name };
mkdirSync(".data", { recursive: true });
writeFileSync(path.resolve(".data", "demo-user.json"), JSON.stringify(info, null, 2), "utf8");

console.log("");
console.log("USER_ID=" + userId);
console.log("下一步：SEED_USER_ID=" + userId + " pnpm db:seed:preview");
process.exit(0);
