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
const user = {
  email: `pastor-${stamp}@test.dev`,
  password: 'Password123!',
  name: 'David Pastor',
};

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
  // 1. Server-side validation testing for 2-denomination maximum & categories
  // ---------------------------------------------------------------------------
  console.log('Testing Server-side API validation...');

  // Test POST /api/listings with 3 denominations (must reject with 400)
  const rejectRes = await fetch(`${BASE}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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

  // Test POST /api/listings with valid 2 denominations
  const valid2Res = await fetch(`${BASE}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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

  // ---------------------------------------------------------------------------
  // 2. Client-side Interaction: Category Accordion
  // ---------------------------------------------------------------------------
  console.log('Testing Expandable Category Accordion UI...');
  await page.goto(`${BASE}/add-listing`, { waitUntil: 'networkidle' });

  // Accordion ARIA & Toggle Behavior
  const foodHeader = page.locator('.industry-item[data-industry-slug="food-beverage"] .industry-header-btn');
  check('accordion: industry header has aria-expanded="false" initially', (await foodHeader.getAttribute('aria-expanded')) === 'false');
  check('accordion: category body is hidden initially', !(await page.locator('#ind-cats-food-beverage').isVisible()));

  // Click to expand
  await foodHeader.click();
  await page.waitForTimeout(150);
  check('accordion: clicking expands section (aria-expanded="true")', (await foodHeader.getAttribute('aria-expanded')) === 'true');
  check('accordion: category body is visible after click', await page.locator('#ind-cats-food-beverage').isVisible());

  // Real-time Search
  const searchInput = page.locator('#category-search-input');
  await searchInput.fill('plumb');
  await page.waitForTimeout(200);
  check('category search: plumbing category is visible', await page.locator('.subcat-option-btn[data-category-slug="plumbing"]').isVisible());
  check('category search: bakeries category is hidden', !(await page.locator('.subcat-option-btn[data-category-slug="bakeries"]').isVisible()));
  check('category search: trades industry auto-expanded', (await page.locator('.industry-item[data-industry-slug="construction-skilled-trades"] .industry-header-btn').getAttribute('aria-expanded')) === 'true');

  // Clear search
  await searchInput.fill('');
  await page.waitForTimeout(150);
  check('category search: clearing restores list', await page.locator('.industry-item[data-industry-slug="food-beverage"]').isVisible());

  // Select category from accordion: Health & Wellness -> Christian Counseling
  const healthHeader = page.locator('.industry-item[data-industry-slug="healthcare-wellness"] .industry-header-btn');
  await healthHeader.click();
  await page.waitForTimeout(150);
  await page.click('.subcat-option-btn[data-category-slug="mental-health"]');

  // Verify Selected Category Badge & summary display
  check('category: accordion hidden after selection', !(await page.locator('#category-accordion-wrapper').isVisible()));
  check('category: selected card visible', await page.locator('#category-selected-card').isVisible());
  const selectedCatText = await page.locator('#category-selected-text').innerText();
  check('category: breadcrumb badge displays Health & Wellness › Christian Counseling', selectedCatText.includes('Health & Wellness') && selectedCatText.includes('Christian Counseling'));
  check('category: hidden input industrySlug set', (await page.inputValue('#input-industry-slug')) === 'healthcare-wellness');
  check('category: hidden input categorySlug set', (await page.inputValue('#input-category-slug')) === 'mental-health');

  // Changing category anytime
  await page.click('#change-category-btn');
  await page.waitForTimeout(150);
  check('category change: accordion re-opens when Change clicked', await page.locator('#category-accordion-wrapper').isVisible());
  check('category change: selected card hidden', !(await page.locator('#category-selected-card').isVisible()));

  // Select "Other" category to test custom category input
  const otherIndHeader = page.locator('.industry-item[data-industry-slug="other-industries"] .industry-header-btn');
  await otherIndHeader.click();
  await page.waitForTimeout(150);
  await page.click('.subcat-option-btn[data-category-slug="other-business"]');

  check('custom category: wrap is visible when Other category is chosen', await page.locator('#custom-category-wrap').isVisible());
  check('custom category: input is required when Other category chosen', await page.locator('#input-custom-category').getAttribute('required') !== null);
  await page.fill('#input-custom-category', 'Specialty Bible Restoration & Bookbinding');

  // ---------------------------------------------------------------------------
  // 3. Client-side Interaction: Multi-Denomination Selection (Max 2)
  // ---------------------------------------------------------------------------
  console.log('Testing Multi-Denomination Selector UI...');

  // Initially 0 of 2
  check('denom UI: starts with 0 of 2 selected', (await page.locator('#denom-counter').innerText()).includes('0 of 2'));
  check('denom UI: empty hint is displayed', await page.locator('#denom-empty-hint').isVisible());

  // Select 1st denomination: Baptist
  const baptistBtn = page.locator('.denom-toggle-btn[data-slug="baptist"]');
  await baptistBtn.click();
  await page.waitForTimeout(100);

  check('denom UI: counter updates to 1 of 2 selected', (await page.locator('#denom-counter').innerText()).includes('1 of 2'));
  check('denom UI: Baptist chip added', await page.locator('.denom-chip:has-text("Baptist")').isVisible());
  check('denom UI: Baptist button has active class', (await baptistBtn.getAttribute('class')).includes('chip-active'));
  check('denom UI: empty hint hidden', !(await page.locator('#denom-empty-hint').isVisible()));

  // Select 2nd denomination: Non-Denominational
  const nonDenomBtn = page.locator('.denom-toggle-btn[data-slug="non-denominational"]');
  await nonDenomBtn.click();
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
  const lutheranBtn = page.locator('.denom-toggle-btn[data-slug="lutheran"]');
  await lutheranBtn.click();
  await page.waitForTimeout(200);

  check('denom UI: alert triggered on 3rd selection attempt', alertMessage.includes('two denominations'));
  check('denom UI: count remains 2 (3rd selection blocked)', (await page.locator('.denom-chip').count()) === 2);
  check('denom UI: Lutheran was NOT added', (await page.locator('.denom-chip:has-text("Lutheran")').count()) === 0);

  // Remove a denomination using chip "✕" button
  await page.click('.denom-chip:has-text("Non-Denominational") button.remove-chip');
  await page.waitForTimeout(100);

  check('denom UI: counter decrements to 1 of 2 selected after removal', (await page.locator('#denom-counter').innerText()).includes('1 of 2'));
  check('denom UI: Non-Denominational chip removed', (await page.locator('.denom-chip:has-text("Non-Denominational")').count()) === 0);
  check('denom UI: Non-Denominational button active class removed', !(await nonDenomBtn.getAttribute('class')).includes('chip-active'));

  // Now select "Other" denomination option
  const otherDenomBtn = page.locator('.denom-toggle-btn[data-slug="other"]');
  await otherDenomBtn.click();
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
  // 4. Submit listing & verify DB persistence + Public Profile rendering
  // ---------------------------------------------------------------------------
  console.log('Submitting listing with 2 denominations and custom category...');
  const testBizName = `Grace Bookbinders ${stamp}`;
  await page.fill('input[name="name"]', testBizName);
  await page.selectOption('select[name="typeSlug"]', 'business');
  await page.fill('input[name="tagline"]', 'Handcrafted Bibles and leather preservation');
  await page.fill('textarea[name="description"]', 'Dedicated to preserving historic family Bibles, hymnals, and theological works through traditional hand-sewn binding and artisan leather craft.');
  await page.fill('input[name="city"]', 'Wheaton');
  await page.fill('input[name="region"]', 'IL');
  await page.fill('input[name="postalCode"]', '60187');
  await page.fill('input[name="phone"]', '(630) 555-1234');
  await page.fill('input[name="email"]', 'inquiry@gracebookbinders.test');
  await page.check('form input[type="checkbox"][required]');

  await Promise.all([
    page.waitForURL('**/add-listing?success=1**'),
    page.click('button[type="submit"]'),
  ]);

  check('create listing: redirected to success', page.url().includes('success=1'));
  const liveLink = page.locator('a:has-text("View public listing")');
  const liveUrl = await liveLink.getAttribute('href');

  // Query DB directly
  const savedRow = (await q('select * from listings where name = $1', [testBizName])).rows[0];
  check('DB: listing row created', Boolean(savedRow));
  check('DB: industry_slug stored correctly', savedRow.industry_slug === 'other-industries');
  check('DB: category_slug stored correctly', savedRow.category_slug === 'other-business');
  check('DB: custom_category stored correctly', savedRow.custom_category === 'Specialty Bible Restoration & Bookbinding');
  check('DB: denominations_list stored correctly as JSONB array', Array.isArray(savedRow.denominations_list) && savedRow.denominations_list.length === 2);
  check('DB: custom_denomination stored correctly', savedRow.custom_denomination === 'Reformed Baptist Network');

  // Check public profile rendering
  await page.goto(`${BASE}${liveUrl}`, { waitUntil: 'networkidle' });
  check('public profile: custom category displayed in badge', (await page.locator('text=Specialty Bible Restoration & Bookbinding').count()) > 0);
  const faithText = await page.locator('dd:has-text("Baptist")').innerText();
  check('public profile: displays both Baptist and custom denomination', faithText.includes('Baptist') && faithText.includes('Reformed Baptist Network'));

  // ---------------------------------------------------------------------------
  // 5. Test Denomination Privacy Controls
  // ---------------------------------------------------------------------------
  console.log('Testing Denomination Privacy Controls...');
  await signup(page, user);

  await page.goto(`${BASE}/dashboard/listings`, { waitUntil: 'networkidle' });
  const privBizName = `Private Faith Consulting ${stamp}`;

  // Open form card in dashboard
  await page.click('#listing-form-card summary');
  await page.waitForTimeout(200);

  // Fill in dashboard form to create a listing with showDenomination = false
  await page.fill('#listing-form input[name="name"]', privBizName);
  await page.selectOption('#listing-form select[name="typeSlug"]', 'business');
  await page.fill('#listing-form input[name="tagline"]', 'Confidential executive business coaching');
  await page.fill('#listing-form textarea[name="description"]', 'Strategic advisory for leadership teams navigating rapid growth and organizational restructuring.');
  await page.fill('#listing-form input[name="city"]', 'Denver');
  await page.fill('#listing-form input[name="region"]', 'CO');
  await page.fill('#listing-form input[name="postalCode"]', '80202');

  // Select category in dashboard: Professional Services -> Consulting
  await page.click('.dash-industry-item[data-industry-slug="professional-business-services"] .dash-industry-header-btn');
  await page.waitForTimeout(150);
  await page.click('.dash-subcat-option-btn[data-category-slug="consulting"]');
  check('dash category: Selected category badge updated', (await page.locator('#dash-category-selected-text').innerText()).includes('Consulting'));

  // Select 2 denominations: Presbyterian & Reformed, Lutheran
  await page.click('.dash-denom-toggle-btn[data-slug="reformed-presbyterian"]');
  await page.click('.dash-denom-toggle-btn[data-slug="lutheran"]');
  check('dash denom: 2 items selected in dashboard', (await page.locator('#dash-denom-counter').innerText()).includes('2 of 2'));

  // UNCHECK showDenomination to make faith affiliation private
  await page.uncheck('#listing-form input[name="showDenomination"]');

  // Submit via publish button
  await page.click('#form-submit-btn');
  await page.waitForTimeout(1500);

  const privDbRow = (await q('select * from listings where name = $1', [privBizName])).rows[0];
  check('DB: private listing created', Boolean(privDbRow));
  check('DB: show_denomination is false', privDbRow.show_denomination === false);
  check('DB: denominations_list stored in DB even when private', Array.isArray(privDbRow.denominations_list) && privDbRow.denominations_list.length === 2);

  // Navigate to public page: faith affiliation should NOT appear
  await page.goto(`${BASE}/directory/${privDbRow.slug}`, { waitUntil: 'networkidle' });
  check('public profile (private faith): Faith affiliation dt/dd NOT rendered', (await page.locator('dt:has-text("Faith affiliation")').count()) === 0);
  const privPageContent = await page.content();
  check('public profile (private faith): Reformed/Presbyterian text not exposed', !privPageContent.includes('Reformed & Presbyterian') && !privPageContent.includes('Presbyterian & Reformed'));

  // ---------------------------------------------------------------------------
  // 6. Test Edit Persistence in Dashboard
  // ---------------------------------------------------------------------------
  console.log('Testing Edit Persistence in Dashboard...');
  await page.goto(`${BASE}/dashboard/listings`, { waitUntil: 'networkidle' });

  // Click edit on the private listing
  await page.click(`tr:has-text("${privBizName}") button[data-act="edit"]`);
  await page.waitForTimeout(400);

  check('edit persistence: form opened with listing name', (await page.inputValue('#listing-form input[name="name"]')) === privBizName);
  check('edit persistence: category restored (Consulting)', (await page.locator('#dash-category-selected-text').innerText()).includes('Consulting'));
  check('edit persistence: 2 denominations restored in chips', (await page.locator('.dash-denom-chip').count()) === 2);
  check('edit persistence: Presbyterian chip exists', (await page.locator('.dash-denom-chip:has-text("Presbyterian")').count()) > 0);
  check('edit persistence: Lutheran chip exists', (await page.locator('.dash-denom-chip:has-text("Lutheran")').count()) > 0);
  check('edit persistence: showDenomination checkbox remains unchecked', !(await page.locator('#listing-form input[name="showDenomination"]').isChecked()));

  // Modify denominations on edit: remove Lutheran, add Non-denominational, enable showDenomination
  await page.click('.dash-denom-chip:has-text("Lutheran") button.remove-chip');
  await page.waitForTimeout(100);
  await page.click('.dash-denom-toggle-btn[data-slug="non-denominational"]');
  await page.check('#listing-form input[name="showDenomination"]');

  await page.click('#form-submit-btn');
  await page.waitForTimeout(1200);

  const updatedPrivRow = (await q('select * from listings where name = $1', [privBizName])).rows[0];
  check('DB edit: show_denomination updated to true', updatedPrivRow.show_denomination === true);
  check('DB edit: denominations_list updated', updatedPrivRow.denominations_list.includes('reformed-presbyterian') && updatedPrivRow.denominations_list.includes('non-denominational'));

  // Public page now reflects updated denominations
  await page.goto(`${BASE}/directory/${privDbRow.slug}`, { waitUntil: 'networkidle' });
  check('public profile: Faith affiliation now visible after toggling on', (await page.locator('dt:has-text("Faith affiliation")').count()) > 0);
  const updatedFaithText = await page.locator('dd:has-text("Non-Denominational")').innerText();
  check('public profile: displays Non-Denominational', updatedFaithText.includes('Non-Denominational'));

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
