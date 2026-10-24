import { db } from "./db";
import { auditLogs, importJobs } from "@/db/schema/audit";
import { eq, and, isNull, desc } from "drizzle-orm";

/**
 * 审计日志写入。fire-and-forget，失败不阻塞主流程。
 * action 示例：create / update / delete / restore / purge / import / export / backup / login
 * resourceType 示例：student / class / dictation / exam / lesson_plan ...
 */
export async function audit(
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  detail?: unknown,
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      resourceType,
      resourceId: resourceId ?? null,
      detail: detail ?? null,
    });
  } catch (e) {
    console.warn("[audit] write failed:", e);
  }
}

/** 创建一个导入任务记录，返回其 id（用于后续更新进度） */
export async function createImportJob(
  userId: string,
  module: string,
  mode: string,
  fileName?: string,
): Promise<string> {
  const [job] = await db
    .insert(importJobs)
    .values({ userId, module, mode, status: "processing", fileName: fileName ?? null })
    .returning();
  return job.id;
}

/** 更新导入任务进度并落审计 */
export async function finishImportJob(
  jobId: string,
  result: { total: number; success: number; skip: number; fail: number; errors?: unknown[] },
): Promise<void> {
  try {
    await db
      .update(importJobs)
      .set({
        status: result.fail > 0 && result.success === 0 ? "failed" : "completed",
        totalRows: String(result.total),
        successCount: String(result.success),
        skipCount: String(result.skip),
        failCount: String(result.fail),
        errors: result.errors?.length ? result.errors : null,
        updatedAt: new Date(),
      })
      .where(eq(importJobs.id, jobId));
  } catch (e) {
    console.warn("[import-job] update failed:", e);
  }
}

/** 查询用户最近的审计日志 */
export async function listAuditLogs(userId: string, limit = 50) {
  return db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.userId, userId), isNull(auditLogs.deletedAt)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

/** 查询用户最近的导入任务 */
export async function listImportJobs(userId: string, limit = 20) {
  return db
    .select()
    .from(importJobs)
    .where(and(eq(importJobs.userId, userId), isNull(importJobs.deletedAt)))
    .orderBy(desc(importJobs.createdAt))
    .limit(limit);
}
