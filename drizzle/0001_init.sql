-- CrossLinkd — search + uniqueness helpers (run via `npm run db:migrate`)
-- NOTE: drizzle-kit `generate` produces the table DDL (0000_*). This file adds the
-- extensions, full-text search vector, and indexes that complement it.
-- Statements are separated with breakpoints so one failure cannot abort the
-- whole file. PostGIS is intentionally NOT required: the app stores plain
-- latitude/longitude columns and computes distance in the application layer.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
--> statement-breakpoint

-- Full-text search vector on listings (name, tagline, description, services folded in app layer)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE listings
      ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(tagline, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'C')
      ) STORED;
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS listings_search_gin ON listings USING GIN (search_vector);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS listings_name_trgm ON listings USING GIN (name gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS hashtags_tag_trgm ON hashtags USING GIN (tag gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS denominations_name_trgm ON denominations USING GIN (name gin_trgm_ops);
--> statement-breakpoint

-- Case-insensitive uniqueness helpers
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email));
