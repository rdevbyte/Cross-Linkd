ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sessions_valid_after" timestamptz;
--> statement-breakpoint
