/**
 * Riggs, on camera, once. (Replaces the nine voiceovers — 3c, retired 2026-08-13.)
 *
 * **What this is instead of.** Every chapter used to carry a ninety-second script, written to be
 * read into a phone by Riggs and printed on the page as its own transcript. Nine of them, about
 * 2,000 words, and none recorded. "You can remove the scripts from all the chapters. I'm recording
 * what I want now. I think I'll just do one video on chapter 0 to explain the site. I don't want to
 * spend so much time recording."
 *
 * That is a better trade than it looks. The nine scripts were the *same* material as the chapters
 * they sat on — that was the design, deliberately: a spoken version of a page that also explains
 * itself. Which makes them the one part of this website whose absence costs a reader nothing, and
 * the one part whose production cost fell entirely on one person. One clip that explains the site
 * is a different job from nine that re-explain the chapters, and it is the job only he can do.
 *
 * **The file is not here yet, and the page is correct without it.** Same rule the audio player
 * followed: no file means no player — not a greyed-out control, not a "coming soon", not something
 * that throws when clicked. The block simply is not on the page. Drop `intro.mp4` into
 * `public/media/` and it appears with no code change.
 *
 * **A local file rather than a YouTube embed.** The two other videos in the course are somebody
 * else's and belong on YouTube; this one is him, in his own house, talking to his aunt. Uploading it
 * to Google to serve it back is a step that buys nothing and costs the one thing this file is meant
 * to protect — that it is a present from a person rather than a link to a platform.
 */

import { el } from '../site/dom';
import type { Mounted } from '../site/types';

export interface IntroVideoOptions {
  /** Fills `{name}` and `{rival}`. */
  t: (text: string) => string;
}

export interface IntroVideoHandle extends Mounted {
  root: HTMLElement;
}

/** Where to drop the file. One clip, one name, no configuration. */
export const INTRO_VIDEO_FILE = 'media/intro.mp4';

export function createIntroVideo(options: IntroVideoOptions): IntroVideoHandle {
  const { t } = options;

  const root = el('section', { class: 'section intro-video' });
  // Hidden until the file answers. The probe below is the only thing that ever shows it, so a
  // missing file leaves an empty section rather than a broken one.
  root.hidden = true;

  // `import.meta.env.BASE_URL` is '/' in dev and '/mario-kart-master/' in a build, always with a
  // trailing slash. Concatenated, never fed to `new URL()` — that needs an absolute base and throws
  // on both of those values. (The bug that cost session 3 an afternoon; see WORKLOG.)
  const src = `${import.meta.env.BASE_URL}${INTRO_VIDEO_FILE}`;

  const video = el('video', {
    className: 'intro-video-player',
    controls: true,
    preload: 'metadata',
    playsInline: true,
  });

  video.addEventListener('loadedmetadata', () => {
    root.hidden = false;
  });
  // A missing file fires `error`; so does Vite's dev server answering an unknown path with
  // index.html, which fails to decode as video. Right in dev and in production, both.
  video.addEventListener('error', () => {
    root.hidden = true;
  });

  video.src = src;

  root.append(
    // The number is in the heading because it is the first thing on the first page and she is
    // deciding whether to spend the evening — and it is *three*, not two, because the file is 2:50
    // and the player says so eight pixels below this line. A heading that undersells the length of
    // the thing directly under it is the one kind of wrong that gets noticed immediately.
    el('h2', null, 'Three minutes from me first'),
    el('div', { class: 'intro-video-frame' }, video),
    el(
      'p',
      { class: 'video-note' },
      t('What this thing is, how it works, and what I want you to do with it.'),
    ),
  );

  return {
    root,
    dispose() {
      video.pause();
      video.removeAttribute('src');
      video.load();
      root.remove();
    },
  };
}
