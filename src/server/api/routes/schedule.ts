import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { timetablePeriods, timetableCells } from "@/db/schema/schedule";
import { notFound, unprocessable } from "../errors";
import { cached, bustUser, ck } from "@/server/cache";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

routes.get("/periods", async (c) => {
  const user = c.get("user");
  const records = await cached(ck.schedulePeriods(user.id), 600, () =>
    db.select().from(timetablePeriods).where(and(eq(timetablePeriods.userId, user.id), isNull(timetablePeriods.deletedAt))),
  );
  return c.json({ data: records });
});

routes.post("/periods", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...rest } = body;
  const [record] = await db.insert(timetablePeriods).values({ ...rest, userId: user.id }).returning();
  await bustUser(user.id, ck.schedulePeriods(user.id));
  return c.json({ data: record }, 201);
});

routes.patch("/periods/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...updateData } = body;
  const [record] = await db.update(timetablePeriods)
    .set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(timetablePeriods.id, id), eq(timetablePeriods.userId, user.id), isNull(timetablePeriods.deletedAt)))
    .returning();
  if (!record) return notFound(c);
  await bustUser(user.id, ck.schedulePeriods(user.id));
  return c.json({ data: record });
});

routes.delete("/periods/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [record] = await db.update(timetablePeriods)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(timetablePeriods.id, id), eq(timetablePeriods.userId, user.id), isNull(timetablePeriods.deletedAt)))
    .returning();
  if (!record) return notFound(c);
  await bustUser(user.id, ck.schedulePeriods(user.id));
  return c.json({ data: record });
});

routes.get("/cells", async (c) => {
  const user = c.get("user");
  const classId = c.req.query("classId");
  if (!classId) {
    const records = await cached(ck.scheduleCells(user.id), 600, () =>
      db.select().from(timetableCells).where(and(eq(timetableCells.userId, user.id), isNull(timetableCells.deletedAt))),
    );
    return c.json({ data: records });
  }
  const records = await db.select().from(timetableCells)
    .where(and(eq(timetableCells.userId, user.id), isNull(timetableCells.deletedAt), eq(timetableCells.classId, classId)));
  return c.json({ data: records });
});

routes.post("/cells", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...rest } = body;
  const [record] = await db.insert(timetableCells).values({ ...rest, userId: user.id }).returning();
  await bustUser(user.id, ck.scheduleCells(user.id));
  return c.json({ data: record }, 201);
});

routes.patch("/cells/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...updateData } = body;
  const [record] = await db.update(timetableCells)
    .set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(timetableCells.id, id), eq(timetableCells.userId, user.id), isNull(timetableCells.deletedAt)))
    .returning();
  if (!record) return notFound(c);
  await bustUser(user.id, ck.scheduleCells(user.id));
  return c.json({ data: record });
});

routes.delete("/cells/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [record] = await db.update(timetableCells)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(timetableCells.id, id), eq(timetableCells.userId, user.id), isNull(timetableCells.deletedAt)))
    .returning();
  if (!record) return notFound(c);
  await bustUser(user.id, ck.scheduleCells(user.id));
  return c.json({ data: record });
});

export { routes as scheduleRoutes };
