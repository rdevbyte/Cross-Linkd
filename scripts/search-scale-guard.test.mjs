import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('search SSR, API, and autocomplete use database-bounded result paths', async () => {
  const [page, api, suggest, dbSearch] = await Promise.all([
    read('src/pages/search.astro'),
    read('src/pages/api/search.ts'),
    read('src/pages/api/suggest.ts'),
    read('src/lib/dbSearch.ts'),
  ]);
  assert.match(page, /searchPublishedListings\(filters(?:,|\))/);
  assert.match(page, /getPublicSearchLocations\(\)/);
  assert.doesNotMatch(page, /getDbListings\(\)/);
  assert.match(api, /searchPublishedListings\(filters(?:,|\))/);
  assert.doesNotMatch(api, /getDbListings\(\)/);
  assert.match(suggest, /\.limit\(6\)/);
  assert.doesNotMatch(suggest, /getPublicListings\(\)/);
  assert.match(dbSearch, /\.limit\(limit\)\s*\.offset\(offset\)/);
  assert.match(dbSearch, /getDbListingsByIds\(ids\)/);
  assert.match(dbSearch, /count\(\*\)::int/);
});

test('API rate limits use the shared store and production fails closed on store errors', async () => {
  const limiter = await read('src/lib/sharedRateLimit.ts');
  const migration = await read('drizzle/0009_shared_rate_limits.sql');
  const search = await read('src/pages/api/search.ts');
  const suggest = await read('src/pages/api/suggest.ts');
  const health = await read('src/pages/api/health.ts');
  assert.match(limiter, /onConflictDoUpdate/);
  assert.match(limiter, /createHash\('sha256'\)/);
  assert.match(limiter, /NODE_ENV === 'production' \? false/);
  assert.match(migration, /PRIMARY KEY \(bucket_key, window_start\)/i);
  assert.match(search, /sharedRateLimit/);
  assert.match(suggest, /sharedRateLimit/);
  assert.match(health, /sharedRateLimitReady/);
});

test('search inputs expose listbox state and result status accessibly', async () => {
  const [searchBar, searchPage] = await Promise.all([
    read('src/components/SearchBar.tsx'),
    read('src/pages/search.astro'),
  ]);
  assert.match(searchBar, /aria-activedescendant/);
  assert.match(searchBar, /aria-haspopup="listbox"/);
  assert.match(searchBar, /useId\(\)/);
  assert.match(searchPage, /role="status" aria-live="polite"/);
  assert.match(searchPage, /aria-label="Pagination"/);
});

test('trust and search analytics do not infer verification from legacy fields', async () => {
  const [dbSearch, analytics, privacy, sampleGate] = await Promise.all([
    read('src/lib/dbSearch.ts'),
    read('src/pages/admin/analytics.astro'),
    read('src/pages/privacy.astro'),
    read('src/lib/sampleGate.ts'),
  ]);
  assert.match(dbSearch, /No public verification desk is currently available/);
  assert.match(dbSearch, /conditions\.push\(sql`false`\)/);
  assert.match(analytics, /searchLogs\.resultCount/);
  assert.match(analytics, /Common zero-result searches/);
  assert.match(privacy, /older than 90 days/);
  assert.match(sampleGate, /NODE_ENV === 'production'\) return false/);
});
