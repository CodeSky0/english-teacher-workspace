import { and, eq, isNull } from "drizzle-orm";
import type { QueryClient } from "@tanstack/react-query";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { classes, students } from "@/db/schema/classes";
import { exams } from "@/db/schema/exams";
import { homework } from "@/db/schema/homework";
import { lessonPlans, teachingResearch } from "@/db/schema/plans";
import { timetableCells } from "@/db/schema/schedule";
import { dictationLists } from "@/db/schema/dictation";
import { vocabUnits } from "@/db/schema/vocab";
import { teachingResources } from "@/db/schema/resources";
import { semesters } from "@/db/schema/semester";

export async function getCurrentClassId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("classId")?.value ?? null;
}

/**
 * 在 RSC layout 中批量预取所有 dashboard 页面的首屏列表数据。
 * userId 范围的查询始终执行；classId 范围的查询仅当 cookie 中有 currentClassId 时执行。
 * 所有查询并行，HydrationBoundary 注入后客户端 0 跳直达首屏数据。
 */
export async function populateDashboardQueries(qc: QueryClient, userId: string): Promise<void> {
  const classId = await getCurrentClassId();

  const tasks: Promise<unknown>[] = [
    qc.prefetchQuery({
      queryKey: ["classes"],
      queryFn: async () => ({ data: await db.select().from(classes).where(and(eq(classes.userId, userId), isNull(classes.deletedAt))) }),
    }),
    qc.prefetchQuery({
      queryKey: ["research"],
      queryFn: async () => ({ data: await db.select().from(teachingResearch).where(and(eq(teachingResearch.userId, userId), isNull(teachingResearch.deletedAt))) }),
    }),
    qc.prefetchQuery({
      queryKey: ["vocab-units"],
      queryFn: async () => ({ data: await db.select().from(vocabUnits).where(and(eq(vocabUnits.userId, userId), isNull(vocabUnits.deletedAt))) }),
    }),
    qc.prefetchQuery({
      queryKey: ["dict-lists"],
      queryFn: async () => ({ data: await db.select().from(dictationLists).where(and(eq(dictationLists.userId, userId), isNull(dictationLists.deletedAt))) }),
    }),
    qc.prefetchQuery({
      queryKey: ["resources"],
      queryFn: async () => ({ data: await db.select().from(teachingResources).where(and(eq(teachingResources.userId, userId), isNull(teachingResources.deletedAt))) }),
    }),
    qc.prefetchQuery({
      queryKey: ["semesters"],
      queryFn: async () => ({ data: await db.select().from(semesters).where(and(eq(semesters.userId, userId), isNull(semesters.deletedAt))) }),
    }),
  ];

  if (classId) {
    tasks.push(
      qc.prefetchQuery({
        queryKey: ["students", classId],
        queryFn: async () => ({ data: await db.select().from(students).where(and(eq(students.classId, classId), eq(students.userId, userId), isNull(students.deletedAt))) }),
      }),
      qc.prefetchQuery({
        queryKey: ["exams", classId],
        queryFn: async () => ({ data: await db.select().from(exams).where(and(eq(exams.classId, classId), eq(exams.userId, userId), isNull(exams.deletedAt))) }),
      }),
      qc.prefetchQuery({
        queryKey: ["homework", classId],
        queryFn: async () => ({ data: await db.select().from(homework).where(and(eq(homework.classId, classId), eq(homework.userId, userId), isNull(homework.deletedAt))) }),
      }),
      qc.prefetchQuery({
        queryKey: ["plans", classId],
        queryFn: async () => ({ data: await db.select().from(lessonPlans).where(and(eq(lessonPlans.classId, classId), eq(lessonPlans.userId, userId), isNull(lessonPlans.deletedAt))) }),
      }),
      qc.prefetchQuery({
        queryKey: ["schedule", classId],
        queryFn: async () => ({ data: await db.select().from(timetableCells).where(and(eq(timetableCells.classId, classId), eq(timetableCells.userId, userId), isNull(timetableCells.deletedAt))) }),
      }),
    );
  }

  await Promise.all(tasks);
}
