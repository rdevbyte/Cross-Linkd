/**
 * Regression tests for the TypeScript library modules (run with `npm run test:lib`,
 * which uses tsx so `@/` aliases and .ts imports resolve).
 *
 * Each test pins a bug that shipped previously:
 *  - validation.ts crashed at import (ZodEffects has no `.partial()`), taking
 *    every auth/listing/admin route down with it
 *  - `website` accepted javascript:/data: URLs that were rendered as hrefs
 *  - JSON-LD was inlined with plain JSON.stringify (</script> break-out XSS)
 *  - sessions were signed with a hardcoded fallback key when AUTH_SECRET was unset
 *  - the sessions_valid_after watermark existed as a migration only
 *  - the site URL was resolved three different ways
 */
import assert from 'node:assert/strict';
import test from 'node:test';

const ORIGINAL_ENV = { ...process.env };
function withEnv(patch, fn) {
  for (const k of Object.keys(patch)) {
    if (patch[k] === undefined) delete process.env[k];
    else process.env[k] = patch[k];
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const k of Object.keys(patch)) {
        if (ORIGINAL_ENV[k] === undefined) delete process.env[k];
        else process.env[k] = ORIGINAL_ENV[k];
      }
    });
}

// ---------------------------------------------------------------- validation

test('validation module loads and both listing schemas are usable', async () => {
  const m = await import('../src/lib/validation.ts');
  assert.equal(m.listingInputSchema.safeParse({ name: 'Grace Bakery', typeSlug: 'business' }).success, true);
  const patch = m.listingPatchSchema.safeParse({ action: 'save', listing: { name: 'Grace Bakery', typeSlug: 'business' } });
  assert.equal(patch.success, true);
  // absent optional keys must stay absent so a PATCH can be merged over the stored row
  assert.deepEqual(Object.keys(patch.data.listing), ['name', 'typeSlug']);
});

test('careersUrl refinement still applies to the PATCH schema', async () => {
  const m = await import('../src/lib/validation.ts');
  const r = m.listingPatchSchema.safeParse({ action: 'save', listing: { name: 'Grace Bakery', typeSlug: 'business', careersUrl: 'ftp://jobs.example' } });
  assert.equal(r.success, false);
  assert.deepEqual(r.error.errors[0].path, ['listing', 'careersUrl']);
});

test('website only accepts http(s) URLs (or empty)', async () => {
  const m = await import('../src/lib/validation.ts');
  const parse = (website) => m.listingInputSchema.safeParse({ name: 'Grace Bakery', typeSlug: 'business', website });
  assert.equal(parse('https://grace.example').success, true);
  assert.equal(parse('').success, true);
  assert.equal(parse('javascript:alert(1)').success, false);
  assert.equal(parse('data:text/html,hi').success, false);
  assert.equal(parse('grace.example').success, false);
});

test('reviews require a UUID listing id and an integer rating', async () => {
  const m = await import('../src/lib/validation.ts');
  const id = '6f1e6c1e-1b2a-4c3d-8e9f-0a1b2c3d4e5f';
  assert.equal(m.reviewInputSchema.safeParse({ listingId: id, rating: 4 }).success, true);
  assert.equal(m.reviewInputSchema.safeParse({ listingId: id, rating: 4.5 }).success, false);
  assert.equal(m.reviewInputSchema.safeParse({ listingId: 'not-a-uuid', rating: 4 }).success, false);
});

// ----------------------------------------------------------------------- seo

test('safeJsonLd cannot close the surrounding <script> element', async () => {
  const { safeJsonLd } = await import('../src/lib/seo.ts');
  const payload = { description: '</script><script>alert(1)</script> & <b> \u2028' };
  const out = safeJsonLd(payload);
  assert.equal(out.includes('<'), false);
  assert.equal(out.includes('>'), false);
  assert.equal(out.includes('&'), false);
  assert.deepEqual(JSON.parse(out), payload, 'escaping must be lossless');
});

// ---------------------------------------------------------------------- auth

test('production without AUTH_SECRET fails closed', () =>
  withEnv({ NODE_ENV: 'production', AUTH_SECRET: undefined }, async () => {
    const m = await import('../src/lib/auth.ts');
    assert.equal(m.authConfigured(), false);
    assert.equal(await m.readSessionToken('a.b.c'), null);
    await assert.rejects(() => m.createSessionToken({ id: 'u1', email: 'a@b.co', displayName: 'A', role: 'super_admin' }), /AUTH_SECRET/);
  }));

