import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { claimError, contactError, honeypotTripped, publishBlockReason, safeReturnPath } from '../src/lib/formGuards.mjs';
import { rateLimit, resetRateLimit } from '../src/lib/rateLimit.mjs';

test('signed-in complete listing can publish immediately', () => {
  assert.equal(publishBlockReason({
    user: { id: 'user-1' },
    email: 'owner@example.com',
    city: 'Austin',
    region: 'TX',
    isOnlineOnly: false,
    attestation: 'on',
    terms: 'on',
  }), '');
});

test('guest publish needs a contact email and a place or online-only', () => {
  assert.match(publishBlockReason({ user: null, email: '', city: 'Austin', region: 'TX', attestation: 'on', terms: 'on' }), /contact email/);
  assert.match(publishBlockReason({ user: null, email: 'guest@example.com', city: '', region: '', attestation: 'on', terms: 'on' }), /city or state/);
  assert.equal(publishBlockReason({
    user: null,
    email: 'guest@example.com',
    city: '',
    region: '',
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
