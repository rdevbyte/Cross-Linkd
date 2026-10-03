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
  email: `member-${stamp}@test.dev`,
  password: 'Password123!',
  name: 'Martha Baker',
};

async function signup(page, u) {
  await page.goto(`${BASE}/auth/signup`, { waitUntil: 'networkidle' });
  await page.fill('input[name="displayName"]', u.name);
  await page.fill('input[name="email"]', u.email);
  await page.fill('input[name="password"]', u.password);
  await page.check('form input[type="checkbox"]');
  await Promise.all([page.waitForURL('**/dashboard**'), page.click('button[type="submit"]')]);
}

async function openManualCategory(page) {
  const suggestions = page.locator('[data-taxonomy-recommendation-panel]');
  if (!(await suggestions.evaluate((el) => el.open))) await suggestions.locator(':scope > summary').click();
  const manualPicker = page.locator('[data-manual-category-picker]');
  if (await manualPicker.isHidden()) {
    await suggestions.locator('[data-taxonomy-none]').click();
    check('None of these fit collapses the suggestion accordion', !(await suggestions.evaluate((el) => el.open)));
  }
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // ----------------------------------------------------
  // 1. Guest view of /add-listing + type-driven category IA
  // ----------------------------------------------------
  await page.goto(`${BASE}/add-listing`, { waitUntil: 'networkidle' });
  check('page loads successfully', (await page.locator('h1:has-text("List your business")').count()) > 0);

  // Listing type terminology
  check('label "What best describes you?" exists', (await page.locator('text=What best describes you?').count()) > 0);
  check('helper text explains category filtering', (await page.locator('text=Select the type that best fits — this filters categories to only relevant options.').count()) > 0);
  check('all seven type cards exist', (await page.locator('.type-card').count()) === 7, `got=${await page.locator('.type-card').count()}`);
  const typeDescriptions = [
    'Christian-owned company, shop, or service provider',
    'Local congregation — services, small groups, pastoral care',
    'Parachurch outreach, missions, discipleship, media',
    'Faith-based charity or community organization',
    'Christian school, college, seminary, or homeschool co-op',
    'Conference, retreat, concert, camp, or gathering',
    'Association, network, or other faith-aligned org',
  ];
  for (const desc of typeDescriptions) {
    check(`type card description present: "${desc.slice(0, 30)}…"`, (await page.locator(`.type-card:has-text("${desc}")`).count()) > 0);
  }

  // Category picker initial state — single typeahead; legacy <select> and its
  // required-field validation are removed (category is optional server-side)
  check('legacy primary category select removed', (await page.locator('#primary-category-select').count()) === 0);
  check('primary category validation error removed (category optional)', (await page.locator('#primary-category-error').count()) === 0);
  check('category search input exists', (await page.locator('#category-search-input').count()) === 1);
  check('initial helper text present', (await page.locator('#category-filter-help').textContent())?.trim() === 'Please select an organization type first.');
  check('category filter status hidden initially', await page.locator('#category-filter-status').isHidden());
  check('category type warning hidden initially', await page.locator('#category-type-warning').isHidden());

  // Listing name behavior
  check('listing name label is "Listing name *"', (await page.locator('label:has-text("Listing name *")').count()) > 0);
  check('listing name input has id input-name', (await page.locator('#input-name').count()) === 1);
  check('listing name placeholder is Grace Community Church', (await page.locator('#input-name').getAttribute('placeholder')) === 'Grace Community Church');
  check('no label says "Organization name"', (await page.locator('text=Organization name').count()) === 0);
  check('preview placeholder is "Your listing name"', (await page.locator('#preview-name').textContent())?.trim() === 'Your listing name');

  // Field clarity: listing type vs. industry & business category
  check('manual category picker is part of the Basics step', (await page.locator('#manual-category-picker').count()) === 1 && (await page.locator('#section-basics').locator('#manual-category-picker').count()) === 1);
  check('professions and services remain available as an optional follow-up', (await page.locator('#section-services h2:has-text("Professions & services")').count()) === 1);
  check('section 1 explains the listing type dimension', (await page.locator('text=Listing type — what you\'re offering or listing.').count()) > 0);
  check('type context chip hidden before a type is selected', await page.locator('#category-type-context').isHidden());
  check('price range select leaves room for its chevron', (await page.locator('select[name="priceRange"]').evaluate((el) => parseFloat(getComputedStyle(el).paddingRight))) >= 32);

  // Organization basics: expanded optional fields
  const yearFounded = page.locator('input[name="yearFounded"]');
  check('year founded input exists', (await yearFounded.count()) === 1);
  check('year founded uses a numeric input type', (await yearFounded.getAttribute('type')) === 'number');
  check('organization size select exists', (await page.locator('select[name="employeeCount"]').count()) === 1);
  check('organization size offers six buckets plus placeholder', (await page.locator('select[name="employeeCount"] option').count()) === 7, `got=${await page.locator('select[name="employeeCount"] option').count()}`);
  check('ownership type select exists', (await page.locator('select[name="ownershipType"]').count()) === 1);
  check('flexible hours editor exists', (await page.locator('#add-listing-hours-editor[data-hours-editor]').count()) === 1);
  check('hours editor keeps the compatible hours JSON payload', (await page.locator('#add-listing-hours-editor input[name="hoursJson"]').count()) === 1);
  check('hours editor offers the legacy quick presets', (await page.locator('#add-listing-hours-editor [data-hours-preset] option').count()) === 7, `got=${await page.locator('#add-listing-hours-editor [data-hours-preset] option').count()}`);
  check('service area input exists', (await page.locator('input[name="serviceArea"]').count()) === 1);
  check('contact preference select exists', (await page.locator('select[name="contactPreference"]').count()) === 1);
  check('contact preference offers four methods plus placeholder', (await page.locator('select[name="contactPreference"] option').count()) === 5, `got=${await page.locator('select[name="contactPreference"] option').count()}`);

  // Price range spacing: generous separation from later sections (no dropdown
  // or denomination control visually attached to the price field). The field
  // lives in the collapsed "About your organization" disclosure, so open it first.
  await page.locator('details.org-card > summary').click();
  const priceBox = await page.locator('select[name="priceRange"]').boundingBox();
  const faithHeadingBox = await page.locator('#section-faith-heading').boundingBox();
  const gapFaith = priceBox && faithHeadingBox ? Math.round(faithHeadingBox.y - (priceBox.y + priceBox.height)) : -1;
  check('price range has clear vertical separation from the denomination section', gapFaith > 80, `gap=${gapFaith}px`);
  check('price range sits inside the optional organization disclosure', await page.locator('select[name="priceRange"]').evaluate((el) => Boolean(el.closest('details.org-card')?.open)));

  // Denomination typeahead replaces the old button grid
  check('denomination search field exists', (await page.locator('#denom-search-input').count()) === 1);
  check('old denomination toggle buttons removed', (await page.locator('.denom-toggle-btn').count()) === 0);
  check('old denomination dropdown removed', (await page.locator('#more-denoms-select').count()) === 0);

  // Visibility checkboxes are now toggle sliders
  check('visibility controls are toggle sliders', (await page.locator('input[name="showEmail"].peer.sr-only').count()) === 1 && (await page.locator('input[name="showPhone"].peer.sr-only').count()) === 1);
  check('toggle state pills render', (await page.locator('label:has(input[name="showEmail"])').textContent())?.includes('Off') === true);

  // Review actions stay with the review section; the fixed sticky action row is gone.
  check('sticky action row is removed', (await page.locator('#sticky-bar, #progress-bar, #progress-text').count()) === 0);
  check('publish and draft actions remain in the review section', (await page.locator('#section-review #review-publish-btn').count()) === 1 && (await page.locator('#section-review #review-draft-btn').count()) === 1);
  check('sitewide button reset removes native button appearance', await page.locator('#review-publish-btn').evaluate((el) => getComputedStyle(el).appearance === 'none'));
  check('faith identity is explicitly required', (await page.locator('#section-faith-heading .field-marker-required').textContent())?.trim() === 'Required');
  check('hiring status defaults to No', await page.locator('#input-hiring-no').isChecked());
  check('careers URL field is hidden until hiring is Yes', await page.locator('#careers-url-field').isHidden());
  await page.locator('#input-hiring-yes').check();
  check('careers URL field appears when hiring is Yes', await page.locator('#careers-url-field').isVisible());
  await page.locator('#input-careers-url').fill('not a url');
  await page.locator('#input-careers-url').blur();
  check('invalid careers URL shows an inline error', await page.locator('#careers-url-error').isVisible());
  await page.locator('#input-hiring-no').check();
  check('careers URL field hides when hiring is No', await page.locator('#careers-url-field').isHidden());
  check('careers URL is preserved after switching back to No', await page.locator('#input-careers-url').inputValue() === 'not a url');
  await page.locator('#input-hiring-yes').check();
  await page.locator('#input-careers-url').fill('https://example.com/careers');
  await page.locator('#input-careers-url').blur();
  check('valid careers URL clears the inline error', await page.locator('#careers-url-error').isHidden());
  await page.locator('#input-careers-url').fill('');
  await page.locator('#input-hiring-no').check();
  check('online-only toggle exists', (await page.locator('#input-online').count()) === 1);
  check('online-only text present', (await page.locator('text=Is this an online-only listing?').count()) > 0);
  check('online off/on labels exist', (await page.locator('#online-off-label').count()) === 1 && (await page.locator('#online-on-label').count()) === 1);
  const offState = await page.evaluate(() => {
    const input = document.getElementById('input-online');
    const data = new FormData(document.getElementById('add-listing-form'));
    return {
      checked: input.checked,
      sent: data.get('isOnlineOnly'),
      mode: document.getElementById('online-toggle-wrap').dataset.online,
      off: document.getElementById('online-off-label').dataset.active,
      on: document.getElementById('online-on-label').dataset.active,
    };
  });
  check('online off highlights In-person', offState.mode === 'off' && offState.off === 'true' && offState.on === 'false' && offState.checked === false && offState.sent == null);
  check('location fields visible before online toggle', await page.locator('#location-fields').isVisible());
  check('location disabled note hidden before online toggle', await page.locator('#location-disabled-note').isHidden());

  // Guest view essentials
  const guestEmailVal = await page.inputValue('input[name="email"]');
  check('guest: email field empty', guestEmailVal === '');
  check('guest: notice to sign up is visible', (await page.locator('text=listing as a guest').count()) > 0);
  check('guest: button says Publish business listing', (await page.locator('#review-publish-btn:has-text("Publish")').count()) > 0);
  check('secondary category search input exists', (await page.locator('#category-search-input').count()) === 1);

  // Multi-denomination UI basics preserved (searchable typeahead)
  check('add-listing: denomination search field exists', (await page.locator('#denom-search-input').count()) > 0);
  check('add-listing: counter badge starts at 0 of 2', (await page.locator('#denom-counter:has-text("0 of 2 selected")').count()) > 0);

  // Privacy controls preserved
  const showEmailBox = page.locator('input[name="showEmail"]');
  const showPhoneBox = page.locator('input[name="showPhone"]');
  const showWebsiteBox = page.locator('input[name="showWebsite"]');
  const showAddressBox = page.locator('input[name="showAddress"]');
  check('add-listing: privacy checkbox showEmail exists', (await showEmailBox.count()) > 0);
  check('add-listing: privacy checkbox showPhone exists', (await showPhoneBox.count()) > 0);
  check('add-listing: privacy checkbox showWebsite exists', (await showWebsiteBox.count()) > 0);
  check('add-listing: privacy checkbox showAddress exists', (await showAddressBox.count()) > 0);
  check('add-listing: contact privacy defaults to unchecked (private)', !(await showEmailBox.isChecked()) && !(await showPhoneBox.isChecked()) && !(await showWebsiteBox.isChecked()));

  // ----------------------------------------------------
  // 2. Selecting a type drives the category search pool
  // ----------------------------------------------------
  await page.click('.type-card[data-type="business"]');
  check('type card marks itself selected via aria-pressed', (await page.locator('.type-card[data-type="business"][aria-pressed="true"]').count()) === 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await openManualCategory(page);
  const mobileCategoryBox = await page.locator('#category-search-input').boundingBox();
  check('mobile manual category search fits the viewport', Boolean(mobileCategoryBox && mobileCategoryBox.x >= 0 && mobileCategoryBox.x + mobileCategoryBox.width <= 390));
  check('mobile layout has no horizontal page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.setViewportSize({ width: 1280, height: 900 });
  check('business helper text updated', (await page.locator('#category-filter-help').textContent())?.trim() === 'Showing business categories');
  check('type context chip shows the selected type', ((await page.locator('#category-type-context').textContent()) ?? '').includes('Business'), `got="${await page.locator('#category-type-context').textContent()}"`);
  const businessStatus = (await page.locator('#category-filter-status').textContent())?.trim() ?? '';
  const businessStatusN = parseInt(businessStatus, 10);
  check('status displays the available category count', /^(\d+) categories available for this type$/.test(businessStatus) && businessStatusN > 20, `status="${businessStatus}"`);
  check('status is visible after type selection', await page.locator('#category-filter-status').isVisible());

  // Listing name live behavior
  await page.fill('#input-name', 'Grace Community Church');
  check('preview echoes listing name', (await page.locator('#preview-name').textContent())?.trim() === 'Grace Community Church');
  await page.fill('#input-name', '');
  check('preview falls back to "Your listing name"', (await page.locator('#preview-name').textContent())?.trim() === 'Your listing name');
  await page.fill('#input-name', 'Grace Community Church');

  // Description length is enforced at input time and shown by a live counter.
  const descriptionField = page.locator('#input-description');
  check('business description has a 500-character maximum', (await descriptionField.getAttribute('maxlength')) === '500');
  await descriptionField.pressSequentially('x'.repeat(520));
  check('description cannot exceed 500 entered characters', (await descriptionField.evaluate((el) => el.value.length)) === 500);
  check('description counter reports the current count and limit', (await page.locator('#description-counter').textContent())?.trim() === '500 / 500 characters');
  await descriptionField.fill('');
  check('description counter resets after clearing', (await page.locator('#description-counter').textContent())?.trim() === '0 / 500 characters');

  // Primary category selection via the single typeahead picker
  await openManualCategory(page);
  await page.fill('#category-search-input', 'bakeries');
  await page.waitForTimeout(200);
  const bakeryResult = page.locator('#category-search-results button[data-slug="bakeries"]');
  check('category search finds Bakeries under business type', (await bakeryResult.count()) === 1, `got=${await bakeryResult.count()}`);
  await bakeryResult.click();
  check('category selection sets hidden industrySlug', (await page.inputValue('#input-industry-slug')) === 'food-beverage');
  check('category selection sets hidden categorySlug', (await page.inputValue('#input-category-slug')) === 'bakeries');
  check('category chip visible after selection', await page.locator('#category-chips-primary').isVisible());
  check('category chip text shows industry › category', ((await page.locator('#category-chip-text').textContent()) ?? '').includes('Bakeries'));
  check('category search field clears after selection', (await page.inputValue('#category-search-input')) === '');

  // Manual categories use a catalog-backed Other path, and typing does not
  // trigger unrelated suggestion updates that move the focused field.
  await page.click('#category-chip-clear');
  await page.fill('#category-search-input', 'qzxvplm-custom-category');
  await page.waitForTimeout(100);
  check('unmatched search offers a custom category path', (await page.locator('#category-search-results [data-custom-category-shortcut]').count()) === 1);
  await page.click('#category-search-results [data-custom-category-shortcut]');
  check('custom category field appears after choosing the fallback', await page.locator('#custom-category-wrap').isVisible());
  const customInput = page.locator('#input-custom-category');
  await customInput.scrollIntoViewIfNeeded();
  const customTopBefore = await customInput.evaluate((el) => el.getBoundingClientRect().top);
  const scrollBeforeTyping = await page.evaluate(() => window.scrollY);
  await customInput.fill('Specialty Gluten-Free Bakery');
  await page.waitForTimeout(350);
  const customTopAfter = await customInput.evaluate((el) => el.getBoundingClientRect().top);
  const scrollAfterTyping = await page.evaluate(() => window.scrollY);
  check('custom category input stays fixed while typing', Math.abs(customTopAfter - customTopBefore) <= 1 && scrollAfterTyping === scrollBeforeTyping, `top=${customTopBefore}->${customTopAfter}; scroll=${scrollBeforeTyping}->${scrollAfterTyping}`);

  // ----------------------------------------------------
  // 3. Switching to church narrows categories + clears invalid selection
  // ----------------------------------------------------
  await page.click('.type-card[data-type="church"]');
  const churchStatus = (await page.locator('#category-filter-status').textContent())?.trim() ?? '';
  check('church pool is exactly the three permitted categories', churchStatus === '3 categories available for this type', `status="${churchStatus}"`);
  check('church status count is smaller than business', parseInt(churchStatus, 10) < businessStatusN, `church=${churchStatus} business=${businessStatusN}`);
  check('church helper text updated', ((await page.locator('#category-filter-help').textContent()) ?? '').startsWith('Showing faith-based categories for Churches'));

  // Type filtering proven on the search pool itself
  await page.fill('#category-search-input', 'bakeries');
  await page.waitForTimeout(200);
  check('business-only catalog categories hidden under church type', (await page.locator('#category-search-results button[data-slug]').count()) === 0, `got=${await page.locator('#category-search-results button[data-slug]').count()}`);
  check('custom-category shortcut remains available when there is no match', (await page.locator('#category-search-results [data-custom-category-shortcut]').count()) === 1);
  await page.fill('#category-search-input', 'other-religious');
  await page.waitForTimeout(200);
  const religiousResult = page.locator('#category-search-results button[data-slug="other-religious"]');
  check('permitted church category offered under church type', (await religiousResult.count()) === 1, `got=${await religiousResult.count()}`);
  check('church search result belongs to religious-organizations', (await religiousResult.first().getAttribute('data-industry-slug')) === 'religious-organizations');
  await page.fill('#category-search-input', '');

  check('invalid category cleared when switching to church', (await page.inputValue('#input-category-slug')) === '');
  check('cleared category chip hidden', await page.locator('#category-chips-primary').isHidden());
  check('warning appears after category invalidated', await page.locator('#category-type-warning').isVisible());
  check('warning text correct', ((await page.locator('#category-type-warning').textContent()) ?? '').includes("Category cleared — it doesn't match the new organization type."));
  await page.waitForTimeout(6500);
  check('warning disappears after six seconds', await page.locator('#category-type-warning').isHidden());

  // ----------------------------------------------------
  // 4. Online-only toggle behavior
  // ----------------------------------------------------
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('.type-card[data-type="business"]');
  await page.fill('#input-name', 'Nationwide Ministry');
  check('basics step is marked complete after type and name', (await page.locator('.form-jump a[data-step="basics"]').getAttribute('data-complete')) === 'true');
  await openManualCategory(page);
  await page.fill('#category-search-input', 'bakeries');
  await page.waitForTimeout(200);
  await page.click('#category-search-results button[data-slug="bakeries"]');
  check('category picker retains one primary industry/category selection', (await page.locator('input[name="industrySlug"]').count()) === 1 && (await page.locator('input[name="categorySlug"]').count()) === 1);
  await page.locator('#section-faith > summary').click();
  await page.fill('#denom-search-input', 'Baptist');
  await page.waitForTimeout(150);
  await page.click('#denom-search-results button[data-slug="baptist"]');
  check('a denomination satisfies the required faith identity item', (await page.locator('#review-checklist [data-check="faith"]').getAttribute('data-state')) === 'ready');
  await page.fill('#input-city', 'Austin');
  check('in-person location requirement marks Contact complete', (await page.locator('.form-jump a[data-step="contact"]').getAttribute('data-complete')) === 'true');

  // Online-only marks Contact complete even with no city/region/postal code
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => document.getElementById('input-online').click());
  const onState = await page.evaluate(() => {
    const input = document.getElementById('input-online');
    const data = new FormData(document.getElementById('add-listing-form'));
    return {
      checked: input.checked,
      sent: data.get('isOnlineOnly'),
      mode: document.getElementById('online-toggle-wrap').dataset.online,
      off: document.getElementById('online-off-label').dataset.active,
      on: document.getElementById('online-on-label').dataset.active,
    };
  });
  check('online on highlights Online-only and submits 1', onState.mode === 'on' && onState.on === 'true' && onState.off === 'false' && onState.checked === true && onState.sent === '1');
  check('online-only hides location fields', await page.locator('#location-fields').isHidden());
  check('online-only shows location disabled note', await page.locator('#location-disabled-note').isVisible());
  check('preview shows Online-only • Serves nationwide', (await page.locator('#preview-location').textContent())?.trim() === 'Online-only • Serves nationwide');
  check('online-only satisfies the in-person location requirement', (await page.locator('.form-jump a[data-step="contact"]').getAttribute('data-complete')) === 'true');

  // ----------------------------------------------------
  // 5. Authenticated user view of /add-listing (pre-fill email)
  // ----------------------------------------------------
  await signup(page, user);
  check('user signed up and in dashboard', page.url().includes('/dashboard'));

  await page.goto(`${BASE}/add-listing`, { waitUntil: 'networkidle' });
  const authedEmailVal = await page.inputValue('input[name="email"]');
  check('authed: email pre-filled from user account', authedEmailVal === user.email, `got=${authedEmailVal}`);
  check('authed: account email explanation shown', (await page.locator(`text=${user.email}`).count()) > 0);

  // ----------------------------------------------------
  // 6. Normal business listing flow through the submission flow
  // ----------------------------------------------------
  const biz1Name = `Harvest & Hearth ${stamp}`;
  await page.click('.type-card[data-type="business"]');
  await page.fill('#input-name', biz1Name);
  await page.fill('input[name="tagline"]', 'Fresh sourdough and artisanal provisions');
  await page.fill('textarea[name="description"]', 'Local artisan bakery dedicated to providing wholesome organic bread and baked goods to our community.');
  await page.fill('#input-city', 'Austin');
  await page.fill('#input-region', 'TX');
  await page.fill('input[name="postalCode"]', '78701');
  await page.fill('input[name="phone"]', '(512) 555-9876');
  await page.fill('input[name="website"]', 'https://harvesthandhearth.test');

  // Organization basics: expanded fields (inside the optional disclosure)
  await page.locator('details.org-card > summary').click();
  await page.fill('input[name="yearFounded"]', '1998');
  await page.selectOption('select[name="employeeCount"]', '11–50');
  await page.selectOption('select[name="ownershipType"]', 'Family-owned');
  await page.fill('input[name="serviceArea"]', 'Austin metro; delivery within 25 miles');
  await page.selectOption('#add-listing-hours-editor [data-hours-preset]', 'standard');
  await page.click('#add-listing-hours-editor [data-hours-action="apply-preset"]');
  await page.selectOption('select[name="contactPreference"]', 'Email');

  // Category search now lives in Step 1 behind the manual-entry choice.
  await openManualCategory(page);
  await page.fill('#category-search-input', 'bakeries');
  await page.waitForTimeout(200);
  await page.click('#category-search-results button[data-slug="bakeries"]');
  check('custom category hidden for non-other category', await page.locator('#custom-category-wrap').isHidden());

  // Faith identity is required: search for "other" and enter the custom denomination.
  await page.locator('#section-faith > summary').click();
  await page.fill('#denom-search-input', 'specify');
  await page.waitForTimeout(150);
  await page.click('#denom-search-results button[data-slug="other"]');
  check('custom denomination input becomes visible on selecting other', !(await page.locator('#custom-denom-wrap').getAttribute('class')).includes('hidden'));
  await page.fill('input[name="customDenomination"]', 'Calvary Chapel Fellowship');

  check('contact details default private on submit', !(await showEmailBox.isChecked()) && !(await showPhoneBox.isChecked()) && !(await showWebsiteBox.isChecked()));
  // Both required statements must be checked or the browser will not submit.
  await page.evaluate(() => {
    document.querySelectorAll('#add-listing-form input[type="checkbox"][required]').forEach((box) => {
      if (!box.checked) box.click();
    });
  });
  check('agreement toggle engaged before submit', await page.locator('#input-attestation').isChecked() && await page.locator('#input-terms').isChecked());
  check('all required review checklist items are ready', (await page.locator('#review-checklist li[data-state="needed"]').count()) === 0);

  await Promise.all([
    page.waitForURL('**/add-listing?success=1**'),
    page.click('#review-publish-btn'),
  ]);

  check('redirects to success page immediately', page.url().includes('success=1'));
  check('success message confirms listing is live', (await page.locator('text=Your listing is now live').count()) > 0);
  const viewLink = page.locator('a:has-text("View public listing")');
  check('view public listing link exists', (await viewLink.count()) > 0);
  const publicHref = await viewLink.getAttribute('href');

  // Check DB status is published immediately
  const dbRow = await q('select * from listings where name = $1', [biz1Name]);
  check('DB: listing exists', dbRow.rows.length === 1);
  const row = dbRow.rows[0];
  check('DB: listing published immediately without review', row.status === 'published', `status=${row.status}`);
  check('DB: show_email is false', row.show_email === false);
  check('DB: show_phone is false', row.show_phone === false);
  check('DB: show_website is false', row.show_website === false);
  check('DB: show_address is false', row.show_address === false);
  check('DB: industry_slug saved', row.industry_slug === 'food-beverage', `got=${row.industry_slug}`);
  check('DB: category_slug saved', row.category_slug === 'bakeries', `got=${row.category_slug}`);
  check('DB: custom_denomination saved', row.custom_denomination === 'Calvary Chapel Fellowship');
  check('DB: type_slug saved', row.type_slug === 'business', `got=${row.type_slug}`);

  // Organization basics persisted
  check('DB: year_founded saved', row.year_founded === 1998, `got=${row.year_founded}`);
  check('DB: employee_count saved', row.employee_count === '11–50', `got=${row.employee_count}`);
  check('DB: ownership_type saved', row.ownership_type === 'Family-owned', `got=${row.ownership_type}`);
  check('DB: service_area saved as single-item array', Array.isArray(row.service_area) && row.service_area[0] === 'Austin metro; delivery within 25 miles', `got=${JSON.stringify(row.service_area)}`);
  check('DB: hours saved as day map', Boolean(row.hours) && row.hours['Mon–Fri'] === '9a–5p', `got=${JSON.stringify(row.hours)}`);
  check('DB: contact_preference saved', row.contact_preference === 'Email', `got=${row.contact_preference}`);

  // ----------------------------------------------------
  // 7. Verify public page does NOT expose private contact info
  // ----------------------------------------------------
  await page.goto(`${BASE}${publicHref}`, { waitUntil: 'networkidle' });
  check('public page loads 200', (await page.locator(`h1:has-text("${biz1Name}")`).count()) > 0);

  check('public page: phone button hidden', (await page.locator('a[data-animate="cta"]:has-text("Call now")').count()) === 0);
  check('public page: website button hidden', (await page.locator('.flex.flex-wrap.gap-2 a:has-text("Website")').count()) === 0);
  check('public page: email button hidden', (await page.locator('.flex.flex-wrap.gap-2 a:has-text("Email")').count()) === 0);
  const bodyHtml = await page.content();
  check('private phone not in page source', !bodyHtml.includes('(512) 555-9876'));
  check('private email not in page source', !bodyHtml.includes(user.email));
  check('private website not in page source', !bodyHtml.includes('https://harvesthandhearth.test'));
  check('private postal code not in page source', !bodyHtml.includes('78701'));

  check('public page: displays industry and category badge', (await page.locator('text=Food & Beverage › Bakeries').count()) > 0);
  check('public page: faith affiliation displays custom denomination', (await page.locator('dd:has-text("Calvary Chapel Fellowship")').count()) > 0);
  check('public page: service area rendered', (await page.locator('text=Austin metro; delivery within 25 miles').count()) > 0);
  check('public page: operating hours rendered', (await page.locator('dt:has-text("Mon–Fri")').count()) > 0);

  // Verify listing appears in public search immediately
  await page.goto(`${BASE}/search?q=Harvest`, { waitUntil: 'networkidle' });
  check('search results include newly created listing immediately', (await page.locator(`article:has-text("${biz1Name}")`).count()) > 0);

  // ----------------------------------------------------
  // 8. Dashboard lists the published listing
  // ----------------------------------------------------
  await page.goto(`${BASE}/dashboard/listings`, { waitUntil: 'networkidle' });
  check('dashboard: listing table shows status', (await page.locator(`tr:has-text("${biz1Name}") .chip`).first().innerText()).match(/Published|Approved/) !== null);
  check('dashboard: View live link present', (await page.locator(`tr:has-text("${biz1Name}") a:has-text("View live")`).count()) > 0);

  const publishedAtBeforeEdit = row.published_at?.toISOString?.() ?? String(row.published_at);
  // Model a pre-migration row with a legacy industry alias and moved category;
  // the normal read/edit path must keep it visible and canonicalize on save.
  await q("update listings set industry_slug = 'home-services', category_slug = 'landscaping' where id = $1", [row.id]);
  await q('delete from listing_industries where listing_id = $1', [row.id]);
  await q("insert into listing_industries (listing_id, industry_id) select $1, id from industries where slug = 'home-property-services' on conflict do nothing", [row.id]);
  await q("insert into listing_industries (listing_id, industry_id) select $1, id from industries where slug = 'retail-consumer' on conflict do nothing", [row.id]);
  await page.goto(`${BASE}${publicHref}`, { waitUntil: 'networkidle' });
  check('legacy industry/category row remains publicly reachable', (await page.locator(`h1:has-text("${biz1Name}")`).count()) === 1);
  check('legacy taxonomy aliases hydrate to the canonical public badge', (await page.locator('text=Home & Property Services › Landscaping').count()) === 1);
  await page.goto(`${BASE}/search?industry=home-services`, { waitUntil: 'networkidle' });
  check('legacy industry alias still matches public search', (await page.locator(`article:has-text("${biz1Name}")`).count()) === 1);
  await page.goto(`${BASE}/dashboard/listings`, { waitUntil: 'networkidle' });
  const ownerRow = page.locator(`tr[data-row-id="${row.id}"]`);
  await ownerRow.locator('[data-act="edit"]').click();
  await page.fill('input[name="tagline"]', 'Fresh sourdough and artisanal provisions — owner updated');
  const editResponsePromise = page.waitForResponse((res) => res.url().endsWith(`/api/listings/${row.id}`) && res.request().method() === 'PATCH');
  await page.click('#form-submit-btn');
  const editResponse = await editResponsePromise;
  check('dashboard edit of a published listing succeeds', editResponse.status() === 200, `status=${editResponse.status()}`);
  await page.waitForLoadState('networkidle');
  const editedRow = (await q('select * from listings where id = $1', [row.id])).rows[0];
  check('ordinary edit preserves published status', editedRow.status === 'published', `status=${editedRow.status}`);
  check('saving a legacy alias upgrades stored primary slugs canonically', editedRow.industry_slug === 'home-property-services' && editedRow.category_slug === 'landscaping', `industry=${editedRow.industry_slug} category=${editedRow.category_slug}`);
  const persistedIndustries = (await q('select i.slug from listing_industries li join industries i on i.id = li.industry_id where li.listing_id = $1 order by i.slug', [row.id])).rows.map((item) => item.slug);
  check('dashboard edit preserves additional industry relations', persistedIndustries.includes('home-property-services') && persistedIndustries.includes('retail-consumer'), `industries=${persistedIndustries.join(',')}`);
  check('ordinary edit preserves original publication date', String(editedRow.published_at) === String(row.published_at), `before=${publishedAtBeforeEdit} after=${editedRow.published_at}`);
  check('dashboard refetch shows the edited listing as live', (await page.locator(`tr[data-row-id="${row.id}"] a:has-text("View live")`).count()) === 1);
  const searchApiResponse = await page.request.get(`${BASE}/api/search?q=${encodeURIComponent('owner updated')}`);
  const searchApiBody = await searchApiResponse.json();
  check('search API reflects edits immediately without stale cache', searchApiResponse.headers()['cache-control']?.includes('no-store') && JSON.stringify(searchApiBody).includes(biz1Name));
  await page.goto(`${BASE}/search?industry=retail`, { waitUntil: 'networkidle' });
  check('secondary industry relation remains searchable after an owner edit', (await page.locator(`article:has-text("${biz1Name}")`).count()) === 1);

  const invalidPatch = await page.request.patch(`${BASE}/api/listings/${row.id}`, {
    data: { action: 'save', listing: { name: biz1Name, typeSlug: 'business', industrySlug: 'food-beverage', categorySlug: 'pest-control' } },
  });
  check('invalid taxonomy hierarchy is rejected with 400', invalidPatch.status() === 400, `status=${invalidPatch.status()}`);
  check('invalid taxonomy update leaves the valid listing published', (await q('select status, industry_slug, category_slug from listings where id = $1', [row.id])).rows[0].status === 'published');

  // Explicit draft saves are private; submitting that draft moves it to the review queue.
  await page.locator(`tr[data-row-id="${row.id}"] [data-act="edit"]`).click();
  const draftResponsePromise = page.waitForResponse((res) => res.url().endsWith(`/api/listings/${row.id}`) && res.request().method() === 'PATCH');
  await page.click('button[data-intent="draft"]');
  const draftResponse = await draftResponsePromise;
  check('published listing can be explicitly saved as a draft', draftResponse.status() === 200 && (await draftResponse.json()).listing.status === 'draft');
  await page.waitForLoadState('networkidle');
  check('draft remains visible in the owner dashboard', (await page.locator(`tr[data-row-id="${row.id}"]`).count()) === 1 && (await page.locator(`tr[data-row-id="${row.id}"] .chip`).innerText()).includes('Draft'));
  check('draft has no public link', (await page.locator(`tr[data-row-id="${row.id}"] a:has-text("View live")`).count()) === 0);
  await page.goto(`${BASE}/search?q=${encodeURIComponent(biz1Name)}`, { waitUntil: 'networkidle' });
  check('draft is not visible in public search', (await page.locator(`article:has-text("${biz1Name}")`).count()) === 0);

  await page.goto(`${BASE}/dashboard/listings`, { waitUntil: 'networkidle' });
  await page.locator(`tr[data-row-id="${row.id}"] [data-act="submit"]`).click();
  const submitResponsePromise = page.waitForResponse((res) => res.url().endsWith(`/api/listings/${row.id}`) && res.request().method() === 'PATCH');
  await page.click('#form-submit-btn');
  const submitResponse = await submitResponsePromise;
  check('draft submit enters pending review', submitResponse.status() === 200 && (await submitResponse.json()).listing.status === 'pending_review');
  await page.waitForLoadState('networkidle');
  check('pending listing remains visible in dashboard without a live link', (await page.locator(`tr[data-row-id="${row.id}"] .chip`).innerText()).includes('Pending Review') && (await page.locator(`tr[data-row-id="${row.id}"] a:has-text("View live")`).count()) === 0);
  await page.goto(`${BASE}/search?q=${encodeURIComponent(biz1Name)}`, { waitUntil: 'networkidle' });
  check('pending listing is excluded from public search', (await page.locator(`article:has-text("${biz1Name}")`).count()) === 0);

  // ----------------------------------------------------
  // 9. Rejected submissions keep the entries on the page (no empty-form redirect)
  // ----------------------------------------------------
  await page.goto(`${BASE}/add-listing`, { waitUntil: 'networkidle' });
  await page.click('.type-card[data-type="business"]');
  await page.fill('#input-name', biz1Name);
  await page.evaluate(() => {
    document.querySelectorAll('#add-listing-form input[type="checkbox"][required]').forEach((box) => {
      if (!box.checked) box.click();
    });
  });
  // Missing location is caught before the request is sent.
  await page.click('#review-publish-btn');
  check('missing location: inline error names the rule', ((await page.locator('#form-status').textContent()) ?? '').includes('Add a city or state, or mark the listing as online-only.'));
  check('missing location: nothing was submitted', page.url().endsWith('/add-listing'));
  check('missing location: focus moves to the city field', await page.evaluate(() => document.activeElement?.id === 'input-city'));

  await page.fill('#input-city', 'Austin');
  await page.fill('#input-region', 'TX');
  await page.click('#review-publish-btn');
  check('missing faith identity blocks publish with a clear message', await page.locator('#faith-identity-error').isVisible() && (await page.locator('#form-status').textContent())?.includes('denomination or add a statement of faith'));
  check('faith section opens and receives focus on validation failure', await page.locator('#section-faith').evaluate((el) => el.open) && await page.evaluate(() => document.activeElement?.id === 'denom-search-input'));
  await page.locator('#section-faith details > summary').click();
  await page.fill('#input-statement', 'We follow the teachings of Jesus and serve our neighbors.');
  check('statement of faith clears the required-field error', await page.locator('#faith-identity-error').isHidden());

  // Same owner, same name, same city → the server refuses the duplicate and the
  // form stays populated so the owner can adjust and retry.
  const duplicateResponse = page.waitForResponse((res) => res.url().endsWith('/api/listings') && res.request().method() === 'POST');
  await page.click('#review-publish-btn');
  const dupRes = await duplicateResponse;
  check('duplicate: server answers 409', dupRes.status() === 409, `got=${dupRes.status()}`);
  await page.waitForFunction(() => document.getElementById('form-status')?.classList.contains('is-error'));
  check('duplicate: inline error explains the conflict', ((await page.locator('#form-status').textContent()) ?? '').includes('already have a listing with this name in this city'));
  check('duplicate: still on the form with entries intact', page.url().endsWith('/add-listing') && (await page.inputValue('#input-name')) === biz1Name && (await page.inputValue('#input-city')) === 'Austin');
  check('duplicate: review publish button is re-enabled for retry', await page.locator('#review-publish-btn').isEnabled() && (await page.locator('#review-publish-btn').textContent())?.trim() === 'Publish');
  check('duplicate: no second row was created', (await q('select count(*)::int as n from listings where name = $1', [biz1Name])).rows[0].n === 1);

  // Changing the city clears the conflict and the retry publishes.
  await page.fill('#input-city', 'Round Rock');
  await Promise.all([
    page.waitForURL('**/add-listing?success=1**'),
    page.click('#review-publish-btn'),
  ]);
  check('retry after fixing the conflict succeeds', page.url().includes('success=1'));
  check('DB: retry created the second listing', (await q('select count(*)::int as n from listings where name = $1', [biz1Name])).rows[0].n === 2);

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
