import { pgTable, text, date, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";
import { baseColumns, attendanceStatusEnum, pollTypeEnum, feedbackTypeEnum } from "./_common";
import { user } from "./auth";
import { classes } from "./classes";
import { students } from "./classes";

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    status: attendanceStatusEnum("status").notNull().default("unrecorded"),
    remark: text("remark"),
  },
  (t) => ({
    userIdx: index("attendance_user_idx").on(t.userId),
    classIdx: index("attendance_class_idx").on(t.classId),
    dateIdx: index("attendance_date_idx").on(t.classId, t.attendanceDate),
    studentIdx: index("attendance_student_idx").on(t.studentId),
  })
);

export const classroomSessions = pgTable(
  "classroom_sessions",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    sessionDate: date("session_date").notNull(),
    activity: text("activity"),
    note: text("note"),
  },
  (t) => ({
    userIdx: index("cls_session_user_idx").on(t.userId),
    classIdx: index("cls_session_class_idx").on(t.classId),
  })
);

export const classroomPoints = pgTable(
  "classroom_points",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => classroomSessions.id, { onDelete: "set null" }),
    studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    groupName: text("group_name"),
    points: integer("points").notNull().default(0),
    reason: text("reason"),
  },
  (t) => ({
    userIdx: index("cls_points_user_idx").on(t.userId),
    classIdx: index("cls_points_class_idx").on(t.classId),
    studentIdx: index("cls_points_student_idx").on(t.studentId),
  })
);

export const studentFeedback = pgTable(
  "student_feedback",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => classroomSessions.id, { onDelete: "set null" }),
    feedbackDate: date("feedback_date"),
    tag: text("tag").notNull(),
    type: feedbackTypeEnum("type").notNull().default("positive"),
    remark: text("remark"),
  },
  (t) => ({
    userIdx: index("feedback_user_idx").on(t.userId),
    studentIdx: index("feedback_student_idx").on(t.studentId),
  })
);

export const classroomPolls = pgTable(
  "classroom_polls",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => classroomSessions.id, { onDelete: "set null" }),
    question: text("question").notNull(),
    type: pollTypeEnum("type").notNull().default("single_choice"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => ({
    userIdx: index("polls_user_idx").on(t.userId),
    classIdx: index("polls_class_idx").on(t.classId),
  })
);

export const classroomPollOptions = pgTable(
  "classroom_poll_options",
  {
    ...baseColumns,
    pollId: text("poll_id").notNull().references(() => classroomPolls.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    voteCount: integer("vote_count").notNull().default(0),
  },
  (t) => ({
    pollIdx: index("poll_options_poll_idx").on(t.pollId),
  })
);

export const classroomPollVotes = pgTable(
  "classroom_poll_votes",
  {
    ...baseColumns,
    pollId: text("poll_id").notNull().references(() => classroomPolls.id, { onDelete: "cascade" }),
    optionId: text("option_id").notNull().references(() => classroomPollOptions.id, { onDelete: "cascade" }),
    studentId: text("student_id"),
  },
  (t) => ({
    pollIdx: index("poll_votes_poll_idx").on(t.pollId),
  })
);

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type ClassroomSession = typeof classroomSessions.$inferSelect;
export type ClassroomPoint = typeof classroomPoints.$inferSelect;
export type StudentFeedback = typeof studentFeedback.$inferSelect;
export type ClassroomPoll = typeof classroomPolls.$inferSelect;
export type ClassroomPollOption = typeof classroomPollOptions.$inferSelect;
