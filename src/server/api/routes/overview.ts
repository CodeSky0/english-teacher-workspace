import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { classes, students } from "@/db/schema/classes";
import { vocabUnits, vocabWords } from "@/db/schema/vocab";
import { dictationLists, dictationWords, dictationResults } from "@/db/schema/dictation";
import { exams } from "@/db/schema/exams";
import { homework } from "@/db/schema/homework";
import { timetableCells } from "@/db/schema/schedule";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

type ClassStat = {
  id: string;
  name: string;
  gradeLevel: string | null;
  studentCount: number;
  dictationCount: number;
  examCount: number;
  avgAccuracy: number | null;
  lastDictation: { id: string; name: string; date: string | null; avgAccuracy: number | null } | null;
};

function pct(correct: number, total: number): number | null {
  if (!total) return null;
  return Math.round((correct / total) * 1000) / 10;
}

/** 跨班级总览数据 */
routes.get("/", async (c) => {
  const user = c.get("user");
  const uid = user.id;

  const [classRows, studentRows, unitRows, wordRows, listRows, dictWordRows, resultRows, examRows, homeworkRows, cellRows] =
    await Promise.all([
      db.select().from(classes).where(and(eq(classes.userId, uid), isNull(classes.deletedAt))),
      db.select().from(students).where(and(eq(students.userId, uid), isNull(students.deletedAt))),
      db.select({ id: vocabUnits.id }).from(vocabUnits).where(and(eq(vocabUnits.userId, uid), isNull(vocabUnits.deletedAt))),
      db.select({ id: vocabWords.id }).from(vocabWords).where(and(eq(vocabWords.userId, uid), isNull(vocabWords.deletedAt))),
      db.select().from(dictationLists).where(and(eq(dictationLists.userId, uid), isNull(dictationLists.deletedAt))),
      db.select().from(dictationWords).where(and(eq(dictationWords.userId, uid), isNull(dictationWords.deletedAt))),
      db.select().from(dictationResults).where(eq(dictationResults.userId, uid)),
      db.select().from(exams).where(and(eq(exams.userId, uid), isNull(exams.deletedAt))),
      db.select({ id: homework.id, status: homework.status }).from(homework).where(and(eq(homework.userId, uid), isNull(homework.deletedAt))),
      db.select().from(timetableCells).where(eq(timetableCells.userId, uid)),
    ]);

  // ---- 听写统计 ----
  const wordCountByList = new Map<string, number>();
  for (const w of dictWordRows) {
    wordCountByList.set(w.listId, (wordCountByList.get(w.listId) ?? 0) + 1);
  }

  // listId:studentId -> 正确数 / 已批改格数
  const correctByListStudent = new Map<string, number>();
  const recordedByListStudent = new Map<string, number>();
  for (const r of resultRows) {
    const k = `${r.listId}:${r.studentId}`;
    recordedByListStudent.set(k, (recordedByListStudent.get(k) ?? 0) + 1);
    if (r.isCorrect === true) correctByListStudent.set(k, (correctByListStudent.get(k) ?? 0) + 1);
  }

  const studentCountByClass = new Map<string, number>();
  for (const s of studentRows) {
    studentCountByClass.set(s.classId, (studentCountByClass.get(s.classId) ?? 0) + 1);
  }

  const classNameById = new Map(classRows.map((cl) => [cl.id, cl.name]));
  const listById = new Map(listRows.map((l) => [l.id, l]));

  /**
   * 单次听写的平均正确率：只统计已批改的学生，分母为该生已批改的格数，
   * 未批改的学生不按 0 分计入。
   */
  function listAccuracy(listId: string): number | null {
    if (!wordCountByList.get(listId)) return null;
    let sum = 0;
    let count = 0;
    for (const [key, recorded] of recordedByListStudent) {
      if (!key.startsWith(`${listId}:`) || recorded === 0) continue;
      sum += (correctByListStudent.get(key) ?? 0) / recorded;
      count++;
    }
    return count ? Math.round((sum / count) * 1000) / 10 : null;
  }

  const listsByClass = new Map<string, typeof listRows>();
  for (const l of listRows) {
    if (!l.classId) continue;
    const arr = listsByClass.get(l.classId) ?? [];
    arr.push(l);
    listsByClass.set(l.classId, arr);
  }

  const examCountByClass = new Map<string, number>();
  for (const e of examRows) {
    examCountByClass.set(e.classId, (examCountByClass.get(e.classId) ?? 0) + 1);
  }

  const classStats: ClassStat[] = classRows.map((cl) => {
    const lists = (listsByClass.get(cl.id) ?? []).slice().sort((a, b) =>
      (b.dictationDate ?? "").localeCompare(a.dictationDate ?? "") || b.name.localeCompare(a.name)
    );
    const accuracies = lists.map((l) => listAccuracy(l.id)).filter((v): v is number => v != null);
    const latest = lists.find((l) => listAccuracy(l.id) != null) ?? lists[0] ?? null;
    return {
      id: cl.id,
      name: cl.name,
      gradeLevel: cl.gradeLevel ?? null,
      studentCount: studentCountByClass.get(cl.id) ?? 0,
      dictationCount: lists.length,
      examCount: examCountByClass.get(cl.id) ?? 0,
      avgAccuracy: accuracies.length ? Math.round((accuracies.reduce((a, b) => a + b, 0) / accuracies.length) * 10) / 10 : null,
      lastDictation: latest
        ? {
            id: latest.id,
            name: latest.name,
            date: latest.dictationDate ?? null,
            avgAccuracy: listAccuracy(latest.id),
          }
        : null,
    };
  });

  classStats.sort((a, b) => b.studentCount - a.studentCount || a.name.localeCompare(b.name, "zh-CN"));

  // ---- 最近听写 ----
  const recentDictations = listRows
    .slice()
    .sort((a, b) => (b.dictationDate ?? "").localeCompare(a.dictationDate ?? "") || b.name.localeCompare(a.name, "zh-CN"))
    .slice(0, 6)
    .map((l) => ({
      id: l.id,
      name: l.name,
      date: l.dictationDate ?? null,
      className: l.classId ? (classNameById.get(l.classId) ?? "未分班") : "未分班",
      classId: l.classId,
      wordCount: wordCountByList.get(l.id) ?? 0,
      avgAccuracy: listAccuracy(l.id),
    }));

  // ---- 高频错词 ----
  const wordInfo = new Map(dictWordRows.map((w) => [w.id, w.word]));
  const wordListById = new Map(dictWordRows.map((w) => [w.id, w.listId]));
  const wrongByWord = new Map<string, { wrong: number; total: number }>();
  for (const r of resultRows) {
    const stat = wrongByWord.get(r.wordId) ?? { wrong: 0, total: 0 };
    stat.total++;
    if (r.isCorrect === false) stat.wrong++;
    wrongByWord.set(r.wordId, stat);
  }
  const weakWords = [...wrongByWord.entries()]
    .filter(([wordId]) => wordInfo.has(wordId))
    .map(([wordId, stat]) => ({
      word: wordInfo.get(wordId) ?? "",
      listName: listById.get(wordListById.get(wordId) ?? "")?.name ?? "",
      wrongCount: stat.wrong,
      totalCount: stat.total,
      wrongRate: pct(stat.wrong, stat.total) ?? 0,
    }))
    .filter((w) => w.wrongCount > 0)
    .sort((a, b) => b.wrongRate - a.wrongRate || b.wrongCount - a.wrongCount)
    .slice(0, 10);

  // ---- 学情预警：连续 N 次听写低于阈值 ----
  const listsOfClass = (classId: string) =>
    (listsByClass.get(classId) ?? [])
      .slice()
      .sort((a, b) => (a.dictationDate ?? "").localeCompare(b.dictationDate ?? "") || a.name.localeCompare(b.name, "zh-CN"));

  const AT_RISK_THRESHOLD = 60;
  const MIN_STREAK = 2;
  const alerts: {
    studentId: string;
    studentName: string;
    studentNo: string | null;
    classId: string;
    className: string;
    streak: number;
    latestAccuracy: number | null;
    latestListName: string;
  }[] = [];

  for (const cl of classRows) {
    const ordered = listsOfClass(cl.id);
    if (ordered.length < MIN_STREAK) continue;
    for (const s of studentRows.filter((x) => x.classId === cl.id)) {
      // 从最近一次往前数连续「低于阈值」的次数，未批改的场次跳过不计也不打断
      let streak = 0;
      let latest: { accuracy: number; listName: string } | null = null;
      for (let i = ordered.length - 1; i >= 0; i--) {
        const l = ordered[i];
        const recorded = recordedByListStudent.get(`${l.id}:${s.id}`) ?? 0;
        if (!recorded) continue;
        const accuracy = pct(correctByListStudent.get(`${l.id}:${s.id}`) ?? 0, recorded) ?? 0;
        if (latest === null) latest = { accuracy, listName: l.name };
        if (accuracy < AT_RISK_THRESHOLD) streak++;
        else break;
      }
      if (streak >= MIN_STREAK && latest) {
        alerts.push({
          studentId: s.id,
          studentName: s.name,
          studentNo: s.studentNo ?? null,
          classId: cl.id,
          className: cl.name,
          streak,
          latestAccuracy: latest.accuracy,
          latestListName: latest.listName,
        });
      }
    }
  }
  alerts.sort((a, b) => b.streak - a.streak || a.latestAccuracy! - b.latestAccuracy!);

  // ---- 今日课表 ----
  const todayDow = new Date().getDay(); // 1=周一 … 5=周五
  const todaySchedule = cellRows
    .filter((cell) => cell.dayOfWeek === todayDow)
    .sort((a, b) => a.periodNo - b.periodNo)
    .map((cell) => ({
      className: classNameById.get(cell.classId) ?? "未知班级",
      periodNo: cell.periodNo,
      subject: cell.subject ?? "",
      classroom: cell.classroom ?? "",
    }));

  const totals = {
    classes: classRows.length,
    students: studentRows.length,
    vocabUnits: unitRows.length,
    vocabWords: wordRows.length,
    dictationLists: listRows.length,
    dictationResults: resultRows.length,
    exams: examRows.length,
    openHomework: homeworkRows.filter((h) => h.status === "published").length,
  };

  return c.json({
    data: {
      totals,
      classes: classStats,
      recentDictations,
      weakWords,
      todaySchedule,
      alerts: alerts.slice(0, 12),
      alertThreshold: AT_RISK_THRESHOLD,
    },
  });
});

export { routes as overviewRoutes };
