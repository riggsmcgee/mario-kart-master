/**
 * Screenshot every page and report anything the console complained about. (supports 4f1)
 *
 * This exists because of a specific, repeated failure in this project: "built" has twice meant
 * "it compiles and lints", and twice that turned out not to mean "it renders". The testbed index
 * sat on `Loading…` forever in session 3 because a route returning HTTP 200 was treated as proof
 * the script had run; the road stripes crawled for two sessions because nobody had looked.
 *
 * A 200 says the server handed back HTML. It says nothing about whether the module threw on line
 * one. This drives a real Chromium, waits for the network to settle, fails loudly on any console
 * error or page exception, and writes a PNG per route so the pages can actually be looked at.
 *
 *   node scripts/shoot.mjs                     # against an already-running dev server
 *   node scripts/shoot.mjs --serve             # start `npm run dev` first, and stop it after
 *   node scripts/shoot.mjs --base http://…     # point somewhere else
 *
 * Exits non-zero if any route logged a console error or threw, so it can gate a commit.
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const BASE = value('base', 'http://localhost:5173');
const OUT = value('out', 'screenshots');

/**
 * Routes worth a picture. The chapter list is deliberately explicit rather than derived — this
 * script has to keep working when the app is the thing that is broken.
 */
/**
 * Each route carries an `expect`: a string that must appear on the rendered page.
 *
 * That column is the entire value of this file and it was added after being burned. The first
 * version only checked that a page was not blank, and it cheerfully passed every chapter while
 * the router was quietly serving the home page for all of them — a deep-link bug that a
 * "did anything render" test can never see, because something always renders. A check that
 * cannot fail is not a check.
 */
const ROUTES = [
  ['home', '/#/', 'A present, with homework'],
  ['settings', '/#/settings', 'Bits and pieces'],
  ['ch0-intro', '/#/chapter/ch0', 'Chapter 0 · The promise'],
  ['ch1-start-boost', '/#/chapter/ch1', 'Chapter 1 · Start boost'],
  ['ch2-items', '/#/chapter/ch2', 'Chapter 2 · Item smarts'],
  ['ch3-tricks', '/#/chapter/ch3', 'Chapter 3 · Ramp tricks'],
  ['ch4-pads', '/#/chapter/ch4', 'Chapter 4 · Boost pads'],
  ['ch5-lines', '/#/chapter/ch5', 'Chapter 5 · Lines and coins'],
  ['ch6-drift', '/#/chapter/ch6', 'Chapter 6 · The drift'],
  ['ch7-kart', '/#/chapter/ch7', 'Chapter 7 · Your kart'],
  ['ch8-plan', '/#/chapter/ch8', 'Chapter 8 · The plan'],
  ['testbed', '/testbed/', 'The Testing Ground'],
];

/** Console noise that is expected and not a defect. */
const IGNORE = [
  /Failed to load resource.*audio\/ch\d\.mp3/i, // voiceovers not recorded yet, by design
  /favicon/i,
  /Download the React DevTools/i,
  /WebGL.*deprecated/i,
];

async function startServer() {
  const child = spawn('npm', ['run', 'dev', '--', '--port', '5173', '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('dev server did not start in 60s')), 60_000);
    const watch = (chunk) => {
      if (/Local:.*http/i.test(String(chunk))) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on('data', watch);
    child.stderr.on('data', watch);
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`dev server exited early (${code})`));
    });
  });

  // Vite prints its banner a moment before it is actually answering requests.
  await sleep(800);
  return child;
}

const server = flag('serve') ? await startServer() : null;
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const failures = [];
const report = [];

for (const [name, path, expect] of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const problems = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (IGNORE.some((pattern) => pattern.test(text))) return;
    problems.push(`console: ${text}`);
  });
  page.on('pageerror', (error) => problems.push(`threw: ${error.message}`));

  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30_000 });
    // The doorman gates everything on a fresh profile, so answer it as Jodi before shooting a
    // chapter — otherwise every screenshot is the same "Who's training?" page.
    const doorman = page.locator('.doorman-option', { hasText: 'Jodi' });
    if (await doorman.count()) {
      await doorman.first().click();
      await page.waitForTimeout(400);
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30_000 });
    }
    // Wait for the thing we came to see, rather than for a number of milliseconds.
    //
    // `networkidle` is not enough on the drill chapters: they dynamically import Three.js, which
    // the dev server hands over as a long waterfall of separate modules, and a gap in that
    // waterfall is indistinguishable from the page having finished. Sampling on a fixed sleep
    // caught chapter 5 mid-"Loading…" and reported a bug in the site that was really a bug in
    // this file. Waiting on the expected text is deterministic and self-documenting.
    if (expect) {
      await page
        .getByText(expect, { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 })
        .catch(() => {
          /* Reported properly by the assertion below, with the page's actual text. */
        });
    }
    // Then a beat for canvases to paint, which is presentation rather than correctness.
    await page.waitForTimeout(900);

    const text = (await page.locator('body').innerText()).trim();
    if (text.length < 40) problems.push(`page is essentially blank (${text.length} chars of text)`);
    // Case-insensitive, and whitespace-normalised, because the eyebrow is uppercased in CSS and
    // innerText reports the transformed text.
    const flat = text.replace(/\s+/g, ' ').toLowerCase();
    if (expect && !flat.includes(expect.replace(/\s+/g, ' ').toLowerCase())) {
      problems.push(`expected to find "${expect}" on the page — served the wrong view?`);
    }

    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  } catch (error) {
    problems.push(`navigation: ${error.message}`);
  }

  report.push({ name, path, problems });
  if (problems.length) failures.push({ name, problems });
  await page.close();
}

await browser.close();
server?.kill();

await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));

for (const { name, path, problems } of report) {
  const mark = problems.length ? 'FAIL' : ' ok ';
  console.log(`[${mark}] ${name.padEnd(18)} ${path}`);
  for (const problem of problems) console.log(`        ${problem}`);
}

console.log(`\n${report.length - failures.length}/${report.length} routes clean · PNGs in ${OUT}/`);
process.exit(failures.length ? 1 : 0);
