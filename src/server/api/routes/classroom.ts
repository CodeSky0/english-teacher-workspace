import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  attendanceRecords, classroomSessions, classroomPoints,
  studentFeedback, classroomPolls, classroomPollOptions,
} from "@/db/schema/classroom";
import { classes } from "@/db/schema/classes";
import { notFound, unprocessable, badRequest } from "../errors";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

function makeSubRoutes(table: any, extraFields: string[] = []) {
  const sub = new Hono<{ Variables: { user: { id: string }; session: any } }>();
  const hasUser = !!table.userId;
  sub.get("/", async (c) => {
    const user = c.get("user");
    const classId = c.req.query("classId");
    const conds: any[] = [isNull(table.deletedAt)];
    if (hasUser) conds.push(eq(table.userId, user.id));
    if (classId && table.classId) conds.push(eq(table.classId, classId));
    const records = await db.select().from(table).where(and(...conds));
    return c.json({ data: records });
  });
  sub.post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json().catch(() => null);
    if (!body) return unprocessable(c, "请求体不合法");
    const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...rest } = body;
    const values = hasUser ? { ...rest, userId: user.id } : rest;
    const [record] = await db.insert(table).values(values).returning();
    return c.json({ data: record }, 201);
  });
  sub.patch("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    if (!body) return unprocessable(c, "请求体不合法");
    const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...updateData } = body;
    const conds: any[] = [eq(table.id, id), isNull(table.deletedAt)];
    if (hasUser) conds.push(eq(table.userId, user.id));
    const [record] = await db.update(table).set({ ...updateData, updatedAt: new Date() })
      .where(and(...conds)).returning();
    if (!record) return notFound(c);
    return c.json({ data: record });
  });
  sub.delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const conds: any[] = [eq(table.id, id), isNull(table.deletedAt)];
    if (hasUser) conds.push(eq(table.userId, user.id));
    const [record] = await db.update(table).set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(...conds)).returning();
    if (!record) return notFound(c);
    return c.json({ data: record });
  });
  return sub;
}

routes.route("/attendance", makeSubRoutes(attendanceRecords));
routes.route("/sessions", makeSubRoutes(classroomSessions));
routes.route("/points", makeSubRoutes(classroomPoints));
routes.route("/feedback", makeSubRoutes(studentFeedback));
routes.route("/polls", makeSubRoutes(classroomPolls));
routes.route("/poll-options", makeSubRoutes(classroomPollOptions));

// ------------------------------------------------------------ 批量：考勤

const ATTENDANCE_STATUSES = new Set(["unrecorded", "present", "absent", "late", "leave"]);

/** 按「班级 + 日期」整班保存考勤，已存在的记录就地更新 */
routes.post("/attendance/bulk", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");

  const classId = String(body.classId ?? "").trim();
  const date = String(body.attendanceDate ?? "").trim();
  if (!classId) return badRequest(c, "请先选择班级");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return badRequest(c, "日期格式应为 YYYY-MM-DD");

  const items: { studentId: string; status: string; remark?: string }[] = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return badRequest(c, "没有可保存的记录");
  if (items.length > 500) return unprocessable(c, "单次保存不能超过 500 条");

  const [klass] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.userId, user.id), isNull(classes.deletedAt)));
  if (!klass) return notFound(c, "班级不存在");

  const existing = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.userId, user.id),
        eq(attendanceRecords.classId, classId),
        eq(attendanceRecords.attendanceDate, date),
        isNull(attendanceRecords.deletedAt)
      )
    );
  const byStudent = new Map(existing.map((r) => [r.studentId, r]));

  let created = 0;
  let updated = 0;
  const inserts: (typeof attendanceRecords.$inferInsert)[] = [];

  for (const it of items) {
    const studentId = String(it.studentId ?? "").trim();
    if (!studentId) continue;
    const status = ATTENDANCE_STATUSES.has(it.status) ? it.status : "present";
    const remark = it.remark == null ? null : String(it.remark).trim() || null;
    const found = byStudent.get(studentId);
    if (!found) {
      inserts.push({ userId: user.id, classId, studentId, attendanceDate: date, status: status as any, remark });
      continue;
    }
    if (found.status === status && (found.remark ?? null) === remark) continue;
    await db
      .update(attendanceRecords)
      .set({ status: status as any, remark, updatedAt: new Date() })
      .where(and(eq(attendanceRecords.id, found.id), eq(attendanceRecords.userId, user.id)));
    updated++;
  }

  if (inserts.length) {
    await db.insert(attendanceRecords).values(inserts);
    created = inserts.length;
  }

  return c.json({ data: { created, updated, total: items.length } });
});

// ------------------------------------------------------------ 批量：积分

/** 一次给多名学生加分，常用于小组/整组奖励 */
routes.post("/points/bulk", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");

  const classId = String(body.classId ?? "").trim();
  const reason = String(body.reason ?? "").trim() || null;
  const groupName = String(body.groupName ?? "").trim() || null;
  const sessionId = String(body.sessionId ?? "").trim() || null;
  const delta = Number(body.points);
  if (!classId) return badRequest(c, "请先选择班级");
  if (!Number.isFinite(delta) || delta === 0) return badRequest(c, "分值必须是非零数字");
  if (Math.abs(delta) > 100) return badRequest(c, "单次分值不能超过 100");

  const studentIds: string[] = Array.isArray(body.studentIds) ? body.studentIds.map(String) : [];
  if (studentIds.length === 0) return badRequest(c, "请至少选择一名学生");
  if (studentIds.length > 200) return unprocessable(c, "单次不能超过 200 人");

  const [klass] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.userId, user.id), isNull(classes.deletedAt)));
  if (!klass) return notFound(c, "班级不存在");

  const rows: (typeof classroomPoints.$inferInsert)[] = studentIds.map((studentId) => ({
    userId: user.id,
    classId,
    studentId,
    sessionId,
    groupName,
    points: Math.trunc(delta),
    reason,
  }));
  await db.insert(classroomPoints).values(rows);

  return c.json({ data: { created: rows.length, points: Math.trunc(delta) } }, 201);
});

export { routes as classroomRoutes };
