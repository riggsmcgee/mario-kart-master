/**
 * The plan, as its own page. (`#/plan`, 2026-08-12.)
 *
 * Once the course is finished this becomes the front door — `app.ts` sends a bare URL here rather
 * than to the contents page, because after the last chapter the home page is a list of things she
 * has already read, and this is the thing she will be opening most evenings for two months.
 *
 * It is deliberately **not** a second copy of Chapter 8. Chapter 8 is the whole programme: the
 * grid, the four track deep dives, the milestone ladder, the cup argument, the printable sheet.
 * This page is the grid and nothing else, with a short row of links to the rest of it. The
 * difference is the difference between a reference and a daily driver — and a daily driver that
 * makes her scroll past a track schematic to find tonight's job would get closed by week two.
 */

import { getChapter } from '../data/chapters';
import { SESSION_COUNT, allSessionIds } from '../data/regimen';
import { RACE_DAY_RULES, readCombo } from '../data/plan';
import type { ProgressStore } from '../backend/progress';
import type { Sfx } from '../ui/sfx';
import { createPlanGrid } from '../ui/plan-grid';
import '../ui/plan.css';
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

  const printButton = el('button', { class: 'btn btn-quiet', type: 'button' }, 'Print the sheet');
  printButton.addEventListener('click', () => window.print());

  const { combo } = readCombo();

  const page = el(
    'article',
    { class: 'page wrap plan-page' },
    el(
      'header',
      { class: 'page-head plan-page-head' },
      el('p', { class: 'eyebrow' }, t('The {rival} Plan')),
      el(
        'h1',
        null,
        done >= SESSION_COUNT
          ? t('You have done all forty. Go and race {rival}.')
          : t('Right then, {name}. What are we doing tonight?'),
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
        el('div', { class: 'plan-strip-links' }, toPlanChapter, toCourse, printButton),
      ),
    ),
  );

  mount.replaceChildren(page);

  return {
    dispose() {
      grid.dispose();
      page.remove();
    },
  };
}
