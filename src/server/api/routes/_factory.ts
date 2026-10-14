import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { notFound, unprocessable } from "../errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Table = any;

export function createResourceRoutes(table: Table) {
  const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

  routes.get("/", async (c) => {
    const user = c.get("user");
    const classId = c.req.query("classId");
    const conditions = [eq(table.userId, user.id), isNull(table.deletedAt)];
    if (classId && table.classId) {
      conditions.push(eq(table.classId, classId));
    }
    const records = await db.select().from(table).where(and(...conditions));
    return c.json({ data: records });
  });

  routes.get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const records = await db.select().from(table).where(and(eq(table.id, id), eq(table.userId, user.id), isNull(table.deletedAt)));
    if (records.length === 0) return notFound(c);
    return c.json({ data: records[0] });
  });

  routes.post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json().catch(() => null);
    if (!body) return unprocessable(c, "请求体不合法");
    const [record] = await db.insert(table).values({ ...body, userId: user.id }).returning();
    return c.json({ data: record }, 201);
  });

  routes.patch("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    if (!body) return unprocessable(c, "请求体不合法");
    const { id: _id, userId: _uid, createdAt: _ca, ...updateData } = body;
    const [record] = await db.update(table)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(table.id, id), eq(table.userId, user.id), isNull(table.deletedAt)))
      .returning();
    if (!record) return notFound(c);
    return c.json({ data: record });
  });

  routes.delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const force = c.req.query("force") === "true";
    if (force) {
      const [record] = await db.delete(table)
        .where(and(eq(table.id, id), eq(table.userId, user.id)))
        .returning();
      if (!record) return notFound(c);
      return c.json({ data: record });
    }
    const [record] = await db.update(table)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(table.id, id), eq(table.userId, user.id), isNull(table.deletedAt)))
      .returning();
    if (!record) return notFound(c);
    return c.json({ data: record });
  });

  return routes;
}
