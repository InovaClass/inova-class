ALTER TABLE "class_messages" ADD COLUMN "objective_id" uuid;--> statement-breakpoint
ALTER TABLE "objectives" ADD COLUMN "discussion_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "class_messages_objective_id_created_at_index" ON "class_messages" ("objective_id","created_at");--> statement-breakpoint
ALTER TABLE "class_messages" ADD CONSTRAINT "class_messages_objective_id_objectives_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE CASCADE;