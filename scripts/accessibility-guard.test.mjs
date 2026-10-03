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

test('empty journeys browse published taxonomy without a homepage browse section', async () => {
  const [home, search, section] = await Promise.all([
    read('src/pages/index.astro'),
    read('src/pages/search.astro'),
    read('src/components/Section.astro'),
  ]);
  assert.doesNotMatch(home, /id="browse-published"/);
  assert.doesNotMatch(home, /Available listings/);
  assert.match(home, /For business owners/);
  assert.match(search, /Clear filters/);
  assert.match(search, /href="\/browse\/industries"/);
  assert.match(search, /Submit a real listing/);
  assert.match(section, /id\?: string/);
});

test('staff can open saved contact messages from the dashboard navigation', async () => {
  const [dashboardLayout, contactRoute, reportsPage] = await Promise.all([
    read('src/layouts/DashboardLayout.astro'),
    read('src/pages/api/contact.ts'),
    read('src/pages/admin/reports.astro'),
  ]);
  assert.match(dashboardLayout, /canViewAdmin\s*=\s*isStaff\(user\)/);
  assert.match(dashboardLayout, /Messages & reports/);
  assert.match(dashboardLayout, /\/admin\/reports/);
  const adminLinks = dashboardLayout.match(/const adminLinks: SidebarLink\[\] = \[([\s\S]*?)\n\];/)?.[1];
  assert.ok(adminLinks, 'admin navigation links should have a stable list');
  assert.deepEqual(
    [...adminLinks.matchAll(/label: '([^']+)'/g)].map(([, label]) => label),
    ['Overview', 'Listings', 'Listing notes', 'Claims', 'Reviews', 'Messages & reports', 'Taxonomy', 'Users', 'Analytics'],
  );
  assert.match(dashboardLayout, /<ul class="dashboard-nav-list">/);
  assert.match(dashboardLayout, /aria-current={active === link\.key \? 'page' : undefined}/);
  assert.match(dashboardLayout, /\.dashboard-nav-link\[aria-current='page'\]/);
  assert.match(reportsPage, /<DashboardLayout user={user} admin active="reports"/);
  assert.match(contactRoute, /db\.insert\(reports\)/);
  assert.doesNotMatch(contactRoute, /sendMail/);
  assert.match(reportsPage, /Reports and messages/);
});

test('resource center shows unique guide content inline in the How It Works style', async () => {
  const [page, navbar, footer] = await Promise.all([
    read('src/pages/articles/index.astro'),
    read('src/components/Navbar.astro'),
    read('src/components/Footer.astro'),
  ]);
  assert.match(page, /<h1[^>]*>Resource Center<\/h1>/);
  assert.match(page, /import '@\/styles\/how-it-works\.css'/);
  assert.match(page, /article\.sections\.map/);
  assert.match(page, /JSON\.stringify\(\[article\.title, article\.excerpt, article\.sections\]\)/);
  assert.doesNotMatch(page, /href=\{`\/articles\/\$\{article\.slug\}`\}/);
  assert.match(navbar, /label: 'Resource Center'/);
  assert.match(footer, /\['Resource Center', '\/articles'\]/);
});

test('browse industries keeps category links and counts visible in the How It Works style', async () => {
  const page = await read('src/pages/browse/industries.astro');
  assert.match(page, /import '@\/styles\/how-it-works\.css'/);
  assert.match(page, /industrySummaries\.map/);
  assert.match(page, /href=\{`\/industries\/\$\{industry\.slug\}`\}/);
  assert.match(page, /industry\.description/);
  assert.match(page, /industry\.categories\.length/);
  assert.match(page, /industry\.publishedCount/);
  assert.doesNotMatch(page, /<details/);
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
