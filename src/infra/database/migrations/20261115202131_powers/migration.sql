CREATE TABLE "powers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"class_id" uuid NOT NULL,
	"character_class" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cost" integer NOT NULL,
	"min_level" integer DEFAULT 1 NOT NULL,
	"disabled_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "powers_cost_check" CHECK ("cost" > 0),
	CONSTRAINT "powers_min_level_check" CHECK ("min_level" >= 1)
);
--> statement-breakpoint
CREATE INDEX "powers_class_id_character_class_index" ON "powers" ("class_id","character_class");--> statement-breakpoint
ALTER TABLE "powers" ADD CONSTRAINT "powers_class_id_classes_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE;