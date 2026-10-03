/** Recently Updated is a 72-hour badge based on an owner-published meaningful edit. */
export const RECENTLY_UPDATED_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
/** Card shimmer stays active for timestamps younger than 96 hours. */
export const CARD_SHIMMER_WINDOW_MS = 96 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const MEANINGFUL_FIELDS = [
  'name', 'typeSlug', 'tagline', 'description',
  'industrySlug', 'categorySlug', 'customCategory', 'industries', 'professions', 'customProfessions', 'services',
  'hours', 'holidayHours',
  'phone', 'email', 'contactPreference', 'showPhone', 'showEmail', 'showAddress', 'showDenomination',
  'priceRange', 'isHiring', 'careersUrl', 'accessibility', 'languages',
  'website', 'showWebsite', 'socialLinks', 'logoUrl', 'coverUrl', 'photos',
  'city', 'region', 'postalCode', 'country', 'isOnlineOnly', 'serviceArea', 'serviceAreaRadiusMi',
  'statementOfFaith', 'denominations', 'customDenomination', 'coreBeliefs', 'worshipStyle', 'baptismPractice',
  'communionPractice', 'ministryFocus', 'yearFounded', 'employeeCount', 'ownershipType', 'languages',
];

function normalized(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const text = value.normalize('NFC').replace(/\s+/gu, ' ').trim().toLowerCase();
    return text || null;
  }
  if (Array.isArray(value)) {
    return value.map(normalized).filter((item) => item !== null).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  if (typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().flatMap((key) => {
      const item = normalized(value[key]);
      return item === null ? [] : [[key, item]];
    }));
  }
  return value;
}

function comparableValue(field, value) {
  // Gallery position is visible to visitors, so reordering photos is a real edit.
  if (field === 'photos' && Array.isArray(value)) return value.map(normalized).filter((item) => item !== null);
  if (field !== 'socialLinks' || !value || typeof value !== 'object' || Array.isArray(value)) return normalized(value);
  const domains = { facebook: 'facebook.com', instagram: 'instagram.com', youtube: 'youtube.com', x: 'x.com', linkedin: 'linkedin.com' };
  const links = Object.fromEntries(Object.entries(value).flatMap(([network, raw]) => {
    const text = String(raw ?? '').normalize('NFC').replace(/\s+/gu, ' ').trim();
    if (!text) return [];
    if (/^https?:\/\//i.test(text)) return [[network, text]];
    const domain = domains[network] ?? network;
    const path = network === 'linkedin' && !/^(company|school|in)\//i.test(text) ? `company/${text.replace(/^@/, '')}` : text.replace(/^@/, '');
    return [[network, `https://${domain}/${path}`]];
  }));
  return normalized(links);
}

/** Return meaningful field names; order and whitespace-only differences are ignored. */
export function meaningfulListingChanges(before, after) {
  return MEANINGFUL_FIELDS.filter((field) => JSON.stringify(comparableValue(field, before?.[field])) !== JSON.stringify(comparableValue(field, after?.[field])));
}

/** True only for an already-published record that remains published after a real content change. */
export function shouldMarkRecentlyUpdated({ wasPublished, willBePublished, before, after }) {
  return Boolean(wasPublished && willBePublished && meaningfulListingChanges(before, after).length > 0);
}

/** Active only for timestamps in [now - 72h, now), so it expires exactly at 72 hours. */
export function recentlyUpdatedState(timestamp, now = Date.now()) {
  const time = timestamp instanceof Date ? timestamp.getTime() : typeof timestamp === 'number' ? timestamp : Date.parse(String(timestamp ?? ''));
  const age = now - time;
  if (!Number.isFinite(time) || age < 0 || age >= RECENTLY_UPDATED_WINDOW_MS) return null;
  const days = Math.floor(age / DAY_MS);
  return {
    timestamp: new Date(time).toISOString(),
    expiresAt: new Date(time + RECENTLY_UPDATED_WINDOW_MS).toISOString(),
    label: days < 1 ? 'Updated today' : `Updated ${days} day${days === 1 ? '' : 's'} ago`,
    ageMs: age,
  };
}

/** Card shimmer runs until exactly 96 hours after the latest real creation/publication/update timestamp. */
export function recentCardShimmerState(activity = {}, now = Date.now()) {
  const timestamps = [activity.createdAt, activity.publishedAt, activity.updatedAt, activity.recentlyUpdatedAt]
    .map((value) => value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(String(value ?? '')))
    .filter((value) => Number.isFinite(value) && value <= now);
  if (!timestamps.length) return null;

  const timestamp = Math.max(...timestamps);
  const age = now - timestamp;
  if (age >= CARD_SHIMMER_WINDOW_MS) return null;
  return {
    timestamp: new Date(timestamp).toISOString(),
    expiresAt: new Date(timestamp + CARD_SHIMMER_WINDOW_MS).toISOString(),
    ageMs: age,
  };
}
