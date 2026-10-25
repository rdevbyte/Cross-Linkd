import { chromium } from 'playwright';

const browser = await chromium.launch();
const pages = ['/', '/search', '/add-listing', '/contact?topic=suggest', '/browse/industries', '/articles'];
const widths = [390, 320];
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of pages) {
      const response = await page.goto(`http://127.0.0.1:4321${path}`, { waitUntil: 'networkidle' });
      const data = await page.evaluate(() => ({
        width: innerWidth,
        docWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        h1: document.querySelector('h1')?.innerText?.trim(),
        primary: [...document.querySelectorAll('a.btn,button.btn')].slice(0, 3).map((el) => ({ text: el.innerText.trim(), aria: el.getAttribute('aria-label'), width: Math.round(el.getBoundingClientRect().width) })),
      }));
      console.log(JSON.stringify({ width, path, status: response?.status(), ...data }));
      if (path === '/' || path === '/add-listing') {
        const name = path === '/' ? 'home' : 'add-listing';
        await page.screenshot({ path: `/home/user/cross-linkd/.scratch/${name}-${width}.png`, fullPage: true });
      }
    }
  }
  await context.close();
  console.log(JSON.stringify({ pageErrors: errors }));
} finally {
  await browser.close();
}
