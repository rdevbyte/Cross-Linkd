import { chromium } from 'playwright';
import pg from 'pg';

const BASE = 'http://localhost:4321';
const results = [];
const check = (name, cond, detail = '') => {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`);
  if (!cond) console.error(`FAILED: ${name} [${detail}]`);
  return cond;
};

const db = new pg.Client({
  connectionString: process.env.TEST_DATABASE_URL ?? 'postgres://crosslinkd:cl_local_dev@127.0.0.1:5433/crosslinkd',
});
await db.connect();
const q = (text, params) => db.query(text, params);

const browser = await chromium.launch();
const stamp = Date.now().toString(36);

// Guest submissions enter moderation (pending_review) and get no public page
// yet, so the UI flow below runs as a signed-in owner, who publishes immediately.
async function signup(page, u) {
  await page.goto(`${BASE}/auth/signup`, { waitUntil: 'networkidle' });
  await page.fill('input[name="displayName"]', u.name);
  await page.fill('input[name="email"]', u.email);
  await page.fill('input[name="password"]', u.password);
  await page.check('form input[type="checkbox"]');
  await Promise.all([page.waitForURL('**/dashboard**'), page.click('button[type="submit"]')]);
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // ---------------------------------------------------------------------------
  // 1. Server-side validation for the 2-denomination maximum
  // ---------------------------------------------------------------------------
  console.log('Testing Server-side API validation...');

  // Guest JSON submissions pass the same publish gate as the form: both
  // statements, a contact email, and a city/state (or online-only).
  const guestGate = { attestation: true, terms: true, email: 'api-guest@example.test', city: 'Austin', region: 'TX' };
  const rejectRes = await fetch(`${BASE}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...guestGate,
      name: `Too Many Denoms ${stamp}`,
      typeSlug: 'business',
      description: 'Testing server validation to ensure at most two denominations can be submitted.',
      industrySlug: 'food-beverage',
      categorySlug: 'bakeries',
      denominations: ['baptist', 'lutheran', 'catholic'], // 3 items!
    }),
  });
  check('server API: rejects >2 denominations with 400 Bad Request', rejectRes.status === 400);
  const rejectJson = await rejectRes.json();
  check('server API: error message explains max 2 denominations limit', rejectJson.error?.toLowerCase().includes('denomination') || rejectJson.error?.toLowerCase().includes('2'));

  const valid2Res = await fetch(`${BASE}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...guestGate,
      name: `Valid Two Denoms ${stamp}`,
      typeSlug: 'business',
      description: 'Testing valid submission with exactly two denominations and hierarchical category.',
      industrySlug: 'construction-skilled-trades',
      categorySlug: 'plumbing',
      denominations: ['baptist', 'non-denominational'],
    }),
  });
  check('server API: accepts valid 2 denominations with 200/201', valid2Res.ok);
  const valid2Json = await valid2Res.json();
  check('server API: returns success and slug', valid2Json.ok && Boolean(valid2Json.slug));

  const valid2Db = await q('select * from listings where slug = $1', [valid2Json.slug]);
  check('DB: stores denominations_list jsonb with 2 items', Array.isArray(valid2Db.rows[0].denominations_list) && valid2Db.rows[0].denominations_list.length === 2);
  check('DB: stores industry_slug', valid2Db.rows[0].industry_slug === 'construction-skilled-trades');
  check('DB: stores category_slug', valid2Db.rows[0].category_slug === 'plumbing');
  check('DB: guest API submission waits for moderation', valid2Db.rows[0].status === 'pending_review', `got=${valid2Db.rows[0].status}`);

  await signup(page, { name: 'Denom Tester', email: `denoms-${stamp}@test.dev`, password: 'Sturdy-Pass-123' });

  // ---------------------------------------------------------------------------
  // 2. Type is required before categories are offered (single searchable picker)
  // ---------------------------------------------------------------------------
  console.log('Testing type-driven category selection...');
  await page.goto(`${BASE}/add-listing`, { waitUntil: 'networkidle' });

  check('legacy primary category select removed', (await page.locator('#primary-category-select').count()) === 0);
  check('category validation error removed (category optional)', (await page.locator('#primary-category-error').count()) === 0);
  check('category search input present', (await page.locator('#category-search-input').count()) === 1);
  check('helper text asks for an organization type first', (await page.locator('#category-filter-help').textContent())?.trim() === 'Please select an organization type first.');
  check('status hidden before a type is chosen', await page.locator('#category-filter-status').isHidden());

  // ---------------------------------------------------------------------------
  // 3. Business category filtering + correct filtered counts
  // ---------------------------------------------------------------------------
  await page.click('.type-card[data-type="business"]');
  check('business helper text shown', (await page.locator('#category-filter-help').textContent())?.trim() === 'Showing business categories');

  const businessStatus = (await page.locator('#category-filter-status').textContent())?.trim() ?? '';
  const businessStatusN = parseInt(businessStatus, 10);
  check('business status matches the count format with a large pool', /^(\d+) categories available for this type$/.test(businessStatus) && businessStatusN > 20, `status="${businessStatus}"`);
  check('business status visible', await page.locator('#category-filter-status').isVisible());

  // The business pool spans multiple industries — probe two of them via search
  await page.fill('#category-search-input', 'music');
  await page.waitForTimeout(200);
  const musicResult = page.locator('#category-search-results button[data-slug="music"]');
  check('business pool includes arts categories', (await musicResult.count()) === 1, `got=${await musicResult.count()}`);
  check('music result belongs to arts-media-entertainment', (await musicResult.first().getAttribute('data-industry-slug')) === 'arts-media-entertainment');
  await page.fill('#category-search-input', '');
  check('search results closed after clearing query', await page.locator('#category-search-results').isHidden());

  // Church: fewer, filtered categories with an exact count
  await page.click('.type-card[data-type="church"]');
  const churchStatus = (await page.locator('#category-filter-status').textContent())?.trim() ?? '';
  check('church pool is exactly the permitted set of three', churchStatus === '3 categories available for this type', `status="${churchStatus}"`);
  check('church shows fewer categories than business', parseInt(churchStatus, 10) < businessStatusN, `church=${churchStatus} business=${businessStatusN}`);
  check('church helper text updated', ((await page.locator('#category-filter-help').textContent()) ?? '').startsWith('Showing faith-based categories for Churches'));

  // Type filtering proven on the pool: non-permitted categories disappear
  await page.fill('#category-search-input', 'music');
  await page.waitForTimeout(200);
  check('church pool excludes non-permitted business categories', (await page.locator('#category-search-results button').count()) === 0, `got=${await page.locator('#category-search-results button').count()}`);
  await page.fill('#category-search-input', 'other-religious');
  await page.waitForTimeout(200);
  const churchPermitted = page.locator('#category-search-results button[data-slug="other-religious"]');
  check('church pool offers the permitted religious categories', (await churchPermitted.count()) === 1, `got=${await churchPermitted.count()}`);
  check('permitted church result belongs to religious-organizations', (await churchPermitted.first().getAttribute('data-industry-slug')) === 'religious-organizations');
  await page.fill('#category-search-input', '');

  // Back to business for the remaining category behavior checks
  await page.click('.type-card[data-type="business"]');
  const restoredStatus = (await page.locator('#category-filter-status').textContent())?.trim() ?? '';
  check('returning to business restores the full business pool', parseInt(restoredStatus, 10) === businessStatusN, `got="${restoredStatus}" expected=${businessStatusN}`);

  // ---------------------------------------------------------------------------
  // 4. Existing category behavior remains intact (search picker)
  // ---------------------------------------------------------------------------
  console.log('Testing category selection behavior...');

  // Search uses the type-filtered pool
  await page.fill('#category-search-input', 'plumb');
  await page.waitForTimeout(200);
  const searchResults = page.locator('#category-search-results button');
  check('category search returns filtered matches', (await searchResults.count()) > 0);
  const firstResultText = (await searchResults.first().textContent()) ?? '';
  check('category search match includes Plumbing', firstResultText.includes('Plumbing'), `got="${firstResultText}"`);
  await searchResults.first().click();
  check('search selection sets hidden industrySlug', (await page.inputValue('#input-industry-slug')) === 'construction-skilled-trades');
  check('search selection sets hidden categorySlug', (await page.inputValue('#input-category-slug')) === 'plumbing');
  check('search field clears after selection', (await page.inputValue('#category-search-input')) === '');
  check('category chip visible after search pick', await page.locator('#category-chips-primary').isVisible());

  // Change category via a new search
  await page.fill('#category-search-input', 'mental-health');
  await page.waitForTimeout(200);
  await page.click('#category-search-results button[data-slug="mental-health"]');
  check('changing category updates hidden inputs', (await page.inputValue('#input-industry-slug')) === 'healthcare-wellness' && (await page.inputValue('#input-category-slug')) === 'mental-health');

  // Select "Other" category to test custom category input
  await page.fill('#category-search-input', 'other-business');
  await page.waitForTimeout(200);
  await page.click('#category-search-results button[data-slug="other-business"]');
  check('custom category: wrap is visible when Other category is chosen', await page.locator('#custom-category-wrap').isVisible());
  check('custom category: input is required when Other category chosen', (await page.locator('#input-custom-category').getAttribute('required')) !== null);
  await page.fill('#input-custom-category', 'Specialty Bible Restoration & Bookbinding');

  // Clearing via the category chip: empties state, no validation error element
  await page.click('#category-chip-clear');
  check('clearing the selection empties hidden inputs', (await page.inputValue('#input-category-slug')) === '' && (await page.inputValue('#input-industry-slug')) === '');
  check('clearing the selection hides the category chip', await page.locator('#category-chips-primary').isHidden());
  check('clearing the selection hides the custom category wrap', await page.locator('#custom-category-wrap').isHidden());
  check('clearing the selection keeps custom input empty', (await page.inputValue('#input-custom-category')) === '');
  check('category stays optional after clearing (no error element)', (await page.locator('#primary-category-error').count()) === 0);

  // Restore the intended category for submission
  await page.fill('#category-search-input', 'other-business');
  await page.waitForTimeout(200);
  await page.click('#category-search-results button[data-slug="other-business"]');
  check('re-selecting Other restores custom category wrap', await page.locator('#custom-category-wrap').isVisible());
  check('custom input required after re-selection', (await page.locator('#input-custom-category').getAttribute('required')) !== null);
  await page.fill('#input-custom-category', 'Specialty Bible Restoration & Bookbinding');
  check('no category validation error ever shown', (await page.locator('#primary-category-error').count()) === 0);

  // ---------------------------------------------------------------------------
  // 5. Multi-Denomination Selection (Max 2) — searchable typeahead
  // ---------------------------------------------------------------------------
  console.log('Testing searchable Denomination Selector...');

  // Initially 0 of 2
  check('denom UI: starts with 0 of 2 selected', (await page.locator('#denom-counter').innerText()).includes('0 of 2'));
  check('denom UI: empty hint is displayed', await page.locator('#denom-empty-hint').isVisible());
  check('denom UI: typeahead field replaces old button grid', (await page.locator('#denom-search-input').count()) === 1 && (await page.locator('.denom-toggle-btn').count()) === 0);

  // Select 1st denomination by typing: Baptist
  await page.fill('#denom-search-input', 'Baptist');
  await page.waitForTimeout(150);
  const baptistResult = page.locator('#denom-search-results button[data-slug="baptist"]');
  check('denom search: typing filters to Baptist', (await baptistResult.count()) === 1);
  check('denom search: results use the category-search styling', ((await baptistResult.first().getAttribute('class')) ?? '').includes('justify-between'));
  await baptistResult.click();

  check('denom UI: counter updates to 1 of 2 selected', (await page.locator('#denom-counter').innerText()).includes('1 of 2'));
  check('denom UI: Baptist chip added', await page.locator('.denom-chip:has-text("Baptist")').isVisible());
  check('denom search: field clears after selection', (await page.inputValue('#denom-search-input')) === '');
  check('denom UI: empty hint hidden', !(await page.locator('#denom-empty-hint').isVisible()));

  // Selected denominations are marked in the result list
  await page.fill('#denom-search-input', 'Bap');
  await page.waitForTimeout(150);
  check('denom search: selected item marked as Selected', ((await page.locator('#denom-search-results button[data-slug="baptist"]').textContent()) ?? '').includes('Selected'));
  await page.fill('#denom-search-input', '');

  // Select 2nd denomination: Non-Denominational
  await page.fill('#denom-search-input', 'Non-Den');
  await page.waitForTimeout(150);
  await page.click('#denom-search-results button[data-slug="non-denominational"]');
  await page.waitForTimeout(100);

  check('denom UI: counter updates to 2 of 2 selected (maximum)', (await page.locator('#denom-counter').innerText()).includes('2 of 2 selected (maximum)'));
  check('denom UI: Non-Denominational chip added', await page.locator('.denom-chip:has-text("Non-Denominational")').isVisible());
  check('denom UI: 2 chips in container', (await page.locator('.denom-chip').count()) === 2);

  // Attempt to select 3rd denomination (should trigger alert dialog and block addition)
  let alertMessage = '';
  page.once('dialog', async (dialog) => {
    alertMessage = dialog.message();
    await dialog.accept();
  });
  await page.fill('#denom-search-input', 'Lutheran');
  await page.waitForTimeout(150);
  await page.click('#denom-search-results button[data-slug="lutheran"]');
  await page.waitForTimeout(200);

  check('denom UI: alert triggered on 3rd selection attempt', alertMessage.includes('two denominations'));
  check('denom UI: count remains 2 (3rd selection blocked)', (await page.locator('.denom-chip').count()) === 2);
  check('denom UI: Lutheran was NOT added', (await page.locator('.denom-chip:has-text("Lutheran")').count()) === 0);

  // Remove a denomination using chip "✕" button
  await page.click('.denom-chip:has-text("Non-Denominational") button.remove-chip');
  await page.waitForTimeout(100);

  check('denom UI: counter decrements to 1 of 2 selected after removal', (await page.locator('#denom-counter').innerText()).includes('1 of 2'));
  check('denom UI: Non-Denominational chip removed', (await page.locator('.denom-chip:has-text("Non-Denominational")').count()) === 0);
  await page.fill('#denom-search-input', 'Non-Den');
  await page.waitForTimeout(150);
  check('denom search: removed item no longer marked Selected', ((await page.locator('#denom-search-results button[data-slug="non-denominational"]').textContent()) ?? '').includes('Add'));
  await page.fill('#denom-search-input', '');

  // Now select "Other" denomination option via search
  await page.fill('#denom-search-input', 'specify');
  await page.waitForTimeout(150);
  await page.click('#denom-search-results button[data-slug="other"]');
  await page.waitForTimeout(100);

  check('denom UI: selecting Other shows custom denomination input', await page.locator('#custom-denom-wrap').isVisible());
  await page.fill('#custom-denom-input', 'Reformed Baptist Network');

  // Verify hidden inputs for form submission contain exactly 2 slugs
  const hiddenDenomInputs = page.locator('#denom-hidden-inputs input[name="denominations"]');
  check('denom UI: exactly 2 hidden inputs generated for submission', (await hiddenDenomInputs.count()) === 2);
  const hiddenVals = [
    await hiddenDenomInputs.nth(0).getAttribute('value'),
    await hiddenDenomInputs.nth(1).getAttribute('value'),
  ];
  check('denom UI: hidden inputs include baptist and other', hiddenVals.includes('baptist') && hiddenVals.includes('other'));

  // ---------------------------------------------------------------------------
  // 6. Submit listing & verify DB persistence + Public Profile rendering
  // ---------------------------------------------------------------------------
  console.log('Submitting listing with 2 denominations and custom category...');
  const testBizName = `Grace Bookbinders ${stamp}`;
  await page.fill('#input-name', testBizName);
  await page.fill('input[name="tagline"]', 'Handcrafted Bibles and leather preservation');
  await page.fill('textarea[name="description"]', 'Dedicated to preserving historic family Bibles, hymnals, and theological works through traditional hand-sewn binding and artisan leather craft.');
  await page.fill('#input-city', 'Wheaton');
  await page.fill('#input-region', 'IL');
  await page.fill('input[name="postalCode"]', '60187');
  await page.fill('input[name="phone"]', '(630) 555-1234');
  await page.fill('input[name="email"]', 'inquiry@gracebookbinders.test');
  // Both required statements must be checked or the browser will not submit.
  await page.evaluate(() => {
    document.querySelectorAll('#add-listing-form input[type="checkbox"][required]').forEach((box) => {
      if (!box.checked) box.click();
    });
  });
  check('agreement toggles engaged before submit', await page.locator('#input-attestation').isChecked() && await page.locator('#input-terms').isChecked());

  await Promise.all([
    page.waitForURL('**/add-listing?success=1**'),
    page.click('#sticky-bar button[type="submit"]'),
  ]);

  check('create listing: redirected to success', page.url().includes('success=1'));
  const liveLink = page.locator('a:has-text("View public listing")');
  const liveUrl = await liveLink.getAttribute('href');

  // Query DB directly
  const savedRow = (await q('select * from listings where name = $1', [testBizName])).rows[0];
  check('DB: listing row created', Boolean(savedRow));
  check('DB: industry_slug stored correctly', savedRow.industry_slug === 'other-industries', `got=${savedRow.industry_slug}`);
  check('DB: category_slug stored correctly', savedRow.category_slug === 'other-business', `got=${savedRow.category_slug}`);
  check('DB: custom_category stored correctly', savedRow.custom_category === 'Specialty Bible Restoration & Bookbinding');
  check('DB: denominations_list stored correctly as JSONB array', Array.isArray(savedRow.denominations_list) && savedRow.denominations_list.length === 2);
  check('DB: custom_denomination stored correctly', savedRow.custom_denomination === 'Reformed Baptist Network');

  // Check public profile rendering
  await page.goto(`${BASE}${liveUrl}`, { waitUntil: 'networkidle' });
  check('public profile: custom category displayed in badge', (await page.locator('text=Specialty Bible Restoration & Bookbinding').count()) > 0);
  const faithText = await page.locator('dd:has-text("Baptist")').innerText();
  check('public profile: displays both Baptist and custom denomination', faithText.includes('Baptist') && faithText.includes('Reformed Baptist Network'));

  await context.close();
} finally {
  await browser.close();
  await db.end();
}

console.log(`\n${results.join('\n')}\n`);
const passed = results.filter((r) => r.startsWith('PASS')).length;
const total = results.length;
console.log(`${passed}/${total} passed`);
if (passed !== total) process.exit(1);