test('development falls back to a dev key; tokens round-trip with issuedAt', () =>
  withEnv({ NODE_ENV: 'development', AUTH_SECRET: undefined }, async () => {
    const m = await import('../src/lib/auth.ts');
    assert.equal(m.authConfigured(), true);
    const token = await m.createSessionToken({ id: 'u1', email: 'a@b.co', displayName: 'A', role: 'member' });
    const claims = await m.readSessionToken(token);
    assert.equal(claims.id, 'u1');
    assert.equal(claims.role, 'member');
    assert.equal(typeof claims.issuedAt, 'number');
    assert.ok(Math.abs(claims.issuedAt - Date.now() / 1000) < 5);
  }));

test('a token signed with a different key is rejected', () =>
  withEnv({ NODE_ENV: 'production', AUTH_SECRET: 'key-one' }, async () => {
    const m = await import('../src/lib/auth.ts');
    const token = await m.createSessionToken({ id: 'u1', email: 'a@b.co', displayName: 'A', role: 'member' });
    process.env.AUTH_SECRET = 'key-two';
    assert.equal(await m.readSessionToken(token), null);
  }));

test('session watermark: revoked only when issued before the watermark second', async () => {
  const { isSessionRevoked } = await import('../src/lib/auth.ts');
  const issuedAt = 1_800_000_000; // seconds
  assert.equal(isSessionRevoked(issuedAt, null), false);
  assert.equal(isSessionRevoked(issuedAt, new Date(issuedAt * 1000 + 999)), false, 'same second → still valid');
  assert.equal(isSessionRevoked(issuedAt, new Date(issuedAt * 1000 + 1000)), true, 'next second → revoked');
  assert.equal(isSessionRevoked(issuedAt, new Date((issuedAt - 60) * 1000)), false, 'older watermark → valid');
});

// ------------------------------------------------------------------- siteUrl

test('resolveSiteUrl follows one resolution order everywhere', async () => {
  const { resolveSiteUrl } = await import('../src/lib/siteUrl.mjs');
  assert.equal(resolveSiteUrl({ PUBLIC_SITE_URL: 'https://crosslinkd.com/' }), 'https://crosslinkd.com');
  assert.equal(resolveSiteUrl({ PUBLIC_SITE_URL: 'crosslinkd.com' }), 'https://crosslinkd.com');
  assert.equal(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'cross-linkd.vercel.app', VERCEL_URL: 'x-git-abc.vercel.app' }), 'https://cross-linkd.vercel.app');
  assert.equal(resolveSiteUrl({ VERCEL_URL: 'x-git-abc.vercel.app' }), 'https://x-git-abc.vercel.app');
  assert.equal(resolveSiteUrl({ NODE_ENV: 'development' }), 'http://localhost:4321');
  assert.equal(resolveSiteUrl({ NODE_ENV: 'production' }), 'https://cross-linkd.vercel.app');
});

test('appUrl builds absolute links from the shared resolver', () =>
  withEnv({ PUBLIC_SITE_URL: 'https://crosslinkd.com/', VERCEL_URL: undefined }, async () => {
    const { appUrl } = await import('../src/lib/mailer.ts');
    assert.equal(appUrl('/auth/reset?token=abc'), 'https://crosslinkd.com/auth/reset?token=abc');
  }));

// ------------------------------------------------------------- searchParams

test('withoutParams drops one value without touching its siblings', async () => {
  const { withoutParams } = await import('../src/lib/searchParams.ts');
  const params = new URLSearchParams('q=bakery&denomination=baptist&denomination=lutheran&page=3');
  assert.equal(withoutParams(params, ['denomination', 'baptist'], ['page']).toString(), 'q=bakery&denomination=lutheran');
  assert.equal(withoutParams(params, ['denomination']).toString(), 'q=bakery&page=3');
  assert.equal(withoutParams(params, ['missing'], ['q', 'other']).toString(), params.toString(), 'no-op when nothing matches');
  assert.equal(params.toString(), 'q=bakery&denomination=baptist&denomination=lutheran&page=3', 'input is not mutated');
});
