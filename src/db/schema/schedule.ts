import { pgTable, text, uuid, integer, time, index } from "drizzle-orm/pg-core";
import { baseColumns } from "./_common";
import { user } from "./auth";
import { classes } from "./classes";

export const timetablePeriods = pgTable(
  "timetable_periods",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    periodNo: integer("period_no").notNull(),
    name: text("name").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
  },
  (t) => ({
    userIdx: index("periods_user_idx").on(t.userId),
    noIdx: index("periods_no_idx").on(t.userId, t.periodNo),
  })
);

export const timetableCells = pgTable(
  "timetable_cells",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    periodNo: integer("period_no").notNull(),
    subject: text("subject"),
    classroom: text("classroom"),
  },
  (t) => ({
    userIdx: index("cells_user_idx").on(t.userId),
    classIdx: index("cells_class_idx").on(t.classId),
    cellIdx: index("cells_cell_idx").on(t.classId, t.dayOfWeek, t.periodNo),
  })
);

export type TimetablePeriod = typeof timetablePeriods.$inferSelect;
export type TimetableCell = typeof timetableCells.$inferSelect;
