import { pgTable, text, date, boolean, index } from "drizzle-orm/pg-core";
import { baseColumns } from "./_common";
import { user } from "./auth";
import { classes } from "./classes";
import { vocabWords } from "./vocab";

export const dictationLists = pgTable(
  "dictation_lists",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: text("class_id").references(() => classes.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    dictationDate: date("dictation_date"),
    isSample: boolean("is_sample").notNull().default(false),
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
    listId: text("list_id").notNull().references(() => dictationLists.id, { onDelete: "cascade" }),
    vocabWordId: text("vocab_word_id").references(() => vocabWords.id, { onDelete: "set null" }),
    word: text("word").notNull(),
    meaning: text("meaning"),
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
    listId: text("list_id").notNull().references(() => dictationLists.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull(),
    wordId: text("word_id").notNull(),
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
