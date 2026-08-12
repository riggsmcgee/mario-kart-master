/**
 * The session grid. (4b2, built 2026-08-12 from Riggs's sketch.)
 *
 * Forty boxes and one detail panel, side by side, sized to sit on one screen without scrolling.
 * The sketch he drew is a plain table with a "skill / exercise" column and a note asking whether
 * a session should name a track; both answers are yes, and both are in here.
 *
 * **The grid is the primary object on the page, and the panel serves it.** Not the other way
 * round. She opens this most evenings for two months, and the question is always the same one —
 * what am I doing tonight — so the answer has to be visible without a click. On load the panel
 * selects the first unticked session, which is the honest definition of "next" even when she has
 * skipped one: the sessions build, and a skipped box is usually a skipped box because it was
 * hard.
 *
 * **Ticking and selecting are different gestures on purpose.** Clicking a cell reads it; clicking
 * its box completes it. Conflating them would mean she cannot look ahead at week six without
 * marking week six done, and looking ahead is most of what a plan is for. The tick is therefore
 * its own control with its own hit area, and the cell around it is a button that only ever
 * changes what the panel is showing.
 *
 * **Every tick goes through `ProgressStore`**, so it is local-first, survives a dead wifi, and
 * turns up on the iPad later. The grid repaints from a store subscription rather than from the
 * click that caused it — which is what makes a tick made on her phone appear here without a
 * refresh, and costs nothing to get right at this size.
 */

import type { ProgressStore } from '../backend/progress';
import { WEEKS, nextSession, shortTrack, type Session } from '../data/regimen';
import { el, rich } from '../site/dom';
import type { Mounted } from '../site/types';

export interface PlanGridOptions {
  progress: ProgressStore;
  /** Fills `{name}` / `{rival}`. */
  t: (text: string) => string;
  /** Open the chapter that taught this session. */
  onOpenChapter: (chapterId: string) => void;
  /** Chapter title for a link label, so the grid does not have to import the chapter list. */
  chapterTitle: (chapterId: string) => string;
}

export interface PlanGrid extends Mounted {
  root: HTMLElement;
}

const DAY_LABELS = ['1', '2', '3', '4', '5'];

