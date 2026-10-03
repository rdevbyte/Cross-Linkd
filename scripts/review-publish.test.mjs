import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/add-listing.astro', import.meta.url), 'utf8');
const taxonomyController = readFileSync(new URL('../src/scripts/taxonomyRecommendationController.ts', import.meta.url), 'utf8');

test('business description enforces the 500-character limit and announces a live count', () => {
  assert.match(page, /<textarea name="description" id="input-description"[^>]*maxlength="500"/);
  assert.match(page, /id="description-counter"[^>]*aria-live="polite"[^>]*>0 \/ 500 characters/);
  assert.match(page, /descriptionCounter\.textContent = `\$\{count\} \/ 500 characters`/);
  assert.match(page, /descriptionInput\?\.addEventListener\('input', updateDescriptionCounter\)/);
});

test('review section keeps required fields and the publish action', () => {
  assert.match(page, /id="section-review"/);
  assert.match(page, /Review and publish/);
  assert.match(page, /name="attestation" id="input-attestation" required/);
  assert.match(page, /name="terms" id="input-terms" required/);
  assert.doesNotMatch(page, /id="publish-btn"/);
  assert.match(page, /id="review-publish-btn"/);
  assert.match(page, />Publish</);
  assert.match(page, /setPublishBusy\(true\)/);
  assert.match(page, /reviewPublishBtn\.disabled = busy/);
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

test('category suggestions and manual picker are consolidated into the first step', () => {
  const basics = page.slice(page.indexOf('id="section-basics"'), page.indexOf('id="section-services"'));
  assert.match(basics, /<details class="disclose mt-5" data-taxonomy-recommendation-panel/);
  assert.match(basics, /Optional category suggestions/);
  assert.match(basics, /data-taxonomy-none[^>]*>None of these fit<\/button>/);
  assert.match(basics, /data-manual-category-picker/);
  assert.match(basics, /id="category-search-input"/);
  assert.match(basics, /name="industrySlug"/);
  assert.match(basics, /name="categorySlug"/);
  assert.doesNotMatch(page, /id="section-category"/);
  assert.match(page, /<section id="section-services"/);
  assert.match(page, /id="profession-options"/);
  assert.match(page, /id="service-options"/);
  assert.match(page, /<details id="section-faith"[^>]*class="form-section card disclose faith-disclosure"/);
  assert.match(page, /function appendCustomCategoryShortcut\(source\)/);
  assert.match(page, /button\.dataset\.customCategoryShortcut = 'true'/);
  assert.match(page, /\.category-picker \{ overflow-anchor: none; \}/);
  assert.match(page, /#category-search-results \{ overscroll-behavior: contain;/);
  assert.match(taxonomyController, /noneButton\?\.addEventListener\('click'/);
  assert.match(taxonomyController, /manualCategoryPicker\.classList\.remove\('hidden'\)/);
  assert.match(taxonomyController, /categorySearch\.focus\(\)/);
  assert.match(taxonomyController, /if \(manualCategoryPicker && categorySearch\)/);
  assert.match(taxonomyController, /panel\.open = false/);
  assert.match(taxonomyController, /appliedSuggestionKey/);
  assert.match(taxonomyController, /choice\.disabled = true/);
  assert.match(page, /taxonomy-recommendation-selection-cleared/);
  assert.match(taxonomyController, /Keep the dashboard’s existing Other-suggestion fallback unchanged/);
});

test('type tiles expose their label to the script and carry a glyph', () => {
  assert.match(page, /import TypeGlyph from '@\/components\/TypeGlyph\.astro'/);
  assert.match(page, /class="type-card"[\s\S]*?data-label=\{t\.label\}/);
  assert.match(page, /<TypeGlyph name=\{typeBySlug\(t\.slug\)\?\.icon \?\? 'store'\} size=\{20\} \/>/);
  assert.match(page, /card\.dataset\.label \|\| card\.querySelector\('\.type-name'\)/);
  assert.doesNotMatch(page, /querySelector\('span span'\)/);
});

test('the sticky action row is removed and review actions remain available', () => {
  for (const removed of ['sticky-bar', 'sticky-status', 'progress-text', 'progress-bar', 'save-draft-btn', 'publish-btn']) {
    assert.doesNotMatch(page, new RegExp(`id=\"${removed}\"`));
  }
  assert.doesNotMatch(page, /sticky-progress|sticky-actions|sticky-row/);
  assert.match(page, /id="review-publish-btn"/);
  assert.match(page, /id="review-draft-btn"/);
  assert.match(page, /reviewDraftBtn\.addEventListener\('click'/);
});

test('faith identity is required by the form and publish APIs while drafts remain possible', () => {
  const listingApi = readFileSync(new URL('../src/pages/api/listings.ts', import.meta.url), 'utf8');
  const submissionApi = readFileSync(new URL('../src/pages/api/submissions.ts', import.meta.url), 'utf8');
  const guards = readFileSync(new URL('../src/lib/formGuards.mjs', import.meta.url), 'utf8');
  assert.match(page, /Faith identity &amp; denomination <span class="field-marker field-marker-required">Required<\/span>/);
  assert.match(page, /Choose at least one denomination or add a statement of faith/);
  assert.match(page, /if \(!hasFaithIdentity\(\)\)/);
  assert.match(page, /faithSection\.open = true/);
  assert.match(page, /id="faith-identity-error"[^>]*role="alert"/);
  assert.match(page, /data-check="faith"/);
  assert.match(guards, /export function faithIdentityReason/);
  assert.match(listingApi, /faithIdentityReason|publishBlockReason/);
  assert.match(submissionApi, /if \(action !== 'draft'\)[\s\S]*?faithIdentityReason\(values\)/);
});

test('required and optional fields have text labels with non-color visual distinction', async () => {
  assert.match(page, /field-marker-required/);
  assert.match(page, /field-marker-optional/);
  assert.match(page, /Fields marked <strong>Required<\/strong>.*<strong>Optional<\/strong>/);
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.btn \{[\s\S]*?appearance: none/);
  assert.match(css, /taxonomy-suggestion-action:disabled[\s\S]*?filter: grayscale\(1\)/);
});
