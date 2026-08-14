/**
 * The accessibility measurement. (3e1, re-runnable.)
 *
 * Contrast of every rendered text node against its *resolved* backdrop, rendered type size, across
 * all twenty routes plus the three layers of Kayla's half that a route crawl cannot reach.
 *
 * Kept out of the throwaway pile on 2026-08-14 because the hard part is not the walk, it is the
 * two corrections in `MEASURE` below — and both were found the expensive way:
 *
 *  - **`color(srgb …)` has to be parsed.** The narrator strip resolves to that form, and a parser
 *    that returns null for it walks past the real backdrop and measures against white, reporting a
 *    comfortable 12:1 pairing as 1.01:1. An audit that lies in the *safe* direction is worse than
 *    no audit; this one lied in both.
 *  - **Inherited opacity composites the text.** The dimmed narrator line is set with `opacity` on
 *    an ancestor rather than with a colour, so the whole ancestor chain has to be multiplied in
 *    before the ratio means anything.
 *
 * `color: transparent` text is skipped on purpose: beat 1's full stop is a 16px disc painted with
 * `background`, and its glyph is hidden deliberately.
 *
 * Needs a dev server. `npm run dev` in another terminal, then `npm run check:contrast`. Exits
 * non-zero on any pairing below WCAG AA (4.5:1, or 3:1 for large text) or any type under 11px.
 */
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5173';

const ROUTES = [
  '/#/',
  '/#/settings',
  '/#/plan',
  '/#/chapter/ch0',
  '/#/chapter/ch1',
  '/#/chapter/ch2',
  '/#/chapter/ch3',
  '/#/chapter/ch4',
  '/#/chapter/ch5',
  '/#/chapter/ch6',
  '/#/chapter/ch7',
  '/#/chapter/ch8',
  '/#/chapter/ch0/try',
  '/#/chapter/ch1/try',
  '/#/chapter/ch2/try',
  '/#/chapter/ch3/try',
  '/#/chapter/ch4/try',
  '/#/chapter/ch5/try',
  '/#/chapter/ch6/try',
  '/#/chapter/ch7/try',
];

const MEASURE = () => {
  const lum = (c) => {
    const f = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  // Handles rgb()/rgba() *and* color(srgb r g b) — the narrator strip resolves to the latter, and
  // a parser that silently returns null for it walks past the real backdrop and measures against
  // white, which reports a 12:1 pairing as 1.01:1.
  const parse = (s) => {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(s || '');
    if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    const c = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/.exec(s || '');
    if (c) return [+c[1] * 255, +c[2] * 255, +c[3] * 255, c[4] === undefined ? 1 : +c[4]];
    return null;
  };
  const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
  const backdrop = (el) => {
    let node = el,
      acc = null;
    while (node && node !== document.documentElement.parentNode) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c[3] > 0) {
        acc = acc === null ? c : [...over(acc, c.slice(0, 3)), 1];
        if (acc[3] >= 1 || c[3] >= 1) return acc.slice(0, 3);
      }
      node = node.parentElement;
    }
    return acc ? acc.slice(0, 3) : [255, 255, 255];
  };
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };

  const out = { contrast: [], small: [], count: 0 };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = (n.textContent || '').trim();
    if (!text) continue;
    const el = n.parentElement;
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    out.count += 1;
    const size = parseFloat(cs.fontSize);
    const weight = +cs.fontWeight || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const fg = parse(cs.color);
    // `color: transparent` is a drawn shape, not text — beat 1's full stop is a 16px disc painted
    // with `background` and its glyph is hidden on purpose.
    if (!fg || fg[3] === 0) continue;
    const bg = backdrop(el);
    // Element opacity composites the text toward its backdrop, and the dimmed narrator line is set
    // this way rather than with a colour.
    let chain = 1;
    for (let a = el; a; a = a.parentElement) chain *= +getComputedStyle(a).opacity;
    if (chain < 1) fg[3] = fg[3] * chain;
    const r = ratio(fg[3] < 1 ? over(fg, bg) : fg.slice(0, 3), bg);
    const need = large ? 3 : 4.5;
    if (r < need - 0.02) {
      out.contrast.push({
        t: text.slice(0, 48),
        r: +r.toFixed(2),
        need,
        size: +size.toFixed(1),
        sel: el.className || el.tagName,
      });
    }
    if (size < 11 && text.length > 2)
      out.small.push({ t: text.slice(0, 34), size: +size.toFixed(1) });
  }
  return out;
};

