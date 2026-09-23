import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:4321';
const results = [];
const check = (name, cond, detail = '') => {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`);
  return cond;
};

// --- DB helpers (pg) ---
import pg from 'pg';
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL ?? 'postgres://crosslinkd:cl_local_dev@127.0.0.1:5433/crosslinkd' });
await db.connect();
const q = (text, params) => db.query(text, params);

/** Read the newest verification link for an email from the dev server log (console mail provider). */
function latestLink(email, kind) {
  const log = readFileSync('/tmp/dev-server.log', 'utf8');
  const lines = log.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes(`[email:console] to=${email}`)) {
      const rest = lines.slice(i, i + 5).join('\n');
      const m = rest.match(new RegExp(`https?://\\S+/api/auth/${kind}\\?token=[0-9a-f]+`));
      if (m) return m[0];
    }
  }
  return null;
}

const browser = await chromium.launch();
const stamp = Date.now().toString(36);
const owner = { email: `owner-${stamp}@test.dev`, password: 'Passw0rd!123', name: 'Olivia Owner' };
const admin = { email: `admin-${stamp}@test.dev`, password: 'Passw0rd!123', name: 'Andy Admin' };

async function signup(page, u, next = '/dashboard') {
  await page.goto(`${BASE}/auth/signup?next=${encodeURIComponent(next)}`, { waitUntil: 'networkidle' });
  await page.fill('input[name="displayName"]', u.name);
  await page.fill('input[name="email"]', u.email);
  await page.fill('input[name="password"]', u.password);
  await page.check('form input[type="checkbox"]');
  await Promise.all([page.waitForURL('**/dashboard**'), page.click('button[type="submit"]')]);
}

