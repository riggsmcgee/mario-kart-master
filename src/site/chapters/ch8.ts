/**
 * Chapter 8 — the plan. (4d1, rendering 4b1 + 4c1 + 4c2)
 *
 * The only chapter that replaces the standard template, and the only one that is not really a
 * chapter. Everything before this teaches something in a browser; this hands her the thing she
 * takes away, and it is judged by a different question: *after she closes the laptop, is she
 * still holding it?*
 *
 * That question decides most of what is odd about this file.
 *
 * **Two renderings, one source.** The page is built twice from `data/plan.ts` — once as the
 * interactive version and once as a dense sheet that only exists on paper. Duplicating the words
 * into a hand-written print block would have been faster and would have gone stale the first time
 * anybody edited a line, which is the exact failure that gets discovered by finding the wrong
 * version on somebody's fridge.
 *
 * **Ticking is the whole interaction, so ticking has to be trustworthy.** Boxes write straight
 * through `ProgressStore` (1f3), which means local first and synced when it can be — she can tick
 * a box on the sofa with the wifi off and find it ticked on the iPad a week later. The counter
 * repaints from the store rather than from the click, so a tick arriving from another device
 * updates this page without anybody asking it to.
 *
 * **The deep dives are visible but labelled, not hidden.** Week three is a *schedule*, not a
 * lock. Hiding them would say "you are not ready"; a tab that says "come back to this in week 3"
 * says "this is here when you are", and she can ignore the advice, which she should be allowed to
 * do — it is her plan.
 */

import '../../ui/plan.css';

import { getChapter } from '../../data/chapters';
import type { VideoRef } from '../../data/chapters';
import {
  CUP_STEERING,
  CUP_TRAINING,
  MILESTONES,
  RACE_DAY_RULES,
  RHYTHM,
  SKILL_DRILLS,
  allCheckIds,
  readCombo,
} from '../../data/plan';
import type { PlanItem, SkillDrill } from '../../data/plan';
import { CUP, NOT_FOR_YOU_INTRO, TRACKS } from '../../data/tracks';
import type { MushroomTrack } from '../../data/tracks';
import { PIN_KIND_LABEL, createTrackMap } from '../../ui/track-map';
import type { TrackMap } from '../../ui/track-map';
import { el, prose, rich } from '../dom';
import { go } from '../router';
import type { ChapterContent, ChapterContext, Mounted } from '../types';

type Fill = (text: string) => string;

/** The lede. Also the `concept` the contract asks every chapter for. */
function lede(t: Fill): Node {
  return prose([
    'Everything up to here was the classroom. This is the part you keep.',
    'Below: what to practise and how often, the one cup you are going to know better than anybody in your house, a map of all four of its tracks, and a ladder of things to beat — ending with the only one that counts.',
    t(
      'Tick the boxes as you go. They save themselves, on every device you own, whether or not the wifi is behaving. And there is a **Print** button, because this belongs on the fridge, not in a tab you will lose by Thursday.',
    ),
  ]);
}

/** The video, behind a click — same deal as the chapter template: no iframe until she asks. */
function videoBlock(video: VideoRef, t: Fill): HTMLElement {
  const frame = el('div', { class: 'video' });
  const poster = el(
    'button',
    { class: 'video-poster', type: 'button' },
    el('span', { class: 'video-play' }),
    el('span', null, video.title),
    el('span', { style: { opacity: '0.75', fontSize: '0.9rem' } }, video.channel),
  );

  poster.addEventListener('click', () => {
    const params = new URLSearchParams({ rel: '0', modestbranding: '1', autoplay: '1' });
    if (video.start) params.set('start', String(video.start));
    frame.replaceChildren(
      el('iframe', {
        src: `https://www.youtube.com/embed/${video.id}?${params.toString()}`,
        title: video.title,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture',
        allowFullscreen: true,
      }),
    );
  });

  frame.append(poster);
  return el(
    'div',
    { class: 'plan-video' },
    frame,
    video.note ? el('p', { class: 'video-note' }, rich(t(video.note))) : null,
  );
}

const content: ChapterContent = {
  concept(ctx: ChapterContext): Node {
    return lede((text) => ctx.t(text));
  },

  custom(mount: HTMLElement, ctx: ChapterContext): Mounted {
    const t: Fill = (text) => ctx.t(text);

    const checkIds = allCheckIds();
    const boxes = new Map<string, HTMLInputElement>();
    const sheetTicks = new Map<string, HTMLElement>();
    const maps: TrackMap[] = [];

    // --- the tickable line, in both renderings -------------------------------

    function check(item: PlanItem): HTMLLIElement {
      const inputId = `chk-${item.id}`;
      const box = el('input', {
        type: 'checkbox',
        class: 'plan-box',
        id: inputId,
        checked: ctx.progress.isChecked(item.id),
      });

      box.addEventListener('change', () => {
        ctx.progress.setCheck(item.id, box.checked);
        // Only the tick makes a sound. Unticking is a correction, and a correction that
        // celebrates itself is a correction that feels like a telling-off.
        if (box.checked) ctx.sfx.play('stamp');
        paint();
      });
      boxes.set(item.id, box);

      return el(
        'li',
        { class: 'plan-item' },
        box,
        el(
          'label',
          { class: 'plan-item-text', attrs: { for: inputId } },
          rich(t(item.text)),
          item.detail ? el('span', { class: 'plan-item-detail' }, rich(t(item.detail))) : null,
        ),
      );
    }

    function checkList(items: readonly PlanItem[]): HTMLUListElement {
      return el('ul', { class: 'plan-checks' }, ...items.map((item) => check(item)));
    }

    function sheetLine(item: PlanItem): HTMLLIElement {
      const tick = el('span', { class: 'sheet-tick' }, ctx.progress.isChecked(item.id) ? '☑' : '☐');
      sheetTicks.set(item.id, tick);
      return el('li', null, tick, ' ', rich(t(item.text)));
    }

    // --- section 1: the week -------------------------------------------------

    const rhythm = el(
      'section',
      { class: 'card plan-card' },
      el('p', { class: 'eyebrow' }, 'The rhythm'),
      el('h2', null, `${RHYTHM.sessions}, ${RHYTHM.length}`),
      prose(RHYTHM.lines.map((line) => t(line))),
      checkList(RHYTHM.items),
    );

    // --- section 2: what to practise ----------------------------------------

    function drillCard(drill: SkillDrill): HTMLElement {
      const meta = getChapter(drill.chapterId);
      const card = el(
        'section',
        { class: 'card plan-card plan-drill' },
        el(
          'p',
          { class: 'eyebrow' },
          meta ? `Chapter ${meta.number} · ${drill.skill}` : drill.skill,
        ),
        el('p', { class: 'plan-rule' }, rich(t(drill.rule))),
        checkList(drill.items),
      );

      if (meta) {
        const link = el(
          'a',
          { class: 'plan-back-link', href: `#/chapter/${meta.id}` },
          t(`Read Chapter ${meta.number} again: ${meta.title}`),
        );
        link.addEventListener('click', (event) => {
          event.preventDefault();
          ctx.sfx.play('page');
          go({ name: 'chapter', id: meta.id });
        });
        card.append(link);
      }

      return card;
    }

    const programme = el(
      'section',
      { class: 'plan-section' },
      el('h2', null, 'What to practise'),
      el(
        'p',
        { class: 'plan-lede' },
        rich(
          t(
            'One job per chapter, phrased as a thing you do **once**. Tick it the first time you manage it; after that it is simply how you play.',
          ),
        ),
      ),
      el('div', { class: 'plan-grid' }, ...SKILL_DRILLS.map((drill) => drillCard(drill))),
    );

    // --- section 3: own the cup ---------------------------------------------

    const cupTraining = el(
      'section',
      { class: 'plan-section' },
      el('h2', null, 'Own the cup'),
      el('p', { class: 'plan-headline' }, CUP_TRAINING.headline),
      prose(CUP_TRAINING.lines.map((line) => t(line))),
      el(
        'div',
        { class: 'plan-grid' },
        ...CUP_TRAINING.stages.map((stage) =>
          el(
            'section',
            { class: 'card plan-card' },
            el('h3', null, t(stage.title)),
            el('p', { class: 'plan-rule' }, rich(t(stage.goal))),
            checkList(stage.items),
          ),
        ),
      ),
      el(
        'section',
        { class: 'card plan-card plan-steering' },
        el('p', { class: 'eyebrow' }, 'When it is your turn to pick'),
        el('h3', null, t('No mercy picks')),
        prose(CUP_STEERING.lines.map((line) => t(line))),
        checkList(CUP_STEERING.items),
      ),
    );

    // --- section 4: the cup, track by track ---------------------------------

    function overviewPanel(
      track: MushroomTrack,
      panelId: string,
      tabId: string,
    ): { panel: HTMLElement; map: TrackMap } {
      const map = createTrackMap({
        schematic: track.schematic,
        pins: track.callouts.map((callout) => ({ ...callout, label: t(callout.label) })),
        alt: t(
          `Simplified diagram of ${track.name}, with ${track.callouts.length} numbered points`,
        ),
      });
      maps.push(map);

      const list = el(
        'ol',
        { class: 'plan-callouts' },
        ...track.callouts.map((callout, index) =>
          el(
            'li',
            { class: 'plan-callout', data: { kind: callout.kind } },
            el('span', { class: 'plan-callout-number' }, String(index + 1)),
            el(
              'div',
              null,
              el('span', { class: 'plan-callout-kind' }, PIN_KIND_LABEL[callout.kind]),
              el('p', null, rich(t(callout.note))),
            ),
          ),
        ),
      );

      const panel = el(
        'div',
        {
          class: 'plan-panel',
          id: panelId,
          attrs: { role: 'tabpanel', 'aria-labelledby': tabId },
        },
        map.root,
        list,
      );

      return { panel, map };
    }

    function deepPanel(track: MushroomTrack, panelId: string, tabId: string): HTMLElement {
      const panel = el('div', {
        class: 'plan-panel',
        id: panelId,
        attrs: { role: 'tabpanel', 'aria-labelledby': tabId },
      });
      panel.hidden = true;

      panel.append(
        el(
          'p',
          { class: 'plan-week3' },
          rich(
            t(
              '**Come back to this in week 3.** None of it will stick until you have driven the corners it is about — and by week three you will read it and recognise every one.',
            ),
          ),
        ),
        el('h4', null, 'The decisions'),
        ...track.deep.choices.map((choice) =>
          el(
            'div',
            { class: 'plan-choice' },
            el('h5', null, t(choice.title)),
            el('p', { class: 'plan-choice-take' }, rich(t(choice.take))),
            el('p', null, rich(t(choice.why))),
          ),
        ),
        el('h4', null, 'The lap, piece by piece'),
        el(
          'ol',
          { class: 'plan-line' },
          ...track.deep.line.map((section) =>
            el(
              'li',
              null,
              el('span', { class: 'plan-line-where' }, t(section.section)),
              el('p', null, rich(t(section.drive))),
            ),
          ),
        ),
        el('h4', null, 'What is going to be in your way'),
        el(
          'ul',
          { class: 'plan-list' },
          ...track.deep.hazards.map((line) => el('li', null, rich(t(line)))),
        ),
        el(
          'div',
          { class: 'switch-card plan-tt' },
          el('p', { class: 'eyebrow' }, 'On the Switch: Time Trial here'),
          el('ul', null, ...track.deep.timeTrial.map((line) => el('li', null, rich(t(line))))),
        ),
        el('p', { class: 'plan-versus' }, rich(t(track.deep.versus))),
        el(
          'div',
          { class: 'plan-notfor' },
          el('h4', null, t('Not for {name}')),
          el('p', null, rich(t(NOT_FOR_YOU_INTRO))),
          el(
            'ul',
            { class: 'plan-list' },
            ...track.notForYou.map((line) => el('li', null, rich(t(line)))),
          ),
        ),
        videoBlock(track.video, t),
      );

      return panel;
    }

    function trackCard(track: MushroomTrack): HTMLElement {
      const overviewId = `plan-${track.id}-overview`;
      const deepId = `plan-${track.id}-deep`;
      const overviewTabId = `${overviewId}-tab`;
      const deepTabId = `${deepId}-tab`;

      const { panel: overview, map } = overviewPanel(track, overviewId, overviewTabId);
      const deep = deepPanel(track, deepId, deepTabId);

      // Named for what is behind it rather than "Overview": every track carries exactly four
      // callouts, and a tab that promises four things is a tab you can finish.
      const overviewTab = el(
        'button',
        {
          class: 'plan-tab',
          type: 'button',
          id: overviewTabId,
          attrs: { role: 'tab', 'aria-selected': 'true', 'aria-controls': overviewId },
        },
        `The ${track.callouts.length === 4 ? 'four' : 'main'} things`,
      );
      const deepTab = el(
        'button',
        {
          class: 'plan-tab',
          type: 'button',
          id: deepTabId,
          attrs: { role: 'tab', 'aria-selected': 'false', 'aria-controls': deepId },
        },
        el('span', null, 'Deep dive'),
        el('span', { class: 'plan-tab-when' }, 'week 3'),
      );

      function select(which: 'overview' | 'deep', focus: boolean): void {
        const wantsOverview = which === 'overview';
        overviewTab.setAttribute('aria-selected', String(wantsOverview));
        deepTab.setAttribute('aria-selected', String(!wantsOverview));
        overview.hidden = !wantsOverview;
        deep.hidden = wantsOverview;
        // The schematic measures its own path, and a path that was hidden when it was measured
        // measures nothing. Cheap to redo, so it is redone rather than reasoned about.
        if (wantsOverview) map.layout();
        if (focus) (wantsOverview ? overviewTab : deepTab).focus();
      }

      overviewTab.addEventListener('click', () => select('overview', false));
      deepTab.addEventListener('click', () => select('deep', false));

      const tabs = el(
        'div',
        {
          class: 'plan-tabs',
          attrs: { role: 'tablist', 'aria-label': t(`${track.name}: how much detail?`) },
        },
        overviewTab,
        deepTab,
      );

      // Keyboard is her only input device, and a tablist that only responds to clicks is a
      // tablist she cannot use.
      tabs.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        select(document.activeElement === overviewTab ? 'deep' : 'overview', true);
      });

      return el(
        'section',
        { class: 'card plan-track' },
        el('p', { class: 'eyebrow' }, `Race ${track.order} of 4`),
        el('h3', null, track.name),
        el('p', { class: 'plan-track-blurb' }, rich(t(track.blurb))),
        tabs,
        overview,
        deep,
      );
    }

    const cupGuide = el(
      'section',
      { class: 'plan-section' },
      el('h2', null, `The ${CUP.name}, track by track`),
      el('p', { class: 'plan-lede' }, rich(t(CUP.why))),
      el(
        'p',
        { class: 'plan-lede' },
        rich(
          t(
            'The pictures are not maps, they are diagrams — the shape is wrong on purpose so the four things that matter are the only four things on it. Start with **The four things** for each track. The deep dives are for week three.',
          ),
        ),
      ),
      ...TRACKS.map((track) => trackCard(track)),
    );

    // --- section 5: the ladder ----------------------------------------------

    const ladder = el(
      'section',
      { class: 'plan-section' },
      el('h2', null, 'The ladder'),
      el(
        'p',
        { class: 'plan-lede' },
        rich(
          t(
            'Five rungs, in order. Each one is a real evening that really happens, and each one names the chapter to go back to if it is not happening yet.',
          ),
        ),
      ),
      el(
        'ol',
        { class: 'plan-ladder' },
        ...MILESTONES.map((milestone, index) => {
          const meta = getChapter(milestone.revisit);
          const inputId = `chk-${milestone.id}`;
          const box = el('input', {
            type: 'checkbox',
            class: 'plan-box',
            id: inputId,
            checked: ctx.progress.isChecked(milestone.id),
          });
          box.addEventListener('change', () => {
            ctx.progress.setCheck(milestone.id, box.checked);
            // The last rung is the whole point of the website. It gets the fanfare.
            if (box.checked) ctx.sfx.play(index === MILESTONES.length - 1 ? 'fanfare' : 'star');
            paint();
          });
          boxes.set(milestone.id, box);

          const revisit = meta
            ? el(
                'p',
                { class: 'plan-revisit' },
                el('strong', null, t(`Stuck? Chapter ${meta.number}: ${meta.title}. `)),
                rich(t(milestone.revisitWhy)),
              )
            : null;

          return el(
            'li',
            { class: 'plan-rung' },
            el('span', { class: 'plan-rung-number' }, String(index + 1)),
            el(
              'div',
              { class: 'plan-rung-body' },
              el(
                'label',
                { class: 'plan-rung-title', attrs: { for: inputId } },
                box,
                el('span', null, t(milestone.title)),
              ),
              el('p', null, rich(t(milestone.blurb))),
              revisit,
            ),
          );
        }),
      ),
    );

    // --- section 6: race day -------------------------------------------------

    const choice = readCombo();
    const raceDay = el(
      'section',
      { class: 'plan-section' },
      el('h2', null, 'Race day'),
      el(
        'div',
        { class: 'card plan-raceday' },
        el(
          'div',
          { class: 'plan-combo' },
          el(
            'p',
            { class: 'eyebrow' },
            choice.saved ? 'Your combo' : 'Your combo (the default pick)',
          ),
          el('h3', null, choice.combo.name),
          el(
            'ul',
            { class: 'plan-combo-parts' },
            el('li', null, choice.combo.character),
            el('li', null, choice.combo.kart),
            el('li', null, choice.combo.tyres),
            el('li', null, choice.combo.glider),
          ),
          choice.saved
            ? null
            : el(
                'p',
                { class: 'plan-combo-note' },
                rich(
                  t(
                    'You have not picked one yet, so this is the one Chapter 7 recommends. It is a good one — set it and stop thinking about it.',
                  ),
                ),
              ),
        ),
        el(
          'ul',
          { class: 'plan-rules' },
          ...RACE_DAY_RULES.map((rule) => el('li', null, rich(t(rule)))),
        ),
      ),
    );

    // --- the printable sheet -------------------------------------------------
    //
    // Hidden on screen, and the only thing that is not hidden on paper. Same data, ruthlessly
    // compressed: no explanations, no video, no diagrams — the things she needs at arm's length
    // while holding a Joy-Con.

    const sheet = el(
      'div',
      { class: 'plan-sheet' },
      el(
        'header',
        { class: 'sheet-head' },
        el('h1', null, t(ctx.meta.title)),
        el(
          'p',
          null,
          t(
            `${CUP.name} · ${CUP.cc} · ${choice.combo.character}, ${choice.combo.kart}, ${choice.combo.tyres}, ${choice.combo.glider}`,
          ),
        ),
      ),
      el(
        'section',
        { class: 'sheet-block' },
        el('h2', null, `The week — ${RHYTHM.sessions}, ${RHYTHM.length}`),
        el('ul', { class: 'sheet-list' }, ...RHYTHM.items.map((item) => sheetLine(item))),
      ),
      el(
        'section',
        { class: 'sheet-block' },
        el('h2', null, 'What to practise'),
        el(
          'div',
          { class: 'sheet-practice' },
          ...SKILL_DRILLS.map((drill) =>
            el(
              'div',
              { class: 'sheet-drill' },
              el('h3', null, `${drill.skill} — ${t(drill.rule)}`),
              el('ul', { class: 'sheet-list' }, ...drill.items.map((item) => sheetLine(item))),
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
        el('ul', { class: 'sheet-list' }, ...CUP_STEERING.items.map((item) => sheetLine(item))),
      ),
      el(
        'section',
        { class: 'sheet-block' },
        el('h2', null, 'The ladder'),
        el(
          'ol',
          { class: 'sheet-ladder' },
          // The ladder's rungs are milestones rather than plan items, but on paper a rung is
          // just another thing with a box next to it.
          ...MILESTONES.map((milestone) => sheetLine({ id: milestone.id, text: milestone.title })),
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

    // --- counter, print button, stamp ---------------------------------------

    const countLabel = el('span', { class: 'ms plan-count-label' });
    const countFill = el('span', { class: 'plan-count-fill' });
    const counter = el(
      'div',
      { class: 'plan-count' },
      countLabel,
      el('span', { class: 'plan-count-bar' }, countFill),
    );

    const printButton = el('button', { class: 'btn', type: 'button' }, 'Print it for the fridge');
    printButton.addEventListener('click', () => window.print());

    const stampSlot = el('div');
    const doneButton = el('button', { class: 'btn btn-go', type: 'button' }, 'I have my plan');
    doneButton.addEventListener('click', () => {
      ctx.finish();
      paintStamp();
      homeButton.focus();
    });

    const homeButton = el('button', { class: 'btn', type: 'button' }, 'Back to the course');
    homeButton.addEventListener('click', () => {
      ctx.sfx.play('page');
      go({ name: 'home' });
    });

    function paintStamp(): void {
      if (ctx.progress.getChapter(ctx.meta.id).status !== 'done') {
        stampSlot.replaceChildren();
        return;
      }
      stampSlot.replaceChildren(el('span', { class: 'stamp' }, 'Done'));
    }

    function paint(): void {
      const done = ctx.progress.countChecked(checkIds);
      countLabel.textContent = `${done} of ${checkIds.length} ticked`;
      countFill.style.width = `${Math.round((done / Math.max(1, checkIds.length)) * 100)}%`;
      for (const [id, box] of boxes) box.checked = ctx.progress.isChecked(id);
      for (const [id, tick] of sheetTicks) {
        tick.textContent = ctx.progress.isChecked(id) ? '☑' : '☐';
      }
    }

    // --- assemble ------------------------------------------------------------

    const screen = el(
      'div',
      { class: 'plan-screen' },
      // No heading or hook here: the template draws both before handing this page the rest, so
      // repeating them printed the chapter title and its hook twice on screen.
      lede(t),
      el('div', { class: 'plan-toolbar' }, counter, printButton),
      rhythm,
      programme,
      cupTraining,
      cupGuide,
      ladder,
      raceDay,
      el('div', { class: 'chapter-end' }, stampSlot, doneButton, homeButton),
    );

    // A plain div, not another `page wrap`: the template already put this slot inside one, and
    // nesting the layout wrapper inside itself would indent the whole programme by a column.
    mount.replaceChildren(el('div', { class: 'plan' }, screen, sheet));

    paintStamp();

    // Repaint from the store rather than from the click, so a tick that arrives from her other
    // device (or from a sync that finished after the page loaded) shows up here too. `subscribe`
    // fires immediately, which doubles as the first paint.
    const unsubscribe = ctx.progress.subscribe(() => paint());

    // Path measurement needs the SVG in the document, so the maps are placed one frame later.
    const frameRequest = requestAnimationFrame(() => {
      for (const map of maps) map.layout();
    });

    return {
      dispose() {
        cancelAnimationFrame(frameRequest);
        unsubscribe();
        for (const map of maps) map.dispose();
      },
    };
  },
};

export default content;