const browser = await chromium.launch();
let failures = 0,
  nodes = 0,
  minSize = 99;

for (const route of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  const d = page.locator('.doorman-option', { hasText: 'Jodi' });
  if (await d.count()) {
    await d.first().click();
    await page.waitForTimeout(400);
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(1200);
  const r = await page.evaluate(MEASURE);
  nodes += r.count;
  for (const s of r.small) minSize = Math.min(minSize, s.size);
  if (r.contrast.length || r.small.length) {
    console.log(`FAIL ${route}`);
    for (const c of r.contrast)
      console.log(`   ${c.r}:1 (needs ${c.need}) ${c.size}px  "${c.t}"  [${c.sel}]`);
    for (const s of r.small) console.log(`   ${s.size}px  "${s.t}"`);
    failures += r.contrast.length + r.small.length;
  }
  await page.close();
}

// Kayla's three layers, which the route crawl cannot reach.
for (const [name, setup] of [
  [
    'kayla: paper (beat 1)',
    async (p) => {
      await p.locator('#k-stop').waitFor({ timeout: 30000 });
      await p.waitForTimeout(2000);
    },
  ],
  [
    'kayla: leave dialogue',
    async (p) => {
      await p.locator('#k-stop').waitFor({ timeout: 30000 });
      await p.waitForTimeout(2000);
      await p.locator('.k-exit').click();
      await p.waitForTimeout(600);
    },
  ],
]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.locator('.doorman-option', { hasText: 'Kayla' }).first().click();
  await setup(page);
  const r = await page.evaluate(MEASURE);
  nodes += r.count;
  if (r.contrast.length || r.small.length) {
    console.log(`FAIL ${name}`);
    for (const c of r.contrast)
      console.log(`   ${c.r}:1 (needs ${c.need}) ${c.size}px  "${c.t}"  [${c.sel}]`);
    for (const s of r.small) console.log(`   ${s.size}px  "${s.t}"`);
    failures += r.contrast.length + r.small.length;
  } else console.log(`ok   ${name}`);
  await page.close();
}

// Deep layer: the assessment's ACCEPTED/REJECTED, which was the worst pairing found.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/src/proto/kayla/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const jump = page.locator('button, a', { hasText: /assessment/i }).first();
  if (await jump.count()) {
    await jump.click();
    await page.waitForTimeout(2500);
    await page.locator('.k-option').nth(0).click(); // the expert answer — rejected
    await page.waitForTimeout(400);
    const rej = await page.evaluate(MEASURE);
    await page.waitForTimeout(1400);
    await page.locator('.k-option').nth(1).click(); // accepted
    await page.waitForTimeout(400);
    const acc = await page.evaluate(MEASURE);
    const bad = [...rej.contrast, ...acc.contrast];
    if (bad.length) {
      console.log('FAIL kayla: deep layer (assessment)');
      for (const c of bad) console.log(`   ${c.r}:1 ${c.size}px "${c.t}" [${c.sel}]`);
      failures += bad.length;
    } else console.log('ok   kayla: deep layer (assessment, both verdicts)');
  }
  await page.close();
}

console.log(
  `\n${nodes} text nodes measured · ${failures} failures · smallest type ${minSize === 99 ? '≥11px' : minSize + 'px'}`,
);
await browser.close();
process.exit(failures ? 1 : 0);
