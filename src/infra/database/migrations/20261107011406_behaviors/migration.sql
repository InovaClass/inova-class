CREATE TABLE "behaviors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"xp" integer NOT NULL,
	"hp" integer NOT NULL,
	"coins" integer NOT NULL,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "behaviors_xp_check" CHECK ("xp" >= 0),
	CONSTRAINT "behaviors_values_check" CHECK ("xp" <> 0 or "hp" <> 0 or "coins" <> 0)
);
--> statement-breakpoint
CREATE INDEX "behaviors_class_id_index" ON "behaviors" ("class_id");--> statement-breakpoint
ALTER TABLE "behaviors" ADD CONSTRAINT "behaviors_class_id_classes_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE;