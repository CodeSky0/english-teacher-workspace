import { Hono } from "hono";
import { eq, and, isNotNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  classes, students, timetableCells, lessonPlans, teachingResearch,
  homework, exams, vocabUnits, vocabWords, dictationLists, teachingResources,
} from "@/db/schema";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

const tables: Record<string, any> = {
  classes, students, timetable_cells: timetableCells, lesson_plans: lessonPlans,
  teaching_research: teachingResearch, homework, exams, vocab_units: vocabUnits,
  vocab_words: vocabWords, dictation_lists: dictationLists, teaching_resources: teachingResources,
};

routes.get("/", async (c) => {
  const user = c.get("user");
  const module = c.req.query("module");
  const result: Array<{ type: string; id: string; title: string; deletedAt: Date | null; classId?: string | null }> = [];

  const entries = module ? [[module, tables[module]]] : Object.entries(tables);
  for (const [type, table] of entries) {
    if (!table) continue;
    const records = await db.select().from(table).where(and(eq(table.userId, user.id), isNotNull(table.deletedAt)));
    for (const r of records) {
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
  const [record] = await db.update(table)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(table.id, id), eq(table.userId, user.id)))
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
  const [record] = await db.delete(table)
    .where(and(eq(table.id, id), eq(table.userId, user.id)))
    .returning();
  if (!record) return c.json({ error: { code: "NOT_FOUND", message: "记录不存在" } }, 404);
  return c.json({ data: record });
});

export { routes as recycleRoutes };
