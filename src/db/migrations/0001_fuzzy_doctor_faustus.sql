CREATE TYPE "public"."week_plan_status" AS ENUM('planned', 'in_progress', 'done', 'skipped');--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"goal" text,
	"total_weeks" integer
);
--> statement-breakpoint
CREATE TABLE "week_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"semester_id" uuid NOT NULL,
	"class_id" uuid,
	"week_no" integer NOT NULL,
	"week_start" date NOT NULL,
	"week_end" date NOT NULL,
	"topic" text,
	"objective" text,
	"content" text,
	"status" "week_plan_status" DEFAULT 'planned' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teaching_resources" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "teaching_resources" ADD COLUMN "blob_url" text;--> statement-breakpoint
ALTER TABLE "teaching_resources" ADD COLUMN "blob_pathname" text;--> statement-breakpoint
ALTER TABLE "teaching_resources" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "teaching_resources" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_plans" ADD CONSTRAINT "week_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_plans" ADD CONSTRAINT "week_plans_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_plans" ADD CONSTRAINT "week_plans_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "semesters_user_idx" ON "semesters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "week_plans_user_idx" ON "week_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "week_plans_semester_idx" ON "week_plans" USING btree ("semester_id");