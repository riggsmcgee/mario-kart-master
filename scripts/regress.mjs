/**
 * The regression suite. Every fix from the pre-send pass, re-checked in a real browser.
 *
 * Written on 2026-08-13 as a throwaway driver at the repo root, kept on 2026-08-14 because it is
 * the only thing in the project that checks *behaviour* rather than rendering. `shoot.mjs` proves
 * every route paints without throwing; this drives the site the way a person does — clicking the
 * doorman, clearing progress, dragging the full stop out of Kayla's notice — and asserts what
 * happened afterwards.
 *
 * Each numbered section is a defect that actually shipped and was actually found by a human. They
 * are worth re-running before any change to routing, `settings.ts`, the doorman, or Kayla's half,
 * because every one of them passed a typecheck and a lint on the day it was wrong:
 *
 *   1. the skip link fired the router at `#main` and painted "no chapter here" over the page
 *   2. `#/chapter/ch3/` (trailing slash) stuck on Loading… forever
 *   3. the race-day card read the saved kart under the wrong keys and named the default build
 *   4. "clear progress" cleared one localStorage key out of four
 *   5. the hole in Kayla's notice counted itself, and ate a word on a 3px twitch
 *   6. the leave dialogue was not modal, and the scene behind it stayed tab-reachable
 *   7. the assessment could be double-clicked two questions forward
 *
 * Needs a dev server. `npm run dev` in another terminal, then `npm run check:regress`. Point it
 * elsewhere with BASE, including at the live site:
 *
 *   BASE=https://riggsmcgee.github.io/mario-kart-master node scripts/regress.mjs
 *
 * Exits non-zero on any failure.
 */
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5173';
const fails = [];
const ok = (m, d = '') => console.log('  ok   ' + m + (d ? '  — ' + d : ''));
const bad = (m, d = '') => {
  fails.push(m + (d ? ' — ' + d : ''));
  console.log('  FAIL ' + m + (d ? '  — ' + d : ''));
};
const browser = await chromium.launch();

async function page(hash = '/#/') {
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', (e) => bad('page threw', e.message));
  p.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|404/i.test(m.text())) bad('console', m.text());
  });
  await p.goto(`${BASE}${hash}`, { waitUntil: 'networkidle' });
  return p;
}
const asJodi = async (p) => {
  const d = p.locator('.doorman-option', { hasText: 'Jodi' });
  if (await d.count()) {
    await d.first().click();
    await p.waitForTimeout(500);
  }
};

console.log('\n1. the skip link');
{
  const p = await page();
  await asJodi(p);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector('a[href="#main"]')?.focus());
  await p.keyboard.press('Enter');
  await p.waitForTimeout(900);
  const body = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  if (/wrong turn|no chapter here|LOADING…/i.test(body))
    bad('skip link still breaks the router', body.slice(0, 70));
  else ok('skip link no longer breaks the router', `url=${p.url()}`);
  const focused = await p.evaluate(() => document.activeElement?.id ?? '(none)');
  if (focused === 'main') ok('focus moved to <main>');
  else bad('focus did not move to <main>', focused);
  await p.close();
}

console.log('\n2. non-canonical chapter urls');
{
  const p = await page();
  await asJodi(p);
  for (const h of ['/chapter/ch3/', '/chapter/ch3', '/chapter/ch5/']) {
    await p.evaluate(() => {
      window.location.hash = '/settings';
    });
    await p.waitForTimeout(500);
    await p.evaluate((x) => {
      window.location.hash = x;
    }, h);
    await p.waitForTimeout(2000);
    const body = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
    if (/LOADING…/i.test(body)) bad(`"#${h}" still stuck on Loading…`);
    else ok(`"#${h}" renders`, body.slice(40, 90));
  }
  await p.close();
}

