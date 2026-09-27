import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onlineToggleState } from '../src/lib/onlineToggle.mjs';

test('off highlights In-person and does not submit a value', () => {
  const state = onlineToggleState(false);
  assert.equal(state.mode, 'off');
  assert.equal(state.activeId, 'online-off-label');
  assert.equal(state.inactiveId, 'online-on-label');
  assert.equal(state.message, 'This listing is for in-person services.');
  assert.equal(state.formValue, '');
});

test('on highlights Online-only and submits 1', () => {
  const state = onlineToggleState(true);
  assert.equal(state.mode, 'on');
  assert.equal(state.activeId, 'online-on-label');
  assert.equal(state.inactiveId, 'online-off-label');
  assert.equal(state.message, 'This listing is for online services only.');
  assert.equal(state.formValue, '1');
});

test('add-listing page uses the same two-option selection', () => {
  const page = readFileSync(new URL('../src/pages/add-listing.astro', import.meta.url), 'utf8');
  const off = onlineToggleState(false);
  const on = onlineToggleState(true);
  assert.match(page, /name="isOnlineOnly" value="1" id="input-online"/);
  assert.match(page, /id="online-off-label"/);
  assert.match(page, /id="online-on-label"/);
  assert.match(page, /In-person/);
  assert.match(page, /Online-only/);
  assert.match(page, new RegExp(off.message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(page, new RegExp(on.message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(page, /formValue: on \? '1' : ''/);
  assert.match(page, /event\.formData\.delete\('isOnlineOnly'\)/);
  assert.doesNotMatch(page, /online-switch|online-indicators|aria-hidden="true">\s*<span class="choice-copy">In-person/);
});

test('hiring and online cards share one control structure', () => {
  const page = readFileSync(new URL('../src/pages/add-listing.astro', import.meta.url), 'utf8');
  const grid = page.slice(page.indexOf('class="control-grid'), page.indexOf('id="careers-url-field"'));
  assert.equal((grid.match(/<fieldset class="control-fieldset">/g) || []).length, 2);
  assert.equal((grid.match(/<legend class="control-title">/g) || []).length, 2);
  assert.equal((grid.match(/class="control-row"/g) || []).length, 2);
  assert.equal((grid.match(/class="choice-group"/g) || []).length, 2);
  assert.equal((grid.match(/class="control-help"/g) || []).length, 2);
  assert.match(grid, /id="input-hiring-no" checked/);
  assert.match(grid, /name="isHiring" value="1" id="input-hiring-yes"/);
  assert.match(grid, /id="input-online-off" checked/);
  assert.match(grid, /Is this an online-only listing\?/);
  assert.doesNotMatch(grid, /online-switch|aria-hidden="true"[^>]*>\s*In-person|role="radiogroup"/);
});
