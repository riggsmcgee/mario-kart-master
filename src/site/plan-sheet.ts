/**
 * The plan, on paper. (4d1, lifted out of `ch8.ts` on 2026-08-13.)
 *
 * Hidden on screen and the only thing that is not hidden on paper: the same data as the chapter,
 * ruthlessly compressed. No explanations, no video, no schematics — the things she needs at arm's
 * length while holding a Joy-Con, and nothing she would only read sitting down.
 *
 * **It lives here rather than in Chapter 8 because two pages print it.** Chapter 8 is the
 * reference; `#/plan` is the page she opens every evening, and until 2026-08-13 its "Print the
 * sheet" button printed the page it was on — the grid and a strip of links — because the sheet
 * simply was not in that document. Riggs, pointing at the top of the plan page: "with the pdf right
 * before it. By FAR the most important detail that is missing." One builder, both pages, and the
 * thing the button promises is the thing that comes out of the printer.
 *
 * **The forty boxes print empty**, deliberately, and that is the one place this disagrees with the
 * screen. The sheet goes on the fridge on day one and stays there for two months, so it has to be a
 * blank wall chart; a snapshot of her ticks as of the afternoon she printed it would be out of date
 * by that evening and wrong for the rest of its life. The *other* ticks — the cup-training list and
 * the ladder — do mirror the store, because those are milestones rather than a daily rhythm and
 * seeing them already crossed off is the point of printing them at all.
 */

import {
  CUP_TRAINING,
  FUNDAMENTALS,
  MILESTONES,
  RACE_DAY_RULES,
  RHYTHM,
  readCombo,
} from '../data/plan';
import type { PlanItem } from '../data/plan';
import { WEEKS } from '../data/regimen';
import { CUP, TRACKS } from '../data/tracks';
import type { ProgressStore } from '../backend/progress';
import { PIN_KIND_LABEL } from '../ui/track-map';
import { el, rich } from './dom';

export interface PlanSheetOptions {
  /** Fills `{name}` and `{rival}`. */
  t: (text: string) => string;
  progress: ProgressStore;
  /** The heading at the top of the printout. The chapter's own title, filled. */
  title: string;
}

export interface PlanSheet {
  root: HTMLElement;
  /** Re-read the ticked milestones from the store. Cheap; call it whenever progress changes. */
  paint(): void;
}

