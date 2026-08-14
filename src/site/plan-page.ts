/**
 * The plan, as its own page. (`#/plan`, 2026-08-12.)
 *
 * Once the course is finished this becomes the front door — `app.ts` sends a bare URL here rather
 * than to the contents page, because after the last chapter the home page is a list of things she
 * has already read, and this is the thing she will be opening most evenings for two months.
 *
 * It is deliberately **not** a second copy of Chapter 8. Chapter 8 is the whole programme: the
 * grid, the four track deep dives, the milestone ladder, the cup argument. This page is the grid
 * and nothing else, with a short row of links to the rest of it. The difference is the difference
 * between a reference and a daily driver — and a daily driver that makes her scroll past a track
 * schematic to find tonight's job would get closed by week two.
 *
 * **The printable sheet is on this page too, as of 2026-08-13**, and until then it was not. There
 * was a "Print the sheet" button in the strip at the bottom, and what it printed was *this page* —
 * the grid and three cards — because `.plan-sheet` was built inside Chapter 8 and no other document
 * contained one. Riggs, pointing at the top of this page: "with the pdf right before it. By FAR the
 * most important detail that is missing." Two changes followed, and the second one is the one that
 * mattered:
 *
 *  - the sheet moved to `plan-sheet.ts` so both pages build the same one, and
 *  - the button moved from the bottom of the page to directly above the grid, where the thing she
 *    is being offered is the thing she is looking at.
 *
 * The heading went with it. "Right then, {name}. What are we doing tonight?" was a nice line and it
 * was two lines of furniture between the top of the window and the only thing this page is for. The
 * grid answers that question better than the sentence did, and it now starts where the sentence
 * used to.
 */

import { getChapter } from '../data/chapters';
import { SESSION_COUNT, allSessionIds } from '../data/regimen';
import { RACE_DAY_RULES, readCombo } from '../data/plan';
import type { ProgressStore } from '../store/progress';
import type { Sfx } from '../ui/sfx';
import { createPlanGrid } from '../ui/plan-grid';
import '../ui/plan.css';
import { createPlanSheet } from './plan-sheet';
import { el, rich } from './dom';
import { fill } from './player';
import { go } from './router';
import type { Mounted, Player } from './types';

export interface PlanPageDeps {
  player: Player;
  progress: ProgressStore;
  sfx: Sfx;
}

export function renderPlanPage(mount: HTMLElement, deps: PlanPageDeps): Mounted {
  const { player, progress, sfx } = deps;
  const t = (text: string): string => fill(text, player);

  const grid = createPlanGrid({
    progress,
    t,
    chapterTitle: (id) => getChapter(id)?.skill ?? 'the chapter',
    onOpenChapter: (id) => {
      sfx.play('page');
      go({ name: 'chapter', id });
    },
  });

  const done = progress.countChecked(allSessionIds());

  const toPlanChapter = el('button', { class: 'btn btn-quiet', type: 'button' }, 'The full plan');
  toPlanChapter.addEventListener('click', () => {
    sfx.play('page');
    go({ name: 'chapter', id: 'ch8' });
  });

  const toCourse = el('button', { class: 'btn btn-quiet', type: 'button' }, 'The nine chapters');
  toCourse.addEventListener('click', () => {
    sfx.play('page');
    go({ name: 'home' });
  });

  // The primary control on the page, and the only one drawn as one. Everything else here is a
  // link to somewhere else; this is the thing she is meant to do with the page on day one.
  const printButton = el(
    'button',
    { class: 'btn btn-go', type: 'button' },
    'Print it for the fridge',
  );
  printButton.addEventListener('click', () => window.print());

  const sheet = createPlanSheet({ t, progress, title: t('The {rival} Plan') });

  const { combo } = readCombo();

  const screen = el(
    'div',
    { class: 'plan-screen' },
    // One compact row instead of a heading block: who this is, how far in she is, and the button.
    // The grid starts immediately under it, which is the whole point of the page.
    el(
      'div',
      { class: 'plan-page-bar' },
      el(
        'div',
        null,
        el('p', { class: 'eyebrow', style: { margin: '0' } }, t('The {rival} Plan')),
        el(
          'p',
          { class: 'ms plan-page-count' },
          done >= SESSION_COUNT
            ? t('All forty done. Go and race {rival}.')
            : `${done} of ${SESSION_COUNT} sessions done`,
        ),
      ),
      el(
        'div',
        { class: 'plan-page-print' },
        printButton,
        // Said in words because "print" and "PDF" are the same button and only one of them is
        // written on it, and she is as likely to want it on a phone as on the fridge.
        el(
          'p',
          null,
          'Four pages or so: the forty boxes with what to think about in each, the fundamentals, all four tracks, the ladder and the race-day card. Choose “Save as PDF” to keep it on your phone.',
        ),
      ),
    ),

    grid.root,

    el(
      'section',
      { class: 'plan-strip' },
      el(
        'div',
        { class: 'plan-strip-card' },
        el('p', { class: 'eyebrow' }, 'Your kart'),
        el('p', null, `${combo.character} · ${combo.kart}`),
        el('p', { class: 'ms' }, `${combo.tyres} · ${combo.glider}`),
      ),
      el(
        'div',
        { class: 'plan-strip-card' },
        el('p', { class: 'eyebrow' }, 'If you remember one thing'),
        el('p', null, rich(t(RACE_DAY_RULES[0] ?? ''))),
      ),
      el(
        'div',
        { class: 'plan-strip-card' },
        el('p', { class: 'eyebrow' }, 'The rest of it'),
        el('div', { class: 'plan-strip-links' }, toPlanChapter, toCourse),
      ),
    ),
  );

  const page = el('article', { class: 'page wrap plan-page' }, screen, sheet.root);

  mount.replaceChildren(page);

  // The sheet's milestone ticks come from the store, so they follow a tick made on another device
  // in exactly the way Chapter 8's do.
  const unsubscribe = progress.subscribe(() => sheet.paint());

  return {
    dispose() {
      unsubscribe();
      grid.dispose();
      page.remove();
    },
  };
}
