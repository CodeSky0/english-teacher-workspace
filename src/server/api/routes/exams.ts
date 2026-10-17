import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { exams, examScores } from "@/db/schema/exams";
import { notFound, unprocessable } from "../errors";
import { bustUser } from "@/server/cache";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

routes.get("/", async (c) => {
  const user = c.get("user");
  const classId = c.req.query("classId");
  const conds = [eq(exams.userId, user.id), isNull(exams.deletedAt)];
  if (classId) conds.push(eq(exams.classId, classId));
  const records = await db.select().from(exams).where(and(...conds));
  return c.json({ data: records });
});

routes.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...rest } = body;
  const [record] = await db.insert(exams).values({ ...rest, userId: user.id }).returning();
  await bustUser(user.id);
  return c.json({ data: record }, 201);
});

routes.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...updateData } = body;
  const [record] = await db.update(exams).set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(exams.id, id), eq(exams.userId, user.id), isNull(exams.deletedAt))).returning();
  if (!record) return notFound(c);
  await bustUser(user.id);
  return c.json({ data: record });
});

routes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [record] = await db.update(exams).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(exams.id, id), eq(exams.userId, user.id), isNull(exams.deletedAt))).returning();
  if (!record) return notFound(c);
  await bustUser(user.id);
  return c.json({ data: record });
});

routes.get("/:id/scores", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const records = await db.select().from(examScores)
    .where(and(eq(examScores.examId, id), eq(examScores.userId, user.id), isNull(examScores.deletedAt)));
  return c.json({ data: records });
});

routes.post("/:id/scores", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [ex] = await db.select().from(exams).where(and(eq(exams.id, id), eq(exams.userId, user.id), isNull(exams.deletedAt)));
  if (!ex) return notFound(c);
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, examId: _eid, ...rest } = body;
  const { listeningScore, speakingScore, writtenScore, totalScore, totalIsManual } = rest;
  let computedTotal = totalScore;
  const manual = totalIsManual ?? false;
  if (!manual && listeningScore != null && speakingScore != null && writtenScore != null) {
    const sum = Number(listeningScore) + Number(speakingScore) + Number(writtenScore);
    if (Number.isFinite(sum)) computedTotal = String(sum);
  }
  const [record] = await db.insert(examScores).values({
    ...rest, examId: id, userId: user.id,
    totalScore: computedTotal, totalIsManual: manual,
  }).returning();
  return c.json({ data: record }, 201);
});

routes.patch("/scores/:scoreId", async (c) => {
  const user = c.get("user");
  const scoreId = c.req.param("scoreId");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, examId: _eid, ...updateData } = body;
  const { listeningScore, speakingScore, writtenScore, totalIsManual } = updateData;
  if (totalIsManual === false && listeningScore != null && speakingScore != null && writtenScore != null) {
    const sum = Number(listeningScore) + Number(speakingScore) + Number(writtenScore);
    if (Number.isFinite(sum)) updateData.totalScore = String(sum);
  }
  const [record] = await db.update(examScores).set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(examScores.id, scoreId), eq(examScores.userId, user.id), isNull(examScores.deletedAt))).returning();
  if (!record) return notFound(c);
  return c.json({ data: record });
});

export { routes as examsRoutes };
