import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
try {
  await page.goto('http://127.0.0.1:4321/search', { waitUntil: 'networkidle' });
  const offenders = await page.evaluate(() => [...document.querySelectorAll('body *')].map((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return { tag: el.tagName, id: el.id, cls: String(el.className?.baseVal ?? el.className ?? '').slice(0, 120), text: el.children.length ? '' : (el.textContent ?? '').trim().slice(0, 55), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), scrollWidth: el.scrollWidth, overflow: s.overflowX };
  }).filter((x) => x.right > innerWidth + 1 || x.left < -1).sort((a,b) => b.right-a.right).slice(0, 30));
  console.log(JSON.stringify({ innerWidth: await page.evaluate(() => innerWidth), docWidth: await page.evaluate(() => document.documentElement.scrollWidth), offenders }, null, 2));
} finally { await browser.close(); }
