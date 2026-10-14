CREATE TYPE "public"."attendance_status" AS ENUM('unrecorded', 'present', 'absent', 'late', 'leave');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('positive', 'negative');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."homework_record_status" AS ENUM('unsubmitted', 'submitted', 'late', 'graded');--> statement-breakpoint
CREATE TYPE "public"."homework_status" AS ENUM('draft', 'published', 'closed');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."lesson_plan_status" AS ENUM('pending', 'planning', 'completed', 'taught');--> statement-breakpoint
CREATE TYPE "public"."poll_type" AS ENUM('single_choice', 'true_false', 'raise_hand');--> statement-breakpoint
CREATE TYPE "public"."research_type" AS ENUM('observation', 'collective_planning', 'meeting', 'public_class', 'paper', 'training', 'other');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('courseware', 'lesson_plan', 'exam', 'audio', 'video', 'reading', 'research', 'other');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"display_name" text,
	"title" text,
	"timezone" text DEFAULT 'Asia/Shanghai',
	"default_class_id" text,
	"sample_initialized" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"en_name" text,
	"grade_level" text,
	"academic_year" text,
	"is_sample" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"class_id" text NOT NULL,
	"name" text NOT NULL,
	"en_name" text,
	"gender" "gender" DEFAULT 'unknown',
	"student_no" text,
	"seat_no" integer,
	"is_sample" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetable_cells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"class_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"period_no" integer NOT NULL,
	"subject" text,
	"classroom" text
);
--> statement-breakpoint
CREATE TABLE "timetable_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"period_no" integer NOT NULL,
	"name" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"class_id" text,
	"title" text NOT NULL,
	"textbook_version" text,
	"grade_level" text,
	"unit" text,
	"lesson_type" text,
	"teach_date" date,
	"objectives" text,
	"key_points" text,
	"teaching_process" text,
	"teaching_resources" text,
	"reflection" text,
	"status" "lesson_plan_status" DEFAULT 'pending' NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teaching_research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"research_date" date,
	"type" "research_type" DEFAULT 'meeting' NOT NULL,
	"participants" text,
	"content" text,
	"takeaways" text,
	"insights" text,
	"remark" text,
	"is_sample" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"class_id" text,
	"title" text NOT NULL,
	"assign_date" date,
	"due_date" date,
	"type" text,
	"content" text,
	"status" "homework_status" DEFAULT 'draft' NOT NULL,
	"remark" text,
	"vocab_unit_id" text,
	"is_sample" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"homework_id" text NOT NULL,
	"student_id" text NOT NULL,
	"status" "homework_record_status" DEFAULT 'unsubmitted' NOT NULL,
	"score" text,
	"remark" text
);
--> statement-breakpoint
CREATE TABLE "exam_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"exam_id" text NOT NULL,
	"student_id" text NOT NULL,
	"listening_score" numeric,
	"speaking_score" numeric,
	"written_score" numeric,
	"total_score" numeric,
	"total_is_manual" boolean DEFAULT false NOT NULL,
	"remark" text
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"class_id" text NOT NULL,
	"name" text NOT NULL,
	"exam_date" date,
	"type" text,
	"remark" text,
	"is_sample" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocab_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"textbook_version" text,
	"grade_level" text,
	"is_sample" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocab_words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"word" text NOT NULL,
	"meaning" text,
	"phonetic_us" text,
	"part_of_speech" text,
	"example_en" text,
	"example_zh" text,
	"remark" text
);
--> statement-breakpoint
CREATE TABLE "dictation_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"class_id" text,
	"name" text NOT NULL,
	"dictation_date" date,
	"is_sample" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dictation_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"list_id" text NOT NULL,
	"student_id" text NOT NULL,
	"word_id" text NOT NULL,
	"is_correct" boolean
);
--> statement-breakpoint
CREATE TABLE "dictation_words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"list_id" text NOT NULL,
	"vocab_word_id" text,
	"word" text NOT NULL,
	"meaning" text
);
--> statement-breakpoint
CREATE TABLE "teaching_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"type" "resource_type" DEFAULT 'other' NOT NULL,
	"unit" text,
	"description" text,
	"link" text,
	"is_sample" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"class_id" text NOT NULL,
	"student_id" text NOT NULL,
	"attendance_date" date NOT NULL,
	"status" "attendance_status" DEFAULT 'unrecorded' NOT NULL,
	"remark" text
);
--> statement-breakpoint
CREATE TABLE "classroom_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"class_id" text NOT NULL,
	"session_id" text,
	"student_id" text NOT NULL,
	"group_name" text,
	"points" integer DEFAULT 0 NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "classroom_poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"poll_id" text NOT NULL,
	"label" text NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classroom_poll_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"poll_id" text NOT NULL,
	"option_id" text NOT NULL,
	"student_id" text
);
--> statement-breakpoint
CREATE TABLE "classroom_polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"class_id" text NOT NULL,
	"session_id" text,
	"question" text NOT NULL,
	"type" "poll_type" DEFAULT 'single_choice' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classroom_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"class_id" text NOT NULL,
	"session_date" date NOT NULL,
	"activity" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "student_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"class_id" text NOT NULL,
	"student_id" text NOT NULL,
	"session_id" text,
	"feedback_date" date,
	"tag" text NOT NULL,
	"type" "feedback_type" DEFAULT 'positive' NOT NULL,
	"remark" text
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"module" text NOT NULL,
	"mode" text NOT NULL,
	"status" "import_job_status" DEFAULT 'pending' NOT NULL,
	"file_name" text,
	"total_rows" text,
	"success_count" text,
	"skip_count" text,
	"fail_count" text,
	"errors" jsonb
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_cells" ADD CONSTRAINT "timetable_cells_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_cells" ADD CONSTRAINT "timetable_cells_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_research" ADD CONSTRAINT "teaching_research_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_vocab_unit_id_vocab_units_id_fk" FOREIGN KEY ("vocab_unit_id") REFERENCES "public"."vocab_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_records" ADD CONSTRAINT "homework_records_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_records" ADD CONSTRAINT "homework_records_homework_id_homework_id_fk" FOREIGN KEY ("homework_id") REFERENCES "public"."homework"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_records" ADD CONSTRAINT "homework_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_scores" ADD CONSTRAINT "exam_scores_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_scores" ADD CONSTRAINT "exam_scores_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_scores" ADD CONSTRAINT "exam_scores_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_units" ADD CONSTRAINT "vocab_units_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_words" ADD CONSTRAINT "vocab_words_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_words" ADD CONSTRAINT "vocab_words_unit_id_vocab_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."vocab_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dictation_lists" ADD CONSTRAINT "dictation_lists_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dictation_lists" ADD CONSTRAINT "dictation_lists_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dictation_results" ADD CONSTRAINT "dictation_results_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dictation_results" ADD CONSTRAINT "dictation_results_list_id_dictation_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."dictation_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dictation_words" ADD CONSTRAINT "dictation_words_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dictation_words" ADD CONSTRAINT "dictation_words_list_id_dictation_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."dictation_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dictation_words" ADD CONSTRAINT "dictation_words_vocab_word_id_vocab_words_id_fk" FOREIGN KEY ("vocab_word_id") REFERENCES "public"."vocab_words"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_resources" ADD CONSTRAINT "teaching_resources_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_points" ADD CONSTRAINT "classroom_points_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_points" ADD CONSTRAINT "classroom_points_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_points" ADD CONSTRAINT "classroom_points_session_id_classroom_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."classroom_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_points" ADD CONSTRAINT "classroom_points_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_poll_options" ADD CONSTRAINT "classroom_poll_options_poll_id_classroom_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."classroom_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_poll_votes" ADD CONSTRAINT "classroom_poll_votes_poll_id_classroom_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."classroom_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_poll_votes" ADD CONSTRAINT "classroom_poll_votes_option_id_classroom_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."classroom_poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_polls" ADD CONSTRAINT "classroom_polls_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_polls" ADD CONSTRAINT "classroom_polls_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_polls" ADD CONSTRAINT "classroom_polls_session_id_classroom_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."classroom_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_sessions" ADD CONSTRAINT "classroom_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_sessions" ADD CONSTRAINT "classroom_sessions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_feedback" ADD CONSTRAINT "student_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_feedback" ADD CONSTRAINT "student_feedback_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_feedback" ADD CONSTRAINT "student_feedback_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_feedback" ADD CONSTRAINT "student_feedback_session_id_classroom_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."classroom_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classes_user_idx" ON "classes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "classes_name_idx" ON "classes" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "students_user_idx" ON "students" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "students_class_idx" ON "students" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "students_no_idx" ON "students" USING btree ("class_id","student_no");--> statement-breakpoint
CREATE INDEX "cells_user_idx" ON "timetable_cells" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cells_class_idx" ON "timetable_cells" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "cells_cell_idx" ON "timetable_cells" USING btree ("class_id","day_of_week","period_no");--> statement-breakpoint
CREATE INDEX "periods_user_idx" ON "timetable_periods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "periods_no_idx" ON "timetable_periods" USING btree ("user_id","period_no");--> statement-breakpoint
CREATE INDEX "plans_user_idx" ON "lesson_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plans_class_idx" ON "lesson_plans" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "plans_date_idx" ON "lesson_plans" USING btree ("user_id","teach_date");--> statement-breakpoint
CREATE INDEX "research_user_idx" ON "teaching_research" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "research_date_idx" ON "teaching_research" USING btree ("user_id","research_date");--> statement-breakpoint
CREATE INDEX "homework_user_idx" ON "homework" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "homework_class_idx" ON "homework" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "hw_records_user_idx" ON "homework_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hw_records_hw_idx" ON "homework_records" USING btree ("homework_id");--> statement-breakpoint
CREATE INDEX "hw_records_student_idx" ON "homework_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "scores_user_idx" ON "exam_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scores_exam_idx" ON "exam_scores" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "scores_student_idx" ON "exam_scores" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "exams_user_idx" ON "exams" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exams_class_idx" ON "exams" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "vocab_units_user_idx" ON "vocab_units" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vocab_units_name_idx" ON "vocab_units" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "vocab_words_user_idx" ON "vocab_words" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vocab_words_unit_idx" ON "vocab_words" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "vocab_words_word_idx" ON "vocab_words" USING btree ("user_id","word");--> statement-breakpoint
CREATE INDEX "dict_lists_user_idx" ON "dictation_lists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dict_lists_class_idx" ON "dictation_lists" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "dict_results_user_idx" ON "dictation_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dict_results_list_idx" ON "dictation_results" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "dict_results_student_idx" ON "dictation_results" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "dict_words_user_idx" ON "dictation_words" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dict_words_list_idx" ON "dictation_words" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "resources_user_idx" ON "teaching_resources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resources_type_idx" ON "teaching_resources" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "attendance_user_idx" ON "attendance_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attendance_class_idx" ON "attendance_records" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "attendance_date_idx" ON "attendance_records" USING btree ("class_id","attendance_date");--> statement-breakpoint
CREATE INDEX "attendance_student_idx" ON "attendance_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "cls_points_user_idx" ON "classroom_points" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cls_points_class_idx" ON "classroom_points" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "cls_points_student_idx" ON "classroom_points" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "poll_options_poll_idx" ON "classroom_poll_options" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "poll_votes_poll_idx" ON "classroom_poll_votes" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "polls_user_idx" ON "classroom_polls" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "polls_class_idx" ON "classroom_polls" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "cls_session_user_idx" ON "classroom_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cls_session_class_idx" ON "classroom_sessions" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "feedback_user_idx" ON "student_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_student_idx" ON "student_feedback" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "import_jobs_user_idx" ON "import_jobs" USING btree ("user_id");