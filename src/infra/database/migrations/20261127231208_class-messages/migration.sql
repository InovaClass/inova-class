CREATE TABLE "class_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"class_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"removed_at" timestamp with time zone,
	"removed_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "chat_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "chat_muted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "class_messages_class_id_created_at_index" ON "class_messages" ("class_id","created_at");--> statement-breakpoint
CREATE INDEX "class_messages_author_id_created_at_index" ON "class_messages" ("author_id","created_at");--> statement-breakpoint
ALTER TABLE "class_messages" ADD CONSTRAINT "class_messages_class_id_classes_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "class_messages" ADD CONSTRAINT "class_messages_author_id_users_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "class_messages" ADD CONSTRAINT "class_messages_removed_by_id_users_id_fkey" FOREIGN KEY ("removed_by_id") REFERENCES "users"("id") ON DELETE SET NULL;