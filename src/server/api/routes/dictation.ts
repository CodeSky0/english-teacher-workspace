import { createResourceRoutes } from "./_factory";
import { dictationLists, dictationWords, dictationResults } from "@/db/schema/dictation";
import { Hono } from "hono";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { badRequest, notFound, unprocessable } from "../errors";
import { cached, bustUser, ck } from "@/server/cache";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

const listsCrud = createResourceRoutes(dictationLists as any, { key: ck.dictLists, ttl: 300 });
const wordsCrud = createResourceRoutes(dictationWords as any, { key: ck.dictWords, ttl: 300 });
const resultsCrud = createResourceRoutes(dictationResults as any);

routes.route("/lists", listsCrud);
routes.route("/words", wordsCrud);
routes.route("/results", resultsCrud);

/**
 * 听写成绩批量保存（幂等）。
 * body: { results: [{ studentId, wordId, isCorrect: boolean | null }] }
 * isCorrect 为 null 表示清除该格记录。
 */
routes.post("/lists/:listId/results", async (c) => {
  const user = c.get("user");
  const listId = c.req.param("listId");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");

  const [list] = await db
    .select({ id: dictationLists.id })
    .from(dictationLists)
    .where(and(eq(dictationLists.id, listId), eq(dictationLists.userId, user.id), isNull(dictationLists.deletedAt)));
  if (!list) return notFound(c, "听写词表不存在");

  const incoming: { studentId: string; wordId: string; isCorrect: boolean | null }[] = Array.isArray(body.results)
    ? body.results
    : [];
  if (incoming.length === 0) return badRequest(c, "没有需要保存的成绩");

  const existing = await db
    .select()
    .from(dictationResults)
    .where(and(eq(dictationResults.listId, listId), eq(dictationResults.userId, user.id)));
  const byKey = new Map(existing.map((r) => [`${r.studentId}:${r.wordId}`, r]));

  const inserts: (typeof dictationResults.$inferInsert)[] = [];
  const updates: { id: string; isCorrect: boolean }[] = [];
  const deletes: string[] = [];
  let unchanged = 0;

  for (const item of incoming) {
    const studentId = String(item?.studentId ?? "");
    const wordId = String(item?.wordId ?? "");
    if (!studentId || !wordId) continue;
    const key = `${studentId}:${wordId}`;
    const found = byKey.get(key);

    if (item.isCorrect === true || item.isCorrect === false) {
      if (found) {
        if (found.isCorrect === item.isCorrect) unchanged++;
        else updates.push({ id: found.id, isCorrect: item.isCorrect });
      } else {
        inserts.push({ userId: user.id, listId, studentId, wordId, isCorrect: item.isCorrect });
      }
    } else if (found) {
      deletes.push(found.id);
    }
  }

  if (inserts.length) await db.insert(dictationResults).values(inserts);
  for (const u of updates) {
    await db
      .update(dictationResults)
      .set({ isCorrect: u.isCorrect, updatedAt: new Date() })
      .where(eq(dictationResults.id, u.id));
  }
  if (deletes.length) {
    await db.delete(dictationResults).where(inArray(dictationResults.id, deletes));
  }

  if (inserts.length || updates.length || deletes.length) {
    await bustUser(user.id, ck.dictResults(user.id, listId));
  }

  return c.json({
    data: { created: inserts.length, updated: updates.length, deleted: deletes.length, unchanged },
  });
});

/** 某个词表的全部成绩，前端成绩表一次拿全 */
routes.get("/lists/:listId/results", async (c) => {
  const user = c.get("user");
  const listId = c.req.param("listId");
  const records = await cached(ck.dictResults(user.id, listId), 120, () =>
    db.select().from(dictationResults).where(and(eq(dictationResults.listId, listId), eq(dictationResults.userId, user.id))),
  );
  return c.json({ data: records });
});

export { routes as dictationRoutes };
