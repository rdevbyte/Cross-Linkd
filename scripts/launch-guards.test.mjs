import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { claimError, contactError, honeypotTripped, publishBlockReason, safeLocalPath, safeReturnPath } from '../src/lib/formGuards.mjs';
import { rateLimit, resetRateLimit } from '../src/lib/rateLimit.mjs';

test('signed-in complete listing can publish immediately', () => {
  assert.equal(publishBlockReason({
    user: { id: 'user-1' },
    email: 'owner@example.com',
    city: 'Austin',
    region: 'TX',
    denominations: ['baptist'],
    isOnlineOnly: false,
    attestation: 'on',
    terms: 'on',
  }), '');
});

test('faith identity is required for publishing and accepts a denomination or statement', () => {
  const complete = { user: { id: 'user-1' }, city: 'Austin', region: 'TX', attestation: 'on', terms: 'on' };
  assert.match(publishBlockReason(complete), /denomination or add a statement of faith/);
  assert.equal(publishBlockReason({ ...complete, denominations: ['baptist'] }), '');
  assert.equal(publishBlockReason({ ...complete, statementOfFaith: 'We follow the teachings of Jesus.' }), '');
  assert.equal(publishBlockReason({ ...complete, denominations: ['other'], customDenomination: 'Independent fellowship' }), '');
});

test('guest publish needs a contact email and a place or online-only', () => {
  assert.match(publishBlockReason({ user: null, email: '', city: 'Austin', region: 'TX', attestation: 'on', terms: 'on' }), /contact email/);
  assert.match(publishBlockReason({ user: null, email: 'guest@example.com', city: '', region: '', attestation: 'on', terms: 'on' }), /city or state/);
  assert.equal(publishBlockReason({
    user: null,
    email: 'guest@example.com',
    city: '',
    region: '',
    denominations: ['baptist'],
    isOnlineOnly: true,
    attestation: 'on',
    terms: 'on',
  }), '');
});

test('publish still requires both statements', () => {
  assert.match(publishBlockReason({ user: { id: 'user-1' }, city: 'Austin', region: 'TX', attestation: 'on', terms: '' }), /terms/);
});

test('honeypot and contact validation', () => {
  assert.equal(honeypotTripped(''), false);
  assert.equal(honeypotTripped('http://spam.test'), true);
  assert.equal(contactError({ name: 'Ada', email: 'ada@example.com', message: 'Please review this listing.' }), '');
  assert.equal(contactError({ name: 'Ada', email: '(512) 555-0100', message: 'Please call me about the listing.' }), '');
  assert.match(contactError({ name: 'A', email: 'ada@example.com', message: 'long enough message' }), /name/);
  assert.match(contactError({ name: 'Ada', email: 'ada@example.com', message: 'https://a.test https://b.test https://c.test https://d.test' }), /links/);
});

test('claim validation matches the form fields', () => {
  assert.equal(claimError({
    listingId: 'listing-1',
    claimantName: 'Ada Lovelace',
    claimantEmail: 'ada@example.com',
    relationship: 'Owner',
    evidence: 'My work email matches the website domain.',
  }), '');
  assert.match(claimError({ listingId: '', claimantName: 'Ada', claimantEmail: 'ada@example.com', relationship: 'Owner', evidence: 'long enough evidence' }), /listing/);
});

test('return paths stay on known pages', () => {
  assert.equal(safeReturnPath('/feedback', '/contact'), '/feedback');
  assert.equal(safeReturnPath('/directory/grace-and-grain', '/contact'), '/directory/grace-and-grain');
  assert.equal(safeReturnPath('https://evil.test', '/contact'), '/contact');
  assert.equal(safeReturnPath('/directory/../admin', '/contact'), '/contact');
});

test('auth return paths reject protocol-relative and backslash-based external URLs', () => {
  assert.equal(safeLocalPath('/dashboard?tab=listings', '/dashboard'), '/dashboard?tab=listings');
  assert.equal(safeLocalPath('//evil.example', '/dashboard'), '/dashboard');
  assert.equal(safeLocalPath('/\\evil.example', '/dashboard'), '/dashboard');
  assert.equal(safeLocalPath('https://evil.example', '/dashboard'), '/dashboard');
});

test('rate limit allows the signed-in e2e volume and then blocks', () => {
  resetRateLimit();
  assert.equal(rateLimit('publish:user:one', 30, 1000, 1_000), true);
  for (let i = 0; i < 29; i += 1) rateLimit('publish:user:one', 30, 1000, 1_000);
  assert.equal(rateLimit('publish:user:one', 30, 1000, 1_000), false);
  assert.equal(rateLimit('publish:user:one', 30, 1000, 2_001), true);
});

