import { Hono } from "hono";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { exams, examScores } from "@/db/schema/exams";
import { students, classes } from "@/db/schema/classes";
import { dictationResults, dictationLists } from "@/db/schema/dictation";
import { cached } from "@/server/cache";
import { badRequest } from "../errors";
import type { RouteEnv } from "../env";

const routes = new Hono<RouteEnv>();

function num(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function avg(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** 班级学情画像：听说读写四维均分 + 总分分布 */
routes.get("/class/:classId/profile", async (c) => {
  const user = c.get("user");
  const classId = c.req.param("classId");

  const [klass] = await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.userId, user.id), isNull(classes.deletedAt)));
  if (!klass) return badRequest(c, "班级不存在");

  const profile = await cached(`an:prof:${user.id}:${classId}`, 60, async () => {
    const [examRows, studentRows, scoreRows] = await Promise.all([
      db.select().from(exams).where(and(eq(exams.classId, classId), eq(exams.userId, user.id), isNull(exams.deletedAt))),
      db.select().from(students).where(and(eq(students.classId, classId), eq(students.userId, user.id), isNull(students.deletedAt))),
      db.select().from(examScores).where(and(eq(examScores.userId, user.id), isNull(examScores.deletedAt))),
    ]);

    const examIds = new Set(examRows.map((e) => e.id));
    const validScores = scoreRows.filter((s) => examIds.has(s.examId));

    const listen = validScores.map((s) => num(s.listeningScore)).filter((v): v is number => v != null);
    const speak = validScores.map((s) => num(s.speakingScore)).filter((v): v is number => v != null);
    const write = validScores.map((s) => num(s.writtenScore)).filter((v): v is number => v != null);
    const total = validScores.map((s) => num(s.totalScore)).filter((v): v is number => v != null);

    return {
      className: klass.name,
      studentCount: studentRows.length,
      examCount: examRows.length,
      dimensions: {
        listening: avg(listen),
        speaking: avg(speak),
        writing: avg(write),
        total: avg(total),
      },
      scoreCount: validScores.length,
    };
  });

  return c.json({ data: profile });
});

/** 成绩趋势：按考试日期排序，每次考试的班级均分 */
routes.get("/class/:classId/trend", async (c) => {
  const user = c.get("user");
  const classId = c.req.param("classId");

  const trend = await cached(`an:trend:${user.id}:${classId}`, 60, async () => {
    const examRows = await db.select().from(exams).where(and(eq(exams.classId, classId), eq(exams.userId, user.id), isNull(exams.deletedAt)));
    if (examRows.length === 0) return [];

    const examIds = examRows.map((e) => e.id);
    const scoreRows = await db.select().from(examScores).where(and(inArray(examScores.examId, examIds), eq(examScores.userId, user.id), isNull(examScores.deletedAt)));

    const byExam = new Map<string, { listen: number[]; speak: number[]; write: number[]; total: number[] }>();
    for (const s of scoreRows) {
      if (!byExam.has(s.examId)) byExam.set(s.examId, { listen: [], speak: [], write: [], total: [] });
      const g = byExam.get(s.examId)!;
      const l = num(s.listeningScore); if (l != null) g.listen.push(l);
      const sp = num(s.speakingScore); if (sp != null) g.speak.push(sp);
      const w = num(s.writtenScore); if (w != null) g.write.push(w);
      const t = num(s.totalScore); if (t != null) g.total.push(t);
    }

    return examRows
      .map((e) => {
        const g = byExam.get(e.id) ?? { listen: [], speak: [], write: [], total: [] };
        return {
          examId: e.id,
          examName: e.name,
          examDate: e.examDate,
          listening: avg(g.listen),
          speaking: avg(g.speak),
          writing: avg(g.write),
          total: avg(g.total),
        };
      })
      .sort((a, b) => (a.examDate ?? "").localeCompare(b.examDate ?? ""));
  });

  return c.json({ data: trend });
});

