ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "ownership_type" varchar(80);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "contact_preference" varchar(40);
