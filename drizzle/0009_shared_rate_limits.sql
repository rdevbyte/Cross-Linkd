-- Shared fixed-window request counters for multi-instance/serverless deployments.
-- bucket_key is a SHA-256 digest; raw IP addresses and email addresses are not stored.
CREATE TABLE IF NOT EXISTS shared_rate_limits (
  bucket_key varchar(64) NOT NULL,
  window_start timestamptz NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shared_rate_limits_pkey PRIMARY KEY (bucket_key, window_start)
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS shared_rate_limits_expiry_idx
  ON shared_rate_limits (expires_at);
