import { pgTable, text, boolean, integer, index } from "drizzle-orm/pg-core";
import { baseColumns, resourceTypeEnum } from "./_common";
import { user } from "./auth";

export const teachingResources = pgTable(
  "teaching_resources",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: resourceTypeEnum("type").notNull().default("other"),
    unit: text("unit"),
    description: text("description"),
    link: text("link"),
    isSample: boolean("is_sample").notNull().default(false),
    fileName: text("file_name"),
    blobUrl: text("blob_url"),
    blobPathname: text("blob_pathname"),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
  },
  (t) => ({
    userIdx: index("resources_user_idx").on(t.userId),
    typeIdx: index("resources_type_idx").on(t.userId, t.type),
  })
);

export type TeachingResource = typeof teachingResources.$inferSelect;
