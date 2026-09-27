ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "is_hiring" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "careers_url" text;
