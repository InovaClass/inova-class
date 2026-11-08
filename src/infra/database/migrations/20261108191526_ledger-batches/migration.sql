ALTER TABLE "ledger_entries" ADD COLUMN "batch_id" uuid;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "reversed_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_reversed_entry_id_key" UNIQUE("reversed_entry_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_batch_id_index" ON "ledger_entries" ("batch_id");--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_reversed_entry_id_ledger_entries_id_fkey" FOREIGN KEY ("reversed_entry_id") REFERENCES "ledger_entries"("id") ON DELETE CASCADE;