-- Existing owner responses predate the moderation queue and were already public.
-- Mark them approved so the new queue only contains newly submitted responses.
UPDATE reviews
SET owner_responded_at = COALESCE(updated_at, created_at, now())
WHERE owner_response IS NOT NULL
  AND owner_responded_at IS NULL;
