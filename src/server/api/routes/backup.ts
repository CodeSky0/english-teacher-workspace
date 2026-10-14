import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { user } from "@/db/schema/auth";
import * as schema from "@/db/schema";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

routes.get("/export", async (c) => {
  const u = c.get("user");
  const [userData] = await db.select().from(user).where(eq(user.id, u.id));

  const [classesData, studentsData, cellsData, plansData, researchData,
    homeworkData, examsData, scoresData, vocabUnitsData, vocabWordsData,
    dictListsData, dictWordsData, resourcesData, attendanceData, pointsData, feedbackData] = await Promise.all([
    db.select().from(schema.classes).where(eq(schema.classes.userId, u.id)),
    db.select().from(schema.students).where(eq(schema.students.userId, u.id)),
    db.select().from(schema.timetableCells).where(eq(schema.timetableCells.userId, u.id)),
    db.select().from(schema.lessonPlans).where(eq(schema.lessonPlans.userId, u.id)),
    db.select().from(schema.teachingResearch).where(eq(schema.teachingResearch.userId, u.id)),
    db.select().from(schema.homework).where(eq(schema.homework.userId, u.id)),
    db.select().from(schema.exams).where(eq(schema.exams.userId, u.id)),
    db.select().from(schema.examScores).where(eq(schema.examScores.userId, u.id)),
    db.select().from(schema.vocabUnits).where(eq(schema.vocabUnits.userId, u.id)),
    db.select().from(schema.vocabWords).where(eq(schema.vocabWords.userId, u.id)),
    db.select().from(schema.dictationLists).where(eq(schema.dictationLists.userId, u.id)),
    db.select().from(schema.dictationWords).where(eq(schema.dictationWords.userId, u.id)),
    db.select().from(schema.teachingResources).where(eq(schema.teachingResources.userId, u.id)),
    db.select().from(schema.attendanceRecords).where(eq(schema.attendanceRecords.userId, u.id)),
    db.select().from(schema.classroomPoints).where(eq(schema.classroomPoints.userId, u.id)),
    db.select().from(schema.studentFeedback).where(eq(schema.studentFeedback.userId, u.id)),
  ]);

  const backup = {
    app: "english-teacher-workspace",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      user: userData,
      classes: classesData,
      students: studentsData,
      timetableCells: cellsData,
      lessonPlans: plansData,
      teachingResearch: researchData,
      homework: homeworkData,
      exams: examsData,
      examScores: scoresData,
      vocabUnits: vocabUnitsData,
      vocabWords: vocabWordsData,
      dictationLists: dictListsData,
      dictationWords: dictWordsData,
      teachingResources: resourcesData,
      attendance: attendanceData,
      classroomPoints: pointsData,
      studentFeedback: feedbackData,
    },
  };

  return c.json(backup);
});

routes.post("/import", async (c) => {
  const u = c.get("user");
  const body = await c.req.json();
  if (body.app !== "english-teacher-workspace") {
    return c.json({ error: { code: "INVALID", message: "不是有效的工作台备份文件" } }, 422);
  }
  if (body.schemaVersion !== 1) {
    return c.json({ error: { code: "INVALID", message: `不支持的版本: ${body.schemaVersion}` } }, 422);
  }
  const mode = c.req.query("mode") || "append";
  const data = body.data;
  const counts: Record<string, number> = {};

  try {
    if (mode === "overwrite") {
      await db.delete(schema.classes).where(eq(schema.classes.userId, u.id));
      await db.delete(schema.students).where(eq(schema.students.userId, u.id));
    }

    if (data.classes?.length) {
      const rows = data.classes.map((r: any) => ({ ...r, id: undefined, userId: u.id, deletedAt: null }));
      const inserted = await db.insert(schema.classes).values(rows).returning();
      counts.classes = inserted.length;
    }
    if (data.students?.length) {
      const rows = data.students.map((r: any) => ({ ...r, id: undefined, userId: u.id, deletedAt: null }));
      const inserted = await db.insert(schema.students).values(rows).returning();
      counts.students = inserted.length;
    }

    return c.json({ data: { counts, mode } });
  } catch (e: any) {
    return c.json({ error: { code: "IMPORT_FAILED", message: e.message || "导入失败" } }, 500);
  }
});

export { routes as backupRoutes };
