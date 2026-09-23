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
  // 1. Guest view of /add-listing (graceful without user)
  // ----------------------------------------------------
  await page.goto(`${BASE}/add-listing`, { waitUntil: 'networkidle' });
  const guestEmailVal = await page.inputValue('input[name="email"]');
  check('guest: email field empty', guestEmailVal === '');
  check('guest: notice to sign up is visible', (await page.locator('text=listing as a guest').count()) > 0);
  check('guest: no submit for review text', (await page.locator('text=Submit for review').count()) === 0);
  check('guest: button says Publish business listing', (await page.locator('button[type="submit"]:has-text("Publish")').count()) > 0);

  // Check multi-denomination UI on /add-listing
  const denomButtons = page.locator('.denom-toggle-btn');
  check('add-listing: denomination buttons exist', (await denomButtons.count()) > 0);
  check('add-listing: helper text advises max 2', (await page.locator('text=Select up to two denominations that best represent this organization.').count()) > 0);
  check('add-listing: counter badge starts at 0 of 2', (await page.locator('#denom-counter:has-text("0 of 2 selected")').count()) > 0);
  check('add-listing: has Non-Denominational option', (await page.locator('.denom-toggle-btn[data-slug="non-denominational"]').count()) > 0);
  check('add-listing: has Other option', (await page.locator('.denom-toggle-btn[data-slug="other"]').count()) > 0);
  check('add-listing: custom denomination input exists', (await page.locator('input[name="customDenomination"]').count()) > 0);

  // Check category accordion on /add-listing
  check('add-listing: category accordion exists', (await page.locator('#category-accordion-wrapper').count()) > 0);
  check('add-listing: category search input exists', (await page.locator('#category-search-input').count()) > 0);

  // Check privacy controls on /add-listing
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
  // 2. Authenticated user view of /add-listing (pre-fill email)
  // ----------------------------------------------------
  await signup(page, user);
  check('user signed up and in dashboard', page.url().includes('/dashboard'));

  await page.goto(`${BASE}/add-listing`, { waitUntil: 'networkidle' });
  const authedEmailVal = await page.inputValue('input[name="email"]');
  check('authed: email pre-filled from user account', authedEmailVal === user.email, `got=${authedEmailVal}`);
  check('authed: account email explanation shown', (await page.locator(`text=${user.email}`).count()) > 0);

  // ----------------------------------------------------
  // 3. Create listing with Hierarchical Category & Custom Denomination
  // ----------------------------------------------------
  const biz1Name = `Harvest & Hearth ${stamp}`;
  await page.fill('input[name="name"]', biz1Name);
  await page.selectOption('select[name="typeSlug"]', 'business');
  await page.fill('input[name="tagline"]', 'Fresh sourdough and artisanal provisions');
  await page.fill('textarea[name="description"]', 'Local artisan bakery dedicated to providing wholesome organic bread and baked goods to our community.');
  await page.fill('input[name="city"]', 'Austin');
  await page.fill('input[name="region"]', 'TX');
  await page.fill('input[name="postalCode"]', '78701');
  await page.fill('input[name="phone"]', '(512) 555-9876');
  await page.fill('input[name="website"]', 'https://harvesthandhearth.test');

  // Select category via accordion: Food & Beverage -> Bakery
  await page.click('.industry-item[data-industry-slug="food-beverage"] .industry-header-btn');
  await page.waitForTimeout(200);
  await page.click('.subcat-option-btn[data-category-slug="bakeries"]');
  check('category selected banner visible', !(await page.locator('#category-selected-card').getAttribute('class')).includes('hidden'));
  check('category selected text shows Food & Beverage › Bakery', (await page.locator('#category-selected-text').innerText()).includes('Bakery'));

  // Multi-denomination: select "other" denomination and fill custom
  await page.click('.denom-toggle-btn[data-slug="other"]');
  check('custom denomination input becomes visible on selecting other', !(await page.locator('#custom-denom-wrap').getAttribute('class')).includes('hidden'));
  await page.fill('input[name="customDenomination"]', 'Calvary Chapel Fellowship');

  // confirm privacy checkboxes are UNCHECKED (default private)
  check('contact details default private on submit', !(await showEmailBox.isChecked()) && !(await showPhoneBox.isChecked()) && !(await showWebsiteBox.isChecked()));
  await page.check('form input[type="checkbox"][required]');

  await Promise.all([
    page.waitForURL('**/add-listing?success=1**'),
    page.click('button[type="submit"]'),
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
  check('DB: industry_slug saved', row.industry_slug === 'food-beverage');
  check('DB: category_slug saved', row.category_slug === 'bakeries');
  check('DB: custom_denomination saved', row.custom_denomination === 'Calvary Chapel Fellowship');

  // ----------------------------------------------------
  // 4. Verify public page does NOT expose private contact info
  // ----------------------------------------------------
  await page.goto(`${BASE}${publicHref}`, { waitUntil: 'networkidle' });
  check('public page loads 200', (await page.locator(`h1:has-text("${biz1Name}")`).count()) > 0);

  // Private contact info must NOT appear
  check('public page: phone button hidden', (await page.locator('a[data-animate="cta"]:has-text("Call now")').count()) === 0);
  check('public page: website button hidden', (await page.locator('.flex.flex-wrap.gap-2 a:has-text("Website")').count()) === 0);
  check('public page: email button hidden', (await page.locator('.flex.flex-wrap.gap-2 a:has-text("Email")').count()) === 0);
  const bodyHtml = await page.content();
  check('private phone not in page source', !bodyHtml.includes('(512) 555-9876'));
  check('private email not in page source', !bodyHtml.includes(user.email));
  check('private website not in page source', !bodyHtml.includes('https://harvesthandhearth.test'));
  check('private postal code not in page source', !bodyHtml.includes('78701'));

  // Category and Denomination are displayed
  check('public page: displays industry and category badge', (await page.locator('text=Food & Beverage › Bakery').count()) > 0);
  check('public page: faith affiliation displays custom denomination', (await page.locator('dd:has-text("Calvary Chapel Fellowship")').count()) > 0);

  // Verify listing appears in public search immediately
  await page.goto(`${BASE}/search?q=Harvest`, { waitUntil: 'networkidle' });
  check('search results include newly created listing immediately', (await page.locator(`article:has-text("${biz1Name}")`).count()) > 0);

  // ----------------------------------------------------
  // 5. Dashboard /dashboard/listings: Edit listing & make contact public
  // ----------------------------------------------------
  await page.goto(`${BASE}/dashboard/listings`, { waitUntil: 'networkidle' });
  check('dashboard: listing table shows status', (await page.locator(`tr:has-text("${biz1Name}") .chip`).first().innerText()).match(/Published|Approved/) !== null);
  check('dashboard: View live link present', (await page.locator(`tr:has-text("${biz1Name}") a:has-text("View live")`).count()) > 0);

  // Click Edit
  await page.click(`tr:has-text("${biz1Name}") button[data-act="edit"]`);
  await page.waitForTimeout(300);
  check('edit: form opens with listing name', (await page.inputValue('#listing-form input[name="name"]')) === biz1Name);
  check('edit: button says Save changes', (await page.locator('#form-submit-btn:has-text("Save changes")').count()) > 0);
  check('edit: custom denomination loaded in form', (await page.inputValue('#listing-form input[name="customDenomination"]')) === 'Calvary Chapel Fellowship');
  check('edit: category restored in form', (await page.locator('#dash-category-selected-text').innerText()).includes('Bakery'));

  // Toggle contact info to PUBLIC:
  await page.check('#listing-form input[name="showPhone"]');
  await page.check('#listing-form input[name="showWebsite"]');
  await page.check('#listing-form input[name="showAddress"]');
  await page.click('#form-submit-btn');
  await page.waitForTimeout(1000);

  // Verify DB updated
  const updatedDb = await q('select * from listings where name = $1', [biz1Name]);
  check('DB: show_phone updated to true', updatedDb.rows[0].show_phone === true);
  check('DB: show_website updated to true', updatedDb.rows[0].show_website === true);
  check('DB: show_address updated to true', updatedDb.rows[0].show_address === true);
  check('DB: status remains published', updatedDb.rows[0].status === 'published');

  // Verify public page now shows public contact buttons
  await page.goto(`${BASE}${publicHref}`, { waitUntil: 'networkidle' });
  check('public page: phone button now visible when public', (await page.locator('a[data-animate="cta"]:has-text("Call now")').count()) > 0);
  check('public page: website button now visible when public', (await page.locator('.flex.flex-wrap.gap-2 a:has-text("Website")').count()) > 0);
  check('public page: postal code now visible when public', (await page.locator('text=78701').count()) > 0);

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