test('launch copy no longer promises an unstaffed inbox or a missing audit log', () => {
  const listings = readFileSync(new URL('../src/pages/api/listings.ts', import.meta.url), 'utf8');
  const privacy = readFileSync(new URL('../src/pages/privacy.astro', import.meta.url), 'utf8');
  const contact = readFileSync(new URL('../src/pages/contact.astro', import.meta.url), 'utf8');
  const about = readFileSync(new URL('../src/pages/about.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(listings, /console\.log\(/);
  assert.match(privacy, /does not keep a separate audit log/);
  assert.doesNotMatch(privacy, /account settings/);
  assert.doesNotMatch(contact, /We reply within 1–2 business days/);
  assert.doesNotMatch(about, /we will reply within 1–2 business days/);
  for (const path of ['../src/pages/guidelines.astro', '../src/pages/appeals.astro', '../src/pages/feedback.astro', '../src/pages/404.astro', '../src/pages/api/contact.ts', '../src/pages/api/claims.ts']) {
    assert.equal(readFileSync(new URL(path, import.meta.url), 'utf8').length > 0, true, path);
  }
});


test('session validation fails closed if revocation cannot be checked', () => {
  const middleware = readFileSync(new URL('../src/middleware.ts', import.meta.url), 'utf8');
  const failurePath = middleware.match(/console\.error\('\[middleware\] session check failed:[\s\S]*?sessionCheckFailed = true;/)?.[0] ?? '';
  assert.match(failurePath, /user = null;/);
  assert.match(middleware, /else if \(process\.env\.NODE_ENV === 'production'\)[\s\S]*?user = null;[\s\S]*?sessionCheckFailed = true;/);
  assert.match(middleware, /if \(token && !user && !sessionCheckFailed\)/);
});

test('unscoped legacy listing write routes are not exposed', () => {
  for (const path of [
    '../src/pages/api/listings/update.ts',
    '../src/pages/api/listings/deactivate.ts',
  ]) {
    assert.equal(existsSync(new URL(path, import.meta.url)), false, `${path} must remain removed`);
  }
});

test('owner responses stay private until staff moderation approves them', () => {
  const submitRoute = readFileSync(new URL('../src/pages/api/reviews/respond.ts', import.meta.url), 'utf8');
  const moderationRoute = readFileSync(new URL('../src/pages/api/admin/reviews/[id].ts', import.meta.url), 'utf8');
  const adminPage = readFileSync(new URL('../src/pages/admin/reviews.astro', import.meta.url), 'utf8');
  const publicListings = readFileSync(new URL('../src/lib/publicListings.ts', import.meta.url), 'utf8');
  const policy = readFileSync(new URL('../src/pages/reviews-policy.astro', import.meta.url), 'utf8');
  assert.match(submitRoute, /ownerRespondedAt: null/);
  assert.match(moderationRoute, /publish_response/);
  assert.match(adminPage, /Owner responses awaiting moderation/);
  assert.match(publicListings, /review\.ownerRespondedAt \?/);
  assert.match(policy, /moderated identically/);
});

test('optional taxonomy suggestions preserve manual custom values and fail open', () => {
  const addForm = readFileSync(new URL('../src/pages/add-listing.astro', import.meta.url), 'utf8');
  const dashboardForm = readFileSync(new URL('../src/pages/dashboard/listings.astro', import.meta.url), 'utf8');
  const controller = readFileSync(new URL('../src/scripts/taxonomyRecommendationController.ts', import.meta.url), 'utf8');
  assert.match(addForm, /taxonomyRecommendationController/);
  assert.match(dashboardForm, /taxonomyRecommendationController/);
  for (const source of [addForm, dashboardForm]) {
    assert.match(source, /customProfessionText/);
    assert.match(source, /customServiceText/);
  }
  assert.match(controller, /Checking local taxonomy suggestions/);
  assert.match(controller, /Suggestions are temporarily unavailable[\s\S]*save your listing normally/);
  assert.match(controller, /taxonomy-recommendations-refresh/);
});

test('homepage shows four distinct live-data metrics in the requested order', () => {
  const home = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.match(home, /getPublicListings\(\)/);
  assert.match(home, /calculateHomepageMetrics\(corpus\)/);
  assert.doesNotMatch(home, /getDbListings/, 'the public catalog is already database-only, so metrics share its single query');
  const cards = home.match(/const metricCards = \[([\s\S]*?)\n\];/)?.[1] ?? '';
  const positions = [
    "label: 'Location coverage'",
    "label: 'Top location'",
    'metricNoun(homepageMetrics.recentlyAdded',
    'metricNoun(homepageMetrics.activeListings',
  ].map((marker) => cards.indexOf(marker));
  assert.ok(positions.every((position) => position >= 0), 'all four homepage metrics are present');
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), 'homepage metrics use the requested order');
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
  assert.doesNotMatch(home, /service offerings|homepageMetrics\.serviceOfferings|verifiedCount/i);
});

test('every .astro frontmatter fence is exactly three dashes', () => {
  // A `------` fence (seen in Footer.astro) makes the compiler treat the extra
  // dashes as page text, so a literal "---" rendered on every page.
  const root = new URL('../src/', import.meta.url).pathname;
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.astro')) files.push(full);
    }
  };
  walk(root);
  assert.ok(files.length > 20, 'astro components found');
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    const fences = lines.filter((line) => /^-{3,}\s*$/.test(line));
    for (const fence of fences) assert.equal(fence.trim(), '---', `${file}: malformed frontmatter fence "${fence}"`);
    if (lines[0] === '---') assert.ok(fences.length >= 2, `${file}: frontmatter is never closed`);
  }
});
