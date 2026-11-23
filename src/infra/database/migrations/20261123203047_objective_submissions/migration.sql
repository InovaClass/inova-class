CREATE TABLE "objective_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"enrollment_id" uuid NOT NULL,
	"objective_id" uuid NOT NULL,
	"text" text,
	"link" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"teacher_comment" text,
	"ledger_entry_id" uuid,
	"decided_by_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "objective_submissions_text_check" CHECK ("status" <> 'pending' or "text" is not null),
	CONSTRAINT "objective_submissions_ledger_entry_check" CHECK ("status" <> 'approved' or "ledger_entry_id" is not null)
);
--> statement-breakpoint
CREATE INDEX "objective_submissions_enrollment_id_objective_id_index" ON "objective_submissions" ("enrollment_id","objective_id");--> statement-breakpoint
CREATE INDEX "objective_submissions_objective_id_index" ON "objective_submissions" ("objective_id");--> statement-breakpoint
CREATE UNIQUE INDEX "objective_submissions_open_unique" ON "objective_submissions" ("enrollment_id","objective_id") WHERE "status" in ('pending', 'approved');--> statement-breakpoint
ALTER TABLE "objective_submissions" ADD CONSTRAINT "objective_submissions_enrollment_id_enrollments_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "objective_submissions" ADD CONSTRAINT "objective_submissions_objective_id_objectives_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "objective_submissions" ADD CONSTRAINT "objective_submissions_ledger_entry_id_ledger_entries_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entries"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "objective_submissions" ADD CONSTRAINT "objective_submissions_decided_by_id_users_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL;