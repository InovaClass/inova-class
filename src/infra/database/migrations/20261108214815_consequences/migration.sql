CREATE TABLE "consequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "consequences_class_id_index" ON "consequences" ("class_id");--> statement-breakpoint
ALTER TABLE "consequences" ADD CONSTRAINT "consequences_class_id_classes_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE;