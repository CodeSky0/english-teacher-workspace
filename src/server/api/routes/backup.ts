import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { user } from "@/db/schema/auth";
import * as schema from "@/db/schema";
import type { RouteEnv } from "../env";
import { getErrorMessage } from "@/lib/error";

const routes = new Hono<RouteEnv>();

type BackupClass = {
  id?: string;
  name?: string;
  enName?: string;
  gradeLevel?: string;
  academicYear?: string;
  isSample?: boolean;
};

type BackupStudent = {
  id?: string;
  name?: string;
  enName?: string;
  gender?: string;
  studentNo?: string;
  seatNo?: number;
  isSample?: boolean;
  classId?: string;
};

type Gender = "male" | "female" | "unknown";

type BackupData = {
  classes?: BackupClass[];
  students?: BackupStudent[];
};

routes.get("/export", async (c) => {
  const u = c.get("user");
  const [userData] = await db.select().from(user).where(eq(user.id, u.id));

  const [classesData, studentsData, cellsData, plansData, researchData,
    homeworkData, examsData, scoresData, vocabUnitsData, vocabWordsData,
    dictListsData, dictWordsData, resourcesData, attendanceData, pointsData, feedbackData] = await Promise.all([
    db.select().from(schema.classes).where(and(eq(schema.classes.userId, u.id), isNull(schema.classes.deletedAt))),
    db.select().from(schema.students).where(and(eq(schema.students.userId, u.id), isNull(schema.students.deletedAt))),
    db.select().from(schema.timetableCells).where(and(eq(schema.timetableCells.userId, u.id), isNull(schema.timetableCells.deletedAt))),
    db.select().from(schema.lessonPlans).where(and(eq(schema.lessonPlans.userId, u.id), isNull(schema.lessonPlans.deletedAt))),
    db.select().from(schema.teachingResearch).where(and(eq(schema.teachingResearch.userId, u.id), isNull(schema.teachingResearch.deletedAt))),
    db.select().from(schema.homework).where(and(eq(schema.homework.userId, u.id), isNull(schema.homework.deletedAt))),
    db.select().from(schema.exams).where(and(eq(schema.exams.userId, u.id), isNull(schema.exams.deletedAt))),
    db.select().from(schema.examScores).where(and(eq(schema.examScores.userId, u.id), isNull(schema.examScores.deletedAt))),
    db.select().from(schema.vocabUnits).where(and(eq(schema.vocabUnits.userId, u.id), isNull(schema.vocabUnits.deletedAt))),
    db.select().from(schema.vocabWords).where(and(eq(schema.vocabWords.userId, u.id), isNull(schema.vocabWords.deletedAt))),
    db.select().from(schema.dictationLists).where(and(eq(schema.dictationLists.userId, u.id), isNull(schema.dictationLists.deletedAt))),
    db.select().from(schema.dictationWords).where(and(eq(schema.dictationWords.userId, u.id), isNull(schema.dictationWords.deletedAt))),
    db.select().from(schema.teachingResources).where(and(eq(schema.teachingResources.userId, u.id), isNull(schema.teachingResources.deletedAt))),
    db.select().from(schema.attendanceRecords).where(and(eq(schema.attendanceRecords.userId, u.id), isNull(schema.attendanceRecords.deletedAt))),
    db.select().from(schema.classroomPoints).where(and(eq(schema.classroomPoints.userId, u.id), isNull(schema.classroomPoints.deletedAt))),
    db.select().from(schema.studentFeedback).where(and(eq(schema.studentFeedback.userId, u.id), isNull(schema.studentFeedback.deletedAt))),
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
  const data = body.data as BackupData;
  const counts: Record<string, number> = {};

  try {
    const result = await db.transaction(async (tx) => {
      if (mode === "overwrite") {
        await tx.delete(schema.students).where(eq(schema.students.userId, u.id));
        await tx.delete(schema.classes).where(eq(schema.classes.userId, u.id));
      }

      const classIdMap = new Map<string, string>();

      if (data.classes?.length) {
        const rows = data.classes.map((r) => ({
          name: r.name ?? "", enName: r.enName, gradeLevel: r.gradeLevel,
          academicYear: r.academicYear, isSample: r.isSample ?? false,
          userId: u.id, deletedAt: null,
        }));
        const inserted = await tx.insert(schema.classes).values(rows).returning();
        data.classes.forEach((r, i) => {
          if (r.id) classIdMap.set(r.id, inserted[i].id);
        });
        counts.classes = inserted.length;
      }

      if (data.students?.length) {
        const rows = data.students
          .map((r) => ({
            name: r.name ?? "", enName: r.enName, gender: (r.gender ?? "unknown") as Gender,
            studentNo: r.studentNo, seatNo: r.seatNo, isSample: r.isSample ?? false,
            classId: r.classId ? (classIdMap.get(r.classId) ?? null) : null,
            userId: u.id, deletedAt: null,
          }))
          .filter((r): r is typeof r & { classId: string } => r.classId !== null);
        if (rows.length) {
          const inserted = await tx.insert(schema.students).values(rows).returning();
          counts.students = inserted.length;
        }
      }

      if (data.students?.length) {
        const rows = data.students
          .map((r) => ({
            name: r.name ?? "", enName: r.enName, gender: (r.gender ?? "unknown") as Gender,
            studentNo: r.studentNo, seatNo: r.seatNo, isSample: r.isSample ?? false,
            classId: r.classId ? (classIdMap.get(r.classId) ?? null) : null,
            userId: u.id, deletedAt: null,
          }))
          .filter((r): r is typeof r & { classId: string } => r.classId !== null);
        if (rows.length) {
          const inserted = await tx.insert(schema.students).values(rows).returning();
          counts.students = inserted.length;
        }
      }

      return counts;
    });

    return c.json({ data: { counts: result, mode } });
  } catch (e: unknown) {
    return c.json({ error: { code: "IMPORT_FAILED", message: getErrorMessage(e, "导入失败") } }, 500);
  }
});

export { routes as backupRoutes };
