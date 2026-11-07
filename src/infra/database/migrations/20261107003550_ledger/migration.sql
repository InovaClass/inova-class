CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"enrollment_id" uuid NOT NULL,
	"type" text NOT NULL,
	"xp_delta" integer NOT NULL,
	"hp_delta" integer NOT NULL,
	"coin_delta" integer NOT NULL,
	"source_id" uuid,
	"parent_entry_id" uuid,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "xp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "hp" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "coins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "ledger_entries_enrollment_id_created_at_index" ON "ledger_entries" ("enrollment_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_entries_parent_entry_id_index" ON "ledger_entries" ("parent_entry_id");--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_enrollment_id_enrollments_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_parent_entry_id_ledger_entries_id_fkey" FOREIGN KEY ("parent_entry_id") REFERENCES "ledger_entries"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_id_users_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_xp_check" CHECK ("xp" >= 0);--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_hp_check" CHECK ("hp" between 0 and 50);--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_coins_check" CHECK ("coins" >= 0);