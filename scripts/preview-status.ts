/**
 * 预览数据体检：统计本地 PGlite 中各表的行数，并校验演示账号密码哈希。
 * 用法：pnpm preview:status
 * 注意：PGlite 单进程独占数据目录，运行前请先停掉 pnpm dev。
 */
import { eq } from "drizzle-orm";
import { db, pgliteReady } from "@/server/db";
import * as schema from "@/db/schema";
import { verifyPassword } from "better-auth/crypto";

async function main() {
  if (!pgliteReady) {
    console.error("✗ 当前不是 PGlite 模式（检查 .env.local 的 DATABASE_URL）");
    process.exit(1);
  }
  await pgliteReady;

  const counts: Array<[string, number]> = [];
  const tables = {
    user: schema.user,
    classes: schema.classes,
    students: schema.students,
    timetablePeriods: schema.timetablePeriods,
    timetableCells: schema.timetableCells,
    semesters: schema.semesters,
    weekPlans: schema.weekPlans,
    lessonPlans: schema.lessonPlans,
    teachingResearch: schema.teachingResearch,
    homework: schema.homework,
    homeworkRecords: schema.homeworkRecords,
    exams: schema.exams,
    examScores: schema.examScores,
    vocabUnits: schema.vocabUnits,
    vocabWords: schema.vocabWords,
    dictationLists: schema.dictationLists,
    dictationWords: schema.dictationWords,
    dictationResults: schema.dictationResults,
    teachingResources: schema.teachingResources,
    classroomSessions: schema.classroomSessions,
    classroomPoints: schema.classroomPoints,
    studentFeedback: schema.studentFeedback,
    attendanceRecords: schema.attendanceRecords,
  } as const;

  for (const [name, table] of Object.entries(tables)) {
    const rows = await db.select().from(table);
    counts.push([name, rows.length]);
  }
  for (const [name, n] of counts) {
    console.log(name.padEnd(20, " ") + n);
  }

  const demo = await db.select().from(schema.user).where(eq(schema.user.email, "teacher@demo.local"));
  if (demo.length === 0) {
    console.error("✗ 找不到演示账号 teacher@demo.local");
    process.exit(1);
  }
  const accounts = await db.select().from(schema.account).where(eq(schema.account.userId, demo[0].id));
  const credential = accounts.find((a) => a.providerId === "credential" && a.password);
  const passwordOk = credential ? await verifyPassword({ hash: credential.password as string, password: "demo1234" }) : false;

  console.log("");
  console.log("演示账号：" + demo[0].email + " / demo1234  密码校验=" + (passwordOk ? "OK" : "FAIL") + "  user.id=" + demo[0].id);
  process.exit(passwordOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
