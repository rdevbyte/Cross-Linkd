-- Timestamp and privacy-minimized event log for meaningful owner-published listing updates.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS recently_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS listings_recent_updated_idx
  ON listings (recently_updated_at);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS listing_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  event_name varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_analytics_events_name_check CHECK (event_name IN (
    'recent_impression', 'recent_card_click', 'detail_view', 'website_click', 'social_click',
    'phone_click', 'email_click', 'contact_click', 'favorite_add', 'favorite_remove',
    'recent_filter', 'owner_share'
  ))
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS listing_analytics_listing_created_idx
  ON listing_analytics_events (listing_id, created_at);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS listing_analytics_event_created_idx
  ON listing_analytics_events (event_name, created_at);