export function createPlanGrid(options: PlanGridOptions): PlanGrid {
  const { progress, t, onOpenChapter, chapterTitle } = options;

  /** Cell chrome by session id, so a repaint does not rebuild the grid. */
  const cells = new Map<string, { button: HTMLElement; box: HTMLInputElement }>();
  let selected: Session | null = null;

  // --- the panel -----------------------------------------------------------

  const panelEyebrow = el('p', { class: 'eyebrow' }, '');
  const panelTitle = el('h3', { class: 'session-title' }, '');
  const panelJob = el('p', { class: 'session-job' }, '');
  const panelWhy = el('p', { class: 'session-why' }, '');
  const panelTrack = el('span', { class: 'session-chip' }, '');
  const panelMode = el('span', { class: 'session-chip session-chip-mode' }, '');

  const panelChapter = el('button', { class: 'btn btn-quiet session-link', type: 'button' }, '');
  panelChapter.addEventListener('click', () => {
    if (selected) onOpenChapter(selected.chapterId);
  });

  const panelDone = el('button', { class: 'btn btn-go session-done', type: 'button' }, '');
  panelDone.addEventListener('click', () => {
    if (!selected) return;
    progress.toggleCheck(selected.id);
    // Ticking the panel's session moves her on, because the next thing she wants after finishing
    // tonight is to see tonight-plus-one — not to stare at a box she has just filled in.
    const next = nextSession((id) => progress.isChecked(id));
    if (next) select(next);
    else paint();
  });

  const panel = el(
    'aside',
    { class: 'session-panel', attrs: { 'aria-live': 'polite' } },
    panelEyebrow,
    panelTitle,
    el('div', { class: 'session-chips' }, panelTrack, panelMode),
    panelJob,
    panelWhy,
    el('div', { class: 'session-actions' }, panelDone, panelChapter),
  );

  // --- the grid ------------------------------------------------------------

  const board = el('div', { class: 'grid-board' });

  board.append(el('div', { class: 'grid-corner' }, 'Week'));
  for (const label of DAY_LABELS) {
    board.append(el('div', { class: 'grid-day' }, label));
  }

  for (const week of WEEKS) {
    board.append(
      el(
        'div',
        { class: 'grid-week', attrs: { title: week.goal } },
        el('span', { class: 'grid-week-no' }, String(week.number)),
        el('span', { class: 'grid-week-name' }, week.title),
      ),
    );

    for (const item of week.sessions) {
      const box = el('input', {
        type: 'checkbox',
        class: 'grid-tick',
        attrs: { 'aria-label': `Session ${item.week}.${item.day}: ${t(item.label)}` },
      });
      box.addEventListener('change', () => {
        progress.setCheck(item.id, box.checked);
        paint();
      });
      // Without this the click bubbles to the cell button underneath and selects as well as
      // ticks, which reads as the tick having navigated somewhere.
      box.addEventListener('click', (event) => event.stopPropagation());

      const button = el(
        'button',
        { class: 'grid-cell', type: 'button' },
        el('span', { class: 'grid-cell-label' }, t(item.label)),
        el('span', { class: 'grid-cell-track' }, shortTrack(item.track)),
      );
      button.addEventListener('click', () => select(item));

      const wrap = el('div', { class: 'grid-cell-wrap' }, button, box);
      board.append(wrap);
      cells.set(item.id, { button, box });
    }
  }

  const counter = el('p', { class: 'grid-count ms' }, '');

  const root = el(
    'div',
    { class: 'session-grid' },
    el(
      'div',
      { class: 'grid-side' },
      el('div', { class: 'grid-head' }, el('h2', null, 'Forty sessions'), counter),
      board,
    ),
    panel,
  );

  // --- painting ------------------------------------------------------------

  function select(item: Session): void {
    selected = item;
    paint();
  }

  function paint(): void {
    let done = 0;

    for (const week of WEEKS) {
      for (const item of week.sessions) {
        const cell = cells.get(item.id);
        if (!cell) continue;
        const checked = progress.isChecked(item.id);
        if (checked) done++;
        cell.box.checked = checked;
        cell.button.dataset['done'] = String(checked);
        cell.button.dataset['selected'] = String(selected?.id === item.id);
      }
    }

    counter.textContent = `${done} of 40 done`;

    if (!selected) {
      panelEyebrow.textContent = 'The programme';
      panelTitle.textContent = 'Pick a session';
      panelJob.textContent = 'Every box is one evening, fifteen to twenty minutes. Start at 1.1.';
      panelWhy.textContent = '';
      panelTrack.hidden = true;
      panelMode.hidden = true;
      panelDone.hidden = true;
      panelChapter.hidden = true;
      return;
    }

    const item = selected;
    const checked = progress.isChecked(item.id);
    const isNext = nextSession((id) => progress.isChecked(id))?.id === item.id;

    panelEyebrow.textContent = isNext
      ? `Tonight · week ${item.week}, session ${item.day}`
      : `Week ${item.week}, session ${item.day}`;
    panelTitle.textContent = t(item.label);
    panelTrack.hidden = false;
    panelMode.hidden = false;
    panelTrack.textContent = item.track;
    panelMode.textContent = item.mode;
    panelJob.replaceChildren(rich(t(item.job)));
    panelWhy.replaceChildren(rich(t(item.why)));
    panelDone.hidden = false;
    panelDone.textContent = checked ? 'Undo this one' : 'Done — tick it off';
    panelChapter.hidden = false;
    panelChapter.textContent = `Read ${t(chapterTitle(item.chapterId))} again`;
  }

  // Open on the first unticked box. On a fresh plan that is session 1.1; on a returning visit it
  // is exactly the thing she came back for.
  const first = nextSession((id) => progress.isChecked(id));
  if (first) selected = first;
  paint();

  const unsubscribe = progress.subscribe(() => paint());

  return {
    root,
    dispose() {
      unsubscribe();
      root.remove();
    },
  };
}
