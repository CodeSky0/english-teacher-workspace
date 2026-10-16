import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { user } from "@/db/schema/auth";
import { z } from "zod";
import { cached, bust, ck } from "@/server/cache";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

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

export { routes as profileRoutes };
