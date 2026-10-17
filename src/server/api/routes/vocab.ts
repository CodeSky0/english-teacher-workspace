import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { vocabUnits, vocabWords } from "@/db/schema/vocab";
import { notFound, unprocessable } from "../errors";
import { cached, bustUser, ck } from "@/server/cache";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

routes.get("/units", async (c) => {
  const user = c.get("user");
  const records = await cached(ck.vocabUnits(user.id), 300, () =>
    db.select().from(vocabUnits).where(and(eq(vocabUnits.userId, user.id), isNull(vocabUnits.deletedAt))),
  );
  return c.json({ data: records });
});

routes.post("/units", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...rest } = body;
  const [record] = await db.insert(vocabUnits).values({ ...rest, userId: user.id }).returning();
  await bustUser(user.id, ck.vocabUnits(user.id));
  return c.json({ data: record }, 201);
});

routes.patch("/units/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...updateData } = body;
  const [record] = await db.update(vocabUnits).set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(vocabUnits.id, id), eq(vocabUnits.userId, user.id), isNull(vocabUnits.deletedAt))).returning();
  if (!record) return notFound(c);
  await bustUser(user.id, ck.vocabUnits(user.id));
  return c.json({ data: record });
});

routes.delete("/units/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [record] = await db.update(vocabUnits).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(vocabUnits.id, id), eq(vocabUnits.userId, user.id), isNull(vocabUnits.deletedAt))).returning();
  if (!record) return notFound(c);
  await bustUser(user.id, ck.vocabUnits(user.id));
  return c.json({ data: record });
});

routes.get("/words", async (c) => {
  const user = c.get("user");
  const unitId = c.req.query("unitId");
  if (!unitId) {
    const records = await cached(ck.vocabWords(user.id), 300, () =>
      db.select().from(vocabWords).where(and(eq(vocabWords.userId, user.id), isNull(vocabWords.deletedAt))),
    );
    return c.json({ data: records });
  }
  const records = await db.select().from(vocabWords)
    .where(and(eq(vocabWords.userId, user.id), isNull(vocabWords.deletedAt), eq(vocabWords.unitId, unitId)));
  return c.json({ data: records });
});

routes.post("/words", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...rest } = body;
  const [record] = await db.insert(vocabWords).values({ ...rest, userId: user.id }).returning();
  await bustUser(user.id, ck.vocabWords(user.id));
  return c.json({ data: record }, 201);
});

routes.patch("/words/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...updateData } = body;
  const [record] = await db.update(vocabWords).set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(vocabWords.id, id), eq(vocabWords.userId, user.id), isNull(vocabWords.deletedAt))).returning();
  if (!record) return notFound(c);
  await bustUser(user.id, ck.vocabWords(user.id));
  return c.json({ data: record });
});

routes.delete("/words/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [record] = await db.update(vocabWords).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(vocabWords.id, id), eq(vocabWords.userId, user.id), isNull(vocabWords.deletedAt))).returning();
  if (!record) return notFound(c);
  await bustUser(user.id, ck.vocabWords(user.id));
  return c.json({ data: record });
});

export { routes as vocabRoutes };
