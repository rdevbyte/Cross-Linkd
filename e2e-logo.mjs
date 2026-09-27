/**
 * Brand-mark hover motion — browser checks (needs the dev server on :4321).
 *   node e2e-logo.mjs
 * Verifies what the static test cannot: the links really travel toward each
 * other, halos and contour gaps travel with them (masks applied in the right
 * frames), the cross cut-out does not move, the mark returns to rest on
 * leave, keyboard focus matches hover, and reduced motion removes all movement.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4321';
const results = [];
const check = (name, cond, detail = '') => {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`);
  return cond;
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// Left edges (CSS px) of the parts we care about, for the header mark.
const measure = (page) => page.evaluate(() => {
  const svg = document.querySelector('header .logo-mark');
  const left = (el) => el.getBoundingClientRect().left;
  const navyDot = svg.querySelector('.mv-navy-rel circle');
  const goldDot = svg.querySelector('.mv-gold-rel circle');
  return {
    navy: left(svg.querySelector('.mv-navy-rel use')),
    gold: left(svg.querySelector('.mv-gold-rel use')),
    navyDot: left(navyDot),
    goldDot: left(goldDot),
    cross: left(svg.querySelector('.cross-glow')),
    crossWidth: svg.querySelector('.cross-glow').getBoundingClientRect().width,
    on: getComputedStyle(svg).getPropertyValue('--mark-on').trim(),
    glow: parseFloat(getComputedStyle(svg.querySelector('.cross-glow')).opacity),
    sheen: parseFloat(getComputedStyle(svg.querySelector('.lk-sheen-gold')).opacity),
    filter: getComputedStyle(svg).filter,
    duration: getComputedStyle(svg.querySelector('.mv-navy')).transitionDuration,
    easing: getComputedStyle(svg.querySelector('.mv-navy')).transitionTimingFunction,
    height: svg.getBoundingClientRect().height,
  };
});

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  check('two scoped marks per page (navbar + footer), no duplicate ids', await page.evaluate(() => {
    const ids = [...document.querySelectorAll('.logo-mark [id]')].map((el) => el.id);
    return document.querySelectorAll('.logo-mark').length === 2 && new Set(ids).size === ids.length && ids.length > 0;
  }));
  check('no flat logo image left', (await page.locator('img[src^="/brand/mark"]').count()) === 0);

  const rest = await measure(page);
  check('mark renders at 36px', near(rest.height, 36, 0.5), `${rest.height}`);
  check('at rest nothing is shifted', rest.on === '0' && rest.glow === 0 && rest.sheen === 0);

  await page.hover('header .logo-mark');
  await page.waitForTimeout(900);
  const hover = await measure(page);
  const navyShift = hover.navy - rest.navy;
  const goldShift = hover.gold - rest.gold;
  check('navy slides right ~2–3px', navyShift >= 2 && navyShift <= 3, navyShift.toFixed(2));
  check('gold slides left ~2–3px', goldShift <= -2 && goldShift >= -3, goldShift.toFixed(2));
  check('dots travel with their own link', near(hover.navyDot - rest.navyDot, navyShift, 0.05) && near(hover.goldDot - rest.goldDot, goldShift, 0.05));
  check('cross stays centred', near(hover.cross, rest.cross, 0.3) || near(hover.cross + (hover.crossWidth - rest.crossWidth) / 2, rest.cross, 0.3), `${rest.cross.toFixed(2)} → ${hover.cross.toFixed(2)}`);
  check('cross emphasis ≤ 5%', hover.crossWidth / rest.crossWidth <= 1.05 && hover.crossWidth / rest.crossWidth > 1, (hover.crossWidth / rest.crossWidth).toFixed(3));
  check('cross brightens (white tint fades in)', hover.glow > 0.5, `${hover.glow}`);
  check('highlight rises along the curves', hover.sheen > 0.3, `${hover.sheen}`);
  check('subtle lift', hover.filter.includes('drop-shadow') && hover.filter.includes('0.22'), hover.filter);
  check('400–600ms with one easing curve', parseFloat(hover.duration) >= 0.4 && parseFloat(hover.duration) <= 0.6 && hover.easing.startsWith('cubic-bezier'), `${hover.duration} ${hover.easing}`);

  // Contour gaps are static strokes inside the frame of the link that casts
  // them, so they inherit that link's shift (masks cannot be probed by hit
  // testing; the frame contract is what makes them travel correctly).
  const frames = await page.evaluate(() => {
    const svg = document.querySelector('header .logo-mark');
    const goldFrame = svg.querySelector('.mv-gold[mask]');
    const navyFrame = svg.querySelector('.mv-navy[mask]');
    return {
      goldFrameMaskInGoldFrame: goldFrame.getAttribute('mask').includes('cut-by-gold'),
      navyFrameMaskInNavyFrame: navyFrame.getAttribute('mask').includes('cut-by-navy'),
      goldFrameShift: getComputedStyle(goldFrame).transform,
      navyFrameShift: getComputedStyle(navyFrame).transform,
    };
  });
  check('gold-cast contour gap is masked in the gold frame (moves with gold)', frames.goldFrameMaskInGoldFrame && frames.goldFrameShift === 'matrix(1, 0, 0, 1, -10, 0)', frames.goldFrameShift);
  check('navy-cast contour gap is masked in the navy frame (moves with navy)', frames.navyFrameMaskInNavyFrame && frames.navyFrameShift === 'matrix(1, 0, 0, 1, 10, 0)', frames.navyFrameShift);

  await page.mouse.move(640, 600);
  await page.waitForTimeout(900);
  const back = await measure(page);
  check('returns to rest after leave', near(back.navy, rest.navy, 0.05) && near(back.gold, rest.gold, 0.05) && back.glow === 0 && back.on === '0');

  // Keyboard parity
  await page.focus('header .logo-link');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(900);
  const focused = await measure(page);
  check('keyboard focus engages the same state', focused.on === '1' && near(focused.navy - rest.navy, navyShift, 0.05), `on=${focused.on}`);

  check('zero JS errors', errors.length === 0, errors.join(' | '));
  await page.close();

  // Reduced motion: no movement, lift or scale — only the tint/highlight fade.
  const rm = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await rm.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const rmRest = await measure(rm);
  await rm.hover('header .logo-mark');
  await rm.waitForTimeout(500);
  const rmHover = await measure(rm);
  check('reduced motion: links do not move', rmHover.navy === rmRest.navy && rmHover.gold === rmRest.gold);
  check('reduced motion: no lift, no scale', rmHover.filter === 'none' && rmHover.crossWidth === rmRest.crossWidth, rmHover.filter);
  check('reduced motion: colour/opacity change still happens', rmHover.glow > 0.5 && rmHover.sheen > 0.3);
  await rm.close();
} finally {
  await browser.close();
}

console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
