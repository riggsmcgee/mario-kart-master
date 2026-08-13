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
  CUP_TRAINING,
  MILESTONES,
  RACE_DAY_RULES,
  RHYTHM,
  allCheckIds,
  readCombo,
} from '../../data/plan';
import type { PlanItem } from '../../data/plan';
import { CUP, NOT_FOR_YOU_INTRO, TRACKS } from '../../data/tracks';
import type { MushroomTrack } from '../../data/tracks';
import { createPlanGrid } from '../../ui/plan-grid';
import { PIN_KIND_LABEL, createTrackMap } from '../../ui/track-map';
import type { TrackMap } from '../../ui/track-map';
import { celebrate } from '../../ui/confetti';
import { el, prose, rich } from '../dom';
import { go, hrefFor } from '../router';
import type { ChapterContent, ChapterContext, Mounted } from '../types';
import { createPlanSheet } from '../plan-sheet';
import { BENCHMARK_TOTAL, beforeScore, createBenchmark } from './benchmark';

type Fill = (text: string) => string;

/** The lede. Also the `concept` the contract asks every chapter for. */
function lede(t: Fill): Node {
  return prose([
    'Everything up to here was the classroom. This is the part you keep.',
    'Forty short sessions with one job each, the one cup you are going to know better than anybody in your house, a map of all four of its tracks, and a ladder of things to beat — ending with the only one that counts.',
    t(
      'Tick the boxes as you go. They save themselves, on every device you own, whether or not the wifi is behaving. And there is a **Print** button, because a blank version of that grid belongs on the fridge, not in a tab you will lose by Thursday.',
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

/** One reading, big, with its label above it. */
function scoreCell(label: string, value: string): HTMLElement {
  return el(
    'div',
    { style: { display: 'grid', gap: '0.15rem' } },
    el('span', { class: 'eyebrow', style: { margin: '0' } }, label),
    el('strong', { style: { fontSize: '2.4rem', lineHeight: '1' } }, value),
  );
}

/**
 * What the difference between the two numbers means, said in her words.
 *
 * Every branch has to be warm, including the two that are not an improvement, and none of them may
 * be a telling-off — this is the last thing the course says to her. The line that matters is in the
 * `gain > 0` branch and it is the argument the whole website has been making: nothing on that list
 * was a skill she acquired in an hour. Every one of them was a fact somebody finally mentioned.
 */
function comparison(before: number | null, now: number): string {
  if (before === null) {
    return `**${now} of ${BENCHMARK_TOTAL}.** There is no cold run to hold that against, which is a shame — the gap was the interesting part. Take it as a reading of where you are standing right now instead.`;
  }
  const gain = now - before;
  if (gain > 0) {
    return `**${gain} more than you got before you started**, on exactly the same twelve questions, in about an hour. Not one of those is a thing you got *better* at. Every one of them is a thing somebody finally told you.`;
  }
  if (gain === 0) {
    return `Level with your cold run — which, if that run was already a good one, means you arrived knowing more than you thought you did. Either way the questions were never the deliverable. The programme below is.`;
  }
  return `A shade under your cold run, which happens with twelve questions and means nothing at all — a couple of them are close-run by design. Everything worth keeping is written down below, and it is not going anywhere.`;
}

const content: ChapterContent = {
  concept(ctx: ChapterContext): Node {
    return lede((text) => ctx.t(text));
  },

  /**
   * The plan itself, and the quiz that now stands in front of it. (Riggs, 2026-08-13.)
   *
   * "Have the quiz be the first thing in the chapter. The actual plan comes after the quiz is done.
   * Not scrollable at the start."
   *
   * The twelve questions used to live on this chapter's practice page, at `#/chapter/ch8/try`,
   * behind a card near the top of the plan. That put the last measurement in the course behind a
   * click, on a page whose next four screens are the thing she came for — so the honest prediction
   * is that she scrolls past it, gets the programme, and the second half of the benchmark never
   * happens. Nothing is *lost* by that; it is just quietly never done, which is the worst way for a
   * feature to fail.
   *
   * So Chapter 8 has two states and the state is her progress, not a flag of its own:
   *
   *  - **not finished** → the twelve questions, and nothing under them. There is a skip, because
   *    nothing in this course locks and this is not the page to start.
   *  - **finished** → the plan, exactly as it was, with the before-and-after card on top of it and
   *    a quiet way back to the questions at the bottom.
   *
   * Reading the state off `status === 'done'` rather than off a stored score is what stops this
   * becoming a gate she meets every evening for two months: the skip finishes the chapter the same
   * way the template's "Skip the practice" does, so one pass through — answered or skipped — and
   * this page is the plan forever after. And after the last chapter, `app.ts` opens her on `#/plan`
   * anyway, which is the page this one is the reference behind.
   */
  custom(mount: HTMLElement, ctx: ChapterContext): Mounted {
    let live: Mounted | null = null;

    /** Swap what is on the page, tearing down whatever was there. */
    function show(next: () => Mounted): void {
      live?.dispose();
      live = next();
    }

    function showQuiz(): void {
      show(() => benchmarkGate(mount, ctx, (intro) => show(() => renderPlan(mount, ctx, intro))));
    }

    if (ctx.progress.getChapter(ctx.meta.id).status === 'done') {
      show(() => renderPlan(mount, ctx, null, showQuiz));
    } else {
      showQuiz();
    }

    return {
      dispose() {
        live?.dispose();
        live = null;
      },
    };
  },
};

/**
 * The second half of the benchmark, standing where the plan used to be.
 *
 * `onThrough` is handed the card that goes on top of the plan — the two scores side by side after
 * a real run, or nothing at all after a skip. Passing it rather than storing it keeps this function
 * ignorant of the plan and the plan ignorant of the quiz.
 */
function benchmarkGate(
  mount: HTMLElement,
  ctx: ChapterContext,
  onThrough: (intro: HTMLElement | null) => void,
): Mounted {
  const t: Fill = (text) => ctx.t(text);

  // Read before `finish()` runs. The cold reading lives on Chapter 0 so nothing here can clobber
  // it, but taking the snapshot first means the card cannot be caught out by that changing.
  const before = beforeScore(ctx.progress);

  const intro = el(
    'div',
    { class: 'card stack' },
    el('p', { class: 'eyebrow' }, 'One thing first'),
    el('h2', null, t('The same twelve questions')),
    el(
      'p',
      { style: { marginBottom: '0' } },
      rich(
        before === null
          ? t(
              'Twelve questions covering this whole course, the same ones that opened it. You went past them at the start, which was allowed — they are still the fastest way to find out what stuck.',
            )
          : t(
              `You answered these twelve at the very start, cold, before a word of it had been taught, and got **${before} of ${BENCHMARK_TOTAL}**. Same twelve, same order. Then the plan.`,
            ),
      ),
    ),
  );

  const quizMount = el('div');

  const skip = el('button', { class: 'btn btn-quiet', type: 'button' }, 'Skip to the plan');
  const skipRow = el('div', { class: 'chapter-end-quiet' }, skip);

  const root = el('div', { class: 'plan-gate stack-lg' }, intro, quizMount, skipRow);
  mount.replaceChildren(root);

  let completed = false;

  const quiz = createBenchmark({
    mount: quizMount,
    ctx,
    onComplete: (summary) => {
      if (completed) return;
      completed = true;
      ctx.finish({ score: summary.correct });
      onThrough(scoreboard(t, before, summary.correct));
    },
  });

  skip.addEventListener('click', () => {
    if (completed) return;
    completed = true;
    // Same contract as the template's own skip: going past the practice still finishes the
    // chapter, which is what stops this page asking again every evening for two months.
    ctx.finish();
    onThrough(null);
  });

  return { dispose: () => quiz.dispose() };
}

/**
 * The two readings, side by side, on top of the plan.
 *
 * Confetti on an improvement is the one place in the course that celebrates without a star rule
 * behind it — Chapter 8 has no stars, because a training programme is not scored, and this is
 * nevertheless the best number the site will ever show her.
 */
function scoreboard(t: Fill, before: number | null, now: number): HTMLElement {
  const card = el(
    'div',
    { class: 'card stack' },
    el('p', { class: 'eyebrow' }, 'Before and after'),
    el(
      'div',
      {
        style: {
          display: 'flex',
          gap: '2.6rem',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          margin: '0.2rem 0 0.4rem',
        },
      },
      scoreCell('At the start', before === null ? '—' : `${before} / ${BENCHMARK_TOTAL}`),
      scoreCell('Just now', `${now} / ${BENCHMARK_TOTAL}`),
    ),
    el('p', null, rich(t(comparison(before, now)))),
    el(
      'p',
      { style: { marginBottom: '0' } },
      rich(
        t(
          'That is the classroom finished. Everything below this is the part you keep — forty sessions, one job each.',
        ),
      ),
    ),
  );

  if (before !== null && now > before) {
    requestAnimationFrame(() => celebrate(card));
  }

  return card;
}

function renderPlan(
  mount: HTMLElement,
  ctx: ChapterContext,
  intro: HTMLElement | null,
  onRetake?: () => void,
): Mounted {
  {
    const t: Fill = (text) => ctx.t(text);

    const checkIds = allCheckIds();
    const boxes = new Map<string, HTMLInputElement>();
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

    // --- section 1: the grid -------------------------------------------------
    //
    // The programme, and the first thing on the page after the lede. It replaced two sections —
    // "the rhythm" and "what to practise" — that between them described a schedule without ever
    // being one. Forty boxes and tonight's job is the same material, answering the question she
    // actually arrives with.

    const grid = createPlanGrid({
      progress: ctx.progress,
      t,
      chapterTitle: (id) => getChapter(id)?.skill ?? 'the chapter',
      onOpenChapter: (id) => {
        ctx.sfx.play('page');
        go({ name: 'chapter', id });
      },
    });

    /**
     * The grid has a page of its own, and until now nothing said so. (Riggs, 2026-08-13: "this work
     * page can be its own thing, own page. Without a long scroll after… after she completes the
     * site, this is the central point.")
     *
     * `#/plan` has existed since 2026-08-12 and is exactly that page: this grid, tonight's job, a
     * three-card strip, and no scroll. The gap was that the only thing linking to it was `app.ts`
     * redirecting a bare URL there once every chapter is finished — so the page she is meant to open
     * every evening for two months was reachable and unmentioned.
     *
     * A link rather than a second button by the chapter's own controls, deliberately. Riggs's last
     * note about two orange buttons doing different jobs on one page was right, and this is a
     * signpost, not a way out of the chapter.
     */
    const nightlyLink = el(
      'a',
      { class: 'plan-nightly-link', href: hrefFor({ name: 'plan' }) },
      'open the nightly page',
    );
    nightlyLink.addEventListener('click', () => ctx.sfx.play('page'));

    const programme = el(
      'section',
      { class: 'plan-section' },
      el('h2', null, `The programme — ${RHYTHM.sessions}, ${RHYTHM.length}`),
      prose(RHYTHM.lines.map((line) => t(line))),
      el(
        'p',
        { class: 'plan-nightly' },
        rich('**This grid has a page of its own** — '),
        nightlyLink,
        rich(
          ' — with tonight’s job and nothing under it. That is the one to bookmark; this chapter is the reference behind it.',
        ),
      ),
      grid.root,
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
    // Built by `site/plan-sheet.ts` since 2026-08-13, because the plan page prints it too and two
    // copies of a fridge chart is exactly the failure that gets found on somebody else's fridge.

    const sheet = createPlanSheet({ t, progress: ctx.progress, title: t(ctx.meta.title) });

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
      sheet.paint();
    }

    // --- assemble ------------------------------------------------------------

    // A way back to the twelve questions, and deliberately the quietest control on the page. It
    // only exists on a revisit — on the run where she has just answered them, the scoreboard is
    // sitting at the top of this very page and a button offering to do it again is noise.
    const retake = onRetake
      ? el(
          'div',
          { class: 'chapter-end-quiet' },
          (() => {
            const button = el(
              'button',
              { class: 'btn btn-quiet', type: 'button' },
              'Take the twelve questions again',
            );
            button.addEventListener('click', onRetake);
            return button;
          })(),
        )
      : null;

    const screen = el(
      'div',
      { class: 'plan-screen' },
      // No heading or hook here: the template draws both before handing this page the rest, so
      // repeating them printed the chapter title and its hook twice on screen.
      intro,
      lede(t),
      el('div', { class: 'plan-toolbar' }, counter, printButton),
      programme,
      cupTraining,
      cupGuide,
      ladder,
      raceDay,
      el('div', { class: 'chapter-end' }, stampSlot, doneButton, homeButton),
      retake,
    );

    // A plain div, not another `page wrap`: the template already put this slot inside one, and
    // nesting the layout wrapper inside itself would indent the whole programme by a column.
    const root = el('div', { class: 'plan' }, screen, sheet.root);
    mount.replaceChildren(root);

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
        grid.dispose();
        for (const map of maps) map.dispose();
        root.remove();
      },
    };
  }
}

export default content;
