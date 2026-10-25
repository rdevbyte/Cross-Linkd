import { chromium } from 'playwright';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
try {
  await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/home/user/cross-linkd/.scratch/home-top.png' });
  for (const [selector, name] of [['#directory-metrics-heading', 'home-metrics'], ['h2:text("For business owners")', 'home-owner']]) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `/home/user/cross-linkd/.scratch/${name}.png` });
  }
  await page.goto('http://127.0.0.1:4321/add-listing', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/home/user/cross-linkd/.scratch/add-top.png' });
  for (const id of ['section-basics', 'section-services', 'section-faith', 'section-contact', 'section-review']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `/home/user/cross-linkd/.scratch/add-${id}.png` });
  }
  await page.goto('http://127.0.0.1:4321/search', { waitUntil: 'networkidle' });
  await page.locator('#sort').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/home/user/cross-linkd/.scratch/search-results-controls.png' });
  console.log('mobile viewport captures complete');
} finally {
  await context.close();
  await browser.close();
}
