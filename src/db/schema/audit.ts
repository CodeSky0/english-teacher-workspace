import { pgTable, text, jsonb, index } from "drizzle-orm/pg-core";
import { baseColumns, importJobStatusEnum } from "./_common";
import { user } from "./auth";

export const auditLogs = pgTable(
  "audit_logs",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    detail: jsonb("detail"),
  },
  (t) => ({
    userIdx: index("audit_user_idx").on(t.userId),
    resourceIdx: index("audit_resource_idx").on(t.resourceType, t.resourceId),
  })
);

export const importJobs = pgTable(
  "import_jobs",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    module: text("module").notNull(),
    mode: text("mode").notNull(),
    status: importJobStatusEnum("status").notNull().default("pending"),
    fileName: text("file_name"),
    totalRows: text("total_rows"),
    successCount: text("success_count"),
    skipCount: text("skip_count"),
    failCount: text("fail_count"),
    errors: jsonb("errors"),
  },
  (t) => ({
    userIdx: index("import_jobs_user_idx").on(t.userId),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type ImportJob = typeof importJobs.$inferSelect;
