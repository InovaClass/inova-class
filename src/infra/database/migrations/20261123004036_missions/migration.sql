CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"published_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"mission_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"story" text NOT NULL,
	"due_on" date,
	"xp_reward" integer NOT NULL,
	"coin_reward" integer NOT NULL,
	"late_penalty_coins" integer NOT NULL,
	"late_penalty_hp" integer NOT NULL,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "objectives_reward_check" CHECK ("xp_reward" >= 0 and "coin_reward" >= 0 and "xp_reward" + "coin_reward" > 0),
	CONSTRAINT "objectives_late_penalty_check" CHECK ("late_penalty_coins" >= 0 and "late_penalty_hp" between 0 and 50),
	CONSTRAINT "objectives_due_on_check" CHECK ("due_on" is not null or ("late_penalty_coins" = 0 and "late_penalty_hp" = 0))
);
--> statement-breakpoint
CREATE INDEX "missions_class_id_index" ON "missions" ("class_id");--> statement-breakpoint
CREATE INDEX "objectives_mission_id_position_index" ON "objectives" ("mission_id","position");--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_class_id_classes_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_mission_id_missions_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE;