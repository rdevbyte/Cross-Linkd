import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, 'search page should load');

  // Keyboard-only: tab from the document until the WHAT combobox receives focus.
  const what = page.getByRole('combobox', { name: 'Service, category, or business name' });
  let focusedSearch = false;
  for (let i = 0; i < 50; i += 1) {
    await page.keyboard.press('Tab');
    if (await what.evaluate((input) => input === document.activeElement)) {
      focusedSearch = true;
      break;
    }
  }
  assert.equal(focusedSearch, true, 'search combobox should be reachable by Tab');

  await page.keyboard.type('#Bap');
  const listbox = page.getByRole('listbox', { name: 'Search suggestions' });
  await listbox.waitFor({ state: 'visible' });
  const options = listbox.getByRole('option');
  assert.ok(await options.count(), 'typing a hashtag fragment should expose suggestions');

  await page.keyboard.press('ArrowDown');
  const activeId = await what.getAttribute('aria-activedescendant');
  assert.ok(activeId, 'ArrowDown should expose the active option to assistive technology');
  assert.equal(await page.locator(`#${activeId}`).getAttribute('aria-selected'), 'true');

  await page.keyboard.press('Escape');
  await listbox.waitFor({ state: 'detached' });
  assert.equal(await listbox.count(), 0, 'Escape should close suggestions');
  assert.equal(await what.evaluate((input) => input === document.activeElement), true, 'Escape should preserve combobox focus');

  await page.keyboard.type('#Bap');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  assert.match(await what.inputValue(), /#\w/, 'Enter should select a suggestion without a mouse');
  await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('button', { name: 'Clear search' }).evaluate((button) => button === document.activeElement), true, 'clear-search control should follow the combobox in the tab order');

  // Axe audit is scoped to the interactive search widget so unrelated page
  // content does not hide regressions in the keyboard/screen-reader controls.
  const axe = await new AxeBuilder({ page }).include('form[role="search"]').analyze();
  assert.deepEqual(axe.violations, [], `search widget accessibility violations:\n${axe.violations.map((v) => `${v.id}: ${v.help}`).join('\n')}`);
  assert.deepEqual(errors, [], `browser errors: ${errors.join('; ')}`);
  console.log('PASS: keyboard search autocomplete and axe accessibility audit');
} finally {
  await browser.close();
}
