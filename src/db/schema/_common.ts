import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";

export const baseColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const homeworkStatusEnum = pgEnum("homework_status", ["draft", "published", "closed"]);
export const homeworkRecordStatusEnum = pgEnum("homework_record_status", ["unsubmitted", "submitted", "late", "graded"]);
export const lessonPlanStatusEnum = pgEnum("lesson_plan_status", ["pending", "planning", "completed", "taught"]);
export const researchTypeEnum = pgEnum("research_type", ["observation", "collective_planning", "meeting", "public_class", "paper", "training", "other"]);
export const resourceTypeEnum = pgEnum("resource_type", ["courseware", "lesson_plan", "exam", "audio", "video", "reading", "research", "other"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["unrecorded", "present", "absent", "late", "leave"]);
export const pollTypeEnum = pgEnum("poll_type", ["single_choice", "true_false", "raise_hand"]);
export const genderEnum = pgEnum("gender", ["male", "female", "unknown"]);
export const feedbackTypeEnum = pgEnum("feedback_type", ["positive", "negative"]);
export const importJobStatusEnum = pgEnum("import_job_status", ["pending", "processing", "completed", "failed"]);
