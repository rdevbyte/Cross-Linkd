/**
 * Brand-mark hover motion contract (run with `npm run test:logo`).
 *
 * The mark is an inline SVG whose two links slide toward each other on
 * hover/focus while the cross cut-out stays put. These checks pin the brief:
 * ~2–3px of travel, 400–600ms with one easing curve, cross emphasis ≤ 5%, no
 * rotation/skew/bounce, and a reduced-motion mode that keeps only a colour/
 * opacity change.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const logo = readFileSync(new URL('../src/components/Logo.astro', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const brand = css.slice(css.indexOf('/* ============ Brand logo'), css.indexOf('/* ============ Theme slider'));
const MARK_HEIGHT_PX = 36;
const ARTWORK_HEIGHT = 148;
const num = (re) => {
  const m = brand.match(re);
  assert.ok(m, `missing ${re}`);
  return parseFloat(m[1]);
};

test('mark is a layered inline SVG: two moving links, one fixed cross cut-out', () => {
  assert.doesNotMatch(logo, /<img/, 'flat PNG replaced by layers');
  assert.match(logo, /<svg\s+class="logo-mark/);
  assert.match(logo, /viewBox="0 0 241 148"/, 'keeps the artwork coordinate system');
  assert.match(logo, /class="mv-navy" mask=/);
  assert.match(logo, /class="mv-gold" mask=/);
  assert.match(logo, /class="mv-navy-rel"/);
  assert.match(logo, /class="mv-gold-rel"/);
  // the cross is cut in the fixed frame (no moving class on that mask) and the
  // same path drives the brightness overlay
  assert.match(logo, /<mask id=\{id\('cut-cross'\)\}[\s\S]*?<path d=\{CROSS\} fill="#000" \/>\s*<\/mask>/);
  assert.match(logo, /<path class="cross-glow" d=\{CROSS\} fill="#fff" \/>/);
  // the weave: navy under, gold, then navy again clipped to the bottom half
  assert.equal((logo.match(/mask=\{`url\(#\$\{id\('cut-cross'\)\}\)`\}/g) || []).length, 3);
  assert.match(logo, /<g clip-path=\{`url\(#\$\{id\('bottom'\)\}\)`\} mask=\{`url\(#\$\{id\('cut-cross'\)\}\)`\}>/);
  // ids are scoped per instance (the mark renders in the navbar and the footer)
  assert.match(logo, /const uid = `lm\$\{Math\.random\(\)/);
  assert.doesNotMatch(logo, /\bid="[a-z]/, 'no unscoped SVG ids');
  assert.match(logo, /aria-hidden="true"/);
  assert.match(logo, /aria-label="CrossLinkd home"/);
});

test('links travel 2–3px toward each other and nothing rotates, skews or bounces', () => {
  const shiftUnits = num(/--mark-shift:\s*([\d.]+)px/);
  const shiftPx = (shiftUnits * MARK_HEIGHT_PX) / ARTWORK_HEIGHT;
  assert.ok(shiftPx >= 2 && shiftPx <= 3, `shift is ${shiftPx.toFixed(2)}px at the ${MARK_HEIGHT_PX}px mark`);
  assert.match(brand, /\.mv-navy \{ transform: translateX\(calc\(var\(--mark-shift\) \* var\(--mark-on\)\)\); \}/);
  assert.match(brand, /\.mv-gold \{ transform: translateX\(calc\(var\(--mark-shift\) \* -1 \* var\(--mark-on\)\)\); \}/);
  // nested frames carry twice the shift so each link nets its own
  assert.match(brand, /\.mv-navy-rel \{ transform: translateX\(calc\(var\(--mark-shift\) \* 2 \* var\(--mark-on\)\)\); \}/);
  assert.match(brand, /\.mv-gold-rel \{ transform: translateX\(calc\(var\(--mark-shift\) \* -2 \* var\(--mark-on\)\)\); \}/);
  assert.doesNotMatch(brand, /rotate\(|skew|translateY\(/);
  assert.doesNotMatch(brand, /@keyframes|animation:/, 'transitions only — they reverse smoothly on leave');
  // easing curve must not overshoot (y values within [0, 1])
  const bezier = brand.match(/--mark-ease:\s*cubic-bezier\(([^)]+)\)/);
  assert.ok(bezier);
  const [, y1, , y2] = bezier[1].split(',').map(Number);
  assert.ok(y1 >= 0 && y1 <= 1 && y2 >= 0 && y2 <= 1, 'no bounce');
});

test('cross stays fixed and is emphasised by at most 5%', () => {
  const scale = num(/\.cross-glow \{[\s\S]*?scale\(calc\(1 \+ ([\d.]+) \* var\(--mark-on\)\)\)/);
  assert.ok(scale > 0 && scale <= 0.05, `cross scale +${scale * 100}%`);
  assert.match(brand, /\.cross-glow \{[\s\S]*?transform-origin: 120px 73px;/, 'scales about the crossing point');
  assert.match(brand, /\.cross-glow \{[\s\S]*?opacity: calc\(var\(--mark-glow\) \* var\(--mark-on\)\);/);
  assert.doesNotMatch(brand, /cut-cross[\s\S]*transform/, 'the cut-out itself never moves');
});

test('one 400–600ms curve for enter and leave, highlight and lift included', () => {
  const ms = num(/--mark-time:\s*(\d+)ms/);
  assert.ok(ms >= 400 && ms <= 600, `${ms}ms`);
  assert.match(brand, /\.lk-sheen-gold \{ opacity: calc\(0\.5 \* var\(--mark-on\)\); \}/);
  assert.match(brand, /\.lk-sheen-navy \{ opacity: calc\(0\.28 \* var\(--mark-on\)\); \}/);
  assert.match(brand, /filter: drop-shadow\(0 1px 1\.5px rgba\(14, 34, 57, calc\(0\.22 \* var\(--mark-on\)\)\)\)/);
  // every animated value derives from --mark-on, which hover (pointer devices
  // only) and keyboard focus both flip — so leaving reverses the same transition
  assert.match(brand, /@media \(hover: hover\) \{\s*\.logo-link:hover \.logo-mark \{ --mark-on: 1; \}/);
  assert.match(brand, /\.logo-link:focus-visible \.logo-mark \{ --mark-on: 1; \}/);
  assert.equal((brand.match(/--mark-on: 1/g) || []).length, 2, 'no other state flips it');
});

test('reduced motion: no movement, lift or scale — only a short colour/opacity change', () => {
  const rm = brand.slice(brand.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(rm, /--mark-shift: 0px/);
  assert.match(rm, /--mark-time: 220ms/);
  assert.match(rm, /\.logo-mark \{[^}]*filter: none;/);
  assert.match(rm, /\.mv-navy, \.logo-mark \.mv-gold, \.logo-mark \.mv-navy-rel, \.logo-mark \.mv-gold-rel \{ transform: none; transition: none; \}/);
  assert.match(rm, /\.cross-glow \{ transform: none; transition: opacity var\(--mark-time\) var\(--mark-ease\); \}/);
  // the old blanket rule that killed every logo transition is gone (it would
  // also have removed the permitted opacity fade)
  assert.doesNotMatch(css, /\.theme-slider, \.logo-mark \{ transition: none !important; \}/);
});
