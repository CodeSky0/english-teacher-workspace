import { pgTable, text, uuid, boolean, index } from "drizzle-orm/pg-core";
import { baseColumns } from "./_common";
import { user } from "./auth";

export const vocabUnits = pgTable(
  "vocab_units",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    textbookVersion: text("textbook_version"),
    gradeLevel: text("grade_level"),
    isSample: boolean("is_sample").notNull().default(false),
  },
  (t) => ({
    userIdx: index("vocab_units_user_idx").on(t.userId),
    nameIdx: index("vocab_units_name_idx").on(t.userId, t.name),
  })
);

export const vocabWords = pgTable(
  "vocab_words",
  {
    ...baseColumns,
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").notNull().references(() => vocabUnits.id, { onDelete: "cascade" }),
    word: text("word").notNull(),
    meaning: text("meaning"),
    phoneticUs: text("phonetic_us"),
    partOfSpeech: text("part_of_speech"),
    exampleEn: text("example_en"),
    exampleZh: text("example_zh"),
    remark: text("remark"),
  },
  (t) => ({
    userIdx: index("vocab_words_user_idx").on(t.userId),
    unitIdx: index("vocab_words_unit_idx").on(t.unitId),
    wordIdx: index("vocab_words_word_idx").on(t.userId, t.word),
  })
);

export type VocabUnit = typeof vocabUnits.$inferSelect;
export type VocabWord = typeof vocabWords.$inferSelect;
