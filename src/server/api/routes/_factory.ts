import { Hono } from "hono";
import { eq, and, isNull, count, type SQL, type AnyColumn } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { db } from "@/server/db";
import { notFound, unprocessable } from "../errors";
import { cached, bustUser } from "@/server/cache";
import type { RouteEnv } from "../env";

/** 资源表必须具备的列（运行时由各表满足，类型层用断言访问） */
type ResourceColumns = {
  id: AnyColumn;
  userId: AnyColumn;
  deletedAt: AnyColumn;
  classId?: AnyColumn;
  listId?: AnyColumn;
};

type CacheConfig = { key: (uid: string) => string; ttl: number };

const DEFAULT_PAGE_SIZE = 0;

export function createResourceRoutes(table: AnyPgTable, cache?: CacheConfig) {
  const routes = new Hono<RouteEnv>();
  const cols = table as unknown as ResourceColumns;

  routes.get("/", async (c) => {
    const user = c.get("user");
    const classId = c.req.query("classId");
    const listId = c.req.query("listId");
    const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
    const pageSize = Math.max(0, Number(c.req.query("pageSize") ?? DEFAULT_PAGE_SIZE) || 0);

    if (cache && !classId && !listId && pageSize === 0) {
      const records = await cached(cache.key(user.id), cache.ttl, () =>
        db.select().from(table).where(and(eq(cols.userId, user.id), isNull(cols.deletedAt))),
      );
      return c.json({ data: records });
    }

    const conditions: SQL[] = [eq(cols.userId, user.id), isNull(cols.deletedAt)];
    if (classId && cols.classId) {
      conditions.push(eq(cols.classId, classId));
    }
    if (listId && cols.listId) {
      conditions.push(eq(cols.listId, listId));
    }

    if (pageSize > 0) {
      const [records, totalRows] = await Promise.all([
        db.select().from(table).where(and(...conditions)).limit(pageSize).offset((page - 1) * pageSize),
        db.select({ value: count() }).from(table).where(and(...conditions)),
      ]);
      const total = totalRows[0]?.value ?? 0;
      return c.json({
        data: records,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    }

    const records = await db.select().from(table).where(and(...conditions));
    return c.json({ data: records });
  });

  routes.get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const records = await db.select().from(table).where(and(eq(cols.id, id), eq(cols.userId, user.id), isNull(cols.deletedAt)));
    if (records.length === 0) return notFound(c);
    return c.json({ data: records[0] });
  });

  routes.post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json().catch(() => null);
    if (!body) return unprocessable(c, "请求体不合法");
    const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...rest } = body;
    const [record] = await db.insert(table).values({ ...rest, userId: user.id }).returning();
    if (cache) await bustUser(user.id, cache.key(user.id));
    return c.json({ data: record }, 201);
  });

  routes.patch("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    if (!body) return unprocessable(c, "请求体不合法");
    const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...updateData } = body;
    const [record] = await db.update(table)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(cols.id, id), eq(cols.userId, user.id), isNull(cols.deletedAt)))
      .returning();
    if (!record) return notFound(c);
    if (cache) await bustUser(user.id, cache.key(user.id));
    return c.json({ data: record });
  });

  routes.delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const force = c.req.query("force") === "true";
    if (force) {
      const [record] = await db.delete(table)
        .where(and(eq(cols.id, id), eq(cols.userId, user.id)))
        .returning();
      if (!record) return notFound(c);
      if (cache) await bustUser(user.id, cache.key(user.id));
      return c.json({ data: record });
    }
    const [record] = await db.update(table)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(cols.id, id), eq(cols.userId, user.id), isNull(cols.deletedAt)))
      .returning();
    if (!record) return notFound(c);
    if (cache) await bustUser(user.id, cache.key(user.id));
    return c.json({ data: record });
  });

  return routes;
}
