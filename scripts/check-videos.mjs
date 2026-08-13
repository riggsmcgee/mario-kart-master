/**
 * Are the embedded videos still there, and still embeddable? (4f1, and the standing check for 2b9)
 *
 * Seven YouTube videos are linked from this site — three in chapters, four in the track guides —
 * and every one of them belongs to somebody else. They can be deleted, made private, or have
 * embedding switched off, and none of those events send us a message. What they do instead is turn
 * a chapter into a grey box on the day Jodi opens it.
 *
 * So this asks YouTube directly, using the oEmbed endpoint:
 *
 *   200  the video exists and may be embedded elsewhere
 *   401  it exists but embedding is disabled — the poster would load and the player would refuse
 *   404  gone, private, or the id is wrong
 *
 * oEmbed rather than the Data API on purpose: no key, no quota, no account, so this keeps working
 * long after anybody has stopped maintaining it. It is the difference between a check that runs at
 * 4f1 and a check that can be run by whoever is around in a year.
 *
 *   node scripts/check-videos.mjs
 *
 * Exits non-zero if any video is unusable, so it can gate a release.
 *
 * **A network failure is not a dead video.** If the request itself fails — offline, DNS, a timeout
 * — that is reported separately and does not fail the run. A checker that cries wolf on a flaky
 * connection is one that gets ignored on the day it is right.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Read the ids out of the data files rather than keeping a list here.
 *
 * A second list would be a second thing to update, and the failure mode is silent: a video swapped
 * in `chapters.ts` and not here is a video this script cheerfully reports as fine while the site
 * embeds something it has never checked.
 */
function collect() {
  const found = [];
  for (const file of ['src/data/chapters.ts', 'src/data/tracks.ts']) {
    const source = readFileSync(join(root, file), 'utf8');
    // Each `video: { id: '...', title: '...', channel: '...' }` block, in order.
    const pattern =
      /video:\s*\{[^}]*?id:\s*'([^']+)'[^}]*?title:\s*'((?:[^'\\]|\\.)*)'[^}]*?channel:\s*'([^']+)'/gs;
    for (const match of source.matchAll(pattern)) {
      found.push({ file, id: match[1], title: match[2], channel: match[3] });
    }
  }
  return found;
}

async function check(video) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${video.id}`,
  )}&format=json`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (response.status === 200) {
      const body = await response.json();
      return { state: 'ok', title: body.title, author: body.author_name };
    }
    if (response.status === 401) return { state: 'no-embed' };
    if (response.status === 404) return { state: 'gone' };
    return { state: 'odd', detail: `HTTP ${response.status}` };
  } catch (error) {
    return { state: 'unreachable', detail: error instanceof Error ? error.message : String(error) };
  }
}

const videos = collect();
if (videos.length === 0) {
  console.error('No videos found. The data files moved or the shape changed — fix this script.');
  process.exit(1);
}

console.log(`Checking ${videos.length} embedded videos\n`);

let broken = 0;
let unreachable = 0;

for (const video of videos) {
  const result = await check(video);
  const where = video.file.replace('src/data/', '');

  if (result.state === 'ok') {
    // The title on YouTube drifts from the one written into the data — uploaders rename things.
    // Worth showing rather than failing on: the copy under the embed is written in Riggs's voice
    // and is allowed to disagree with the uploader's capitalisation.
    const drifted = result.title !== video.title;
    console.log(`[ ok ] ${video.id}  ${where}  ${video.channel}`);
    if (drifted) console.log(`         now titled: "${result.title}" by ${result.author}`);
  } else if (result.state === 'unreachable') {
    unreachable++;
    console.log(`[ ?? ] ${video.id}  ${where}  could not reach YouTube — ${result.detail}`);
  } else {
    broken++;
    const why =
      result.state === 'no-embed'
        ? 'embedding is switched off — the player will refuse to load'
        : result.state === 'gone'
          ? 'deleted, private, or the id is wrong'
          : result.detail;
    console.log(`[FAIL] ${video.id}  ${where}  ${why}`);
    console.log(`         "${video.title}" (${video.channel})`);
  }
}

console.log(
  `\n${videos.length - broken - unreachable}/${videos.length} usable` +
    (broken ? ` · ${broken} BROKEN` : '') +
    (unreachable ? ` · ${unreachable} unreachable (not counted as failures)` : ''),
);

process.exit(broken > 0 ? 1 : 0);
