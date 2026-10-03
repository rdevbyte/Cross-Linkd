import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public listing freshness comes from a stored record timestamp, not a verification field', async () => {
  const [types, mapper, card, detail] = await Promise.all([
    read('src/data/listings.ts'),
    read('src/lib/submissions.ts'),
    read('src/components/ListingCard.astro'),
    read('src/pages/directory/[slug].astro'),
  ]);
  assert.match(types, /updatedAt\?: string/);
  assert.match(mapper, /updatedAt: row\.updatedAt\?\.toISOString/);
  assert.match(card, /Public listing record last updated/);
  assert.match(detail, /Public listing record last updated/);
  assert.match(detail, /This is not a verification/);
  assert.doesNotMatch(detail, /fullDate\(listing\.updatedDaysAgo\)|>Last updated</);
  assert.doesNotMatch(card, /lastVerifiedAt|verifiedAt/);
});

test('listing cards show only entered services and submitted service areas', async () => {
  const card = await read('src/components/ListingCard.astro');
  assert.match(card, /l\.services/);
  assert.match(card, /serviceArea &&/);
  assert.match(card, /Online-only/);
  assert.match(card, /Services listed by/);
  assert.doesNotMatch(card, /industrySlug.*service/i);
});

test('empty journeys link to clear filters, published taxonomy, and real submissions', async () => {
  const [home, search, section] = await Promise.all([
    read('src/pages/index.astro'),
    read('src/pages/search.astro'),
    read('src/components/Section.astro'),
  ]);
  assert.match(home, /Submit a real listing/);
  assert.match(home, /id="browse-published"/);
  assert.match(search, /Clear filters/);
  assert.match(search, /#browse-published/);
  assert.match(search, /Submit a real listing/);
  assert.match(section, /id\?: string/);
});

test('search widget retains combobox keyboard and screen-reader support', async () => {
  const [searchBar, page] = await Promise.all([
    read('src/components/SearchBar.tsx'),
    read('src/pages/search.astro'),
  ]);
  assert.match(searchBar, /aria-activedescendant/);
  assert.match(searchBar, /aria-controls=/);
  assert.match(searchBar, /ArrowDown/);
  assert.match(searchBar, /ArrowUp/);
  assert.match(searchBar, /Escape/);
  assert.match(searchBar, /aria-haspopup="listbox"/);
  assert.match(page, /role="status" aria-live="polite"/);
});
