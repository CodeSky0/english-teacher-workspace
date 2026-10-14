import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  attendanceRecords, classroomSessions, classroomPoints,
  studentFeedback, classroomPolls, classroomPollOptions,
} from "@/db/schema/classroom";
import { notFound } from "../errors";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

function makeSubRoutes(table: any, extraFields: string[] = []) {
  const sub = new Hono<{ Variables: { user: { id: string }; session: any } }>();
  sub.get("/", async (c) => {
    const user = c.get("user");
    const classId = c.req.query("classId");
    const conds = [eq(table.userId, user.id), isNull(table.deletedAt)];
    if (classId && table.classId) conds.push(eq(table.classId, classId));
    const records = await db.select().from(table).where(and(...conds));
    return c.json({ data: records });
  });
  sub.post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();
    const [record] = await db.insert(table).values({ ...body, userId: user.id }).returning();
    return c.json({ data: record }, 201);
  });
  sub.patch("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();
    const { id: _id, userId: _uid, createdAt: _ca, ...updateData } = body;
    const [record] = await db.update(table).set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(table.id, id), eq(table.userId, user.id), isNull(table.deletedAt))).returning();
    if (!record) return notFound(c);
    return c.json({ data: record });
  });
  sub.delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const [record] = await db.update(table).set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(table.id, id), eq(table.userId, user.id), isNull(table.deletedAt))).returning();
    if (!record) return notFound(c);
    return c.json({ data: record });
  });
  return sub;
}

routes.route("/attendance", makeSubRoutes(attendanceRecords));
routes.route("/sessions", makeSubRoutes(classroomSessions));
routes.route("/points", makeSubRoutes(classroomPoints));
routes.route("/feedback", makeSubRoutes(studentFeedback));
routes.route("/polls", makeSubRoutes(classroomPolls));
routes.route("/poll-options", makeSubRoutes(classroomPollOptions));

export { routes as classroomRoutes };
