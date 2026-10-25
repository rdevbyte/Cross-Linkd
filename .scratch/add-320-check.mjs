import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 320, height: 844 }, deviceScaleFactor: 2 });
try {
  await page.goto('http://127.0.0.1:4321/add-listing', { waitUntil: 'networkidle' });
  await page.locator('#section-basics').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/home/user/cross-linkd/.scratch/add-basic-320.png' });
  const info = await page.locator('.type-card').evaluateAll((els) => els.slice(0, 2).map((el) => ({ width: el.getBoundingClientRect().width, name: el.querySelector('.type-name')?.getBoundingClientRect().width, desc: el.querySelector('.type-desc')?.getBoundingClientRect().width })));
  console.log(JSON.stringify(info));
} finally { await browser.close(); }
