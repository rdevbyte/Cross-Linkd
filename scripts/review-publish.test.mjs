import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/add-listing.astro', import.meta.url), 'utf8');

test('review section keeps required fields and the publish action', () => {
  assert.match(page, /id="section-review"/);
  assert.match(page, /Review and publish/);
  assert.match(page, /name="attestation" id="input-attestation" required/);
  assert.match(page, /name="terms" id="input-terms" required/);
  assert.match(page, /id="publish-btn"/);
  assert.match(page, /id="review-publish-btn"/);
  assert.match(page, />Publish</);
  assert.match(page, /setPublishBusy\(true\)/);
  assert.match(page, /button\.disabled = busy/);
  assert.match(page, /id="live-preview"/);
  assert.equal(page.match(/id="live-preview"/g).length, 1);
  assert.equal(page.match(/id="form-status"/g).length, 1);
});

test('hiring and online controls share a responsive row', () => {
  assert.match(page, /class="control-grid/);
  assert.match(page, /Is this company hiring\?/);
  assert.match(page, /id="input-hiring-yes"/);
  assert.match(page, /id="input-hiring-no"/);
  assert.match(page, /id="careers-url-field"/);
  assert.match(page, /@media \(min-width: 768px\) \{\s*\.control-grid \{ grid-template-columns: 1fr 1fr; \}/);
});

test('publish posts JSON and keeps the entries when the server says no', () => {
  // Native POST stays as the no-JS fallback …
  assert.match(page, /<form method="POST" action="\/api\/listings"/);
  // … while the enhanced path sends the same payload as JSON and reports inline.
  assert.match(page, /fetch\('\/api\/listings', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json'/);
  assert.match(page, /window\.location\.assign\('\/add-listing\?' \+ params\.toString\(\)\)/);
  assert.match(page, /function publishFailed\(message\)/);
  assert.match(page, /publishFailed\(\(data && data\.error\) \|\| 'Could not publish the listing\. Please try again\.'\)/);
  assert.match(page, /Could not reach the server\. Check your connection and try again/);
  // Draft and publish share one payload builder shaped like listingInputSchema.
  assert.equal(page.match(/function collectListing\(\)/g).length, 1);
  assert.match(page, /yearFounded: year \? Number\(year\) : undefined/);
  assert.match(page, /attestation: Boolean\(fd\.get\('attestation'\)\)/);
});

test('client location rule matches the server publish gate', async () => {
  const { publishBlockReason } = await import('../src/lib/formGuards.mjs');
  const serverMessage = publishBlockReason({ user: { id: 'u' }, city: '', region: '', isOnlineOnly: false, attestation: 'on', terms: 'on' });
  assert.ok(serverMessage);
  assert.ok(page.includes(`const LOCATION_RULE = '${serverMessage}';`));
});

test('guest email is required in the markup, mirroring the server rule', () => {
  assert.match(page, /name="email"\s+type="email"[\s\S]*?required=\{!user\}/);
  assert.match(page, /listing as a guest/);
});

test('rail holds the step list and the single live preview', () => {
  const rail = page.slice(page.indexOf('<aside class="builder-rail"'), page.indexOf('</aside>'));
  assert.match(rail, /<nav class="form-jump" aria-label="Form sections">/);
  assert.equal((rail.match(/data-step="/g) || []).length, 5);
  assert.match(rail, /<details class="disclose rail-preview" id="preview-panel" open>/);
  assert.match(rail, /id="live-preview"/);
  for (const id of ['preview-name', 'preview-type', 'preview-category', 'preview-location']) assert.match(rail, new RegExp(`id="${id}"`));
  assert.match(page, /window\.matchMedia\('\(min-width: 1024px\)'\)/);
});

test('type tiles expose their label to the script and carry a glyph', () => {
  assert.match(page, /import TypeGlyph from '@\/components\/TypeGlyph\.astro'/);
  assert.match(page, /class="type-card"[\s\S]*?data-label=\{t\.label\}/);
  assert.match(page, /<TypeGlyph name=\{typeBySlug\(t\.slug\)\?\.icon \?\? 'store'\} size=\{20\} \/>/);
  assert.match(page, /card\.dataset\.label \|\| card\.querySelector\('\.type-name'\)/);
  assert.doesNotMatch(page, /querySelector\('span span'\)/);
});

test('sticky bar keeps the progress contract on a single slim row', () => {
  const bar = page.slice(page.indexOf('id="sticky-bar"'), page.indexOf('</div>\n      </>'));
  assert.match(bar, /id="progress-bar" class="sticky-progress-fill" style="width: 0%"/);
  assert.match(bar, /id="progress-text" class="sticky-text" aria-live="polite">0 of 4 sections complete</);
  assert.match(bar, /id="save-draft-btn"/);
  assert.match(bar, /id="publish-btn"[^>]*form="add-listing-form"/);
  assert.match(page, /\.sticky-progress \{ height: 2px;/);
});
