CREATE TABLE "join_attempts" (
	"student_id" uuid PRIMARY KEY,
	"window_started_at" timestamp with time zone NOT NULL,
	"attempts" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "join_attempts" ADD CONSTRAINT "join_attempts_student_id_users_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE;