import { pgTable, text, uuid, boolean, integer, index } from "drizzle-orm/pg-core";
import { baseColumns, genderEnum } from "./_common";
import { user } from "./auth";

export const classes = pgTable(
  "classes",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    enName: text("en_name"),
    gradeLevel: text("grade_level"),
    academicYear: text("academic_year"),
    isSample: boolean("is_sample").notNull().default(false),
  },
  (t) => ({
    userIdx: index("classes_user_idx").on(t.userId),
    nameIdx: index("classes_name_idx").on(t.userId, t.name),
  })
);

export const students = pgTable(
  "students",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    enName: text("en_name"),
    gender: genderEnum("gender").default("unknown"),
    studentNo: text("student_no"),
    seatNo: integer("seat_no"),
    isSample: boolean("is_sample").notNull().default(false),
  },
  (t) => ({
    userIdx: index("students_user_idx").on(t.userId),
    classIdx: index("students_class_idx").on(t.classId),
    noIdx: index("students_no_idx").on(t.classId, t.studentNo),
  })
);

export type Class = typeof classes.$inferSelect;
export type Student = typeof students.$inferSelect;
