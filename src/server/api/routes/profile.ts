import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import { user } from "@/db/schema/auth";
import { account } from "@/db/schema/auth";
import { z } from "zod";
import { cached, bust, ck } from "@/server/cache";
import { verifyPassword } from "better-auth/crypto";
import type { ProfileEnv } from "../env";

const routes = new Hono<ProfileEnv>();

routes.get("/", async (c) => {
  const u = c.get("user");
  const record = await cached(ck.profile(u.id), 600, async () => {
    const records = await db.select().from(user).where(eq(user.id, u.id));
    return records[0] ?? null;
  });
  return c.json({ data: record });
});

const updateSchema = z.object({
  name: z.string().optional(),
  displayName: z.string().optional(),
  title: z.string().optional(),
  timezone: z.string().optional(),
  defaultClassId: z.string().uuid().nullable().optional(),
});

routes.patch("/", async (c) => {
  const u = c.get("user");
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: { code: "INVALID", message: "参数不合法", details: parsed.error } }, 422);
  const [updated] = await db.update(user).set({ ...parsed.data, updatedAt: new Date() }).where(eq(user.id, u.id)).returning();
  await bust(ck.profile(u.id));
  return c.json({ data: updated });
});

routes.post("/verify-password", async (c) => {
  const u = c.get("user");
  const body = await c.req.json();
  const parsed = z.object({ password: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return c.json({ error: "密码不能为空" }, 400);
  const { password } = parsed.data;

  const accounts = await db
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, u.id), eq(account.providerId, "credential")));

  const hash = accounts[0]?.password;
  if (!hash) return c.json({ error: "未找到密码账户" }, 400);

  const valid = await verifyPassword({ hash, password });
  if (!valid) return c.json({ error: "密码错误" }, 400);

  return c.json({ verified: true });
});

export { routes as profileRoutes };
