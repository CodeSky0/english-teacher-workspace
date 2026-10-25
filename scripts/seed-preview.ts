/**
 * 本地预览种子数据（仅开发用）。
 *
 * 先跑仓库自带的示例数据（pnpm db:seed，幂等），再补充课表 / 学期周计划 / 听写词与批改结果
 * / 考试成绩 / 课堂互动 / 作业提交等，让 /dashboard 各页（尤其 overview）有真实可视内容。
 *
 * 用法（SEED_USER_ID 为注册接口返回的 user.id）：
 *   $env:SEED_USER_ID="<user.id>"; pnpm db:seed:preview
 *   或： pnpm db:seed:preview <user.id>
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function resolveUserId(): string | null {
  if (process.env.SEED_USER_ID) return process.env.SEED_USER_ID;
  if (process.argv[2]) return process.argv[2];
  // preview:bootstrap 会把演示账号写进 .data/demo-user.json
  try {
    if (existsSync(".data/demo-user.json")) {
      const info = JSON.parse(readFileSync(".data/demo-user.json", "utf8"));
      if (info && info.id) return info.id;
    }
  } catch {
    // 忽略
  }
  return null;
}

const userId = resolveUserId();
if (!userId) {
  console.error("用法：SEED_USER_ID=<user.id> pnpm db:seed:preview（或先跑 pnpm preview:bootstrap）");
  process.exit(1);
}

// 1) 仓库自带的示例数据（子进程继承环境变量，读写同一个 PGlite 数据目录）
const base = spawnSync("pnpm", ["db:seed"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, SEED_USER_ID: userId },
});
if (base.status !== 0) {
  console.error("✗ pnpm db:seed 失败，请先解决基础示例数据问题");
  process.exit(base.status || 1);
}

// 2) 补充数据：这里才 import db（动态 import 确保环境变量与子进程写入已完成）
const { db, pgliteReady } = await import("@/server/db");
const schema = await import("@/db/schema");
const { eq } = await import("drizzle-orm");

if (pgliteReady) await pgliteReady;

const uid = userId;
const dateStr = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

const classRows = await db.select().from(schema.classes).where(eq(schema.classes.userId, uid));
if (classRows.length === 0) {
  console.error("✗ 没有找到班级数据，请确认 pnpm db:seed 已成功");
  process.exit(1);
}
const studentRows = await db.select().from(schema.students).where(eq(schema.students.userId, uid));
const studentsByClass = new Map<string, typeof studentRows>();
for (const s of studentRows) {
  const arr = studentsByClass.get(s.classId) || [];
  arr.push(s);
  studentsByClass.set(s.classId, arr);
}
console.log("▶ 班级 " + classRows.length + " 个，学生 " + studentRows.length + " 人");

// ── 作息节次 ───────────────────────────────────────────────────────────────
const periodRows = await db
  .select({ id: schema.timetablePeriods.id })
  .from(schema.timetablePeriods)
  .where(eq(schema.timetablePeriods.userId, uid));
if (periodRows.length === 0) {
  const PERIODS = [
    ["第 1 节", "08:00:00", "08:45:00"],
    ["第 2 节", "08:55:00", "09:40:00"],
    ["第 3 节", "10:00:00", "10:45:00"],
    ["第 4 节", "10:55:00", "11:40:00"],
    ["第 5 节", "14:00:00", "14:45:00"],
    ["第 6 节", "14:55:00", "15:40:00"],
    ["第 7 节", "16:00:00", "16:45:00"],
    ["第 8 节", "16:55:00", "17:40:00"],
  ];
  await db.insert(schema.timetablePeriods).values(
    PERIODS.map((p, i) => ({
      userId: uid,
      periodNo: i + 1,
      name: p[0],
      startTime: p[1],
      endTime: p[2],
    }))
  );
  console.log("  ✓ 作息节次 8 条");
}

// ── 周课表 ─────────────────────────────────────────────────────────────────
const cellRows = await db
  .select({ id: schema.timetableCells.id })
  .from(schema.timetableCells)
  .where(eq(schema.timetableCells.userId, uid));
if (cellRows.length === 0) {
  const SUBJECTS = ["英语", "英语", "阅读", "听力", "写作", "英语"];
  const values = [] as (typeof schema.timetableCells.$inferInsert)[];
  for (const cls of classRows) {
    for (let day = 1; day <= 5; day++) {
      for (let p = 1; p <= 6; p++) {
        values.push({
          userId: uid,
          classId: cls.id,
          dayOfWeek: day,
          periodNo: p,
          subject: SUBJECTS[(day + p) % SUBJECTS.length],
          classroom: cls.name,
        });
      }
    }
  }
  await db.insert(schema.timetableCells).values(values);
  console.log("  ✓ 周课表 " + values.length + " 格");
}

// ── 学期 + 周计划 ──────────────────────────────────────────────────────────
const semesterRows = await db.select().from(schema.semesters).where(eq(schema.semesters.userId, uid));
let semesterId: string;
if (semesterRows.length === 0) {
  const [created] = await db
    .insert(schema.semesters)
    .values({
      userId: uid,
      name: "2026-2027 学年第一学期",
      startDate: "2026-09-01",
      endDate: "2027-01-22",
      goal: "完成必修一、二教学；词汇量提升至 2000；听说读写综合能力达标",
      totalWeeks: 20,
    })
    .returning();
  semesterId = created.id;
  console.log("  ✓ 学期 1 条");
} else {
  semesterId = semesterRows[0].id;
}

const weekPlanRows = await db
  .select({ id: schema.weekPlans.id })
  .from(schema.weekPlans)
  .where(eq(schema.weekPlans.semesterId, semesterId));
if (weekPlanRows.length === 0) {
  const TOPICS = [
    "Unit 1 Reading: Explore the World",
    "Unit 1 Listening & Speaking",
    "Unit 2 Reading: Improve Your Ability",
    "Unit 2 Grammar: 定语从句",
    "Unit 3 Reading: Protect the Environment",
    "Unit 3 Writing: 环保主题写作",
    "阶段复习与单元测评",
    "期中复习：词汇与语法专项",
  ];
  const OBJECTIVES = [
    "掌握 Unit 1 核心词汇 30 个，能完成精读任务",
    "训练听力细节捕捉与口语表达",
    "理解文章结构，完成信息匹配",
    "掌握定语从句的关系代词用法",
    "读后能复述文章主旨并做观点表达",
    "能写 80 词环保倡议书",
    "查漏补缺，完成单元测评",
    "巩固易错词，提升阅读速度",
  ];
  const baseDate = new Date(Date.UTC(2026, 8, 1));
  const values = [] as (typeof schema.weekPlans.$inferInsert)[];
  for (let i = 0; i < TOPICS.length; i++) {
    const start = addDays(baseDate, i * 7);
    values.push({
      userId: uid,
      semesterId,
      classId: classRows[i % classRows.length].id,
      weekNo: i + 1,
      weekStart: dateStr(start),
      weekEnd: dateStr(addDays(start, 6)),
      topic: TOPICS[i],
      objective: OBJECTIVES[i],
      content: "精讲 + 课堂练习 + 课后作业；每周一次限时阅读训练。",
      status: i < 7 ? "done" : "in_progress",
    });
  }
  await db.insert(schema.weekPlans).values(values);
  console.log("  ✓ 周计划 " + values.length + " 条");
}

// ── 听写：第二批词表 + 词 + 批改结果 ────────────────────────────────────────
const EXTRA_LISTS = [
  { name: "Unit 1 词汇听写（第二轮）", classId: classRows[0].id, dictationDate: "2026-10-08" },
  { name: "Unit 2 词汇听写（第二轮）", classId: (classRows[1] || classRows[0]).id, dictationDate: "2026-10-15" },
  { name: "Unit 3 词汇听写", classId: (classRows[2] || classRows[0]).id, dictationDate: "2026-10-22" },
];
const existingListNames = new Set(
  (
    await db
      .select({ name: schema.dictationLists.name })
      .from(schema.dictationLists)
      .where(eq(schema.dictationLists.userId, uid))
  ).map((r) => r.name)
);
const newLists = EXTRA_LISTS.filter((l) => !existingListNames.has(l.name));
if (newLists.length > 0) {
  await db.insert(schema.dictationLists).values(
    newLists.map((l) => ({ userId: uid, classId: l.classId, name: l.name, dictationDate: l.dictationDate, isSample: true }))
  );
  console.log("  ✓ 新增听写词表 " + newLists.length + " 个");
}

const listRows = await db.select().from(schema.dictationLists).where(eq(schema.dictationLists.userId, uid));
const unitRows = await db.select().from(schema.vocabUnits).where(eq(schema.vocabUnits.userId, uid));
const wordRows = await db.select().from(schema.vocabWords).where(eq(schema.vocabWords.userId, uid));

for (const list of listRows) {
  const existingWords = await db
    .select({ id: schema.dictationWords.id })
    .from(schema.dictationWords)
    .where(eq(schema.dictationWords.listId, list.id));
  if (existingWords.length > 0) continue;
  if (!list.classId) continue;

  const unitIdx = /Unit\s*1/i.test(list.name) ? 0 : /Unit\s*2/i.test(list.name) ? 1 : 2;
  const unit = unitRows[unitIdx] || unitRows[0];
  const words = wordRows.filter((w) => w.unitId === unit?.id).slice(0, 10);
  if (words.length === 0) continue;

  const insertedWords = await db
    .insert(schema.dictationWords)
    .values(
      words.map((w) => ({ userId: uid, listId: list.id, vocabWordId: w.id, word: w.word, meaning: w.meaning }))
    )
    .returning({ id: schema.dictationWords.id });

  const students = studentsByClass.get(list.classId) || [];
  const resultValues = [] as (typeof schema.dictationResults.$inferInsert)[];
  for (let si = 0; si < students.length; si++) {
    const student = students[si];
    // 前两名学生刻意做成低正确率，触发 overview 的学情预警
    const wrongCount = si === 0 ? 7 : si === 1 ? 5 : si % 5 === 0 ? 3 : si % 3 === 0 ? 2 : 1;
    for (let k = 0; k < insertedWords.length; k++) {
      const isWrong = (k * 7 + si * 3) % 10 < wrongCount;
      resultValues.push({
        userId: uid,
        listId: list.id,
        studentId: student.id,
        wordId: insertedWords[k].id,
        isCorrect: !isWrong,
      });
    }
  }
  if (resultValues.length > 0) {
    await db.insert(schema.dictationResults).values(resultValues);
  }
  console.log("  ✓ 听写 " + list.name + "：" + insertedWords.length + " 词 / " + resultValues.length + " 条批改");
}

// ── 考试 + 成绩 ─────────────────────────────────────────────────────────────
const examPlans = [
  { name: "Unit 1 单元测", classId: classRows[Math.min(2, classRows.length - 1)].id, examDate: "2026-09-18", type: "单元测" },
  { name: "Unit 1-2 阶段测试（B 班）", classId: classRows[Math.min(1, classRows.length - 1)].id, examDate: "2026-09-26", type: "阶段测" },
  { name: "期中考试", classId: classRows[0].id, examDate: "2026-11-05", type: "期中" },
];
const examRows = await db.select().from(schema.exams).where(eq(schema.exams.userId, uid));
const existingExamNames = new Set(examRows.map((e) => e.name));
const newExams = examPlans.filter((e) => !existingExamNames.has(e.name));
if (newExams.length > 0) {
  await db.insert(schema.exams).values(newExams.map((e) => ({ ...e, userId: uid, isSample: true })));
  console.log("  ✓ 新增考试 " + newExams.length + " 场");
}

const allExamRows = await db.select().from(schema.exams).where(eq(schema.exams.userId, uid));
for (const exam of allExamRows) {
  const students = studentsByClass.get(exam.classId) || [];
  const existingScores = await db
    .select({ studentId: schema.examScores.studentId })
    .from(schema.examScores)
    .where(eq(schema.examScores.examId, exam.id));
  const scored = new Set(existingScores.map((s) => s.studentId));
  const values = [] as (typeof schema.examScores.$inferInsert)[];
  students.forEach((student, i) => {
    if (scored.has(student.id)) return;
    const listening = 18 + ((i * 3) % 8);
    const speaking = 16 + ((i * 5) % 9);
    const written = 42 + ((i * 7) % 14);
    values.push({
      userId: uid,
      examId: exam.id,
      studentId: student.id,
      listeningScore: String(listening),
      speakingScore: String(speaking),
      writtenScore: String(written),
      // 总分同步落库：学情分析的班级均分按 total_score 汇总，缺省会显示 0/150
      totalScore: String(listening + speaking + written),
      totalIsManual: false,
    });
  });
  if (values.length > 0) {
    await db.insert(schema.examScores).values(values);
  }
}
console.log("  ✓ 考试成绩已补齐");

// ── 作业提交记录 ───────────────────────────────────────────────────────────
const homeworkRows = await db.select().from(schema.homework).where(eq(schema.homework.userId, uid));
for (const hw of homeworkRows) {
  if (!hw.classId) continue;
  const students = studentsByClass.get(hw.classId) || [];
  const existingRecords = await db
    .select({ id: schema.homeworkRecords.id })
    .from(schema.homeworkRecords)
    .where(eq(schema.homeworkRecords.homeworkId, hw.id));
  if (existingRecords.length > 0) continue;
  const values = [] as (typeof schema.homeworkRecords.$inferInsert)[];
  students.forEach((student, i) => {
    const mod = i % 10;
    const status = mod < 6 ? "graded" : mod < 8 ? "submitted" : mod === 8 ? "late" : "unsubmitted";
    values.push({
      userId: uid,
      homeworkId: hw.id,
      studentId: student.id,
      status,
      score: status === "graded" ? String(78 + ((i * 4) % 22)) : null,
    });
  });
  if (values.length > 0) await db.insert(schema.homeworkRecords).values(values);
}
console.log("  ✓ 作业提交记录已补齐");

// ── 课堂互动：上课记录 / 积分 / 考勤 / 反馈 ────────────────────────────────
const today = new Date();
const sessionRows = await db
  .select({ id: schema.classroomSessions.id, classId: schema.classroomSessions.classId })
  .from(schema.classroomSessions)
  .where(eq(schema.classroomSessions.userId, uid));
if (sessionRows.length === 0) {
  const values = [] as (typeof schema.classroomSessions.$inferInsert)[];
  for (const cls of classRows) {
    values.push(
      { userId: uid, classId: cls.id, sessionDate: dateStr(addDays(today, -3)), activity: "单词接龙", note: "全班参与，气氛活跃" },
      { userId: uid, classId: cls.id, sessionDate: dateStr(addDays(today, -1)), activity: "小组对话展示", note: "A 组表现突出" }
    );
  }
  await db.insert(schema.classroomSessions).values(values);
  console.log("  ✓ 课堂记录 " + values.length + " 条");
}

const allSessionRows = await db
  .select()
  .from(schema.classroomSessions)
  .where(eq(schema.classroomSessions.userId, uid));
const pointRows = await db
  .select({ id: schema.classroomPoints.id })
  .from(schema.classroomPoints)
  .where(eq(schema.classroomPoints.userId, uid));
if (pointRows.length === 0 && allSessionRows.length > 0) {
  const REASONS = ["主动回答问题", "小组合作出色", "朗读语音标准", "作业完成质量高", "帮助同学讲解"];
  const values = [] as (typeof schema.classroomPoints.$inferInsert)[];
  for (const session of allSessionRows) {
    const students = studentsByClass.get(session.classId) || [];
    students.forEach((student, i) => {
      values.push({
        userId: uid,
        classId: session.classId,
        sessionId: session.id,
        studentId: student.id,
        groupName: i % 2 === 0 ? "A 组" : "B 组",
        points: 3 + ((i * 3) % 8),
        reason: REASONS[i % REASONS.length],
      });
    });
  }
  if (values.length > 0) {
    await db.insert(schema.classroomPoints).values(values);
    console.log("  ✓ 课堂积分 " + values.length + " 条");
  }
}

const feedbackRows = await db
  .select({ id: schema.studentFeedback.id })
  .from(schema.studentFeedback)
  .where(eq(schema.studentFeedback.userId, uid));
if (feedbackRows.length === 0) {
  const TAGS = ["课堂参与", "作业质量", "口语表达", "学习态度"];
  const values = [] as (typeof schema.studentFeedback.$inferInsert)[];
  for (const cls of classRows) {
    const students = studentsByClass.get(cls.id) || [];
    students.slice(0, 4).forEach((student, i) => {
      values.push({
        userId: uid,
        classId: cls.id,
        studentId: student.id,
        feedbackDate: dateStr(addDays(today, -2)),
        tag: TAGS[i % TAGS.length],
        type: i === 3 ? "negative" : "positive",
        remark: i === 3 ? "近期作业提交偏慢，需要跟进" : "表现稳定，继续保持",
      });
    });
  }
  if (values.length > 0) {
    await db.insert(schema.studentFeedback).values(values);
    console.log("  ✓ 学生反馈 " + values.length + " 条");
  }
}

const todayStr = dateStr(today);
const attendanceRows = await db
  .select({ id: schema.attendanceRecords.id })
  .from(schema.attendanceRecords)
  .where(eq(schema.attendanceRecords.userId, uid));
if (attendanceRows.length === 0) {
  const values = [] as (typeof schema.attendanceRecords.$inferInsert)[];
  for (const cls of classRows) {
    const students = studentsByClass.get(cls.id) || [];
    students.forEach((student, i) => {
      const status = i === 2 ? "late" : i === 5 ? "leave" : "present";
      values.push({
        userId: uid,
        classId: cls.id,
        studentId: student.id,
        attendanceDate: todayStr,
        status,
      });
    });
  }
  if (values.length > 0) {
    await db.insert(schema.attendanceRecords).values(values);
    console.log("  ✓ 今日考勤 " + values.length + " 条");
  }
}

console.log("✓ 预览数据准备完成");
process.exit(0);