/** 班级横向对比：各班的听说读写均分 */
routes.get("/compare", async (c) => {
  const user = c.get("user");

  const compare = await cached(`an:cmp:${user.id}`, 60, async () => {
    const [classRows, examRows, scoreRows, studentRows] = await Promise.all([
      db.select().from(classes).where(and(eq(classes.userId, user.id), isNull(classes.deletedAt))),
      db.select().from(exams).where(and(eq(exams.userId, user.id), isNull(exams.deletedAt))),
      db.select().from(examScores).where(and(eq(examScores.userId, user.id), isNull(examScores.deletedAt))),
      db.select().from(students).where(and(eq(students.userId, user.id), isNull(students.deletedAt))),
    ]);

    const examByClass = new Map<string, string[]>();
    for (const e of examRows) {
      if (!examByClass.has(e.classId)) examByClass.set(e.classId, []);
      examByClass.get(e.classId)!.push(e.id);
    }
    const studentCountByClass = new Map<string, number>();
    for (const s of studentRows) {
      studentCountByClass.set(s.classId, (studentCountByClass.get(s.classId) ?? 0) + 1);
    }

    return classRows.map((cls) => {
      const eIds = examByClass.get(cls.id) ?? [];
      const eIdSet = new Set(eIds);
      const clsScores = scoreRows.filter((s) => eIdSet.has(s.examId));
      const listen = clsScores.map((s) => num(s.listeningScore)).filter((v): v is number => v != null);
      const speak = clsScores.map((s) => num(s.speakingScore)).filter((v): v is number => v != null);
      const write = clsScores.map((s) => num(s.writtenScore)).filter((v): v is number => v != null);
      const total = clsScores.map((s) => num(s.totalScore)).filter((v): v is number => v != null);
      return {
        classId: cls.id,
        className: cls.name,
        listening: avg(listen),
        speaking: avg(speak),
        writing: avg(write),
        total: avg(total),
        studentCount: studentCountByClass.get(cls.id) ?? 0,
      };
    });
  });

  return c.json({ data: compare });
});

/** 学生个人画像：听说读写 + 听写正确率 */
routes.get("/student/:studentId/profile", async (c) => {
  const user = c.get("user");
  const studentId = c.req.param("studentId");

  const [student] = await db.select().from(students).where(and(eq(students.id, studentId), eq(students.userId, user.id), isNull(students.deletedAt)));
  if (!student) return badRequest(c, "学生不存在");

  const profile = await cached(`an:sp:${user.id}:${studentId}`, 60, async () => {
    const [scores, dictRes, dictLists] = await Promise.all([
      db.select().from(examScores).where(and(eq(examScores.studentId, studentId), eq(examScores.userId, user.id), isNull(examScores.deletedAt))),
      db.select().from(dictationResults).where(and(eq(dictationResults.studentId, studentId), eq(dictationResults.userId, user.id), isNull(dictationResults.deletedAt))),
      db.select().from(dictationLists).where(and(eq(dictationLists.userId, user.id), eq(dictationLists.classId, student.classId), isNull(dictationLists.deletedAt))),
    ]);

    const listen = scores.map((s) => num(s.listeningScore)).filter((v): v is number => v != null);
    const speak = scores.map((s) => num(s.speakingScore)).filter((v): v is number => v != null);
    const write = scores.map((s) => num(s.writtenScore)).filter((v): v is number => v != null);
    const total = scores.map((s) => num(s.totalScore)).filter((v): v is number => v != null);

    const listIds = new Set(dictLists.map((l) => l.id));
    const studentDict = dictRes.filter((r) => listIds.has(r.listId));
    let dictCorrect = 0, dictTotal = 0;
    for (const r of studentDict) {
      if (r.isCorrect === null) continue;
      dictTotal++;
      if (r.isCorrect) dictCorrect++;
    }

    return {
      studentName: student.name,
      dimensions: {
        listening: avg(listen),
        speaking: avg(speak),
        writing: avg(write),
        total: avg(total),
      },
      dictationRate: dictTotal > 0 ? (dictCorrect / dictTotal) * 100 : 0,
      examCount: scores.length,
      dictationCount: dictTotal,
    };
  });

  return c.json({ data: profile });
});

/** 学生历次考试成绩：含考试名与日期 */
routes.get("/student/:studentId/scores", async (c) => {
  const user = c.get("user");
  const studentId = c.req.param("studentId");

  const [student] = await db.select().from(students).where(and(eq(students.id, studentId), eq(students.userId, user.id), isNull(students.deletedAt)));
  if (!student) return badRequest(c, "学生不存在");

  const result = await cached(`an:ss:${user.id}:${studentId}`, 60, async () => {
    const [scores, examRows] = await Promise.all([
      db.select().from(examScores).where(and(eq(examScores.studentId, studentId), eq(examScores.userId, user.id), isNull(examScores.deletedAt))),
      db.select().from(exams).where(and(eq(exams.classId, student.classId), eq(exams.userId, user.id), isNull(exams.deletedAt))),
    ]);

    const examNameById = new Map(examRows.map((e) => [e.id, { name: e.name, examDate: e.examDate }]));
    return scores.map((s) => ({
      examId: s.examId,
      examName: examNameById.get(s.examId)?.name ?? "考试",
      examDate: examNameById.get(s.examId)?.examDate ?? null,
      listeningScore: s.listeningScore,
      speakingScore: s.speakingScore,
      writtenScore: s.writtenScore,
      totalScore: s.totalScore,
    }));
  });

  return c.json({ data: result });
});

export { routes as analyticsRoutes };
