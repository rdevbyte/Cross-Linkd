ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "industry_slug" varchar(120);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "category_slug" varchar(120);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "custom_category" varchar(180);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "denominations_list" jsonb DEFAULT '[]'::jsonb NOT NULL;
