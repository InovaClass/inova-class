CREATE TABLE "power_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"enrollment_id" uuid NOT NULL,
	"power_id" uuid NOT NULL,
	"cost" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"ledger_entry_id" uuid,
	"decided_by_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "power_requests_cost_check" CHECK ("cost" > 0),
	CONSTRAINT "power_requests_ledger_entry_check" CHECK (("status" = 'approved') = ("ledger_entry_id" is not null))
);
--> statement-breakpoint
CREATE INDEX "power_requests_enrollment_id_status_index" ON "power_requests" ("enrollment_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "power_requests_enrollment_id_power_id_index" ON "power_requests" ("enrollment_id","power_id") WHERE "status" = 'pending';--> statement-breakpoint
ALTER TABLE "power_requests" ADD CONSTRAINT "power_requests_enrollment_id_enrollments_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "power_requests" ADD CONSTRAINT "power_requests_power_id_powers_id_fkey" FOREIGN KEY ("power_id") REFERENCES "powers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "power_requests" ADD CONSTRAINT "power_requests_ledger_entry_id_ledger_entries_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entries"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "power_requests" ADD CONSTRAINT "power_requests_decided_by_id_users_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL;