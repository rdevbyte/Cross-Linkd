import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { calculateHomepageMetrics, formatMetricCount, metricNoun } from '../src/lib/homeMetrics.mjs';

test('homepage metrics count live listings, recent additions, state and city coverage, and leading locations', () => {
  const metrics = calculateHomepageMetrics([
    { city: 'Dallas', region: 'TX', addedDaysAgo: 0 },
    { city: ' dallas ', region: 'Texas', addedDaysAgo: 30 },
    { city: 'Fort Worth', region: 'TX', addedDaysAgo: 31 },
    { city: '—', region: 'TX' },
    { city: 'Atlanta', region: 'GA', addedDaysAgo: 12 },
    { city: 'Atlanta', region: 'GA', addedDaysAgo: 45 },
    { city: 'Atlanta', region: 'GA', addedDaysAgo: 50 },
    { city: 'Dallas', region: 'TX', isOnlineOnly: true, addedDaysAgo: 2 },
    { city: 'Toronto', region: 'ON', addedDaysAgo: 5 }
  ]);

  assert.equal(metrics.activeListings, 9);
  assert.equal(metrics.recentlyAdded, 5);
  assert.equal(metrics.statesRepresented, 2);
  assert.equal(metrics.citiesRepresented, 3);
  assert.deepEqual(metrics.topState, { state: 'TX', listingCount: 4, name: 'Texas' });
  assert.deepEqual(metrics.topCity, { city: 'Dallas', state: 'TX', listingCount: 2, stateName: 'Texas' });
  assert.equal(Object.hasOwn(metrics, 'serviceOfferings'), false, 'service-offering totals are not calculated');
});

test('metric nouns are singular only for a value of one, including irregular plurals', () => {
  assert.equal(formatMetricCount(0, 'state', 'states'), '0 states');
  assert.equal(formatMetricCount(1, 'state', 'states'), '1 state');
  assert.equal(formatMetricCount(2, 'state', 'states'), '2 states');
  assert.equal(formatMetricCount(1, 'city', 'cities'), '1 city');
  assert.equal(formatMetricCount(0, 'city', 'cities'), '0 cities');
  assert.equal(formatMetricCount(2, 'listing', 'listings'), '2 listings');
  assert.equal(metricNoun(1, 'Listing', 'Listings'), 'Listing');
  assert.equal(metricNoun(0, 'Listing', 'Listings'), 'Listings');
  assert.equal(metricNoun(2, 'Listing', 'Listings'), 'Listings');
});

test('cities are counted by normalized city and state, and ties resolve deterministically', () => {
  const metrics = calculateHomepageMetrics([
    { city: 'Albany', region: 'NY' },
    { city: 'Albany', region: 'CA' },
    { city: '  ALBANY ', region: 'ny' },
  ]);
  assert.equal(metrics.citiesRepresented, 2);
  assert.deepEqual(metrics.topCity, { city: 'Albany', state: 'NY', listingCount: 2, stateName: 'New York' });
});

test('active listing count is data-driven and reflects five published database rows', () => {
  const listings = Array.from({ length: 5 }, (_, index) => ({
    city: index < 2 ? 'Boise' : 'Salt Lake City',
    region: index < 2 ? 'ID' : 'UT',
  }));
  assert.equal(calculateHomepageMetrics(listings).activeListings, listings.length);
});

test('homepage metrics are safe for an empty published directory', () => {
  assert.deepEqual(calculateHomepageMetrics([]), {
    activeListings: 0,
    recentlyAdded: 0,
    statesRepresented: 0,
    citiesRepresented: 0,
    topState: undefined,
    topCity: undefined,
  });
});

test('homepage cards use published database rows and follow the requested distinct order', async () => {
  const [home, source] = await Promise.all([
    readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/publicListings.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(home, /getPublicListings\(\)/);
  assert.match(home, /calculateHomepageMetrics\(corpus\)/);
  assert.doesNotMatch(home, /getDbListings/, 'public listings are database-only, so homepage metrics need no duplicate query');
  const cards = home.match(/const metricCards = \[([\s\S]*?)\n\];/)?.[1] ?? '';
  const orderedMarkers = [
    "label: 'Location coverage'",
    "label: 'Top location'",
    'metricNoun(homepageMetrics.recentlyAdded',
    'metricNoun(homepageMetrics.activeListings',
  ].map((marker) => cards.indexOf(marker));
  assert.ok(orderedMarkers.every((position) => position >= 0), 'all four dashboard metrics are present');
  assert.deepEqual(orderedMarkers, [...orderedMarkers].sort((a, b) => a - b), 'metrics follow the requested order');
  assert.match(cards, /value: formatMetricCount\(homepageMetrics\.statesRepresented, 'state', 'states'\)/);
  assert.match(cards, /formatMetricCount\(homepageMetrics\.citiesRepresented, 'city', 'cities'\)\} across the U\.S\./);
  assert.match(cards, /value: homepageMetrics\.topState\?\.name \?\? '—'/);
  assert.match(cards, /\$\{homepageMetrics\.topCity\.city\}, \$\{homepageMetrics\.topCity\.state\} · \$\{formatMetricCount\(homepageMetrics\.topState\.listingCount, 'listing', 'listings'\)\} statewide/);
  assert.match(cards, /homepageMetrics\.topCity\.listingCount\.toLocaleString\(\)\} in the city/);
  assert.match(cards, /detail: 'Added in the past 30 days'/);
  assert.match(cards, /detail: 'Live in the directory now'/);
  assert.doesNotMatch(cards, /Leading state:|Leading city:|service offerings/i);
  assert.match(home, /class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"/);
  assert.match(home, /class="card min-w-0 p-4 sm:p-5"/);
  assert.match(home, /title=\{metric\.value\}/);
  assert.doesNotMatch(home, /service offerings|homepageMetrics\.serviceOfferings/i);
  assert.match(source, /eq\(listings\.status, 'published'\)/);
  assert.match(source, /isNull\(listings\.deletedAt\)/);
});
