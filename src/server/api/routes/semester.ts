import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { semesters, weekPlans } from "@/db/schema/semester";
import { notFound, unprocessable, badRequest } from "../errors";
import { bustUser } from "@/server/cache";
import type { RouteEnv } from "../env";

const routes = new Hono<RouteEnv>();

routes.get("/semesters", async (c) => {
  const user = c.get("user");
  const records = await db.select().from(semesters).where(and(eq(semesters.userId, user.id), isNull(semesters.deletedAt)));
  return c.json({ data: records });
});

routes.post("/semesters", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...rest } = body;
  const [record] = await db.insert(semesters).values({ ...rest, userId: user.id }).returning();
  await bustUser(user.id);
  return c.json({ data: record }, 201);
});

routes.patch("/semesters/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...updateData } = body;
  const [record] = await db.update(semesters).set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(semesters.id, id), eq(semesters.userId, user.id), isNull(semesters.deletedAt))).returning();
  if (!record) return notFound(c);
  await bustUser(user.id);
  return c.json({ data: record });
});

routes.delete("/semesters/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [record] = await db.update(semesters).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(semesters.id, id), eq(semesters.userId, user.id), isNull(semesters.deletedAt))).returning();
  if (!record) return notFound(c);
  await bustUser(user.id);
  return c.json({ data: record });
});

routes.get("/week-plans", async (c) => {
  const user = c.get("user");
  const semesterId = c.req.query("semesterId");
  if (!semesterId) return badRequest(c, "缺少 semesterId");
  const records = await db.select().from(weekPlans)
    .where(and(eq(weekPlans.semesterId, semesterId), eq(weekPlans.userId, user.id), isNull(weekPlans.deletedAt)));
  return c.json({ data: records });
});

routes.post("/week-plans", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...rest } = body;
  const [record] = await db.insert(weekPlans).values({ ...rest, userId: user.id }).returning();
  return c.json({ data: record }, 201);
});

routes.patch("/week-plans/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...updateData } = body;
  const [record] = await db.update(weekPlans).set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(weekPlans.id, id), eq(weekPlans.userId, user.id), isNull(weekPlans.deletedAt))).returning();
  if (!record) return notFound(c);
  return c.json({ data: record });
});

routes.delete("/week-plans/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [record] = await db.update(weekPlans).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(weekPlans.id, id), eq(weekPlans.userId, user.id), isNull(weekPlans.deletedAt))).returning();
  if (!record) return notFound(c);
  return c.json({ data: record });
});

/** 自动生成周计划：根据学期起止日期，按周一到周日切分周次 */
routes.post("/semesters/:id/generate-weeks", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [semester] = await db.select().from(semesters)
    .where(and(eq(semesters.id, id), eq(semesters.userId, user.id), isNull(semesters.deletedAt)));
  if (!semester) return notFound(c, "学期不存在");

  const start = new Date(semester.startDate);
  const end = new Date(semester.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return badRequest(c, "日期不合法");
  }

  const dayMs = 86400000;
  const existing = await db.select().from(weekPlans)
    .where(and(eq(weekPlans.semesterId, id), eq(weekPlans.userId, user.id), isNull(weekPlans.deletedAt)));
  if (existing.length > 0) return badRequest(c, "已有周计划，请先删除再生成");

  const firstMonday = new Date(start);
  const dayOfWeek = firstMonday.getDay();
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  firstMonday.setDate(firstMonday.getDate() + offset);

  const weeks: (typeof weekPlans.$inferInsert)[] = [];
  let weekNo = 1;
  let weekStart = new Date(firstMonday);
  while (weekStart <= end) {
    const weekEnd = new Date(weekStart.getTime() + 6 * dayMs);
    weeks.push({
      userId: user.id,
      semesterId: id,
      weekNo,
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      status: "planned",
    });
    weekNo++;
    weekStart = new Date(weekEnd.getTime() + dayMs);
  }

  if (weeks.length > 0) {
    await db.insert(weekPlans).values(weeks);
  }

  await db.update(semesters).set({ totalWeeks: weeks.length, updatedAt: new Date() })
    .where(eq(semesters.id, id));

  return c.json({ data: { generated: weeks.length } });
});

export { routes as semesterRoutes };