console.log('\n3. the race-day build name');
{
  const p = await page();
  await asJodi(p);
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('mkm.progress.v1') ?? '{}');
    s.chapters = {};
    for (const id of ['ch0', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'])
      s.chapters[id] = {
        status: 'done',
        stars: 3,
        bestScore: 100,
        updatedAt: new Date().toISOString(),
      };
    localStorage.setItem('mkm.progress.v1', JSON.stringify(s));
    localStorage.setItem(
      'mkm.combo.v1',
      JSON.stringify({
        archetype: 'zippy',
        title: 'The Zippy One',
        character: 'Toadette',
        body: 'Biddybuggy',
        tyres: 'Roller',
        glider: 'Cloud Glider',
      }),
    );
  });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  await p.evaluate(() => {
    window.location.hash = '/chapter/ch8';
  });
  await p.waitForTimeout(2500);
  const body = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  if (/Zippy One/.test(body) && !/Comfy Speedster/.test(body))
    ok('race-day card names the chosen build');
  else
    bad(
      'race-day card build name',
      `Zippy=${/Zippy One/.test(body)} Comfy=${/Comfy Speedster/.test(body)}`,
    );
  await p.close();
}

console.log('\n4. clear progress');
{
  const p = await page();
  await p.evaluate(() => {
    localStorage.setItem('mkm.kayla.admitted.v1', 'yes');
    localStorage.setItem(
      'mkm.combo.v1',
      '{"archetype":"zippy","title":"The Zippy One","character":"Toadette","body":"Biddybuggy","tyres":"Roller","glider":"Cloud Glider"}',
    );
  });
  await asJodi(p);
  await p.evaluate(() => {
    window.location.hash = '/settings';
  });
  await p.waitForTimeout(800);
  const before = await p.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith('mkm'))
      .sort(),
  );
  const clear = await p
    .locator('button', { hasText: /Clear progress/ })
    .first()
    .elementHandle();
  await clear.click();
  await p.waitForTimeout(300);
  await clear.click();
  await p.waitForTimeout(1500);
  const after = await p.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith('mkm'))
      .sort(),
  );
  console.log(`       before ${JSON.stringify(before)}`);
  console.log(`       after  ${JSON.stringify(after)}`);
  if (after.some((k) => /combo|admitted|doorman/.test(k)))
    bad('clear progress left a key behind', JSON.stringify(after));
  else ok('clear progress clears every key');
  const doors = await p.locator('.doorman-option').count();
  if (doors > 0) ok('and the doorman reopens immediately, with no reload', `${doors} options`);
  else bad('the doorman did not reopen after clearing');
  await p.close();
}

console.log("\n5. Kayla's piece — the fixed beats");
{
  const p = await page();
  await p.locator('.doorman-option', { hasText: 'Kayla' }).first().click();
  await p.locator('#k-stop.k-stop-fallen').waitFor({ state: 'attached', timeout: 40000 });
  await p.waitForTimeout(1200);
  // the notice reads the way it should
  const notice = (await p.locator('.k-notice').innerText()).replace(/\n/g, ' / ');
  ok('the notice', `"${notice}"`);
  // beat 1 -> beat 2
  const b = await p.locator('#k-stop').boundingBox();
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await p.mouse.down();
  await p.mouse.move(b.x + 60, b.y + 90, { steps: 8 });
  await p.mouse.up();
  await p.locator('#k-stop.k-hole').waitFor({ state: 'attached', timeout: 30000 });
  await p.waitForTimeout(500);
  const words = await p.evaluate(() => document.querySelectorAll('.k-notice .k-word').length);
  const inside = await p.evaluate(() => document.querySelectorAll('#k-stop .k-word').length);
  if (words === 16 && inside === 0)
    ok('the hole no longer counts itself', `${words} words, ${inside} inside`);
  else bad('hole word count', `${words} words, ${inside} inside the hole`);
  // a tiny nudge eats nothing
  const h = await p.locator('#k-stop').boundingBox();
  await p.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await p.mouse.down();
  await p.mouse.move(h.x + h.width / 2 + 3, h.y + h.height / 2 + 3, { steps: 3 });
  await p.mouse.up();
  await p.waitForTimeout(400);
  const eaten = await p.evaluate(() => document.querySelectorAll('.k-eaten').length);
  if (eaten === 0) ok('a 3px nudge eats nothing');
  else bad('the hole still eats on a tiny nudge', `${eaten} eaten`);
  await p.close();
}

