/**
 * The chapter template. (2a2, rebuilt 2026-08-12.)
 *
 * **A chapter is two pages now.** It used to be one scroll — hook, concept, video, drill, a card
 * telling her what to do on the Switch, done. Riggs played it and called the shape wrong, and the
 * screenshot he sent makes the case better than the argument does: the drill arrives two thirds
 * of the way down a page she is still reading, with prose above it and more prose below.
 *
 * Reading and playing want different postures. So:
 *
 *  - **`#/chapter/ch3` is the lesson.** Prose, a video if one earns its place, and nothing that
 *    moves. It ends with one button: try it.
 *  - **`#/chapter/ch3/try` is the practice.** The drill, alone, with the chapter's idea restated
 *    in a sentence above it. No video, no essay, nothing to scroll past.
 *
 * Both halves are drawn here rather than by the chapters, so all nine still behave identically —
 * which was always the point of having a template. A chapter supplies `concept` and optionally
 * `interactive`, and the template decides what a page looks like and what "done" means.
 *
 * **Where done is awarded.** A chapter with a drill is finished by finishing the drill, so its
 * stamp lives on the practice page. A chapter without one is finished by saying so on the lesson
 * page. Neither can trap her: the practice page always offers a way onward whether or not the
 * drill was beaten, because nothing in this course is allowed to lock.
 *
 * **The "On the Switch" cards are gone.** Every chapter used to end with one, and nine of them
 * amounted to a training programme delivered in nine unconnected pieces, at the exact moment she
 * was still learning the idea rather than ready to practise it. That material now lives in
 * Chapter 8's programme, where it is one list, in order, with somewhere to tick it off.
 */

import type { ChapterMeta } from '../data/chapters';
import { nextChapter, starsFor } from '../data/chapters';
import type { ProgressStore } from '../backend/progress';
import type { Sfx } from '../ui/sfx';
import { createVoiceover, type VoiceoverHandle } from '../ui/voiceover';
import { VOICEOVER } from '../data/voiceover';
import { el, rich } from './dom';
import { fill } from './player';
import { go, hrefFor } from './router';
import type { ChapterContent, ChapterContext, ChapterResult, Mounted, Player } from './types';

export interface ChapterPageDeps {
  player: Player;
  progress: ProgressStore;
  sfx: Sfx;
}

/** Three stars, filled or hollow. */
function starRow(count: number): HTMLElement {
  const row = el('div', { class: 'stars', attrs: { 'aria-label': `${count} of 3 stars` } });
  for (let i = 0; i < 3; i++) {
    const star = el('span', { class: 'star', data: { on: String(i < count) } });
    star.textContent = i < count ? '★' : '☆';
    row.append(star);
  }
  return row;
}

function pageHead(meta: ChapterMeta, t: (text: string) => string, title: string): HTMLElement {
  return el(
    'header',
    { class: 'page-head' },
    el('p', { class: 'eyebrow' }, `Chapter ${meta.number} · ${meta.skill}`),
    el('h1', null, t(title)),
  );
}

/**
 * The video, behind a click.
 *
 * A bare iframe pulls YouTube's player, its cookies and a few hundred kilobytes onto the page
 * whether or not she ever presses play — nine times over across the course. The poster is a
 * button; the iframe only exists once she asks for it.
 */
function videoBlock(meta: ChapterMeta, t: (text: string) => string): HTMLElement | null {
  const video = meta.video;
  if (!video) return null;

  const frame = el('div', { class: 'video' });
  const poster = el(
    'button',
    { class: 'video-poster', type: 'button' },
    el('span', { class: 'video-play' }),
    el('span', null, video.title),
    el('span', { style: { opacity: '0.75', fontSize: '0.9rem' } }, video.channel),
  );

  poster.addEventListener('click', () => {
    const params = new URLSearchParams({ rel: '0', modestbranding: '1' });
    if (video.start) params.set('start', String(video.start));
    params.set('autoplay', '1');

    const iframe = el('iframe', {
      src: `https://www.youtube.com/embed/${video.id}?${params.toString()}`,
      title: video.title,
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture',
      allowFullscreen: true,
    });
    frame.replaceChildren(iframe);
  });

  frame.append(poster);

  return el(
    'section',
    { class: 'section' },
    el('h2', null, 'Watch someone do it'),
    frame,
    video.note ? el('p', { class: 'video-note' }, rich(t(video.note))) : null,
  );
}

/**
 * Everything both halves share: the `t` filler, the context, the done-stamp, and the button that
 * leaves the chapter. Built once and handed to whichever page is being drawn.
 */
function chapterShell(meta: ChapterMeta, deps: ChapterPageDeps) {
  const { player, progress, sfx } = deps;
  const t = (text: string): string => fill(text, player);

  const stampSlot = el('div');
  const next = nextChapter(meta.id);

  const nextButton = el(
    'button',
    { class: 'btn btn-go', type: 'button' },
    next ? `Next: ${t(next.title)}` : 'Back to the course',
  );
  nextButton.addEventListener('click', () => {
    sfx.play('page');
    go(next ? { name: 'chapter', id: next.id } : { name: 'home' });
  });

  /** Draw the current done-state. Called on load and again whenever she finishes. */
  function paintStamp(fresh: boolean): void {
    const row = progress.getChapter(meta.id);
    if (row.status !== 'done') {
      stampSlot.replaceChildren();
      return;
    }
    const stamp = el('span', { class: 'stamp', data: { fresh: String(fresh) } }, 'Done');
    stampSlot.replaceChildren(
      el(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' } },
        stamp,
        meta.stars ? starRow(row.stars) : null,
        meta.stars && row.bestScore !== null
          ? el(
              'span',
              { class: 'ms', style: { color: 'var(--ink-soft)' } },
              `best: ${row.bestScore} ${meta.stars.unit.replace(/ out of \d+/, '')}`,
            )
          : null,
      ),
    );
  }

  const ctx: ChapterContext = {
    player,
    meta,
    progress,
    sfx,
    t,
    finish(result?: ChapterResult) {
      const stars =
        result?.stars ??
        (result?.score !== undefined && meta.stars ? starsFor(meta, result.score) : 0);

      const patch: { status: 'done'; stars?: number; bestScore?: number } = { status: 'done' };
      if (meta.stars) patch.stars = stars;
      if (result?.score !== undefined) patch.bestScore = result.score;

      const before = progress.getChapter(meta.id);
      progress.setChapter(meta.id, patch);

      // Only celebrate a genuine change. Re-finishing a chapter she has already done should
      // stamp quietly rather than throw a fanfare every time she revisits it.
      const firstTime = before.status !== 'done';
      const improved = stars > before.stars;
      if (firstTime || improved) {
        if (meta.stars && stars > 0) sfx.playStars(stars);
        else sfx.play('stamp');
      }

      paintStamp(firstTime || improved);
      nextButton.focus();
    },
  };

  return { t, ctx, stampSlot, nextButton, paintStamp, next };
}

// --- the lesson ------------------------------------------------------------

export function renderChapter(
  mount: HTMLElement,
  meta: ChapterMeta,
  content: ChapterContent,
  deps: ChapterPageDeps,
): Mounted {
  const { progress, sfx } = deps;
  const { t, ctx, stampSlot, nextButton, paintStamp } = chapterShell(meta, deps);

  progress.startChapter(meta.id);

  let custom: Mounted | null = null;
  let voice: VoiceoverHandle | null = null;

  const page = el('article', { class: 'page wrap' });

  page.append(
    pageHead(meta, t, meta.title),
    el('p', { class: 'chapter-hook' }, rich(t(meta.hook))),
  );

  const transcript = VOICEOVER[meta.id];
  if (transcript && transcript.length > 0) {
    voice = createVoiceover({ chapterId: meta.id, transcript, t });
    page.append(voice.root);
  }

  // A chapter that renders its own body, and then genuinely owns it.
  //
  // Chapter 8's programme is not a hook-concept-video chapter, and bending the template around
  // one page would cost the other eight something. So it keeps the heading, the hook and the
  // voiceover — enough that it does not read as a different website — and everything below that
  // is its own, including its own done row. The template stops here rather than adding a second
  // copy of furniture the custom page has already drawn.
  //
  // Mounted on a microtask for the same reason the drills are: it draws track schematics, and an
  // SVG that is not yet in the document measures zero.
  if (content.custom) {
    const slot = el('div');
    page.append(slot);
    mount.replaceChildren(page);
    queueMicrotask(() => {
      custom = content.custom?.(slot, ctx) ?? null;
    });
    return {
      dispose() {
        custom?.dispose();
        voice?.dispose();
      },
    };
  }

  page.append(el('section', { class: 'section' }, content.concept(ctx)));

  const video = videoBlock(meta, t);
  if (video) page.append(video);

  // The end of the lesson. A chapter with practice sends her to it and nowhere else — that button
  // is the whole point of the page ending. A chapter without one is finished here.
  if (meta.drill) {
    const tryButton = el(
      'a',
      { class: 'btn btn-go btn-try', href: hrefFor({ name: 'try', id: meta.id }) },
      `Try it: ${meta.drill.title}`,
    );
    tryButton.addEventListener('click', () => sfx.play('page'));

    const skip = el('button', { class: 'btn btn-quiet', type: 'button' }, 'Skip the practice');
    skip.addEventListener('click', () => {
      ctx.finish();
      nextButton.click();
    });

    page.append(
      el(
        'div',
        { class: 'chapter-end' },
        stampSlot,
        tryButton,
        el('div', { class: 'chapter-end-quiet' }, skip),
      ),
    );
  } else {
    const doneButton = el('button', { class: 'btn', type: 'button' }, 'Got it');
    doneButton.addEventListener('click', () => ctx.finish());
    page.append(el('div', { class: 'chapter-end' }, stampSlot, doneButton, nextButton));
  }

  paintStamp(false);
  mount.replaceChildren(page);

  return {
    dispose() {
      custom?.dispose();
      voice?.dispose();
    },
  };
}

// --- the practice ----------------------------------------------------------

/**
 * The drill on its own page.
 *
 * Deliberately thin: a heading, one sentence, the drill, and a way onward. Anything else here
 * would be the thing this split exists to remove. The lesson is one click away and stays that
 * way, because "what was I meant to be doing" is a question this page must be able to answer
 * without her losing her place.
 */
export function renderTry(
  mount: HTMLElement,
  meta: ChapterMeta,
  content: ChapterContent,
  deps: ChapterPageDeps,
): Mounted {
  const { t, ctx, stampSlot, nextButton, paintStamp } = chapterShell(meta, deps);

  let interactive: Mounted | null = null;

  const page = el('article', { class: 'page wrap' });
  const drill = meta.drill;

  page.append(
    el(
      'header',
      { class: 'page-head' },
      el(
        'p',
        { class: 'eyebrow' },
        el(
          'a',
          { class: 'back-link', href: hrefFor({ name: 'chapter', id: meta.id }) },
          `← Chapter ${meta.number} · ${meta.skill}`,
        ),
      ),
      el('h1', null, t(drill?.title ?? 'Your turn')),
    ),
  );

  if (drill) page.append(el('p', { class: 'chapter-hook' }, rich(t(drill.blurb))));

  if (content.interactive) {
    const slot = el('div');
    page.append(el('section', { class: 'section' }, slot));
    // Mounted after the section is in the tree: drills measure their canvas on creation, and a
    // canvas that is not in the document measures zero.
    queueMicrotask(() => {
      interactive = content.interactive?.(slot, ctx) ?? null;
    });
  } else {
    page.append(
      el(
        'p',
        null,
        'This chapter has no practice page — which means the lesson was the whole of it.',
      ),
    );
  }

  // Always present, whatever the drill did. A drill she cannot beat must never be able to hold
  // her inside the course, so "move on" is on the page from the moment it loads.
  const doneButton = el('button', { class: 'btn', type: 'button' }, 'Mark this chapter done');
  doneButton.addEventListener('click', () => ctx.finish());

  page.append(el('div', { class: 'chapter-end' }, stampSlot, doneButton, nextButton));

  paintStamp(false);
  mount.replaceChildren(page);

  return {
    dispose() {
      interactive?.dispose();
    },
  };
}
