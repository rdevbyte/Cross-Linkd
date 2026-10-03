ALTER TABLE "industries" ADD COLUMN IF NOT EXISTS "aliases" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "industries" ADD COLUMN IF NOT EXISTS "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "industry_categories" ADD COLUMN IF NOT EXISTS "aliases" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "industry_categories" ADD COLUMN IF NOT EXISTS "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "professions" ADD COLUMN IF NOT EXISTS "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "professions" ADD COLUMN IF NOT EXISTS "service_examples" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "custom_professions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "professions" SET "slug" = 'managed-it-provider' WHERE "slug" = 'it-support' AND NOT EXISTS (SELECT 1 FROM "professions" WHERE "slug" = 'managed-it-provider');--> statement-breakpoint
UPDATE "professions" SET "slug" = 'floral-designer' WHERE "slug" = 'florist' AND NOT EXISTS (SELECT 1 FROM "professions" WHERE "slug" = 'floral-designer');--> statement-breakpoint
UPDATE "professions" SET "slug" = 'other-professional-service-provider', "name" = 'Other Professional or Service Provider' WHERE "slug" = 'general-specialist' AND NOT EXISTS (SELECT 1 FROM "professions" WHERE "slug" = 'other-professional-service-provider');
--> statement-breakpoint
ALTER TABLE "listing_services" ADD COLUMN IF NOT EXISTS "profession_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "listing_services" ADD CONSTRAINT "listing_services_profession_id_professions_id_fk" FOREIGN KEY ("profession_id") REFERENCES "public"."professions"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_profession_idx" ON "listing_services" USING btree ("profession_id");
