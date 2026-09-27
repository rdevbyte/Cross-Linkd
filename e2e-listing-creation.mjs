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
  check('section heading is "Industry & business category"', (await page.locator('h2:has-text("Industry & business category")').count()) > 0);
  check('section 1 explains the listing type dimension', (await page.locator('text=Listing type — what you\'re offering or listing.').count()) > 0);
  check('type context chip hidden before a type is selected', await page.locator('#category-type-context').isHidden());
  check('price range select has extra right-side padding', ((await page.locator('select[name="priceRange"]').getAttribute('class')) ?? '').includes('pr-10'));

  // Organization basics: expanded optional fields
  const yearFounded = page.locator('input[name="yearFounded"]');
  check('year founded input exists', (await yearFounded.count()) === 1);
  check('year founded uses a numeric input type', (await yearFounded.getAttribute('type')) === 'number');
  check('organization size select exists', (await page.locator('select[name="employeeCount"]').count()) === 1);
  check('organization size offers six buckets plus placeholder', (await page.locator('select[name="employeeCount"] option').count()) === 7, `got=${await page.locator('select[name="employeeCount"] option').count()}`);
  check('ownership type select exists', (await page.locator('select[name="ownershipType"]').count()) === 1);
  check('operating hours select exists', (await page.locator('select[name="hours"]').count()) === 1);
  check('operating hours offers six presets plus placeholder', (await page.locator('select[name="hours"] option').count()) === 7, `got=${await page.locator('select[name="hours"] option').count()}`);
  check('service area input exists', (await page.locator('input[name="serviceArea"]').count()) === 1);
  check('contact preference select exists', (await page.locator('select[name="contactPreference"]').count()) === 1);
  check('contact preference offers four methods plus placeholder', (await page.locator('select[name="contactPreference"] option').count()) === 5, `got=${await page.locator('select[name="contactPreference"] option').count()}`);

  // Price range spacing: generous separation from later sections (no dropdown
  // or denomination control visually attached to the price field)
  const priceBox = await page.locator('select[name="priceRange"]').boundingBox();
  const faithHeadingBox = await page.locator('#section-faith-heading').boundingBox();
  const gapFaith = priceBox && faithHeadingBox ? Math.round(faithHeadingBox.y - (priceBox.y + priceBox.height)) : -1;
  check('price range has clear vertical separation from the denomination section', gapFaith > 80, `gap=${gapFaith}px`);
  check('price range sits inside its own spaced block', ((await page.locator('select[name="priceRange"]').evaluate((el) => el.closest('div').className)) ?? '').includes('mt-7'));

  // Denomination typeahead replaces the old button grid
  check('denomination search field exists', (await page.locator('#denom-search-input').count()) === 1);
  check('old denomination toggle buttons removed', (await page.locator('.denom-toggle-btn').count()) === 0);
  check('old denomination dropdown removed', (await page.locator('#more-denoms-select').count()) === 0);

  // Visibility checkboxes are now toggle sliders
  check('visibility controls are toggle sliders', (await page.locator('input[name="showEmail"].peer.sr-only').count()) === 1 && (await page.locator('input[name="showPhone"].peer.sr-only').count()) === 1);
  check('toggle state pills render', (await page.locator('label:has(input[name="showEmail"])').textContent())?.includes('Off') === true);

  // Sticky bar / progress / online toggle structure
  check('sticky bar exists', (await page.locator('#sticky-bar').count()) === 1);
  check('progress bar exists', (await page.locator('#progress-bar').count()) === 1);
  check('completion starts at 0 of 4 sections complete', (await page.locator('#progress-text').textContent())?.trim() === '0 of 4 sections complete');
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
  check('guest: button says Publish business listing', (await page.locator('#sticky-bar button[type="submit"]:has-text("Publish")').count()) > 0);
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

  // Primary category selection via the single typeahead picker
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
  check('business-only categories hidden under church type', (await page.locator('#category-search-results button').count()) === 0, `got=${await page.locator('#category-search-results button').count()}`);
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
  check('completion reaches 1 of 4 with type + name', (await page.locator('#progress-text').textContent())?.trim() === '1 of 4 sections complete');
  await page.fill('#category-search-input', 'bakeries');
  await page.waitForTimeout(200);
  await page.click('#category-search-results button[data-slug="bakeries"]');
  check('completion reaches 2 of 4 with category', (await page.locator('#progress-text').textContent())?.trim() === '2 of 4 sections complete');
  await page.fill('#denom-search-input', 'Baptist');
  await page.waitForTimeout(150);
  await page.click('#denom-search-results button[data-slug="baptist"]');
  check('completion reaches 3 of 4 with denomination', (await page.locator('#progress-text').textContent())?.trim() === '3 of 4 sections complete');
  await page.fill('#input-city', 'Austin');
  check('completion reaches 4 of 4 with location', (await page.locator('#progress-text').textContent())?.trim() === '4 of 4 sections complete');
  const progressWidth = await page.locator('#progress-bar').evaluate((el) => el.style.width);
  check('progress bar reaches 100%', progressWidth === '100%', `got=${progressWidth}`);

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
  check('online-only marks Contact section complete without location', (await page.locator('#progress-text').textContent())?.trim() === '1 of 4 sections complete');

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

  // Organization basics: expanded fields
  await page.fill('input[name="yearFounded"]', '1998');
  await page.selectOption('select[name="employeeCount"]', '11–50');
  await page.selectOption('select[name="ownershipType"]', 'Family-owned');
  await page.fill('input[name="serviceArea"]', 'Austin metro; delivery within 25 miles');
  await page.selectOption('select[name="hours"]', 'standard');
  await page.selectOption('select[name="contactPreference"]', 'Email');

  // Category via the type-filtered typeahead search
  await page.fill('#category-search-input', 'bakeries');
  await page.waitForTimeout(200);
  await page.click('#category-search-results button[data-slug="bakeries"]');
  check('custom category hidden for non-other category', await page.locator('#custom-category-wrap').isHidden());

  // Multi-denomination: search for "other" denomination and fill custom
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

  await Promise.all([
    page.waitForURL('**/add-listing?success=1**'),
    page.click('#sticky-bar button[type="submit"]'),
  ]);

  check('redirects to success page immediately', page.url().includes('success=1'));
  check('success message confirms listing is live', (await page.locator('text=Your listing is now live!').count()) > 0);
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