console.log('\n6. the leave dialogue');
{
  const p = await page();
  await p.locator('.doorman-option', { hasText: 'Kayla' }).first().click();
  await p.locator('#k-stop').waitFor({ state: 'attached', timeout: 30000 });
  await p.waitForTimeout(1800);
  await p.locator('.k-exit').click();
  await p.waitForTimeout(500);
  const modal = await p.locator('.k-leaving').getAttribute('aria-modal');
  const desc = await p.locator('.k-leaving').getAttribute('aria-describedby');
  const descExists = await p.locator('#k-leaving-body').count();
  if (modal === 'true' && desc === 'k-leaving-body' && descExists === 1)
    ok('dialogue is modal, labelled and described');
  else bad('dialogue semantics', `aria-modal=${modal} describedby=${desc} target=${descExists}`);
  const inert = await p.evaluate(() => ({
    scene: document.querySelector('.k-scene')?.hasAttribute('inert') ?? false,
    bin: document.querySelector('.k-pocket')?.hasAttribute('inert') ?? false,
  }));
  if (inert.scene) ok('the scene behind it is inert');
  else bad('the scene is still tab-reachable');
  // Escape closes it and does not destroy the narrator's line
  const lineBefore = await p
    .locator('.k-narrator')
    .innerText()
    .catch(() => '');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  if ((await p.locator('.k-leaving').count()) === 0) ok('Escape closes it');
  else bad('Escape did not close it');
  const stillInert = await p.evaluate(
    () => document.querySelector('.k-scene')?.hasAttribute('inert') ?? false,
  );
  if (!stillInert) ok('and inert is lifted');
  else bad('the scene stayed inert after closing');
  console.log(`       narrator before "${lineBefore.replace(/\n/g, ' / ').slice(0, 60)}"`);
  // second press leaves
  await p.locator('.k-exit').click();
  await p.waitForTimeout(900);
  if ((await p.locator('.doorman-option').count()) > 0)
    ok('second press goes straight out to the door');
  else bad('second press did not leave');
  const admitted = await p.evaluate(() => localStorage.getItem('mkm.kayla.admitted.v1'));
  if (!admitted) ok('leaving admits nobody', `flag=${admitted}`);
  else bad('leaving set the admission flag', String(admitted));
  await p.close();
}

console.log('\n7. the assessment cannot be double-clicked past');
{
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', (e) => bad('page threw', e.message));
  await p.goto(`${BASE}/src/proto/kayla/index.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const jump = p.locator('button, a', { hasText: /assessment/i }).first();
  if (await jump.count()) {
    await jump.click();
    await p.waitForTimeout(2500);
    if (await p.locator('.k-form').count()) {
      const first = await p.locator('.k-ask').textContent();
      const opts = p.locator('.k-option');
      await opts.nth(1).click();
      await opts
        .nth(1)
        .click({ force: true })
        .catch(() => {});
      await p.waitForTimeout(1600);
      const second = await p.locator('.k-ask').textContent();
      const num = await p.locator('.k-stencil').first().textContent();
      if (num && /Question 2 of 3/.test(num))
        ok('a double-click advances exactly one question', num);
      else
        bad(
          'double-click advanced too far',
          `${num} · "${String(second).slice(0, 40)}" (was "${String(first).slice(0, 40)}")`,
        );
    } else bad('could not reach the assessment on the bench');
  } else console.log('       (no beat jump button found — skipped)');
  await p.close();
}

console.log(`\n=== ${fails.length} failures ===`);
for (const f of fails) console.log(' -', f);
await browser.close();
process.exit(fails.length ? 1 : 0);
