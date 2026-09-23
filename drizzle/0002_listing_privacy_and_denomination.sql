ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "show_email" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "show_phone" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "show_website" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "show_address" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "show_denomination" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "custom_denomination" varchar(180);--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "status" SET DEFAULT 'published';
