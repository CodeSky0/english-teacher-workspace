import { pgTable, text, uuid, date, boolean, index } from "drizzle-orm/pg-core";
import { baseColumns, homeworkStatusEnum, homeworkRecordStatusEnum } from "./_common";
import { user } from "./auth";
import { classes } from "./classes";
import { students } from "./classes";
import { vocabUnits } from "./vocab";

export const homework = pgTable(
  "homework",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    assignDate: date("assign_date"),
    dueDate: date("due_date"),
    type: text("type"),
    content: text("content"),
    status: homeworkStatusEnum("status").notNull().default("draft"),
    remark: text("remark"),
    vocabUnitId: uuid("vocab_unit_id").references(() => vocabUnits.id, { onDelete: "set null" }),
    isSample: boolean("is_sample").notNull().default(false),
  },
  (t) => ({
    userIdx: index("homework_user_idx").on(t.userId),
    classIdx: index("homework_class_idx").on(t.classId),
  })
);

export const homeworkRecords = pgTable(
  "homework_records",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    homeworkId: uuid("homework_id").notNull().references(() => homework.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    status: homeworkRecordStatusEnum("status").notNull().default("unsubmitted"),
    score: text("score"),
    remark: text("remark"),
  },
  (t) => ({
    userIdx: index("hw_records_user_idx").on(t.userId),
    hwIdx: index("hw_records_hw_idx").on(t.homeworkId),
    studentIdx: index("hw_records_student_idx").on(t.studentId),
  })
);

export type Homework = typeof homework.$inferSelect;
export type HomeworkRecord = typeof homeworkRecords.$inferSelect;