export function createPlanSheet(options: PlanSheetOptions): PlanSheet {
  const { t, progress, title } = options;
  const choice = readCombo();
  const ticks = new Map<string, HTMLElement>();

  /** A box and a label, without the `<li>` around them, so a rung can add lines underneath. */
  function tickAnd(id: string, text: string): Node[] {
    const tick = el('span', { class: 'sheet-tick' }, progress.isChecked(id) ? '☑' : '☐');
    ticks.set(id, tick);
    return [tick, document.createTextNode(' '), rich(t(text))];
  }

  function sheetLine(item: PlanItem): HTMLLIElement {
    return el('li', null, ...tickAnd(item.id, item.text));
  }

  const root = el(
    'div',
    { class: 'plan-sheet' },
    el(
      'header',
      { class: 'sheet-head' },
      el('h1', null, t(title)),
      el(
        'p',
        null,
        t(
          `${CUP.name} · ${CUP.cc} · ${choice.combo.character}, ${choice.combo.kart}, ${choice.combo.tyres}, ${choice.combo.glider}`,
        ),
      ),
    ),
    // The grid, as a table she can fill in with a pen.
    //
    // The boxes print empty rather than mirroring what she has ticked on screen, and that is a
    // decision rather than an oversight: this sheet goes on the fridge on day one and stays
    // there for two months, so it has to be a *blank* wall chart. A snapshot of her ticks as of
    // the afternoon she printed it would be out of date by that evening and wrong for the rest
    // of its life.
    el(
      'section',
      { class: 'sheet-block sheet-block-grid' },
      el('h2', null, `The programme — ${RHYTHM.sessions}, ${RHYTHM.length}`),
      // How to use the grid, which the screen says above it and the paper did not say at all —
      // and the paper is the copy that gets read in week five by somebody who has forgotten.
      el(
        'ul',
        { class: 'sheet-rules' },
        ...RHYTHM.lines.map((line) => el('li', null, rich(t(line)))),
      ),
      el(
        'table',
        { class: 'sheet-grid' },
        el(
          'tbody',
          null,
          ...WEEKS.map((week) =>
            el(
              'tr',
              null,
              el(
                'th',
                { attrs: { scope: 'row' } },
                el('span', { class: 'sheet-grid-no' }, String(week.number)),
                ' ',
                week.title,
              ),
              ...week.sessions.map((item) =>
                el(
                  'td',
                  null,
                  el('span', { class: 'sheet-tick' }, '☐'),
                  ' ',
                  el('span', { class: 'sheet-grid-label' }, t(item.label)),
                  // Volume and track, because on paper there is no panel to open — the cell has
                  // to carry enough that she could work tonight off the fridge alone.
                  el('span', { class: 'sheet-grid-track' }, `${item.reps} · ${item.track}`),
                  // And the focus, which *is* the session. The label names the drill and the
                  // reps say how much; without this line the fridge copy of a session says
                  // "Starts · Five races · Stadium" and never says what to think about while
                  // doing them, which is the only part she cannot reconstruct from memory.
                  el('span', { class: 'sheet-grid-focus' }, rich(t(item.focus))),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    el(
      'section',
      { class: 'sheet-block' },
      el('h2', null, 'The fundamentals'),
      el(
        'ul',
        { class: 'sheet-rules' },
        ...FUNDAMENTALS.map((item) =>
          el('li', null, el('strong', null, `${item.skill}. `), rich(t(item.rule))),
        ),
      ),
    ),
    // The cup guide, in words. (Riggs, 2026-08-13: "make sure all relevant info is captured on
    // the pdf, even if it takes up more than one page.")
    //
    // This was the one thing on screen that never reached the paper, and it is the material she
    // most needs at arm's length: where the pads are, where the coins are, the hazard that
    // actually matters, and how to drive each section. On screen it is four cards with tabs and a
    // schematic each; on paper the schematics go — a diagram whose whole trick is that it is not
    // to scale does not survive being printed small and grey — and the callouts they were
    // labelling become the list they always were underneath.
    //
    // It costs pages, and pages were explicitly authorised. The sheet was one; it is now three or
    // four, which is the correct trade for the thing that goes on the fridge for two months.
    el(
      'section',
      { class: 'sheet-block sheet-block-tracks' },
      el('h2', null, `The ${CUP.name}, track by track`),
      ...TRACKS.map((track) =>
        el(
          'div',
          { class: 'sheet-track' },
          el('h3', null, `${track.order}. ${track.name}`),
          el('p', { class: 'sheet-track-blurb' }, rich(t(track.blurb))),
          el(
            'ul',
            { class: 'sheet-list' },
            ...track.callouts.map((callout) =>
              el(
                'li',
                null,
                el('strong', null, `${PIN_KIND_LABEL[callout.kind]} — `),
                // The label carries its own second line for the schematic's pin; on paper the
                // note says the same thing at length, so only the first line is worth the ink.
                el('em', null, `${callout.label.split('\n')[0] ?? ''}. `),
                rich(t(callout.note)),
              ),
            ),
          ),
          el('h4', null, 'How to drive it'),
          el(
            'ul',
            { class: 'sheet-list' },
            ...track.deep.line.map((section) =>
              el(
                'li',
                null,
                el('strong', null, `${t(section.section)} — `),
                rich(t(section.drive)),
              ),
            ),
          ),
          el('h4', null, 'In your way'),
          el(
            'ul',
            { class: 'sheet-list' },
            ...track.deep.hazards.map((line) => el('li', null, rich(t(line)))),
          ),
          el('h4', null, 'Time Trial here'),
          el(
            'ul',
            { class: 'sheet-list' },
            ...track.deep.timeTrial.map((line) => el('li', null, rich(t(line)))),
          ),
        ),
      ),
    ),
    el(
      'section',
      { class: 'sheet-block' },
      el('h2', null, `Own the cup — ${CUP_TRAINING.headline}`),
      ...CUP_TRAINING.stages.map((stage) =>
        el(
          'div',
          { class: 'sheet-drill' },
          el('h3', null, `${t(stage.title)} — ${t(stage.goal)}`),
          el('ul', { class: 'sheet-list' }, ...stage.items.map((item) => sheetLine(item))),
        ),
      ),
    ),
    el(
      'section',
      { class: 'sheet-block' },
      el('h2', null, 'The ladder'),
      el(
        'ol',
        { class: 'sheet-ladder' },
        /**
         * The ladder's rungs are milestones rather than plan items, but on paper a rung is just
         * another thing with a box next to it.
         *
         * It used to be the title alone, which on the fridge is five bare phrases — "take one race
         * off Kayla" with nothing saying what that means or where to go when it will not come. The
         * blurb and the revisit are both one line each and both are the reason the rung is there.
         */
        ...MILESTONES.map((milestone) =>
          el(
            'li',
            null,
            ...tickAnd(milestone.id, milestone.title),
            el('span', { class: 'sheet-rung-note' }, rich(t(milestone.blurb))),
            el('span', { class: 'sheet-rung-note' }, rich(t(`**Stuck?** ${milestone.revisitWhy}`))),
          ),
        ),
      ),
    ),
    el(
      'section',
      { class: 'sheet-block' },
      el('h2', null, 'Race day'),
      el(
        'ul',
        { class: 'sheet-rules' },
        ...RACE_DAY_RULES.map((rule) => el('li', null, rich(t(rule)))),
      ),
    ),
  );

  return {
    root,
    paint() {
      for (const [id, tick] of ticks) tick.textContent = progress.isChecked(id) ? '☑' : '☐';
    },
  };
}
