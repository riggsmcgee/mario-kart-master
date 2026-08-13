/**
 * The home page. (2a1)
 *
 * Its whole job is to answer one question — *where was I?* — and then get out of the way. The
 * lap map is the answer, and the primary button under it is "carry on from here", pointed at the
 * first chapter she has not finished. There is no dashboard, no stats page, no streak.
 *
 * The chapter list below the map is not decoration and it is not a fallback: it is the complete,
 * accessible route to every chapter, and it says everything the map says in words (3e1). The map
 * is allowed to be the delightful way in precisely because it is never the only way in.
 */

import { CHAPTERS, type ChapterMeta } from '../data/chapters';
import type { ProgressStore } from '../backend/progress';
import type { ChapterStatus } from '../backend/schema';
import { turboJodi } from '../ui/mascot';
import { el, rich } from './dom';
import { createLapMap } from './lap-map';
import { fill } from './player';
import { go } from './router';
import type { Mounted, Player } from './types';

export interface HomeDeps {
  player: Player;
  progress: ProgressStore;
  locked: boolean;
}

/** The chapter to point her at: the first one not finished, or the last if she is done. */
export function resumeChapter(progress: ProgressStore): ChapterMeta {
  const next = CHAPTERS.find((chapter) => progress.getChapter(chapter.id).status !== 'done');
  return next ?? CHAPTERS[CHAPTERS.length - 1] ?? CHAPTERS[0]!;
}

export function renderHome(mount: HTMLElement, deps: HomeDeps): Mounted {
  const { player, progress, locked } = deps;
  const t = (text: string): string => fill(text, player);

  const page = el('div', { class: `page wrap${locked ? ' locked' : ''}` });

  const map = createLapMap({
    onPick: locked ? undefined : (chapter) => go({ name: 'chapter', id: chapter.id }),
  });

  const resume = resumeChapter(progress);
  const started = CHAPTERS.some((c) => progress.getChapter(c.id).status !== 'not_started');
  const doneCount = CHAPTERS.filter((c) => progress.getChapter(c.id).status === 'done').length;

  const cta = el(
    'button',
    { class: 'btn btn-go', type: 'button' },
    started ? `Carry on: ${t(resume.title)}` : "Start here — let's go",
  );
  cta.addEventListener('click', () => go({ name: 'chapter', id: resume.id }));
  cta.disabled = locked;

  const progressLine = el(
    'p',
    { class: 'eyebrow', style: { marginTop: '1rem' } },
    doneCount === 0
      ? `${CHAPTERS.length} chapters · about an hour · most of the work happens on the Switch`
      : doneCount === CHAPTERS.length
        ? 'Every chapter done. Go and win something.'
        : `${doneCount} of ${CHAPTERS.length} chapters done`,
  );

  page.append(
    el(
      'header',
      { class: 'page-head hero' },
      el(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' } },
        turboJodi({ size: 56, motion: true, title: 'Turbo Jodi, the site mascot' }),
        el('p', { class: 'eyebrow', style: { margin: '0' } }, 'A present, with homework'),
      ),
      el('h1', null, t('So you want to beat {rival} at Mario Kart?')),
      el(
        'p',
        { class: 'hero-lede' },
        rich(
          // Reframed 2026-08-13, in step with Chapter 0: the gap is hours and a handful of
          // unmentioned facts, not reaction time. See `chapters/ch0.ts`.
          t(
            "She knows a handful of things about this game that nobody ever mentioned to you. That's the whole gap — and it's a short list.",
          ),
        ),
      ),
      cta,
      progressLine,
    ),
  );

  page.append(map.root);

  const unsubscribe = progress.subscribe(() => {
    const statuses: Record<string, ChapterStatus> = {};
    for (const chapter of CHAPTERS) statuses[chapter.id] = progress.getChapter(chapter.id).status;
    map.update(statuses, resumeChapter(progress).id);
  });

  mount.replaceChildren(page);
  // The map measures its own path, which needs layout — so the first update runs after the page
  // is in the document, not while it is being assembled.
  requestAnimationFrame(() => {
    const statuses: Record<string, ChapterStatus> = {};
    for (const chapter of CHAPTERS) statuses[chapter.id] = progress.getChapter(chapter.id).status;
    map.update(statuses, resumeChapter(progress).id);
  });

  return {
    dispose() {
      unsubscribe();
      map.dispose();
    },
  };
}
