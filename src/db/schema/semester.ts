import { pgTable, text, uuid, date, integer, boolean, index, pgEnum } from "drizzle-orm/pg-core";
import { baseColumns } from "./_common";
import { user } from "./auth";
import { classes } from "./classes";

export const weekPlanStatusEnum = pgEnum("week_plan_status", ["planned", "in_progress", "done", "skipped"]);

export const semesters = pgTable(
  "semesters",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    goal: text("goal"),
    totalWeeks: integer("total_weeks"),
  },
  (t) => ({
    userIdx: index("semesters_user_idx").on(t.userId),
  })
);

export const weekPlans = pgTable(
  "week_plans",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    semesterId: uuid("semester_id").notNull().references(() => semesters.id, { onDelete: "cascade" }),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
    weekNo: integer("week_no").notNull(),
    weekStart: date("week_start").notNull(),
    weekEnd: date("week_end").notNull(),
    topic: text("topic"),
    objective: text("objective"),
    content: text("content"),
    status: weekPlanStatusEnum("status").notNull().default("planned"),
  },
  (t) => ({
    userIdx: index("week_plans_user_idx").on(t.userId),
    semesterIdx: index("week_plans_semester_idx").on(t.semesterId),
  })
);

export type Semester = typeof semesters.$inferSelect;
export type WeekPlan = typeof weekPlans.$inferSelect;
