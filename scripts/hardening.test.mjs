/**
 * Regression tests for the hardening pass (run with `npm run test:hardening`; tsx resolves the
 * `@/` alias and .ts imports).
 *
 * Every test pins a defect that was found in the code, not a hypothetical one:
 *  - the `next` redirect guard accepted `/\evil.com` and `/<TAB>/evil.com` (open redirect)
 *  - CSV exports wrote user-entered text verbatim (spreadsheet formula injection)
 *  - an owner could re-publish a listing a moderator had rejected (PATCH defaults to `publish`)
 *  - the in-memory rate limiter never evicted keys
 *  - city links used a different slug rule than the city pages ("St. Louis" → 404/redirect)
 *  - the cross-site check ignored requests that carry no Origin header
 *  - the C5 IDOR route (`api/listings/update.ts`) was documented as deleted but still shipped
 *  - stub endpoints reported success without storing anything
 *  - README/scripts drift (`npm run db:reset` did not exist)
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(root, rel), 'utf8');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
const apiFiles = () => walk(join(root, 'src/pages/api')).filter((f) => f.endsWith('.ts'));
const rel = (f) => relative(join(root, 'src/pages/api'), f).split('\\').join('/');

const ORIGINAL_ENV = { ...process.env };
async function withEnv(patch, fn) {
  for (const k of Object.keys(patch)) {
    if (patch[k] === undefined) delete process.env[k];
    else process.env[k] = patch[k];
  }
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(patch)) {
      if (ORIGINAL_ENV[k] === undefined) delete process.env[k];
      else process.env[k] = ORIGINAL_ENV[k];
    }
  }
}

// ------------------------------------------------------------- redirects

test('safeNextPath keeps same-site paths and rejects every off-site spelling', async () => {
  const { safeNextPath } = await import('../src/lib/safeRedirect.ts');
  for (const ok of ['/dashboard', '/admin/listings?status=pending#top', '/directory/grace-bakery', '/add-listing?x=1&y=2']) {
    assert.equal(safeNextPath(ok), ok, ok);
  }
  const bad = [
    '//evil.com', '///evil.com', '/\\evil.com', '/\\\\evil.com', '/\\/evil.com',
    '/\t/evil.com', '/\n/evil.com', '/\r/evil.com', '/\u0000/evil.com',
    'http://evil.com', 'https://evil.com/x', 'javascript:alert(1)', 'data:text/html,x', 'evil.com',
    '', '   ', `/${'a'.repeat(600)}`, null, undefined, 42, {},
  ];
  for (const value of bad) {
    assert.equal(safeNextPath(value), '/dashboard', JSON.stringify(value)?.slice(0, 40));
    assert.equal(safeNextPath(value, '/account'), '/account');
  }
  // dot segments are normalised away rather than passed through
  assert.equal(safeNextPath('/a/../b?c=1'), '/b?c=1');
});

// ------------------------------------------------------------------- csv

test('csvCell neutralises formula injection and keeps real numbers numeric', async () => {
  const { csvCell, toCsv } = await import('../src/lib/csv.ts');
  assert.equal(csvCell('=HYPERLINK("http://x","y")'), `"'=HYPERLINK(""http://x"",""y"")"`);
  for (const lead of ['=1+1', '+1', '-1', '@SUM(A1)', '\t=1', '\r=1']) {
    assert.ok(csvCell(lead).startsWith(`"'`), `formula lead ${JSON.stringify(lead)} must be prefixed`);
  }
  assert.equal(csvCell('Grace & Grain'), '"Grace & Grain"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell(-5), '-5', 'negative numbers stay numeric');
  assert.equal(csvCell(4.5), '4.5');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(undefined), '""');
  const out = toCsv(['a', 'b'], [['=x', 2]]);
  assert.ok(out.startsWith('\uFEFF"a","b"\r\n'), 'BOM + CRLF');
  assert.ok(out.endsWith(`"'=x",2\r\n`));
});

// ------------------------------------------------------- listing status

test('owner saves can never lift a listing out of a moderator-held state', async () => {
  const { resolveSaveStatus } = await import('../src/lib/listingStatus.ts');
  // product policy unchanged: new / draft / published listings go live on publish
  for (const current of [undefined, 'draft', 'published']) {
    for (const action of ['publish', 'save', undefined]) assert.equal(resolveSaveStatus(action, current), 'published', `${action}/${current}`);
  }
  // the bypass: PATCH defaults to `publish`, which used to republish rejected listings
  for (const held of ['rejected', 'changes_requested', 'pending_review', 'suspended', 'archived']) {
    for (const action of ['publish', 'save', undefined]) assert.equal(resolveSaveStatus(action, held), held, `${action}/${held} must not change`);
  }
  // resubmission re-enters moderation, except for staff-locked states
  for (const current of [undefined, 'draft', 'published', 'pending_review', 'rejected', 'changes_requested']) {
    for (const action of ['submit', 'resubmit']) assert.equal(resolveSaveStatus(action, current), 'pending_review');
  }
  for (const locked of ['suspended', 'archived']) assert.equal(resolveSaveStatus('resubmit', locked), locked);
  // a draft save keeps whatever status exists
  assert.equal(resolveSaveStatus('draft', undefined), 'draft');
  for (const s of ['published', 'rejected', 'pending_review']) assert.equal(resolveSaveStatus('draft', s), s);
});

// ---------------------------------------------------------- rate limiter

test('in-memory rate limiter slides, does not extend on blocked hits, and stays bounded', async () => {
  const { rateLimit, resetRateLimit, rateLimitSize, RATE_LIMIT_MAX_KEYS } = await import('../src/lib/rateLimit.mjs');
  resetRateLimit();
  assert.equal(rateLimit('k', 2, 1000, 0), true);
  assert.equal(rateLimit('k', 2, 1000, 10), true);
  assert.equal(rateLimit('k', 2, 1000, 20), false);
  assert.equal(rateLimit('k', 2, 1000, 30), false);
  // blocked attempts were not recorded, so the window ends when the first real hit ages out
  assert.equal(rateLimit('k', 2, 1000, 1001), true);

  // a flood of distinct keys cannot grow the map without bound
  resetRateLimit();
  const base = 5_000_000;
  for (let i = 0; i < RATE_LIMIT_MAX_KEYS + 500; i++) rateLimit(`flood:${i}`, 1, 600_000, base + i);
  assert.ok(rateLimitSize() <= RATE_LIMIT_MAX_KEYS + 1, `size ${rateLimitSize()}`);

  // expired keys are swept (they used to live until the instance was recycled)
  rateLimit('later', 1, 600_000, base + 3_600_000);
  assert.ok(rateLimitSize() < 10, `size after expiry ${rateLimitSize()}`);

  // absurdly long keys are truncated, not stored whole
  resetRateLimit();
  const huge = 'x'.repeat(50_000);
  assert.equal(rateLimit(huge, 1, 1000, 0), true);
  assert.equal(rateLimit(huge, 1, 1000, 1), false);
  resetRateLimit();
});

// ------------------------------------------------------------ ttl cache

test('ttl cache coalesces concurrent loads, expires, invalidates, and serves stale on error', async () => {
  const { createTtlCache } = await import('../src/lib/ttlCache.ts');
  let calls = 0;
  let clock = 0;
  let fail = false;
  const cache = createTtlCache(async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 5));
    if (fail) throw new Error('db down');
    return { n: calls };
  }, 1000, () => clock);

  const [a, b] = await Promise.all([cache.get(), cache.get(), cache.get()]);
  assert.equal(calls, 1, 'concurrent callers share one load');
  assert.equal(a, b);
  clock = 500;
  assert.equal((await cache.get()).n, 1);
  assert.equal(calls, 1, 'fresh entry served from cache');

  clock = 1500;
  fail = true;
  assert.equal((await cache.get()).n, 1, 'stale value served when the refresh fails');
  assert.equal(calls, 2);

  fail = false;
  clock = 1600;
  assert.equal((await cache.get()).n, 3, 'expired entry reloads');
  cache.invalidate();
  assert.equal((await cache.get()).n, 4, 'invalidate forces a reload');

  // an invalidation that lands while a load is in flight must not be overwritten by that (now stale) load
  let gate;
  let loads = 0;
  const slow = createTtlCache(async () => {
    loads++;
    if (loads === 1) await new Promise((r) => { gate = r; });
    return loads;
  }, 1000, () => clock);
  const first = slow.get();
  slow.invalidate();
  gate();
  assert.equal(await first, 1);
  assert.equal(await slow.get(), 2, 'the stale in-flight result was not cached');

  // no stale value and a failing loader: the error surfaces
  const broken = createTtlCache(async () => { throw new Error('boom'); }, 1000, () => clock);
  await assert.rejects(broken.get(), /boom/);

  // ttl <= 0 disables caching entirely
  let n = 0;
  const off = createTtlCache(async () => ++n, 0, () => clock);
  assert.equal(await off.get(), 1);
  assert.equal(await off.get(), 2);
});

// -------------------------------------------------------------- client ip

test('clientIp prefers the platform header and never returns attacker-sized junk', async () => {
  const { clientIp } = await import('../src/lib/clientIp.ts');
  const req = (headers) => new Request('http://x.test/', { headers });
  assert.equal(clientIp(req({ 'x-vercel-forwarded-for': '203.0.113.9', 'x-forwarded-for': '1.1.1.1' })), '203.0.113.9');
  assert.equal(clientIp(req({ 'x-forwarded-for': '198.51.100.7, 10.0.0.1' })), '198.51.100.7');
  assert.equal(clientIp(req({ 'x-forwarded-for': '2001:db8::1' })), '2001:db8::1');
  assert.equal(clientIp(req({ 'x-forwarded-for': '<script>'.repeat(50) })), 'unknown');
  assert.equal(clientIp(req({ 'x-real-ip': 'not an ip' })), 'unknown');
  assert.equal(clientIp(req({})), 'unknown');
});

// ---------------------------------------------------------- location slug

test('city links and city pages share one slug rule', async () => {
  const { locationSlug, slugify } = await import('../src/lib/slug.ts');
  assert.equal(locationSlug('St. Louis', 'MO'), 'st-louis-mo');
  assert.equal(locationSlug("O'Fallon", 'MO'), 'o-fallon-mo');
  assert.equal(locationSlug('Saint Clair', 'MO'), 'saint-clair-mo');
  assert.equal(locationSlug('New York', 'NY'), 'new-york-ny');
  assert.equal(locationSlug('São Paulo', 'SP'), 'sao-paulo-sp');
  assert.equal(locationSlug('St. Louis', 'MO'), slugify('St. Louis-MO'));
  // the formula the directory page and sitemap used to use produced slugs the city page never matched
  const legacy = (city, region) => `${city.toLowerCase().replace(/\s+/g, '-')}-${region.toLowerCase()}`;
  assert.notEqual(legacy('St. Louis', 'MO'), locationSlug('St. Louis', 'MO'));
  assert.notEqual(legacy("O'Fallon", 'MO'), locationSlug("O'Fallon", 'MO'));
});

// ------------------------------------------------------------------ csrf

test('cross-site writes are blocked, including requests that send no Origin', async () => {
  const { isCrossSiteWrite, originAllowed } = await import('../src/lib/csrf.ts');
  const h = (o) => new Headers(o);
  const host = 'crosslinkd.example';
  await withEnv({ NODE_ENV: 'production', PUBLIC_SITE_URL: undefined }, async () => {
    assert.equal(isCrossSiteWrite('GET', h({ origin: 'https://evil.test', host })), false, 'reads are never blocked');
    assert.equal(isCrossSiteWrite('POST', h({ origin: `https://${host}`, host })), false);
    assert.equal(isCrossSiteWrite('POST', h({ origin: 'https://evil.test', host })), true);
    assert.equal(isCrossSiteWrite('DELETE', h({ origin: 'https://evil.test', host })), true);
    assert.equal(isCrossSiteWrite('POST', h({ origin: 'null', host })), true, 'sandboxed-iframe Origin: null');
    assert.equal(isCrossSiteWrite('POST', h({ host, 'sec-fetch-site': 'cross-site' })), true, 'no Origin but the browser says cross-site');
    assert.equal(isCrossSiteWrite('POST', h({ host, 'sec-fetch-site': 'same-origin' })), false);
    assert.equal(isCrossSiteWrite('POST', h({ host })), false, 'non-browser clients carry no cookies to ride');
    assert.equal(originAllowed('http://localhost:4321', host), false, 'loopback is only trusted outside production');
    assert.equal(originAllowed('https://www.crosslinkd.com', host), true);
  });
  await withEnv({ NODE_ENV: 'development', PUBLIC_SITE_URL: 'https://site.example' }, async () => {
    assert.equal(originAllowed('http://localhost:4321', host), true);
    assert.equal(originAllowed('https://site.example', host), true, 'configured public site');
    assert.equal(originAllowed('https://evil.test', host), false);
  });
});

// -------------------------------------------------------------- small libs

test('safeHttpUrl only ever returns http(s) links', async () => {
  const { safeHttpUrl } = await import('../src/lib/safeUrl.ts');
  assert.equal(safeHttpUrl('https://example.com/path?q=1'), 'https://example.com/path?q=1');
  assert.equal(safeHttpUrl(' http://example.com '), 'http://example.com/');
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>', 'ftp://x.test', 'mailto:a@b.co', 'not a url', '', '   ', null, undefined, 5, `https://x.test/${'a'.repeat(2100)}`]) {
    assert.equal(safeHttpUrl(bad), undefined, String(bad).slice(0, 40));
  }
});

test('isUuid and xmlEscape', async () => {
  const { isUuid } = await import('../src/lib/ids.ts');
  const { xmlEscape } = await import('../src/lib/xml.ts');
  assert.equal(isUuid('3f2b8c1e-9d4a-4e6b-8a1c-2d3e4f5a6b7c'), true);
  for (const bad of ['', 'nope', '3f2b8c1e-9d4a-4e6b-8a1c-2d3e4f5a6b7', "1'; drop table users;--", null, undefined, 7]) assert.equal(isUuid(bad), false);
  assert.equal(xmlEscape(`Bed & Breakfast <"O'Fallon">`), 'Bed &amp; Breakfast &lt;&quot;O&apos;Fallon&quot;&gt;');
});

test('reviewer names are shortened to first name + last initial', async () => {
  const { publicReviewerName } = await import('../src/lib/listingReviews.ts');
  assert.equal(publicReviewerName('Olivia Owner'), 'Olivia O.');
  assert.equal(publicReviewerName('  mary   jane watson '), 'mary W.');
  assert.equal(publicReviewerName('Madonna'), 'Madonna');
  for (const empty of ['', '   ', null, undefined]) assert.equal(publicReviewerName(empty), 'Community member');
});

// ------------------------------------------------------------ validation

test('validation bounds arrays, trims names, caps emails and parses flags correctly', async () => {
  const m = await import('../src/lib/validation.ts');
  const base = { name: 'Grace Bakery', typeSlug: 'business' };
  assert.equal(m.listingInputSchema.safeParse({ ...base, industries: Array(12).fill('x') }).success, true);
  assert.equal(m.listingInputSchema.safeParse({ ...base, industries: Array(13).fill('x') }).success, false);
  assert.equal(m.listingInputSchema.safeParse({ ...base, professions: Array(13).fill('x') }).success, false);
  assert.equal(m.listingInputSchema.safeParse({ ...base, hashtags: Array(31).fill('x') }).success, false);
  assert.equal(m.listingInputSchema.safeParse({ ...base, languages: Array(13).fill('x') }).success, false);
  assert.equal(m.listingInputSchema.safeParse({ ...base, accessibility: ['x'.repeat(121)] }).success, false);
  assert.equal(m.listingInputSchema.safeParse({ ...base, name: '   ' }).success, false, 'whitespace-only names are rejected');
  assert.equal(m.listingInputSchema.parse({ ...base, name: '  Grace Bakery  ' }).name, 'Grace Bakery');
  // the PATCH schema inherits the same bounds
  assert.equal(m.listingPatchSchema.safeParse({ listing: { ...base, industries: Array(13).fill('x') } }).success, false);

  const longEmail = `${'a'.repeat(250)}@example.com`;
  assert.equal(m.signinSchema.safeParse({ email: longEmail, password: 'x' }).success, false, 'email length is capped');
  assert.equal(m.signupSchema.safeParse({ email: longEmail, password: 'longenough', displayName: 'Ab' }).success, false);
  assert.equal(m.signinSchema.safeParse({ email: 'a@b.co', password: 'x'.repeat(129) }).success, false);
  assert.equal(m.signinSchema.safeParse({ email: 'a@b.co', password: 'x'.repeat(128) }).success, true);

  const listingId = '3f2b8c1e-9d4a-4e6b-8a1c-2d3e4f5a6b7c';
  assert.equal(m.reviewInputSchema.safeParse({ listingId, rating: 5, serviceQuality: 4 }).success, true);
  assert.equal(m.reviewInputSchema.safeParse({ listingId, rating: 5, serviceQuality: 4.5 }).success, false, 'smallint column');
  assert.equal(m.reviewInputSchema.safeParse({ listingId, rating: Number.NaN }).success, false, 'a missing rating is not five stars');

  // z.coerce.boolean() turned the strings "false" and "0" into true
  const f = m.searchFilterSchema.parse({ verifiedOnly: 'false', openNow: '0', onlineOnly: '1' });
  assert.equal(f.verifiedOnly, false);
  assert.equal(f.openNow, false);
  assert.equal(f.onlineOnly, true);
  assert.equal(m.searchFilterSchema.parse({}).verifiedOnly, false);
});

test('region is normalised to the USPS code; cities and non-US regions are kept as typed', async () => {
  const m = await import('../src/lib/validation.ts');
  const base = { name: 'Grace Bakery', typeSlug: 'business' };
  const region = (value) => m.listingInputSchema.parse({ ...base, region: value }).region;
  for (const typed of ['Missouri', 'missouri', 'MO', 'mo', 'Mo.', 'M.O.', '  Missouri  ']) assert.equal(region(typed), 'MO', typed);
  assert.equal(region('texas'), 'TX');
  assert.equal(region('Washington DC'), 'DC');
  // not a US state: stays exactly as typed (the directory supports listings outside the U.S.)
  assert.equal(region('Ontario'), 'Ontario');
  assert.equal(region('Île-de-France'), 'Île-de-France');
  assert.equal(m.listingInputSchema.parse(base).region, undefined, 'absent stays absent');

  const city = (value) => m.listingInputSchema.parse({ ...base, city: value }).city;
  assert.equal(city('  St.   Louis '), 'St. Louis', 'whitespace tidied');
  // letter case is NOT rewritten: a title-caser turns these real Missouri cities into "Desoto" / "Town And Country"
  for (const real of ['DeSoto', 'DeKalb', 'Town and Country', "O'Fallon", 'Saint Clair']) assert.equal(city(real), real);

  // partial PATCH: only fields that were sent are touched
  const patch = m.listingPatchSchema.parse({ listing: { ...base, region: 'texas' } });
  assert.equal(patch.listing.region, 'TX');
  assert.equal(patch.listing.city, undefined);
});

// ------------------------------------------------- structural regressions

test('removed routes and files stay removed (C5 IDOR, stubs, shadowing, debug leftovers)', () => {
  const gone = [
    'src/pages/api/listings/update.ts',       // any signed-in user could overwrite any listing
    'src/pages/api/listings/deactivate.ts',   // redirected as if it had worked
    'src/pages/api/verifications.ts',         // logged uploads + reported success, stored nothing
    'src/pages/api/cron/refresh-sitemap.ts',  // no-op ping
    'src/lib/ratelimit.ts',                   // unused second limiter
    'public/robots.txt',                      // shadowed the dynamic robots.txt route (hard-coded sitemap host)
    'dbg.mjs',
  ];
  for (const file of gone) assert.equal(existsSync(join(root, file)), false, `${file} must not exist`);
});

test('no API route reports success for work it does not do', () => {
  for (const file of apiFiles()) {
    const src = readFileSync(file, 'utf8');
    assert.doesNotMatch(src, /\[demo\]/, `${rel(file)} logs "[demo]" and pretends to succeed`);
    assert.doesNotMatch(src, /import \{[^}]*\brateLimit\b[^}]*\} from '@\/lib\/rateLimit\.mjs'/, `${rel(file)} must use rateLimitShared`);
    assert.doesNotMatch(src, /request\.formData\(\)/, `${rel(file)} must use readFormData (formData() throws on other content types → 500)`);
  }
});

test('every admin API route is behind an apiGuard', () => {
  const admin = apiFiles().filter((f) => rel(f).startsWith('admin/'));
  assert.ok(admin.length >= 5, 'admin routes found');
  for (const file of admin) assert.match(readFileSync(file, 'utf8'), /apiGuard\.(admin|root|user)\(/, `${rel(file)} has no guard`);
  // the admin export in particular used to be guarded only when NODE_ENV=production && DATABASE_URL was set
  assert.match(read('src/pages/api/admin/export.ts'), /apiGuard\.admin\(/);
  assert.doesNotMatch(read('src/pages/api/admin/export.ts'), /process\.env\.NODE_ENV/);
  assert.match(read('src/pages/api/listings/export.ts'), /apiGuard\.user\(/);
});

test('routes that write listings are a reviewed allow-list, each with its guard', () => {
  const required = {
    'listings.ts': ['rateLimitShared', 'publishBlockReason'],          // public form: guests allowed by design, throttled + moderated
    'listings/[id].ts': ['apiGuard.user', 'loadOwned'],                // owner only
    'submissions.ts': ['apiGuard.user'],
    'admin/listings/[id]/moderate.ts': ['apiGuard.admin'],
  };
  for (const file of apiFiles()) {
    const src = readFileSync(file, 'utf8');
    if (!/\.update\(listings\)|\.delete\(listings\)|saveListing\(/.test(src)) continue;
    const name = rel(file);
    assert.ok(name in required, `${name} writes listings but is not in the reviewed allow-list — review its authorization, then add it here`);
    for (const token of required[name]) assert.ok(src.includes(token), `${name} must contain ${token}`);
  }
  // owner PATCH must go through the status rules, never write `status` itself
  assert.doesNotMatch(read('src/pages/api/listings/[id].ts'), /status:\s*(action|parsed)/);
  assert.match(read('src/lib/submissions.ts'), /resolveSaveStatus\(/);
});

test('vercel.json ships a real CSP and the standard security headers', () => {
  const config = JSON.parse(read('vercel.json'));
  const all = config.headers.find((h) => h.source === '/(.*)').headers;
  const header = (name) => all.find((h) => h.key.toLowerCase() === name.toLowerCase())?.value ?? '';
  const csp = Object.fromEntries(header('Content-Security-Policy').split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const [name, ...values] = d.split(/\s+/);
    return [name, values];
  }));
  assert.deepEqual(csp['default-src'], ["'self'"]);
  assert.deepEqual(csp['object-src'], ["'none'"]);
  assert.deepEqual(csp['base-uri'], ["'self'"]);
  assert.deepEqual(csp['form-action'], ["'self'"]);
  assert.deepEqual(csp['frame-ancestors'], ["'self'"]);
  for (const directive of ['script-src', 'style-src', 'connect-src', 'img-src']) {
    assert.ok(csp[directive], `${directive} is set`);
    assert.ok(!csp[directive].includes("'unsafe-eval'"), `${directive} must not allow eval`);
    assert.ok(!csp[directive].includes('*'), `${directive} must not be a wildcard`);
    assert.ok(!csp[directive].includes('http:'), `${directive} must not allow plain http`);
  }
  assert.ok('upgrade-insecure-requests' in csp);
  assert.equal(header('X-Content-Type-Options'), 'nosniff');
  assert.match(header('Strict-Transport-Security'), /max-age=\d{7,}/);
  assert.match(header('X-Frame-Options'), /SAMEORIGIN|DENY/);
  // hashed Astro assets live in /_astro (the adapter caches them); there is no /assets directory to configure
  assert.ok(!JSON.stringify(config).includes('/assets/'));
});

test('documented npm scripts exist', () => {
  const scripts = JSON.parse(read('package.json')).scripts;
  const docs = ['README.md', 'DEPLOY.md', 'DEPLOYMENT.md', 'LAUNCH_CHECKLIST.md', 'CODE_REVIEW.md', ...walk(join(root, 'docs')).filter((f) => f.endsWith('.md')).map((f) => relative(root, f))]
    .filter((f) => existsSync(join(root, f)));
  const missing = [];
  for (const file of docs) {
    for (const [, name] of read(file).matchAll(/npm run ([a-z0-9:_-]+)/gi)) {
      if (!(name in scripts)) missing.push(`${file}: npm run ${name}`);
    }
  }
  assert.deepEqual(missing, [], 'docs mention scripts that do not exist');
  for (const name of ['db:start', 'db:reset', 'dev:local', 'preview', 'test:hardening']) assert.ok(name in scripts, name);
  assert.match(scripts.test, /test:hardening/, 'the new suite is part of `npm test`');
});

test('e2e scripts are portable (no hard-coded sandbox paths)', () => {
  for (const file of readdirSync(root).filter((f) => /^e2e-.*\.mjs$/.test(f))) {
    const src = read(file);
    assert.doesNotMatch(src, /\/tmp\/node22/, `${file} hard-codes a sandbox Node path`);
  }
});

test('migrations: rate_limits table exists in both the SQL and the Drizzle schema', () => {
  assert.match(read('drizzle/0006_rate_limits.sql'), /CREATE TABLE IF NOT EXISTS "rate_limits"/);
  assert.match(read('src/db/schema.ts'), /pgTable\('rate_limits'/);
});

test('local Postgres is always initialised as UTF-8', () => {
  const src = read('scripts/start-pg.mjs');
  assert.match(src, /--encoding=UTF8/);
  assert.match(src, /server_encoding/);
});

test('destructive / polluting scripts need an explicit opt-in', () => {
  const wipe = read('scripts/wipe-listings.mjs');
  assert.match(wipe, /--yes/, 'wipe-listings must be a dry run unless --yes is given');
  assert.match(wipe, /--confirm-host=/, 'wiping a non-local database needs a second confirmation');
  const seed = read('src/db/seed.ts');
  assert.doesNotMatch(seed, /SAMPLE_LISTINGS|insert\(schema\.listings\)/, 'db:seed must never add fabricated business listings');
  // The seed is taxonomy-only now, so deployment docs may call it directly.
  for (const doc of ['DEPLOYMENT.md', 'DEPLOY.md']) {
    const text = read(doc);
    for (const line of text.split('\n')) {
      if (line.includes('npm run db:generate')) assert.match(line, /do not|don't|never/i, `${doc} recommends db:generate: ${line.trim().slice(0, 80)}`);
    }
    assert.doesNotMatch(text, /48 sample listings|copies the bundled sample listings/i, `${doc} must not claim db:seed inserts samples`);
  }
});

test('guarded-by-design: sign-in uses the constant-time verifier and the shared redirect guard', () => {
  const signin = read('src/pages/api/auth/signin.ts');
  assert.match(signin, /verifyPasswordConstantTime/);
  assert.doesNotMatch(signin, /verifyPassword\(/);
  for (const file of ['signin.ts', 'magic-link.ts']) {
    const src = read(`src/pages/api/auth/${file}`);
    assert.match(src, /safeNextPath/, `${file} must validate next with safeNextPath`);
    assert.doesNotMatch(src, /startsWith\('\/'\) && !/, `${file} still has the bypassable inline check`);
  }
  assert.match(read('src/pages/auth/signin.astro'), /safeNextPath/);
  // the magic-link button must live in the same <form> as the email field
  const page = read('src/pages/auth/signin.astro');
  assert.match(page, /formaction="\/api\/auth\/magic-link"/);
  assert.doesNotMatch(page, /<form[^>]*action="\/api\/auth\/magic-link"/, 'a separate magic-link form has no email input');
});
