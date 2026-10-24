import { Hono } from "hono";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { classroomPolls, classroomPollOptions, classroomPollVotes } from "@/db/schema/classroom";
import { badRequest, notFound } from "../errors";

const routes = new Hono();

routes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [poll] = await db
    .select()
    .from(classroomPolls)
    .where(and(eq(classroomPolls.id, id), eq(classroomPolls.isActive, true), isNull(classroomPolls.deletedAt)));
  if (!poll) return notFound(c, "投票不存在或已结束");

  const options = await db
    .select()
    .from(classroomPollOptions)
    .where(and(eq(classroomPollOptions.pollId, id), isNull(classroomPollOptions.deletedAt)));

  return c.json({
    data: {
      id: poll.id,
      question: poll.question,
      type: poll.type,
      options: options.map((o) => ({ id: o.id, label: o.label, voteCount: o.voteCount })),
    },
  });
});

routes.post("/:id/vote", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body) return badRequest(c, "请求体不合法");
  const optionId = String(body.optionId ?? "");
  if (!optionId) return badRequest(c, "缺少 optionId");

  const [poll] = await db
    .select()
    .from(classroomPolls)
    .where(and(eq(classroomPolls.id, id), eq(classroomPolls.isActive, true), isNull(classroomPolls.deletedAt)));
  if (!poll) return notFound(c, "投票不存在或已结束");

  const [option] = await db
    .select()
    .from(classroomPollOptions)
    .where(and(eq(classroomPollOptions.id, optionId), eq(classroomPollOptions.pollId, id), isNull(classroomPollOptions.deletedAt)));
  if (!option) return notFound(c, "选项不存在");

  const voterKey = String(body.voterKey ?? "").slice(0, 64) || null;

  if (voterKey) {
    const existing = await db
      .select()
      .from(classroomPollVotes)
      .where(and(eq(classroomPollVotes.pollId, id), eq(classroomPollVotes.voterKey, voterKey), isNull(classroomPollVotes.deletedAt)));
    if (existing.length > 0) {
      return c.json({ data: { voted: true, note: "已投过票" } });
    }
  }

  await db.transaction(async (tx) => {
    await tx.insert(classroomPollVotes).values({ pollId: id, optionId, studentId: null, voterKey });
    await tx
      .update(classroomPollOptions)
      .set({ voteCount: sql`${classroomPollOptions.voteCount} + 1` })
      .where(eq(classroomPollOptions.id, optionId));
  });

  const options = await db
    .select()
    .from(classroomPollOptions)
    .where(and(eq(classroomPollOptions.pollId, id), isNull(classroomPollOptions.deletedAt)));

  return c.json({
    data: {
      voted: true,
      options: options.map((o) => ({ id: o.id, label: o.label, voteCount: o.voteCount })),
    },
  });
});

export { routes as pollRoutes };
