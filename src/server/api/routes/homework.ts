import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { homework, homeworkRecords } from "@/db/schema/homework";
import { notFound } from "../errors";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

routes.get("/", async (c) => {
  const user = c.get("user");
  const classId = c.req.query("classId");
  const conds = [eq(homework.userId, user.id), isNull(homework.deletedAt)];
  if (classId) conds.push(eq(homework.classId, classId));
  const records = await db.select().from(homework).where(and(...conds));
  return c.json({ data: records });
});

routes.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const [record] = await db.insert(homework).values({ ...body, userId: user.id }).returning();
  return c.json({ data: record }, 201);
});

routes.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const { id: _id, userId: _uid, createdAt: _ca, ...updateData } = body;
  const [record] = await db.update(homework).set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(homework.id, id), eq(homework.userId, user.id), isNull(homework.deletedAt))).returning();
  if (!record) return notFound(c);
  return c.json({ data: record });
});

routes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [record] = await db.update(homework).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(homework.id, id), eq(homework.userId, user.id), isNull(homework.deletedAt))).returning();
  if (!record) return notFound(c);
  return c.json({ data: record });
});

routes.get("/:id/records", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const records = await db.select().from(homeworkRecords)
    .where(and(eq(homeworkRecords.homeworkId, id), eq(homeworkRecords.userId, user.id), isNull(homeworkRecords.deletedAt)));
  return c.json({ data: records });
});

routes.post("/:id/records", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const [record] = await db.insert(homeworkRecords).values({ ...body, homeworkId: id, userId: user.id }).returning();
  return c.json({ data: record }, 201);
});

routes.patch("/records/:recordId", async (c) => {
  const user = c.get("user");
  const recordId = c.req.param("recordId");
  const body = await c.req.json();
  const { id: _id, userId: _uid, createdAt: _ca, ...updateData } = body;
  const [record] = await db.update(homeworkRecords).set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(homeworkRecords.id, recordId), eq(homeworkRecords.userId, user.id))).returning();
  if (!record) return notFound(c);
  return c.json({ data: record });
});

export { routes as homeworkRoutes };
