import { Hono } from "hono";
import { listAuditLogs, listImportJobs } from "@/server/audit";
import type { RouteEnv } from "../env";

const routes = new Hono<RouteEnv>();

routes.get("/logs", async (c) => {
  const user = c.get("user");
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? 50) || 50));
  const logs = await listAuditLogs(user.id, limit);
  return c.json({ data: logs });
});

routes.get("/jobs", async (c) => {
  const user = c.get("user");
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") ?? 20) || 20));
  const jobs = await listImportJobs(user.id, limit);
  return c.json({ data: jobs });
});

export { routes as auditRoutes };
