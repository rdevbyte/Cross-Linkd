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
