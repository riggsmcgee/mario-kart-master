import { chromium } from 'playwright';
const KEY = 'mkm.kayla.admitted.v1';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// --- Riggs's actual situation: admitted, so Kayla's door no longer opens ------
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
await page.evaluate((k) => localStorage.setItem(k, 'yes'), KEY);
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: /kayla/i }).first().click();
await page.waitForTimeout(1500);
console.log('admitted → clicking Kayla shows the stage?', (await page.locator('.k-stage').count()) > 0, '(expect false — this is the bug he hit)');
console.log('flag before reset:', await page.evaluate((k) => localStorage.getItem(k), KEY));

// --- clear progress ----------------------------------------------------------
await page.goto('http://localhost:5199/#/settings', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const reset = page.getByRole('button', { name: /Clear progress on this computer/i });
await reset.click();
await page.getByRole('button', { name: /Really clear it/i }).click();
await page.waitForTimeout(900);
console.log('flag after reset:', await page.evaluate((k) => localStorage.getItem(k), KEY), '(expect null)');

// --- and now her door works again -------------------------------------------
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const kaylaBtn = page.getByRole('button', { name: /kayla/i }).first();
console.log('doorman asks again after reset:', (await kaylaBtn.count()) > 0);
if (await kaylaBtn.count()) {
  await kaylaBtn.click();
  await page.waitForSelector('.k-stage', { timeout: 12000 });
  console.log('after reset → Kayla opens the experience: true');
} else {
  console.log('no doorman (already answered) — forcing it');
}

// --- the settings button -----------------------------------------------------
await page.goto('http://localhost:5199/#/settings', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: 'shot-settings.png', fullPage: true });
const look = page.getByRole('button', { name: /Have a look at Kayla/i });
console.log('button present:', await look.count());
await look.click();
await page.waitForSelector('.k-over .k-stage', { timeout: 15000 });
console.log('opens as an overlay:', (await page.locator('.k-over .k-stage').count()) === 1);
console.log('body scroll locked:', await page.evaluate(() => document.body.classList.contains('k-over-open')));
console.log('site header covered:', await page.evaluate(() => {
  const h = document.querySelector('.site-header');
  if (!h) return 'no header';
  const r = h.getBoundingClientRect();
  const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return !h.contains(top);
}));
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shot-visit.png' });

// leave via the exit
await page.locator('.k-exit').click();
await page.waitForTimeout(800);
console.log('back on settings:', (await page.locator('.k-over').count()) === 0 && (await page.getByRole('heading', { name: 'Bits and pieces' }).count()) === 1);
console.log('scroll lock removed:', !(await page.evaluate(() => document.body.classList.contains('k-over-open'))));
console.log('preview wrote nothing:', (await page.evaluate((k) => localStorage.getItem(k), KEY)) === null);

// navigating away mid-visit must tear it down
await look.click();
await page.waitForSelector('.k-over .k-stage', { timeout: 15000 });
await page.goto('http://localhost:5199/#/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
console.log('leaving settings mid-visit cleans up:', (await page.locator('.k-over').count()) === 0 && !(await page.evaluate(() => document.body.classList.contains('k-over-open'))));

console.log('CONSOLE ERRORS:', errors.length ? errors : 'none');
await browser.close();
