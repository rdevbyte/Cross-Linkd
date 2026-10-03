-- Shared rate-limit counters (one row per limiter key, see src/lib/rateLimitShared.ts).
-- Lets sign-in / reset / contact budgets hold across serverless instances instead of
-- being multiplied by the number of warm instances.
CREATE TABLE IF NOT EXISTS "rate_limits" (
  "key" text PRIMARY KEY NOT NULL,
  "window_start" timestamp with time zone DEFAULT now() NOT NULL,
  "hits" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limits_window_idx" ON "rate_limits" USING btree ("window_start");
