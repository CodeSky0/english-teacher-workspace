import { pgTable, text, date, boolean, index } from "drizzle-orm/pg-core";
import { baseColumns, lessonPlanStatusEnum, researchTypeEnum } from "./_common";
import { user } from "./auth";
import { classes } from "./classes";

export const lessonPlans = pgTable(
  "lesson_plans",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: text("class_id").references(() => classes.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    textbookVersion: text("textbook_version"),
    gradeLevel: text("grade_level"),
    unit: text("unit"),
    lessonType: text("lesson_type"),
    teachDate: date("teach_date"),
    objectives: text("objectives"),
    keyPoints: text("key_points"),
    teachingProcess: text("teaching_process"),
    teachingResources: text("teaching_resources"),
    reflection: text("reflection"),
    status: lessonPlanStatusEnum("status").notNull().default("pending"),
    isSample: boolean("is_sample").notNull().default(false),
  },
  (t) => ({
    userIdx: index("plans_user_idx").on(t.userId),
    classIdx: index("plans_class_idx").on(t.classId),
    dateIdx: index("plans_date_idx").on(t.userId, t.teachDate),
  })
);

export const teachingResearch = pgTable(
  "teaching_research",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    researchDate: date("research_date"),
    type: researchTypeEnum("type").notNull().default("meeting"),
    participants: text("participants"),
    content: text("content"),
    takeaways: text("takeaways"),
    insights: text("insights"),
    remark: text("remark"),
    isSample: boolean("is_sample").notNull().default(false),
  },
  (t) => ({
    userIdx: index("research_user_idx").on(t.userId),
    dateIdx: index("research_date_idx").on(t.userId, t.researchDate),
  })
);

export type LessonPlan = typeof lessonPlans.$inferSelect;
export type TeachingResearch = typeof teachingResearch.$inferSelect;
