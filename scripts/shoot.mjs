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
  ['plan', '/#/plan', 'Forty sessions'],
  ['ch0-intro', '/#/chapter/ch0', 'Chapter 0 · The goal'],
  ['ch1-start-boost', '/#/chapter/ch1', 'Chapter 1 · Start boost'],
  ['ch2-items', '/#/chapter/ch2', 'Chapter 2 · Item smarts'],
  ['ch3-tricks', '/#/chapter/ch3', 'Chapter 3 · Ramp tricks'],
  ['ch4-pads', '/#/chapter/ch4', 'Chapter 4 · Boost pads'],
  ['ch5-lines', '/#/chapter/ch5', 'Chapter 5 · Lines and coins'],
  ['ch6-drift', '/#/chapter/ch6', 'Chapter 6 · The drift'],
  ['ch7-kart', '/#/chapter/ch7', 'Chapter 7 · Your kart'],
  ['ch8-plan', '/#/chapter/ch8', 'Chapter 8 · The plan'],

  // The practice pages. Added when the chapters were split in two (2026-08-12) — and they need
  // checking at least as much as the lessons do, because a `/try` route that quietly falls back to
  // the lesson is exactly the class of bug that got this file its `expect` column in the first
  // place. Each one expects its *drill* heading, which only the practice page draws.
  ['ch0-try', '/#/chapter/ch0/try', 'Twelve questions, cold'],
  ['ch1-try', '/#/chapter/ch1/try', 'Five starts'],
  ['ch2-try', '/#/chapter/ch2/try', 'Hold the banana'],
  ['ch3-try', '/#/chapter/ch3/try', 'Six ramps'],
  ['ch4-try', '/#/chapter/ch4/try', 'Find the boost pads'],
  ['ch5-try', '/#/chapter/ch5/try', 'Follow the line'],
  ['ch6-try', '/#/chapter/ch6/try', 'Six corners'],
  ['ch7-try', '/#/chapter/ch7/try', 'Build your kart'],
  // Chapter 8 has no practice page: the second half of the benchmark stands at the front of the
  // chapter itself, which is what `ch8-plan` above expects to find.

  ['testbed', '/testbed/', 'The Testing Ground'],

  // Kayla's five minutes (4e4). Shot at its prototype harness rather than through the doorman,
  // because the real route into it is a click on her own name and this file drives URLs. What it
  // is checking is the thing this file exists for: that the chunk loads and the module does not
  // throw on line one. The beats themselves are exercised by playing them.
  ['kayla', '/src/proto/kayla/index.html', 'There Is No Course'],
];

/**
 * Requests that are allowed to fail, matched on the **URL** rather than on the console text.
 *
 * This used to be a console-message pattern (`/Failed to load resource.*audio\/ch\d\.mp3/`) and it
 * only worked against the dev server, which happens to put the URL in the message. Served the way
 * Pages serves it, Chromium logs a bare "Failed to load resource: 404" for the audio probe with no
 * filename in it — so the pattern missed, and every lesson page failed for a file that is missing
 * on purpose. Matching the request URL is what the rule always meant.
 */
const ALLOWED_MISSING = [
  // `intro.mp4` used to be listed here "until the file lands". It landed on 2026-08-13, and leaving
  // the allowance in place meant the one check that would notice a missing, renamed or unpublished
  // intro video was passing on purpose. An exemption written for an absence has to be deleted when
  // the absence ends, or it quietly becomes a blind spot over the most visible asset on the site.
  /favicon/i,
  // Google's font CDN, which is not ours and drops the odd request. `theme.css` names a full
  // fallback stack for all three faces, so a miss costs the look and nothing else. A genuinely
  // wrong font URL would fail on every route rather than one, which is still visible here.
  /^https:\/\/fonts\.gstatic\.com\//i,
];

/** Console noise that is expected and not a defect. */
const IGNORE = [
  /favicon/i,
  /Download the React DevTools/i,
  /WebGL.*deprecated/i,
  // Paired with ALLOWED_MISSING above: the failed request is reported by the response handler,
  // which knows the URL, so the console's URL-less echo of the same thing is noise.
  /^Failed to load resource: the server responded with a status of 404/i,
];

/**
 * SGR colour codes. Built from a char code rather than written as a literal escape so the source
 * carries no control character — which both `no-control-regex` and the next person reading this
 * line will thank us for.
 */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

async function startServer() {
  const child = spawn('npm', ['run', 'dev', '--', '--port', '5173', '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('dev server did not start in 60s')), 60_000);
    const watch = (chunk) => {
      // Strip ANSI before matching. Vite colours its banner even when stdout is a pipe, which
      // puts an escape sequence between "Local" and ":" — so the obvious /Local:.*http/ never
      // matches, the wait times out at 60s, and the orphaned child then holds the port so the
      // next run fails differently. Cost an evening once; not again.
      if (/Local:.*http/i.test(String(chunk).replace(ANSI, ''))) {
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

  // The real check for missing files. A 404 the app shrugs off is still a 404, and this is the
  // only place that knows which URL it was.
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (ALLOWED_MISSING.some((pattern) => pattern.test(url))) return;
    problems.push(`${response.status()}: ${url}`);
  });

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
    // Emphasis markers that never got formatted. (Added 2026-08-13, after Riggs found
    // `**identically**` printing its own asterisks on Chapter 7's practice page.)
    //
    // Copy in this project carries `**bold**`, and `dom.ts`'s `rich()` is the only thing that turns
    // that into a `<strong>`. Pass the same string to `el()` and it becomes a text node with the
    // asterisks still in it — which typechecks, lints, renders, and is wrong. Nothing but looking
    // at the page catches it, so the thing that already looks at every page may as well.
    const stray = /\*\*\S/.exec(text);
    if (stray) {
      const at = text.slice(Math.max(0, stray.index - 40), stray.index + 60).replace(/\s+/g, ' ');
      problems.push(`unformatted "**" in the copy — needs rich(): …${at}…`);
    }
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
