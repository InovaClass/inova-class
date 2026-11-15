ALTER TABLE "enrollments" ADD COLUMN "character_class" text;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "body_type" text;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "skin" text;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "hair_style" text;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "hair_color" text;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "outfit_color" text;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "equipped_items" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_character_check" CHECK (("character_class" is null and "body_type" is null and "skin" is null and "hair_style" is null and "hair_color" is null and "outfit_color" is null) or ("character_class" is not null and "body_type" is not null and "skin" is not null and "hair_color" is not null and "outfit_color" is not null));