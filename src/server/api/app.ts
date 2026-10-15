import { Hono } from "hono";
import { logger } from "hono/logger";
import { auth } from "@/server/auth/auth";
import { unauthorized } from "./errors";
import { classesRoutes } from "./routes/classes";
import { studentsRoutes } from "./routes/students";
import { scheduleRoutes } from "./routes/schedule";
import { plansRoutes } from "./routes/plans";
import { researchRoutes } from "./routes/research";
import { homeworkRoutes } from "./routes/homework";
import { examsRoutes } from "./routes/exams";
import { vocabRoutes } from "./routes/vocab";
import { dictationRoutes } from "./routes/dictation";
import { resourcesRoutes } from "./routes/resources";
import { classroomRoutes } from "./routes/classroom";
import { profileRoutes } from "./routes/profile";
import { recycleRoutes } from "./routes/recycle";
import { backupRoutes } from "./routes/backup";
import { aiRoutes } from "./routes/ai";
import { excelRoutes } from "./routes/excel";
import { importExportRoutes } from "./routes/import-export";
import { overviewRoutes } from "./routes/overview";

type AppEnv = {
  Variables: {
    user: { id: string; name: string; email: string };
    session: any;
  };
};

const app = new Hono<AppEnv>();

app.use("*", logger());

app.get("/api/health", (c) => c.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/health") return next();
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return unauthorized(c);
  c.set("user", session.user as any);
  c.set("session", session.session);
  await next();
});

const api = new Hono<AppEnv>();
api.route("/profile", profileRoutes);
api.route("/classes", classesRoutes);
api.route("/students", studentsRoutes);
api.route("/schedule", scheduleRoutes);
api.route("/plans", plansRoutes);
api.route("/research", researchRoutes);
api.route("/homework", homeworkRoutes);
api.route("/exams", examsRoutes);
api.route("/vocab", vocabRoutes);
api.route("/dictation", dictationRoutes);
api.route("/resources", resourcesRoutes);
api.route("/classroom", classroomRoutes);
api.route("/recycle", recycleRoutes);
api.route("/backup", backupRoutes);
api.route("/ai", aiRoutes);
api.route("/excel", excelRoutes);
api.route("/overview", overviewRoutes);
// 导入/导出路由自带 /import、/export 前缀，直接挂在 api 根上
api.route("/", importExportRoutes);

app.route("/api", api);

export { app };
