export const LISTING_ANALYTICS_EVENTS = Object.freeze([
  'recent_impression',
  'recent_card_click',
  'detail_view',
  'website_click',
  'social_click',
  'phone_click',
  'email_click',
  'contact_click',
  'favorite_add',
  'favorite_remove',
  'recent_filter',
  'owner_share',
]);

const allowed = new Set(LISTING_ANALYTICS_EVENTS);
export const isListingAnalyticsEvent = (value) => typeof value === 'string' && allowed.has(value);
