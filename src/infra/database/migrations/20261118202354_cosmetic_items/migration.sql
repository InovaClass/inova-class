CREATE TABLE "owned_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"student_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"purchase_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owned_items_student_id_item_id_unique" UNIQUE("student_id","item_id")
);
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "item_shop_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "owned_items" ADD CONSTRAINT "owned_items_student_id_users_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "owned_items" ADD CONSTRAINT "owned_items_purchase_entry_id_ledger_entries_id_fkey" FOREIGN KEY ("purchase_entry_id") REFERENCES "ledger_entries"("id") ON DELETE SET NULL;