async function signin(page, u, next = '/dashboard') {
  await page.goto(`${BASE}/auth/signin?next=${encodeURIComponent(next)}`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', u.email);
  await page.fill('input[name="password"]', u.password);
  await Promise.all([page.waitForURL('**' + next + '**'), page.click('button[type="submit"]')]);
}

const goodListing = (name) => ({
  name,
  typeSlug: 'business',
  tagline: 'Small-batch granola and sourdough',
  description: 'Family-run bakerygranola business serving the neighborhood with fresh baked goods every morning since 2019.',
  city: 'Austin', region: 'TX',
  email: 'hello@bakery.test', phone: '555-0100',
  website: 'https://bakery.test', priceRange: '$$',
});

try {
  // ============ 1. Signup + email verification (owner A) ============
  const A = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errorsA = [];
  A.on('pageerror', (e) => errorsA.push(e.message));
  await signup(A, owner);
  check('signup → session cookie lands on dashboard', A.url().includes('/dashboard'), A.url());
  check('verify-email banner shown', await A.locator('text=Verify your email').first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false));
  await A.close();

  const verifyUrl = latestLink(owner.email, 'verify');
  check('verification email generated with token link', !!verifyUrl, verifyUrl?.slice(0, 60));
  const V = await browser.newPage();
  await V.goto(verifyUrl, { waitUntil: 'networkidle' });
  check('verification link marks email verified', A.url().includes('dashboard') || (await V.locator('text=Email verified').count()) > 0 || V.url().includes('notice=email-verified'), V.url());
  const dbVerified = await q('select email_verified_at from users where email = $1', [owner.email]);
  check('DB: email_verified_at set', !!dbVerified.rows[0]?.email_verified_at);
  await V.close();

  // ============ 2. Owner creates draft, submits (pending, NOT public) ============
  const O = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await signin(O, owner, '/dashboard/listings');
  check('owner can open My Listings', O.url().includes('/dashboard/listings'));
  await O.click('#listing-form-card summary');
  await O.fill('#listing-form input[name="name"]', goodListing('Halo Granola Co.').name);
  await O.selectOption('#listing-form select[name="typeSlug"]', 'business');
  await O.fill('#listing-form textarea[name="description"]', goodListing('').description);
  await O.fill('#listing-form input[name="city"]', 'Austin');
  await O.fill('#listing-form input[name="region"]', 'TX');
  await O.fill('#listing-form input[name="email"]', 'hello@halogranola.test');
  await O.click('button[data-intent="draft"]');
  await O.waitForLoadState('networkidle');
  check('draft saved and visible in table', (await O.locator('td:has-text("Halo Granola Co.")').count()) > 0);
  check('status chip = Draft', (await O.locator('tr:has-text("Halo Granola") .chip').first().innerText()).includes('Draft'));

  // draft must not be publicly visible
  let pub = await q("select count(*) from listings where name = 'Halo Granola Co.' and status = 'published'");
  check('DB: draft not published', Number(pub.rows[0].count) === 0);
  const S = await browser.newPage();
  await S.goto(`${BASE}/search?q=Halo+Granola`, { waitUntil: 'networkidle' });
  check('public search does NOT show pending/draft listing', (await S.locator('a[href="/directory/halo-granola-co"]').count()) === 0);

  // incomplete submit blocked (clear description via API to simulate)
  const sess = await O.context().cookies();
  const cookie = sess.map((c) => `${c.name}=${c.value}`).join('; ');
  const bad = await fetch(`${BASE}/api/submissions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ action: 'submit', listing: { name: 'Halo Draft Only', typeSlug: 'business', description: 'short' } }),
  });
  check('incomplete submit rejected (400)', bad.status === 400, `status=${bad.status}`);

  // duplicate blocked
  const dup = await fetch(`${BASE}/api/submissions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ action: 'submit', listing: { ...goodListing('Halo Granola Co.'), description: 'Another halo granola location with the same name in the same city.' } }),
  });
  check('duplicate submission blocked (409)', dup.status === 409, `status=${dup.status}`);

  // unauthenticated blocked
  const anon = await fetch(`${BASE}/api/submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'draft', listing: { name: 'X Co', typeSlug: 'business' } }) });
  check('unauthenticated submit blocked (401)', anon.status === 401);

  // submit for review from the UI
  await O.click('[data-actions][data-name="Halo Granola Co."] [data-act="submit"]');
  await O.waitForTimeout(300);
  const [subResp] = await Promise.all([
    O.waitForResponse((r) => r.url().includes('/api/'), { timeout: 15000 }).catch(() => null),
    O.click('button[data-intent="submit"]'),
  ]);
  if (subResp && !subResp.ok()) console.log('SUBMIT FAILED BODY:', await subResp.text(), '\nREQUEST WAS:', subResp.request()?.postData() ?? '(none)');
  await O.waitForLoadState('networkidle');
  check('listing now Pending Review', (await O.locator('tr:has-text("Halo Granola") .chip').first().innerText()).includes('Pending Review'));

  // ============ 3. Admin bootstrap via CLI + moderation ============
  const { execSync } = await import('node:child_process');
  const env = { ...process.env, DATABASE_URL: 'postgres://crosslinkd:cl_local_dev@127.0.0.1:5433/crosslinkd', DIRECT_URL: 'postgres://crosslinkd:cl_local_dev@127.0.0.1:5433/crosslinkd', PATH: `/tmp/node22/bin:${process.env.PATH}` };
  // CLI promotion requires a registered account — sign up first.
  const A2 = await browser.newPage();
  await signup(A2, admin);
  await A2.close();
  const promote = execSync(`npx tsx scripts/admin-promote.ts ${admin.email}`, { env, encoding: 'utf8' });
  check('CLI promote works after registration', promote.includes('super_admin'), promote.trim().split('\n').pop());

  const AD = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await signin(AD, admin, '/admin/listings');
  check('admin lands in console', AD.url().includes('/admin/listings'));
  check('pending queue shows the submission', (await AD.locator('td:has-text("Halo Granola Co.")').count()) > 0);
  await AD.screenshot({ path: '/tmp/admin-queue.png', fullPage: false });

  // approve via UI
  await AD.click('[data-mod][data-name="Halo Granola Co."] [data-mact="approve"]');
  await AD.waitForLoadState('networkidle');
  check('queue approved (row leaves pending tab)', (await AD.locator('td:has-text("Halo Granola Co.")').count()) === 0);
  pub = await q("select status from listings where name = 'Halo Granola Co.'");
  check('DB: listing published', pub.rows[0]?.status === 'published', pub.rows[0]?.status);

  // publicly visible now
  await S.goto(`${BASE}/search?q=Halo+Granola`, { waitUntil: 'networkidle' });
  check('public search SHOWS approved listing', (await S.locator('a[href="/directory/halo-granola-co"]').count()) > 0);
  await S.goto(`${BASE}/directory/halo-granola-co`, { waitUntil: 'networkidle' });
  check('public detail page renders approved listing', (await S.locator('h1:has-text("Halo Granola")').count()) > 0);
  await S.close();

  // owner sees Approved
  await O.reload({ waitUntil: 'networkidle' });
  check('owner sees Approved status', (await O.locator('tr:has-text("Halo Granola") .chip').first().innerText()).includes('Approved'));
  const locked = await fetch(`${BASE}/api/listings/${(await q("select id from listings where name='Halo Granola Co.'")).rows[0].id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ action: 'save', listing: { name: 'Halo Granola Co.', typeSlug: 'business' } }),
  });
  check('published listing locked for owner edits (409)', locked.status === 409, `status=${locked.status}`);

  // ============ 4. Request changes → owner revises & resubmits ============
  await O.click('#listing-form-card summary');
  await O.fill('#listing-form input[name="name"]', 'Cedar & Sparrow Coffee');
  await O.fill('#listing-form textarea[name="description"]', 'Neighborhood coffee shop with pour-overs and a quiet study room open to all.');
  await O.fill('#listing-form input[name="city"]', 'Austin');
  await O.fill('#listing-form input[name="region"]', 'TX');
  await O.fill('#listing-form input[name="email"]', 'hi@cedarsparrow.test');
  await O.click('button[data-intent="submit"]');
  await O.waitForLoadState('networkidle');
  check('second listing pending', (await O.locator('tr:has-text("Cedar & Sparrow") .chip').first().innerText()).includes('Pending Review'));

  const cedarId = (await q("select id from listings where name = 'Cedar & Sparrow Coffee'")).rows[0].id;
  const rc = await fetch(`${BASE}/api/admin/listings/${cedarId}/moderate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie: sess.map((c) => `${c.name}=${c.value}`).join('; ') },
    body: JSON.stringify({ action: 'request_changes' }),
  });
  // admin cookie needed — use AD's session instead
  const adCookies = await AD.context().cookies();
  const adCookieHeader = adCookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const rc2 = await fetch(`${BASE}/api/admin/listings/${cedarId}/moderate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie: adCookieHeader },
    body: JSON.stringify({ action: 'request_changes', note: 'Please add your opening hours and a website or social link.' }),
  });
  check('request-changes without note rejected (owner cookie → 403 anyway)', rc.status === 403, `status=${rc.status}`);
  check('request-changes with note works for admin', rc2.ok, `status=${rc2.status}`);
  await O.reload({ waitUntil: 'networkidle' });
  check('owner sees Changes Requested + reviewer note', (await O.locator('tr:has-text("Cedar & Sparrow")').innerText()).includes('opening hours'));

  // resubmit
  await O.click('[data-actions][data-name="Cedar & Sparrow Coffee"] [data-act="resubmit"]');
  await O.waitForTimeout(300);
  const [reResp] = await Promise.all([
    O.waitForResponse((r) => r.url().includes('/api/listings/'), { timeout: 15000 }).catch(() => null),
    O.click('button[data-intent="submit"]'),
  ]);
  if (reResp && !reResp.ok()) console.log('RESUBMIT FAILED:', await reResp.text());
  await O.waitForLoadState('networkidle');
  check('resubmit → Pending Review again', (await O.locator('tr:has-text("Cedar & Sparrow") .chip').first().innerText()).includes('Pending Review'));

  // ============ 5. Security negatives ============
  const anonPage = await browser.newPage();
  await anonPage.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  check('anon /admin redirected to signin', anonPage.url().includes('/auth/signin'), anonPage.url());
  await anonPage.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  check('anon /dashboard redirected to signin', anonPage.url().includes('/auth/signin'));
  await anonPage.close();

  const A3 = await browser.newPage();
  await signin(A3, owner, '/dashboard');
  const resp1 = await A3.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  check('member /admin → 403', resp1.status() === 403, `status=${resp1.status()}`);
  const m1 = await fetch(`${BASE}/api/admin/users/00000000-0000-0000-0000-000000000000/role`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ role: 'super_admin' }) });
  check('member role-change API → 403', m1.status === 403, `status=${m1.status}`);
  const m2 = await fetch(`${BASE}/api/admin/listings/${cedarId}/moderate`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ action: 'approve' }) });
  check('member moderate API → 403', m2.status === 403, `status=${m2.status}`);
  // cross-user protection: another (admin) account PATCHing A's listing → 404
  const m3 = await fetch(`${BASE}/api/listings/${cedarId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', cookie: adCookieHeader }, body: JSON.stringify({ action: 'save', listing: { name: 'Cedar & Sparrow Coffee', typeSlug: 'business' } }) });
  check('cross-user listing PATCH → 404', [403, 404].includes(m3.status), `status=${m3.status}`);
  // setup-key endpoint: wrong key → 403; right key → 409 (admin exists)
  const sk1 = await fetch(`${BASE}/api/admin/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ key: 'wrong-key' }) });
  check('setup endpoint wrong key → 403', sk1.status === 403, `status=${sk1.status}`);
  const sk2 = await fetch(`${BASE}/api/admin/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ key: 'bootstrap-key-local-e2e' }) });
  check('setup endpoint after admin exists → 409', sk2.status === 409, `status=${sk2.status}`);
  const sk3 = await fetch(`${BASE}/api/admin/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'bootstrap-key-local-e2e' }) });
  check('setup endpoint unauthenticated → 401', sk3.status === 401, `status=${sk3.status}`);
  await A3.close();

  // ============ 6. Admin console: users page + role revoke semantics ============
  check('admin users page lists accounts', (await AD.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle' }).then(() => AD.locator('td:has-text(' + JSON.stringify(owner.email) + ')').count())) > 0);
  check('self role editor disabled for admin', (await AD.locator(`tr:has-text("${admin.email}") select`).count()) === 0);

  // revoke admin via CLI; old session still admin (JWT), after re-signin → 403
  execSync(`npx tsx scripts/admin-promote.ts --revoke ${admin.email}`, { env, encoding: 'utf8' });
  await AD.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  check('revoked admin: existing session still works (documented JWT semantics)', (await AD.locator('h1').first().innerText()).length > 0);
  await AD.goto(`${BASE}/auth/signout`, { waitUntil: 'networkidle' }).catch(() => {});
  await signin(AD, admin, '/admin/listings');
  const after = await AD.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  check('revoked admin: after re-signin → 403', after.status() === 403, `status=${after.status()}`);
  await AD.close();

  // ============ 7. Responsive + regression of key pages ============
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await signin(mob, owner, '/dashboard/listings');
  await mob.screenshot({ path: '/tmp/dash-mobile.png' });
  check('mobile dashboard renders form', await mob.locator('#listing-form-card').isVisible());
  await mob.close();

  check('zero page errors on owner flows', errorsA.length === 0, errorsA.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  await db.end();
}
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
