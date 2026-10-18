import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { db } from "@/server/db";
import { user } from "@/db/schema/auth";
import * as schema from "@/db/schema";
import type { RouteEnv } from "../env";
import { getErrorMessage } from "@/lib/error";

const routes = new Hono<RouteEnv>();

type Gender = "male" | "female" | "unknown";

/** 备份数据行：来源是数据库整行，字段宽松处理 */
type BackupRow = Record<string, unknown>;
type BackupData = {
  classes?: BackupRow[];
  students?: BackupRow[];
  timetableCells?: BackupRow[];
  vocabUnits?: BackupRow[];
  lessonPlans?: BackupRow[];
  teachingResearch?: BackupRow[];
  homework?: BackupRow[];
  exams?: BackupRow[];
  examScores?: BackupRow[];
  vocabWords?: BackupRow[];
  dictationLists?: BackupRow[];
  dictationWords?: BackupRow[];
  dictationResults?: BackupRow[];
  teachingResources?: BackupRow[];
  attendance?: BackupRow[];
  classroomPoints?: BackupRow[];
  studentFeedback?: BackupRow[];
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

  // 空值统一转 null；必填字符串转 string
  const nil = (v: unknown) => (v == null ? null : String(v));
  const req = (v: unknown) => String(v ?? "");
  const num = (v: unknown) => (v == null ? null : Number(v));
  const bool = (v: unknown) => !!v;
  const idOf = (map: Map<string, string>, v: unknown) =>
    v == null ? null : (map.get(String(v)) ?? null);

  try {
    const result = await db.transaction(async (tx) => {
      // overwrite 模式：先清空当前用户全部业务数据（子表先于父表）
      if (mode === "overwrite") {
        await tx.delete(schema.dictationResults).where(eq(schema.dictationResults.userId, u.id));
        await tx.delete(schema.dictationWords).where(eq(schema.dictationWords.userId, u.id));
        await tx.delete(schema.dictationLists).where(eq(schema.dictationLists.userId, u.id));
        await tx.delete(schema.examScores).where(eq(schema.examScores.userId, u.id));
        await tx.delete(schema.exams).where(eq(schema.exams.userId, u.id));
        await tx.delete(schema.homework).where(eq(schema.homework.userId, u.id));
        await tx.delete(schema.vocabWords).where(eq(schema.vocabWords.userId, u.id));
        await tx.delete(schema.vocabUnits).where(eq(schema.vocabUnits.userId, u.id));
        await tx.delete(schema.attendanceRecords).where(eq(schema.attendanceRecords.userId, u.id));
        await tx.delete(schema.classroomPoints).where(eq(schema.classroomPoints.userId, u.id));
        await tx.delete(schema.studentFeedback).where(eq(schema.studentFeedback.userId, u.id));
        await tx.delete(schema.timetableCells).where(eq(schema.timetableCells.userId, u.id));
        await tx.delete(schema.lessonPlans).where(eq(schema.lessonPlans.userId, u.id));
        await tx.delete(schema.teachingResearch).where(eq(schema.teachingResearch.userId, u.id));
        await tx.delete(schema.teachingResources).where(eq(schema.teachingResources.userId, u.id));
        await tx.delete(schema.students).where(eq(schema.students.userId, u.id));
        await tx.delete(schema.classes).where(eq(schema.classes.userId, u.id));
      }

      type Row = Record<string, unknown>;
      const idMap = async (
        rows: Row[] | undefined,
        table: AnyPgTable,
        build: (r: Row) => Record<string, unknown>,
      ) => {
        const map = new Map<string, string>();
        if (!rows?.length) return { map, count: 0 };
        const values = rows.map(build);
        const inserted = await tx
          .insert(table as AnyPgTable)
          .values(values as Record<string, unknown>[])
          .returning();
        rows.forEach((r, i) => {
          if (r.id != null) map.set(String(r.id), (inserted[i] as Row).id as string);
        });
        return { map, count: inserted.length };
      };

      const classIdMap = new Map<string, string>();
      const vocabUnitMap = new Map<string, string>();
      const studentMap = new Map<string, string>();
      const homeworkMap = new Map<string, string>();
      const examMap = new Map<string, string>();
      const dictListMap = new Map<string, string>();

      // ── 根表：班级、词汇单元 ──
      const cls = await idMap(data.classes, schema.classes, (r) => ({
        name: req(r.name), enName: nil(r.enName), gradeLevel: nil(r.gradeLevel),
        academicYear: nil(r.academicYear), isSample: bool(r.isSample), userId: u.id, deletedAt: null,
      }));
      cls.map.forEach((v, k) => classIdMap.set(k, v));
      counts.classes = cls.count;

      const units = await idMap(data.vocabUnits, schema.vocabUnits, (r) => ({
        name: req(r.name), textbookVersion: nil(r.textbookVersion), gradeLevel: nil(r.gradeLevel),
        isSample: bool(r.isSample), userId: u.id, deletedAt: null,
      }));
      units.map.forEach((v, k) => vocabUnitMap.set(k, v));
      counts.vocabUnits = units.count;

      // ── 学生（依赖班级）──
      const stu = await idMap(data.students, schema.students, (r) => ({
        name: req(r.name), enName: nil(r.enName), gender: (nil(r.gender) as Gender) ?? "unknown",
        studentNo: nil(r.studentNo), seatNo: num(r.seatNo), isSample: bool(r.isSample),
        classId: idOf(classIdMap, r.classId), userId: u.id, deletedAt: null,
      }));
      stu.map.forEach((v, k) => studentMap.set(k, v));
      counts.students = stu.count;

      // ── 课表单元格（依赖班级）──
      const cells = await idMap(data.timetableCells, schema.timetableCells, (r) => ({
        classId: idOf(classIdMap, r.classId), dayOfWeek: Number(r.dayOfWeek), periodNo: Number(r.periodNo),
        subject: nil(r.subject), classroom: nil(r.classroom), userId: u.id, deletedAt: null,
      }));
      counts.timetableCells = cells.count;

      // ── 教案（依赖班级）──
      const plans = await idMap(data.lessonPlans, schema.lessonPlans, (r) => ({
        classId: idOf(classIdMap, r.classId), title: req(r.title), textbookVersion: nil(r.textbookVersion),
        gradeLevel: nil(r.gradeLevel), unit: nil(r.unit), lessonType: nil(r.lessonType),
        teachDate: nil(r.teachDate), objectives: nil(r.objectives), keyPoints: nil(r.keyPoints),
        teachingProcess: nil(r.teachingProcess), teachingResources: nil(r.teachingResources),
        reflection: nil(r.reflection), status: (nil(r.status) as "pending" | "in_progress" | "done") ?? "pending",
        isSample: bool(r.isSample), userId: u.id, deletedAt: null,
      }));
      counts.lessonPlans = plans.count;

      // ── 教研活动（无外键）──
      const research = await idMap(data.teachingResearch, schema.teachingResearch, (r) => ({
        title: req(r.title), researchDate: nil(r.researchDate),
        type: (nil(r.type) as "meeting" | "training" | "observation" | "other") ?? "meeting",
        participants: nil(r.participants), content: nil(r.content), takeaways: nil(r.takeaways),
        insights: nil(r.insights), remark: nil(r.remark), isSample: bool(r.isSample),
        userId: u.id, deletedAt: null,
      }));
      counts.teachingResearch = research.count;

      // ── 作业（依赖班级、词汇单元）──
      const hw = await idMap(data.homework, schema.homework, (r) => ({
        classId: idOf(classIdMap, r.classId), title: req(r.title), assignDate: nil(r.assignDate),
        dueDate: nil(r.dueDate), type: nil(r.type), content: nil(r.content),
        status: (nil(r.status) as "draft" | "published" | "closed") ?? "draft", remark: nil(r.remark),
        vocabUnitId: idOf(vocabUnitMap, r.vocabUnitId), isSample: bool(r.isSample),
        userId: u.id, deletedAt: null,
      }));
      hw.map.forEach((v, k) => homeworkMap.set(k, v));
      counts.homework = hw.count;

      // ── 考试（依赖班级）──
      const ex = await idMap(data.exams, schema.exams, (r) => ({
        classId: idOf(classIdMap, r.classId), name: req(r.name), examDate: nil(r.examDate),
        type: nil(r.type), remark: nil(r.remark), isSample: bool(r.isSample), userId: u.id, deletedAt: null,
      }));
      ex.map.forEach((v, k) => examMap.set(k, v));
      counts.exams = ex.count;

      // ── 考试成绩（依赖考试、学生）──
      const scores = await idMap(data.examScores, schema.examScores, (r) => ({
        examId: idOf(examMap, r.examId), studentId: idOf(studentMap, r.studentId),
        listeningScore: nil(r.listeningScore), speakingScore: nil(r.speakingScore),
        writtenScore: nil(r.writtenScore), totalScore: nil(r.totalScore),
        totalIsManual: bool(r.totalIsManual), remark: nil(r.remark), userId: u.id, deletedAt: null,
      }));
      counts.examScores = scores.count;

      // ── 词汇单词（依赖单元）──
      const words = await idMap(data.vocabWords, schema.vocabWords, (r) => ({
        unitId: idOf(vocabUnitMap, r.unitId), word: req(r.word), meaning: nil(r.meaning),
        phoneticUs: nil(r.phoneticUs), partOfSpeech: nil(r.partOfSpeech),
        exampleEn: nil(r.exampleEn), exampleZh: nil(r.exampleZh), remark: nil(r.remark),
        userId: u.id, deletedAt: null,
      }));
      counts.vocabWords = words.count;

      // ── 听写词表（依赖班级）──
      const dl = await idMap(data.dictationLists, schema.dictationLists, (r) => ({
        classId: idOf(classIdMap, r.classId), name: req(r.name), dictationDate: nil(r.dictationDate),
        isSample: bool(r.isSample), userId: u.id, deletedAt: null,
      }));
      dl.map.forEach((v, k) => dictListMap.set(k, v));
      counts.dictationLists = dl.count;

      // ── 听写单词（依赖词表）──
      const dw = await idMap(data.dictationWords, schema.dictationWords, (r) => ({
        listId: idOf(dictListMap, r.listId), word: req(r.word), meaning: nil(r.meaning),
        userId: u.id, deletedAt: null,
      }));
      counts.dictationWords = dw.count;

      // ── 听写成绩（依赖词表、学生）──
      const dres = await idMap(data.dictationResults, schema.dictationResults, (r) => ({
        listId: idOf(dictListMap, r.listId), studentId: idOf(studentMap, r.studentId),
        isCorrect: (r.isCorrect == null ? null : !!r.isCorrect) as boolean | null,
        userId: u.id, deletedAt: null,
      }));
      counts.dictationResults = dres.count;

      // ── 教学资源（无外键）──
      const res = await idMap(data.teachingResources, schema.teachingResources, (r) => ({
        title: req(r.title), type: (nil(r.type) as "lesson_plan" | "ppt" | "video" | "exercise" | "other") ?? "other",
        unit: nil(r.unit), description: nil(r.description), link: nil(r.link),
        isSample: bool(r.isSample), userId: u.id, deletedAt: null,
      }));
      counts.teachingResources = res.count;

      // ── 考勤（依赖班级、学生）──
      const att = await idMap(data.attendance, schema.attendanceRecords, (r) => ({
        classId: idOf(classIdMap, r.classId), studentId: idOf(studentMap, r.studentId),
        attendanceDate: nil(r.attendanceDate), status: (nil(r.status) as "unrecorded" | "present" | "absent" | "late" | "leave") ?? "present",
        remark: nil(r.remark), userId: u.id, deletedAt: null,
      }));
      counts.attendance = att.count;

      // ── 课堂积分（依赖班级、学生）──
      const pts = await idMap(data.classroomPoints, schema.classroomPoints, (r) => ({
        classId: idOf(classIdMap, r.classId), studentId: idOf(studentMap, r.studentId),
        sessionId: nil(r.sessionId), groupName: nil(r.groupName), points: num(r.points),
        reason: nil(r.reason), userId: u.id, deletedAt: null,
      }));
      counts.classroomPoints = pts.count;

      // ── 表现反馈（依赖班级、学生）──
      const fb = await idMap(data.studentFeedback, schema.studentFeedback, (r) => ({
        classId: idOf(classIdMap, r.classId), studentId: idOf(studentMap, r.studentId),
        tag: req(r.tag), type: (nil(r.type) as "positive" | "negative") ?? "positive",
        feedbackDate: nil(r.feedbackDate), remark: nil(r.remark), userId: u.id, deletedAt: null,
      }));
      counts.studentFeedback = fb.count;

      return counts;
    });

    return c.json({ data: { counts: result, mode } });
  } catch (e: unknown) {
    return c.json({ error: { code: "IMPORT_FAILED", message: getErrorMessage(e, "导入失败") } }, 500);
  }
});

export { routes as backupRoutes };
