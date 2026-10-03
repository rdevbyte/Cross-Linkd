-- Accelerate service-label matching in the public search path.
-- pg_trgm is installed by 0001_init.sql; IF NOT EXISTS keeps this safe on
-- partially upgraded databases and does not rewrite or delete listing data.
CREATE INDEX IF NOT EXISTS listing_services_name_trgm
  ON listing_services USING GIN (name gin_trgm_ops);
