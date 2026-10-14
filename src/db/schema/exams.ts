import { pgTable, text, uuid, date, boolean, numeric, index } from "drizzle-orm/pg-core";
import { baseColumns } from "./_common";
import { user } from "./auth";
import { classes } from "./classes";
import { students } from "./classes";

export const exams = pgTable(
  "exams",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    examDate: date("exam_date"),
    type: text("type"),
    remark: text("remark"),
    isSample: boolean("is_sample").notNull().default(false),
  },
  (t) => ({
    userIdx: index("exams_user_idx").on(t.userId),
    classIdx: index("exams_class_idx").on(t.classId),
  })
);

export const examScores = pgTable(
  "exam_scores",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    listeningScore: numeric("listening_score"),
    speakingScore: numeric("speaking_score"),
    writtenScore: numeric("written_score"),
    totalScore: numeric("total_score"),
    totalIsManual: boolean("total_is_manual").notNull().default(false),
    remark: text("remark"),
  },
  (t) => ({
    userIdx: index("scores_user_idx").on(t.userId),
    examIdx: index("scores_exam_idx").on(t.examId),
    studentIdx: index("scores_student_idx").on(t.studentId),
  })
);

export type Exam = typeof exams.$inferSelect;
export type ExamScore = typeof examScores.$inferSelect;
