import { pgTable, text, uuid, date, boolean, integer, index } from "drizzle-orm/pg-core";
import { baseColumns } from "./_common";
import { user } from "./auth";
import { classes } from "./classes";
import { vocabWords } from "./vocab";

export const dictationLists = pgTable(
  "dictation_lists",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    dictationDate: date("dictation_date"),
    isSample: boolean("is_sample").notNull().default(false),
    /** 过不过规则类型：none=不评定 / wrong=错词上限 / score=分数下限 */
    passType: text("pass_type").notNull().default("none"),
    /** 规则阈值：wrong 时为允许错的最大个数，score 时为百分制及格线 */
    passValue: integer("pass_value"),
  },
  (t) => ({
    userIdx: index("dict_lists_user_idx").on(t.userId),
    classIdx: index("dict_lists_class_idx").on(t.classId),
  })
);

export const dictationWords = pgTable(
  "dictation_words",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    listId: uuid("list_id").notNull().references(() => dictationLists.id, { onDelete: "cascade" }),
    vocabWordId: uuid("vocab_word_id").references(() => vocabWords.id, { onDelete: "set null" }),
    word: text("word").notNull(),
    meaning: text("meaning"),
    /** 分值权重：加权得分时每个正确词贡献的分数，默认 1 */
    scoreWeight: integer("score_weight").notNull().default(1),
  },
  (t) => ({
    userIdx: index("dict_words_user_idx").on(t.userId),
    listIdx: index("dict_words_list_idx").on(t.listId),
  })
);

export const dictationResults = pgTable(
  "dictation_results",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    listId: uuid("list_id").notNull().references(() => dictationLists.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull(),
    wordId: uuid("word_id").notNull(),
    isCorrect: boolean("is_correct"),
  },
  (t) => ({
    userIdx: index("dict_results_user_idx").on(t.userId),
    listIdx: index("dict_results_list_idx").on(t.listId),
    studentIdx: index("dict_results_student_idx").on(t.studentId),
  })
);

export type DictationList = typeof dictationLists.$inferSelect;
export type DictationWord = typeof dictationWords.$inferSelect;
export type DictationResult = typeof dictationResults.$inferSelect;
