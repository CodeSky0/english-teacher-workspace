import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { vocabUnits, vocabWords } from "@/db/schema/vocab";
import { notFound } from "../errors";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

routes.get("/units", async (c) => {
  const user = c.get("user");
  const records = await db.select().from(vocabUnits)
    .where(and(eq(vocabUnits.userId, user.id), isNull(vocabUnits.deletedAt)));
  return c.json({ data: records });
});

routes.post("/units", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const [record] = await db.insert(vocabUnits).values({ ...body, userId: user.id }).returning();
  return c.json({ data: record }, 201);
});

routes.patch("/units/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const { id: _id, userId: _uid, createdAt: _ca, ...updateData } = body;
  const [record] = await db.update(vocabUnits).set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(vocabUnits.id, id), eq(vocabUnits.userId, user.id), isNull(vocabUnits.deletedAt))).returning();
  if (!record) return notFound(c);
  return c.json({ data: record });
});

routes.delete("/units/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [record] = await db.update(vocabUnits).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(vocabUnits.id, id), eq(vocabUnits.userId, user.id), isNull(vocabUnits.deletedAt))).returning();
  if (!record) return notFound(c);
  return c.json({ data: record });
});

routes.get("/words", async (c) => {
  const user = c.get("user");
  const unitId = c.req.query("unitId");
  const conds = [eq(vocabWords.userId, user.id), isNull(vocabWords.deletedAt)];
  if (unitId) conds.push(eq(vocabWords.unitId, unitId));
  const records = await db.select().from(vocabWords).where(and(...conds));
  return c.json({ data: records });
});

routes.post("/words", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const [record] = await db.insert(vocabWords).values({ ...body, userId: user.id }).returning();
  return c.json({ data: record }, 201);
});

routes.patch("/words/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const { id: _id, userId: _uid, createdAt: _ca, ...updateData } = body;
  const [record] = await db.update(vocabWords).set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(vocabWords.id, id), eq(vocabWords.userId, user.id), isNull(vocabWords.deletedAt))).returning();
  if (!record) return notFound(c);
  return c.json({ data: record });
});

routes.delete("/words/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [record] = await db.update(vocabWords).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(vocabWords.id, id), eq(vocabWords.userId, user.id), isNull(vocabWords.deletedAt))).returning();
  if (!record) return notFound(c);
  return c.json({ data: record });
});

export { routes as vocabRoutes };
