import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CARD_SHIMMER_WINDOW_MS,
  RECENTLY_UPDATED_WINDOW_MS,
  meaningfulListingChanges,
  recentlyUpdatedState,
  recentCardShimmerState,
  shouldMarkRecentlyUpdated,
} from '../src/lib/recentlyUpdated.mjs';

const base = {
  name: 'Northside Repair',
  description: 'Dependable local service',
  categorySlug: 'home-services',
  services: ['Repairs', 'Installation'],
  hours: { Monday: '9 AM – 5 PM' },
  phone: '919-555-0100',
  website: 'https://northside.example',
  socialLinks: { facebook: 'northsiderepair', linkedin: 'company/northside-repair' },
  photos: [{ url: 'https://cdn.example/one.jpg', alt: 'Shopfront' }],
  city: 'Raleigh',
  region: 'NC',
  serviceArea: ['Raleigh, NC', 'Cary, NC'],
  statementOfFaith: 'Serve our neighbors with care.',
  ownershipType: 'Family-owned',
};

const qualifies = (before, after) => shouldMarkRecentlyUpdated({
  wasPublished: true,
  willBePublished: true,
  before,
  after,
});

test('meaningful published owner edits qualify across required field families', () => {
  for (const change of [
    { description: 'Dependable local service, now open weekends' },
    { categorySlug: 'auto-services' },
    { services: ['Repairs', 'Installation', 'Maintenance'] },
    { hours: { Monday: '8 AM – 6 PM' } },
    { phone: '919-555-0111' },
    { socialLinks: { facebook: 'https://facebook.com/northside-repair', linkedin: 'https://linkedin.com/company/northside-repair' } },
    { photos: [...base.photos, { url: 'https://cdn.example/two.jpg', alt: 'Team' }] },
    { photos: [{ url: 'https://cdn.example/two.jpg', alt: 'Team' }, ...base.photos] },
    { city: 'Durham' },
    { serviceArea: ['Raleigh, NC', 'Durham, NC'] },
    { statementOfFaith: 'Serve our neighbors and community with care.' },
    { ownershipType: 'Privately owned' },
  ]) {
    assert.equal(qualifies(base, { ...base, ...change }), true, `expected ${Object.keys(change)[0]} to qualify`);
  }
});

test('whitespace-only, case-only, reordered list, and legacy social-handle normalization are not changes', () => {
  const unchanged = {
    ...base,
    name: '  NORTHSIDE   REPAIR ',
    description: ' Dependable   local service  ',
    services: ['Installation', 'Repairs'],
    serviceArea: ['Cary, NC', 'Raleigh, NC'],
    socialLinks: {
      facebook: 'https://facebook.com/northsiderepair',
      linkedin: 'https://linkedin.com/company/northside-repair',
    },
  };
  assert.deepEqual(meaningfulListingChanges(base, unchanged), []);
  assert.equal(qualifies(base, unchanged), false);
});

test('administrative-only saves and repeated saves do not qualify; publication gates apply', () => {
  assert.deepEqual(meaningfulListingChanges({ ...base, updatedAt: 'yesterday', status: 'published' }, { ...base, updatedAt: 'today', status: 'published' }), []);
  assert.equal(qualifies(base, base), false);
  assert.equal(shouldMarkRecentlyUpdated({ wasPublished: false, willBePublished: true, before: base, after: { ...base, description: 'New copy' } }), false);
  assert.equal(shouldMarkRecentlyUpdated({ wasPublished: true, willBePublished: false, before: base, after: { ...base, description: 'New copy' } }), false);
});

test('badge is valid until, but not including, the exact 72-hour boundary', () => {
  const updatedAt = Date.UTC(2026, 8, 27, 12, 0, 0);
  const expiresAt = updatedAt + RECENTLY_UPDATED_WINDOW_MS;
  assert.equal(recentlyUpdatedState(updatedAt, updatedAt).label, 'Updated today');
  assert.equal(recentlyUpdatedState(updatedAt, updatedAt + 2 * 24 * 60 * 60 * 1000).label, 'Updated 2 days ago');
  assert.ok(recentlyUpdatedState(updatedAt, expiresAt - 1));
  assert.equal(recentlyUpdatedState(updatedAt, expiresAt), null);
  assert.equal(recentlyUpdatedState(updatedAt, updatedAt - 1), null);
  assert.equal(recentlyUpdatedState(null, expiresAt), null);
  assert.equal(recentlyUpdatedState('not-a-date', expiresAt), null);
});

