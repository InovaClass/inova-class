CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_student_id_class_id_unique" UNIQUE("student_id","class_id")
);
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "join_code" text;--> statement-breakpoint
-- Classes created before #9 need a code. Referencing "classes" makes Postgres run the subquery once per row, so each gets its own code
UPDATE "classes" SET "join_code" = (
	SELECT string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', floor(random() * 31)::int + 1, 1), '')
	FROM generate_series(1, 6)
	WHERE "classes"."id" IS NOT NULL
);--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "join_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "join_code_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_join_code_key" UNIQUE("join_code");--> statement-breakpoint
CREATE INDEX "enrollments_class_id_index" ON "enrollments" ("class_id");--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_users_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_classes_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE;