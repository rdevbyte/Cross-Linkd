-- CrossLinkd — initial migration (run via `npm run db:migrate` or drizzle-kit)
-- NOTE: drizzle-kit `generate` produces the full DDL from src/db/schema.ts.
-- This file adds the extensions, full-text search vector, and RLS-safe indexes
-- that complement the generated migration. Apply AFTER the generated DDL.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis" CASCADE;

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

CREATE INDEX IF NOT EXISTS listings_search_gin ON listings USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS listings_name_trgm ON listings USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS hashtags_tag_trgm ON hashtags USING GIN (tag gin_trgm_ops);
CREATE INDEX IF NOT EXISTS denominations_name_trgm ON denominations USING GIN (name gin_trgm_ops);

-- Case-insensitive uniqueness helpers
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email));