test('card shimmer uses the latest creation, publication, or update time and expires exactly at 96 hours', () => {
  const now = Date.UTC(2026, 8, 30, 12, 0, 0);
  const createdAt = now - 2 * 24 * 60 * 60 * 1000;
  const updatedAt = now - 18 * 60 * 60 * 1000;
  const shimmer = recentCardShimmerState({
    createdAt: new Date(createdAt),
    publishedAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(updatedAt),
  }, now);
  assert.equal(shimmer.timestamp, new Date(updatedAt).toISOString());
  assert.equal(shimmer.expiresAt, new Date(updatedAt + CARD_SHIMMER_WINDOW_MS).toISOString());

  // Creation and a subsequent update each start their own exact 96-hour window.
  for (const activity of [
    { createdAt: now - 95 * 60 * 60 * 1000 },
    { createdAt: now - 100 * 60 * 60 * 1000, updatedAt: now - 95 * 60 * 60 * 1000 },
  ]) {
    assert.ok(recentCardShimmerState(activity, now), 'shimmer remains active at 95 hours');
    const lastActivity = activity.updatedAt ?? activity.createdAt;
    assert.equal(recentCardShimmerState(activity, lastActivity + CARD_SHIMMER_WINDOW_MS - 1)?.ageMs, CARD_SHIMMER_WINDOW_MS - 1);
    assert.equal(recentCardShimmerState(activity, lastActivity + CARD_SHIMMER_WINDOW_MS), null, 'shimmer expires exactly at 96 hours');
    assert.equal(recentCardShimmerState(activity, lastActivity + CARD_SHIMMER_WINDOW_MS + 1), null, 'shimmer stays expired after 96 hours');
  }
  assert.equal(recentCardShimmerState({ createdAt: now + 1 }, now), null);
  assert.equal(recentCardShimmerState({}, now), null);
});

test('a second meaningful publish refreshes the three-day window from the later save', () => {
  const firstPublish = Date.UTC(2026, 8, 27, 12);
  const secondPublish = firstPublish + 24 * 60 * 60 * 1000;
  const refreshed = recentlyUpdatedState(new Date(secondPublish), secondPublish);
  assert.equal(refreshed.expiresAt, new Date(secondPublish + RECENTLY_UPDATED_WINDOW_MS).toISOString());
  const afterOriginalExpiry = secondPublish + RECENTLY_UPDATED_WINDOW_MS;
  assert.equal(recentlyUpdatedState(new Date(firstPublish), afterOriginalExpiry), null);
  assert.ok(recentlyUpdatedState(new Date(secondPublish), afterOriginalExpiry - 1));
});

test('card shimmer repeats every seven seconds using compositor-friendly properties and respects reduced motion', async () => {
  const [css, card, mapper, dashboard, searchPage, analytics] = await Promise.all([
    readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ListingCard.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/submissions.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/dashboard/listings.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/search.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/scripts/listingAnalytics.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(css, /prefers-reduced-motion:\s*no-preference/);
  assert.match(css, /animation:\s*recent-card-shimmer 7s ease-in-out var\(--card-shimmer-delay, 0s\) infinite both/);
  const shimmerKeyframes = css.match(/@keyframes recent-card-shimmer\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(shimmerKeyframes, /opacity/);
  assert.match(shimmerKeyframes, /transform:\s*translateX\(-110%\)/);
  assert.match(shimmerKeyframes, /transform:\s*translateX\(110%\)/);
  assert.doesNotMatch(shimmerKeyframes, /box-shadow|background-position|filter:/);
  assert.match(css, /prefers-reduced-motion:\s*reduce\)[\s\S]*?\.recent-card-shimmer::after\s*\{\s*display:\s*none/s);
  assert.match(card, /recentCardShimmerState/);
  assert.match(card, /data-card-shimmer-expires/);
  assert.match(card, /shimmerDelay/);
  assert.doesNotMatch(card, /--recent-delay:-/);
  assert.match(mapper, /createdAt: row\.createdAt\?\.toISOString/);
  assert.match(mapper, /publishedAt: row\.publishedAt\?\.toISOString/);
  assert.match(mapper, /updatedAt: row\.updatedAt\?\.toISOString/);
  assert.match(analytics, /expireCardShimmer/);
  assert.match(card, /This listing was recently updated by its owner\./);
  assert.match(card, /data-recent-update-expires/);
  for (const input of ['photoUrls', 'socialFacebook', 'serviceAreaText', 'holidayHoursText', 'statementOfFaith', 'languagesText', 'accessibilityText']) {
    assert.match(dashboard, new RegExp(`name="${input}"`), `dashboard exposes ${input}`);
  }
  assert.ok(dashboard.includes('Your listing is now marked Recently Updated for 3 days.'));
  assert.ok(dashboard.includes('Share your updated listing with your customers.'));
  assert.match(searchPage, /Recently Updated/);
  for (const event of ['recent_impression', 'recent_card_click', 'detail_view', 'website_click', 'contact_click', 'favorite_add', 'recent_filter']) {
    assert.match(analytics, new RegExp(`'${event}'`), `analytics tracks ${event}`);
  }
});
