import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('http://localhost:4321/search', { waitUntil: 'networkidle' });
const root = p.locator('[data-sdd][data-name="denomination"]');
await root.locator('.sdd-button').click();
await p.waitForTimeout(400);
const info = await p.evaluate(() => {
  const root = document.querySelector('[data-sdd][data-name="denomination"]');
  const toggle = root.querySelector('.sdd-toggle');
  const r = toggle.getBoundingClientRect();
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  const path = [];
  let el = hit;
  while (el && path.length < 6) { path.push(`${el.tagName}.${(el.className?.baseVal ?? el.className ?? '').toString().slice(0, 40)}`); el = el.parentElement; }
  const toggles = [...root.querySelectorAll('.sdd-toggle')].map((t, i) => {
    const tr = t.getBoundingClientRect();
    return { i, name: t.querySelector('.sdd-gname')?.textContent, y: Math.round(tr.y), h: Math.round(tr.height) };
  });
  return { toggleRect: { y: Math.round(r.y), h: Math.round(r.height) }, hitPath: path, toggles: toggles.slice(0, 4), scroll: root.querySelector('.sdd-list').scrollTop };
});
console.log(JSON.stringify(info, null, 1));
await p.screenshot({ path: '/tmp/dbg-denom.png' });
await b.close();
