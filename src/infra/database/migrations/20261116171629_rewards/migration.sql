CREATE TABLE "reward_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"enrollment_id" uuid NOT NULL,
	"reward_id" uuid NOT NULL,
	"price" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"purchase_entry_id" uuid NOT NULL,
	"refund_entry_id" uuid,
	"decided_by_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reward_orders_price_check" CHECK ("price" > 0),
	CONSTRAINT "reward_orders_refund_entry_check" CHECK (("status" = 'canceled') = ("refund_entry_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"stock" integer,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rewards_price_check" CHECK ("price" > 0),
	CONSTRAINT "rewards_stock_check" CHECK ("stock" >= 0)
);
--> statement-breakpoint
CREATE INDEX "reward_orders_enrollment_id_status_index" ON "reward_orders" ("enrollment_id","status");--> statement-breakpoint
CREATE INDEX "rewards_class_id_index" ON "rewards" ("class_id");--> statement-breakpoint
ALTER TABLE "reward_orders" ADD CONSTRAINT "reward_orders_enrollment_id_enrollments_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reward_orders" ADD CONSTRAINT "reward_orders_reward_id_rewards_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "rewards"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reward_orders" ADD CONSTRAINT "reward_orders_purchase_entry_id_ledger_entries_id_fkey" FOREIGN KEY ("purchase_entry_id") REFERENCES "ledger_entries"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reward_orders" ADD CONSTRAINT "reward_orders_refund_entry_id_ledger_entries_id_fkey" FOREIGN KEY ("refund_entry_id") REFERENCES "ledger_entries"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reward_orders" ADD CONSTRAINT "reward_orders_decided_by_id_users_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_class_id_classes_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE;