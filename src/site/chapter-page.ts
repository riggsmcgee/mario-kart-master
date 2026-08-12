/**
 * The chapter template. (2a2)
 *
 * Every chapter runs the same order, set by the plan: hook → concept → video → interactive →
 * "On the Switch" card → done stamp. The order is not negotiable per chapter and that is the
 * point — nine pages that each rearranged themselves would make her re-learn the page every
 * time, and the one thing a linear course must never do is surprise you with its own shape.
 *
 * Chapters supply the middle (`concept`, and optionally `interactive`). Everything else —
 * heading, hook, voiceover, video, Switch card, stamping, what "done" means, where the next
 * button goes — lives here exactly once.
 *
 * Two behaviours worth knowing about:
 *
 *  - **Finishing is generous.** A chapter with a drill is done when the drill says so; a chapter
 *    without one is done when she presses the button. Nothing is ever locked behind a score,
 *    because the plan's rule is that every interactive ends on a win.
 *  - **The voiceover stops when a drill starts.** Riggs talking over the top of a timing game
 *    is the sort of thing nobody notices in review and everybody notices in use.
 */

import type { ChapterMeta } from '../data/chapters';
import { nextChapter, starsFor } from '../data/chapters';
import type { ProgressStore } from '../backend/progress';
import type { Sfx } from '../ui/sfx';
import { createVoiceover, type VoiceoverHandle } from '../ui/voiceover';
import { VOICEOVER } from '../data/voiceover';
import { el, rich } from './dom';
import { fill } from './player';
import { go } from './router';
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

function switchCard(meta: ChapterMeta, t: (text: string) => string): HTMLElement | null {
  const card = meta.onSwitch;
  if (!card) return null;

  return el(
    'section',
    { class: 'section' },
    el(
      'div',
      { class: 'switch-card' },
      el('p', { class: 'eyebrow' }, 'Take this to the Switch'),
      el('h3', null, t(card.title)),
      card.rule ? el('p', null, el('strong', null, t(card.rule))) : null,
      el('ol', null, ...card.steps.map((step) => el('li', null, rich(t(step))))),
    ),
  );
}

export function renderChapter(
  mount: HTMLElement,
  meta: ChapterMeta,
  content: ChapterContent,
  deps: ChapterPageDeps,
): Mounted {
  const { player, progress, sfx } = deps;
  const t = (text: string): string => fill(text, player);

  progress.startChapter(meta.id);

  let interactive: Mounted | null = null;
  let custom: Mounted | null = null;
  let voice: VoiceoverHandle | null = null;

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

  // --- build the page -------------------------------------------------------

  const page = el('article', { class: 'page wrap' });

  page.append(
    el(
      'header',
      { class: 'page-head' },
      el('p', { class: 'eyebrow' }, `Chapter ${meta.number} · ${meta.skill}`),
      el('h1', null, t(meta.title)),
    ),
    el('p', { class: 'chapter-hook' }, rich(t(meta.hook))),
  );

  const transcript = VOICEOVER[meta.id];
  if (transcript && transcript.length > 0) {
    voice = createVoiceover({ chapterId: meta.id, transcript, t });
    page.append(voice.root);
  }

  // A chapter that renders its own body, and then genuinely owns it.
  //
  // Chapter 8's programme is not a hook-concept-video-drill chapter, and bending the template
  // around one page would cost the other eight something. So it keeps the heading, the hook and
  // the voiceover — enough that it does not read as a different website — and everything below
  // that is its own, including its own done row. The template stops here rather than adding a
  // second copy of furniture the custom page has already drawn.
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

  if (content.interactive) {
    const slot = el('div');
    page.append(el('section', { class: 'section' }, el('h2', null, 'Your turn'), slot));
    // Mounted after the section is in the tree: drills measure their canvas on creation, and a
    // canvas that is not in the document measures zero.
    queueMicrotask(() => {
      voice?.pause();
      interactive = content.interactive?.(slot, ctx) ?? null;
    });
  }

  const card = switchCard(meta, t);
  if (card) page.append(card);

  // Chapters with no drill need a way to say "understood". Chapters with one still get the
  // button, because a drill she cannot finish must never be able to trap her in the course.
  const doneButton = el(
    'button',
    { class: 'btn', type: 'button' },
    content.interactive ? 'Mark this chapter done' : 'Got it',
  );
  doneButton.addEventListener('click', () => ctx.finish());

  page.append(el('div', { class: 'chapter-end' }, stampSlot, doneButton, nextButton));

  paintStamp(false);
  mount.replaceChildren(page);

  return {
    dispose() {
      interactive?.dispose();
      custom?.dispose();
      voice?.dispose();
    },
  };
}
