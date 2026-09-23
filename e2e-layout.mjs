import { chromium } from 'playwright';

const BASE = 'http://localhost:4321';
const results = [];
const check = (name, cond, detail = '') => {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`);
  return cond;
};

const snap = (el) => {
  const cols = getComputedStyle(el).gridTemplateColumns.split(' ').filter((v) => v && v !== 'none').length;
  const card = el.querySelector('article');
  const media = el.querySelector('.card-media');
  return {
    dir: card ? getComputedStyle(card).flexDirection : '?',
    cols,
    mediaW: media?.getBoundingClientRect().width,
    mediaH: media?.getBoundingClientRect().height,
    cardH: card?.getBoundingClientRect().height,
    mediaBg: media ? getComputedStyle(media).backgroundColor : '',
  };
};

const browser = await chromium.launch();
try {
  // ---------- Desktop ----------
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Extra attributes from the server') && !(m.text().includes('did not match') && m.text().includes('FavoriteButton'))) errors.push('console: ' + m.text()); });

  await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' });

  const grid = page.locator('#results-grid');
  await grid.waitFor();
  const cards = page.locator('#results-grid > article');
  check('12 cards render', (await cards.count()) === 12, `count=${await cards.count()}`);

  // LIST default state
  let s = await grid.evaluate(snap);
  check('default = list (single column)', s.cols === 1, `tracks=${s.cols}`);
  check('list cards horizontal', s.dir === 'row', `flex-direction=${s.dir}`);
  check('list thumb ~216px on desktop', s.mediaW > 200 && s.mediaW < 230, `${s.mediaW?.toFixed(0)}px`);
  check('list thumb has real height (fills card)', s.mediaH > 120 && Math.abs(s.mediaH - s.cardH) < 4, `media=${s.mediaH?.toFixed(0)} card=${s.cardH?.toFixed(0)}`);
  check('list thumb background visible', s.mediaBg !== 'rgba(0, 0, 0, 0)', s.mediaBg);
  check('button shows active "List view"', (await page.locator('#layout-toggle-label').innerText()) === 'List view');
  check('aria-pressed=false in list', (await page.getAttribute('#layout-toggle', 'aria-pressed')) === 'false');
  check('aria-label names active + target', (await page.getAttribute('#layout-toggle', 'aria-label')) === 'List view. Switch to grid view');
  check('list icon visible, grid icon hidden', await page.locator('#icon-list').isVisible() && !(await page.locator('#icon-grid').isVisible()));

  await page.screenshot({ path: '/tmp/shot-list-desktop.png' });

  // Toggle -> GRID
  await page.click('#layout-toggle');
  await page.waitForTimeout(1400); // let staggered FLIP settle
  s = await grid.evaluate(snap);
  check('grid = multi-column', s.cols >= 2, `tracks=${s.cols}`);
  check('grid cards vertical', s.dir === 'column', `flex-direction=${s.dir}`);
  check('grid media full-width 144px', s.mediaH === 144 && s.mediaW > 250, `${s.mediaW?.toFixed(0)}x${s.mediaH?.toFixed(0)}`);
  check('grid thumb background visible', s.mediaBg !== 'rgba(0, 0, 0, 0)', s.mediaBg);
  check('button shows active "Grid view"', (await page.locator('#layout-toggle-label').innerText()) === 'Grid view');
  check('aria-pressed=true in grid', (await page.getAttribute('#layout-toggle', 'aria-pressed')) === 'true');
  check('grid icon visible now', await page.locator('#icon-grid').isVisible() && !(await page.locator('#icon-list').isVisible()));
  check('live status announced', (await page.locator('#layout-status').innerText()).includes('Grid view'));

  await page.screenshot({ path: '/tmp/shot-grid-desktop.png' });

  // Persists across filter navigation
  await page.goto(`${BASE}/search?ltype=industry:food-beverage`, { waitUntil: 'networkidle' });
  const s2 = await page.locator('#results-grid').evaluate(snap);
  check('layout persists after filtering (grid)', s2.cols >= 2 && s2.dir === 'column', `tracks=${s2.cols} dir=${s2.dir}`);
  check('filter results correct', (await page.locator('#results-grid > article').count()) === 5, `n=${await page.locator('#results-grid > article').count()}`);

  // Toggle back to list + persists across pagination click
  await page.click('#layout-toggle');
  await page.waitForTimeout(1400);
  const s3 = await page.locator('#results-grid').evaluate(snap);
  check('toggle back to list works', s3.cols === 1 && s3.dir === 'row', `tracks=${s3.cols} dir=${s3.dir}`);
  await page.goto(`${BASE}/search?page=2`, { waitUntil: 'networkidle' });
  const s4 = await page.locator('#results-grid').evaluate(snap);
  check('layout persists after pagination (list)', s4.cols === 1 && s4.dir === 'row', `tracks=${s4.cols} dir=${s4.dir}`);

  // Card trace SVG: full-perimeter outline, decorative, non-blocking
  const art = await page.evaluate(() => {
    const svg = document.querySelector('#results-grid .card-trace');
    if (!svg) return null;
    const cs = getComputedStyle(svg);
    const outline = svg.querySelector('.card-trace-outline');
    const light = svg.querySelector('.card-trace-light');
    const card = svg.closest('article');
    return {
      pe: cs.pointerEvents, aria: svg.getAttribute('aria-hidden'),
      cardRect: card?.getBoundingClientRect(), svgRect: svg.getBoundingClientRect(),
      outlineOp: outline ? getComputedStyle(outline).strokeOpacity : null,
      outlineW: outline ? getComputedStyle(outline).strokeWidth : null,
      lightOp: light ? getComputedStyle(light).opacity : null,
      lightAnim: light ? getComputedStyle(light).animationName : null,
    };
  });
  check('card-trace SVG in every card (list)', (await page.locator('#results-grid .card-trace').count()) === (await page.locator('#results-grid > article').count()));
  check('card-trace pointer-events none', art?.pe === 'none', art?.pe);
  check('card-trace aria-hidden', art?.aria === 'true');
  check('trace outline visible (gold, always-on)', art?.outlineOp !== null && parseFloat(art.outlineOp) > 0.2 && parseFloat(art.outlineW) > 0, `op=${art?.outlineOp} w=${art?.outlineW}`);
  check('trace light animating in normal mode', art?.lightAnim === 'card-trace-orbit' && parseFloat(art.lightOp) > 0.5, `${art?.lightAnim} op=${art?.lightOp}`);
  check('trace covers full card box', Math.abs(art.svgRect.width - art.cardRect.width) < 3 && Math.abs(art.svgRect.height - art.cardRect.height) < 3, `${art.svgRect.width.toFixed(0)}x${art.svgRect.height.toFixed(0)} vs ${art.cardRect.width.toFixed(0)}x${art.cardRect.height.toFixed(0)}`);
  check('unique trace gradient ids', await page.evaluate(() => {
    const ids = [...document.querySelectorAll('#results-grid .card-trace radialGradient')].map((g) => g.id);
    return new Set(ids).size === ids.length;
  }));
  check('trace geometry fits card box (no viewBox stretch)', await page.evaluate(() => {
    const svg = document.querySelector('#results-grid .card-trace');
    const r = svg?.querySelector('.card-trace-outline');
    if (!svg || !r) return false;
    if (svg.hasAttribute('viewBox')) return false;
    const b = svg.getBoundingClientRect();
    const rx = parseFloat(r.getAttribute('x') ?? ''), rw = parseFloat(r.getAttribute('width') ?? '');
    return Math.abs(rx - 0.75) < 0.01 && Math.abs(rw + 1.5 - b.width) < 2 && Math.abs(parseFloat(r.getAttribute('height') ?? '') + 1.5 - b.height) < 2;
  }));
  check('trace light rides the ring centerline', await page.evaluate(() => {
    const light = document.querySelector('#results-grid .card-trace-light');
    const p = light ? getComputedStyle(light).offsetPath : '';
    return !!p && p.includes('path(') && p.includes('A');
  }));
  check('card link navigates (not blocked by trace)', await page.evaluate(() => {
    const a = document.querySelector('#results-grid article a[href^="/directory/"]');
    return !!a && a.getBoundingClientRect().width > 100;
  }));

  // trace still present after switching to grid
  await page.click('#layout-toggle');
  await page.waitForTimeout(1400);
  check('card-trace in every card (grid)', (await page.locator('#results-grid .card-trace').count()) === (await page.locator('#results-grid > article').count()));
  check('trace refits to grid geometry (ResizeObserver)', await page.evaluate(() => {
    const svg = document.querySelector('#results-grid .card-trace');
    const r = svg?.querySelector('.card-trace-outline');
    if (!svg || !r) return false;
    const b = svg.getBoundingClientRect();
    return Math.abs(parseFloat(r.getAttribute('width') ?? '') + 1.5 - b.width) < 2;
  }));
  await page.click('#layout-toggle');
  await page.waitForTimeout(1400);

  // ---------- Structured dropdowns (Listing type + Denomination) ----------
  const ltypeRoot = page.locator('[data-sdd][data-name="ltype"]');
  const denomRoot = page.locator('[data-sdd][data-name="denomination"]');
  check('both structured dropdowns enhanced by JS', (await ltypeRoot.evaluate((el) => el.classList.contains('sdd-enhanced'))) && (await denomRoot.evaluate((el) => el.classList.contains('sdd-enhanced'))));
  check('native fallback selects hidden when enhanced', await page.evaluate(() => [...document.querySelectorAll('.sdd-native')].every((el) => getComputedStyle(el).display === 'none')));

  await ltypeRoot.locator('.sdd-button').click();
  check('ltype panel opens and focuses search', await ltypeRoot.locator('.sdd-panel').isVisible() && await page.evaluate(() => document.activeElement?.classList.contains('input') && !!document.activeElement?.closest('.sdd-search')));
  const groupsBefore = await ltypeRoot.locator('.sdd-ghead:visible').count();
  check('ltype groups visible (19 sections)', groupsBefore >= 18, `n=${groupsBefore}`);
  await ltypeRoot.locator('.sdd-search input').fill('baker');
  await page.waitForTimeout(120);
  const visOpts = await ltypeRoot.locator('.sdd-option:visible').count();
  check('search filters options (baker → 1 match, placeholder hidden)', visOpts === 1, `visible=${visOpts}`);
  check('non-matching groups hidden while searching', !(await ltypeRoot.locator('.sdd-group[aria-label="Financial Services"]').isVisible()));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check('keyboard select updates hidden input', (await page.locator('input[name="ltype"]').inputValue()) === 'cat:bakeries', await page.locator('input[name="ltype"]').inputValue());
  check('button label shows selection', (await ltypeRoot.locator('[data-sdd-value]').innerText()) === 'Bakeries');
  check('panel closes after selection', !(await ltypeRoot.locator('.sdd-panel').isVisible()));
  await page.click('#layout-toggle'); // unrelated control still works
  await page.waitForTimeout(300);
  await page.click('button[type="submit"]:has-text("Apply")');
  await page.waitForLoadState('networkidle');
  check('form submits chosen ltype', new URL(page.url()).searchParams.get('ltype') === 'cat:bakeries', page.url());
  check('selection survives reload (server-rendered label)', (await page.locator('[data-sdd][data-name="ltype"] [data-sdd-value]').innerText()) === 'Bakeries');
  check('filtered results correct (bakeries = 2)', (await page.locator('#results-grid > article').count()) === 2, `n=${await page.locator('#results-grid > article').count()}`);

  // denomination widget: keyboard + escape + collapse
  await denomRoot.locator('.sdd-button').click();
  check('denom panel opens with same structure', await denomRoot.locator('.sdd-panel').isVisible() && (await denomRoot.locator('.sdd-group').count()) >= 15, `groups=${await denomRoot.locator('.sdd-group').count()}`);
  const firstToggle = denomRoot.locator('.sdd-toggle').first();
  await firstToggle.click();
  check('group collapses (aria-expanded=false)', (await firstToggle.getAttribute('aria-expanded')) === 'false');
  await firstToggle.click();
  await page.keyboard.press('Escape');
  check('Escape closes panel and refocuses button', !(await denomRoot.locator('.sdd-panel').isVisible()) && await page.evaluate(() => document.activeElement?.classList.contains('sdd-button')));
  await denomRoot.locator('.sdd-button').click();
  await denomRoot.locator('.sdd-search input').fill('baptist');
  await page.waitForTimeout(120);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check('denom selection works identically', (await page.locator('input[name="denomination"]').inputValue()).includes('baptist'), await page.locator('input[name="denomination"]').inputValue());
  // reset via placeholder option
  await denomRoot.locator('.sdd-button').click();
  await denomRoot.locator('.sdd-option.sdd-any').click();
  check('placeholder option clears selection', (await page.locator('input[name="denomination"]').inputValue()) === '');

  check('zero JS errors on desktop flows', errors.length === 0, errors.slice(0, 3).join(' | '));

  // ---------- Tablet + Mobile grids ----------
  for (const [label, vp, minCols] of [['tablet', { width: 768, height: 1024 }, 2], ['mobile', { width: 375, height: 700 }, 1]]) {
    const p2 = await browser.newPage({ viewport: vp });
    await p2.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
    const t1 = await p2.locator('#results-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    check(`${label}: list single column`, t1 === 1, `tracks=${t1}`);
    await p2.click('#layout-toggle');
    await p2.waitForTimeout(1200);
    const t2 = await p2.locator('#results-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    check(`${label}: grid multi-column or clean single on phones`, t2 >= minCols, `tracks=${t2}`);
    await p2.screenshot({ path: `/tmp/shot-grid-${label}.png` });
    await p2.click('#layout-toggle');
    await p2.waitForTimeout(1200);
    const t3 = await p2.locator('#results-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    check(`${label}: back to list`, t3 === 1, `tracks=${t3}`);
    await p2.close();
  }

  // ---------- Reduced motion ----------
  const rm = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await rm.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
  await rm.click('#layout-toggle');
  await rm.waitForTimeout(120);
  const rmc = await rm.locator('#results-grid').getAttribute('class');
  check('reduced motion: instant switch, no animation', rmc.includes('as-grid'));
  const rmArt = await rm.evaluate(() => {
    const light = document.querySelector('#results-grid .card-trace-light');
    const outline = document.querySelector('#results-grid .card-trace-outline');
    return { anim: getComputedStyle(light).animationName, op: getComputedStyle(light).opacity, outlineOp: getComputedStyle(outline).strokeOpacity };
  });
  check('reduced motion: trace light off, static outline kept', rmArt.anim === 'none' && parseFloat(rmArt.op) === 0 && parseFloat(rmArt.outlineOp) > 0.2, `${rmArt.anim} op=${rmArt.op} outline=${rmArt.outlineOp}`);
  check('reduced motion: dropdowns still function', await rm.locator('[data-sdd][data-name="ltype"]').evaluate((el) => el.classList.contains('sdd-enhanced')));
  await rm.close();

  // ---------- Detail page (related cards with art) ----------
  const d = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const dErr = [];
  d.on('pageerror', (e) => dErr.push(e.message));
  await d.goto(`${BASE}/directory/grace-and-grain-bakery`, { waitUntil: 'networkidle' });
  check('detail page renders card trace on related listings', (await d.locator('.card-trace').count()) > 0, `n=${await d.locator('.card-trace').count()}`);
  check('detail page zero JS errors', dErr.length === 0, dErr.join(' | '));
  await d.screenshot({ path: '/tmp/shot-detail.png' });
  await d.close();
  // ---------- No-JS fallback: native selects remain usable ----------
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const np = await noJs.newPage();
  await np.goto(`${BASE}/search`, { waitUntil: 'load' });
  check('no-JS: native select fallback rendered', (await np.locator('select.sdd-native[name="ltype"] option').count()) > 50, `options=${await np.locator('select.sdd-native[name="ltype"] option').count()}`);
  await noJs.close();
} finally {
  await browser.close();
}
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
