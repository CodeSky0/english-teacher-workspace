import { eq, and, isNull } from "drizzle-orm";
import { put, del } from "@vercel/blob";
import { createResourceRoutes } from "./_factory";
import { teachingResources } from "@/db/schema/resources";
import { db } from "@/server/db";
import { bustUser } from "@/server/cache";
import { audit } from "@/server/audit";
import { notFound, unprocessable, badRequest, serverError } from "../errors";
import type { AnyPgTable } from "drizzle-orm/pg-core";

const routes = createResourceRoutes(teachingResources as unknown as AnyPgTable);

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/aac", "audio/x-m4a", "audio/mp4",
  "video/mp4", "video/webm", "video/ogg", "video/x-msvideo",
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/zip",
  "text/plain",
]);

function mimeToResourceType(mime: string): "audio" | "video" | "reading" | "courseware" | "other" {
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "reading";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "courseware";
  if (mime.startsWith("image/")) return "reading";
  return "other";
}

routes.post("/upload", async (c) => {
  const user = c.get("user");
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return serverError(c, "未配置 BLOB_READ_WRITE_TOKEN，文件上传不可用");
  }

  const formData = await c.req.formData().catch(() => null);
  if (!formData) return unprocessable(c, "请上传文件");
  const file = formData.get("file");
  if (!(file instanceof File)) return badRequest(c, "缺少 file 字段");
  if (file.size === 0) return badRequest(c, "文件为空");
  if (file.size > MAX_FILE_SIZE) return unprocessable(c, "文件不能超过 50MB");

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) return unprocessable(c, `不支持的文件类型: ${mime}`);

  const title = (formData.get("title") as string | null)?.trim() || file.name.replace(/\.[^.]+$/, "");
  const unit = (formData.get("unit") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const typeOverride = (formData.get("type") as string | null)?.trim();
  const resourceType = typeOverride || mimeToResourceType(mime);

  const pathname = `resources/${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  let blob;
  try {
    blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: mime,
    });
  } catch (e) {
    console.error("[blob] upload failed:", e);
    return serverError(c, "文件上传失败");
  }

  const [record] = await db
    .insert(teachingResources)
    .values({
      userId: user.id,
      title,
      type: resourceType as "audio" | "video" | "reading" | "courseware" | "other",
      unit,
      description,
      fileName: file.name,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      mimeType: mime,
      fileSize: file.size,
    })
    .returning();

  await bustUser(user.id);
  void audit(user.id, "create", "resource", record.id, { title, fileName: file.name, blobUrl: blob.url });
  return c.json({ data: record }, 201);
});

routes.delete("/:id/file", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const [record] = await db
    .select()
    .from(teachingResources)
    .where(and(eq(teachingResources.id, id), eq(teachingResources.userId, user.id), isNull(teachingResources.deletedAt)));
  if (!record) return notFound(c);
  if (!record.blobPathname) return badRequest(c, "该资源没有关联文件");

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(record.blobPathname);
    } catch (e) {
      console.warn("[blob] delete failed:", e);
    }
  }

  const [updated] = await db
    .update(teachingResources)
    .set({
      fileName: null,
      blobUrl: null,
      blobPathname: null,
      mimeType: null,
      fileSize: null,
      updatedAt: new Date(),
    })
    .where(and(eq(teachingResources.id, id), eq(teachingResources.userId, user.id)))
    .returning();

  void audit(user.id, "delete", "resource_file", id, { blobPathname: record.blobPathname });
  return c.json({ data: updated });
});

export { routes as resourcesRoutes };
