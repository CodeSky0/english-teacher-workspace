import { Hono } from "hono";
import { eq, and, isNotNull, type SQL, type AnyColumn } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { db } from "@/server/db";
import {
  classes, students, timetableCells, lessonPlans, teachingResearch,
  homework, exams, vocabUnits, vocabWords, dictationLists, teachingResources,
} from "@/db/schema";
import type { RouteEnv } from "../env";

const routes = new Hono<RouteEnv>();

type RecyclableColumns = {
  id: AnyColumn;
  userId: AnyColumn;
  deletedAt: AnyColumn;
  name?: AnyColumn;
  title?: AnyColumn;
  word?: AnyColumn;
  subject?: AnyColumn;
  classId?: AnyColumn;
};

type RecyclableRecord = {
  id: string;
  name?: string;
  title?: string;
  word?: string;
  subject?: string;
  deletedAt: Date | null;
  classId?: string | null;
};

const tables: Record<string, AnyPgTable> = {
  classes: classes as unknown as AnyPgTable,
  students: students as unknown as AnyPgTable,
  timetable_cells: timetableCells as unknown as AnyPgTable,
  lesson_plans: lessonPlans as unknown as AnyPgTable,
  teaching_research: teachingResearch as unknown as AnyPgTable,
  homework: homework as unknown as AnyPgTable,
  exams: exams as unknown as AnyPgTable,
  vocab_units: vocabUnits as unknown as AnyPgTable,
  vocab_words: vocabWords as unknown as AnyPgTable,
  dictation_lists: dictationLists as unknown as AnyPgTable,
  teaching_resources: teachingResources as unknown as AnyPgTable,
};

routes.get("/", async (c) => {
  const user = c.get("user");
  const moduleKey = c.req.query("module");
  const result: Array<{ type: string; id: string; title: string; deletedAt: Date | null; classId?: string | null }> = [];

  const entries = moduleKey ? [[moduleKey, tables[moduleKey]]] : Object.entries(tables);
  const validEntries = entries.filter(([, table]) => !!table) as [string, AnyPgTable][];

  const allRecords = await Promise.all(
    validEntries.map(([, table]) => {
      const t = table as unknown as RecyclableColumns;
      return db.select().from(table).where(and(eq(t.userId, user.id), isNotNull(t.deletedAt)));
    }),
  );

  for (let i = 0; i < validEntries.length; i++) {
    const [type] = validEntries[i];
    for (const r of allRecords[i] as RecyclableRecord[]) {
      result.push({
        type,
        id: r.id,
        title: r.name || r.title || r.word || r.subject || r.id,
        deletedAt: r.deletedAt,
        classId: r.classId,
      });
    }
  }
  result.sort((a, b) => (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0));
  return c.json({ data: result });
});

routes.post("/restore/:type/:id", async (c) => {
  const user = c.get("user");
  const type = c.req.param("type");
  const id = c.req.param("id");
  const table = tables[type];
  if (!table) return c.json({ error: { code: "NOT_FOUND", message: "未知类型" } }, 404);
  const t = table as unknown as RecyclableColumns;
  const [record] = await db.update(table)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(t.id, id), eq(t.userId, user.id), isNotNull(t.deletedAt)))
    .returning();
  if (!record) return c.json({ error: { code: "NOT_FOUND", message: "记录不存在" } }, 404);
  return c.json({ data: record });
});

routes.delete("/:type/:id", async (c) => {
  const user = c.get("user");
  const type = c.req.param("type");
  const id = c.req.param("id");
  const table = tables[type];
  if (!table) return c.json({ error: { code: "NOT_FOUND", message: "未知类型" } }, 404);
  const t = table as unknown as RecyclableColumns;
  const [record] = await db.delete(table)
    .where(and(eq(t.id, id), eq(t.userId, user.id), isNotNull(t.deletedAt)))
    .returning();
  if (!record) return c.json({ error: { code: "NOT_FOUND", message: "记录不存在" } }, 404);
  return c.json({ data: record });
});

export { routes as recycleRoutes };
