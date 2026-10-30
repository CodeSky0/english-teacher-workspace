ALTER TABLE "dictation_words" ADD COLUMN "score_weight" integer NOT NULL DEFAULT 1;
ALTER TABLE "dictation_lists" ADD COLUMN "pass_type" text NOT NULL DEFAULT 'none';
ALTER TABLE "dictation_lists" ADD COLUMN "pass_value" integer;
