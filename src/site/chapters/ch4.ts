/**
 * Chapter 4: boost pads. (2b5)
 *
 * The chapter has one idea and it is the strategic thesis in miniature, so everything here is
 * bent toward making that one idea land rather than toward teaching a technique. Boost pads are
 * not a skill: you do not press anything, you cannot mistime them, and there is no such thing as
 * a decoy (Riggs, 2026-08-07 — Mario Kart has no fake pads, so "spot the fake" was never the
 * lesson). What there is, is a track where the arrows sit **off the line you would naturally
 * drive** — straight out of Mario Kart Stadium, where the dash panels live in the wide outer lane
 * — which makes the fast way round different from the tight way round, and makes the only way to
 * know it *knowing the track*. Preparation beating reaction, painted on the road.
 *
 * **Why the drill layout looks like that.** Eight pads, and four of them are deliberately
 * unreachable from the tidy line: three strung down the outside of the wide right-hander, one on
 * the far side of the chicane. That ratio is the whole design. Put them all on the racing line and
 * she hits eight without learning anything; put them all off it and the drill reads as unfair and
 * arbitrary rather than as a track with a secret. The two easy ones on the main straight come
 * first on purpose, so the first arrow she meets teaches what an arrow *does* before any of them
 * start asking her to go somewhere.
 *
 * **Why three laps for eight pads.** Lap one is meant to be a miss. She takes the obvious line,
 * gets four or five, and the counter tells her — without a word of telling-off — that there were
 * things out there she drove past. Lap two is the one where she goes looking. A one-lap drill
 * would have skipped the only part that matters.
 *
 * **Why two parts, in sequence.** Driving over a pad teaches what a pad is worth. It cannot teach
 * her to *plan* a lap, because in the drill the arrows are visible ahead of her and she is
 * reacting to them, which is precisely the habit this chapter argues against. So the drill hands
 * over to five map cards: a road, some arrows, and no kart to drive — where the only thing being
 * asked is which line takes the boosts. The drill is disposed at the handover rather than left
 * sitting there, because it owns a WebGL context and a render loop, and the quiz is a paragraph
 * further down the same page she has not left.
 *
 * **Names.** {@link Quiz} paints its copy with `textContent` straight from the JSON, so it never
 * sees `ctx.t()` — the card data is templated here, on the way in, which keeps the rule that no
 * chapter copy anywhere contains a literal name (4e1). It is also why the JSON holds no `**bold**`
 * markers: that file is plain text all the way to the screen.
 */

import '../../ui/quiz.css';

import type { FurnitureSpec } from '../../engine/track';
import { createKartDrill } from '../../ui/kart-drill';
import { Quiz, parseQuiz, type QuizQuestion, type QuizSummary } from '../../ui/quiz';
import spotThePad from '../../data/quiz/spot-the-pad.json';
import { el, frag, prose, rich } from '../dom';
import type { ChapterContent, ChapterContext, Mounted } from '../types';

/**
 * The lap, as eight arrows.
 *
 * Positions are `t` (fraction of the lap) and lateral `offset` — negative toward the infield,
 * positive toward the outside. The test circuit runs: main straight to 0.28, the wide right-hand
 * U-turn to 0.58, back straight and chicane to 0.84, tight hairpin to the line.
 *
 * The road's half-width is 10 and a pad is 5 wide, so ±6 is as far out as one can sit while
 * staying entirely on the tarmac. Every "off the line" pad below is at that edge deliberately:
 * half-hearted placement would let her collect them by wandering, and wandering is not the lesson.
 */
const PAD_LAYOUT: FurnitureSpec[] = [
  // 1. Main straight, dead centre. Free, and there purely so the first thing she meets teaches
  //    her what an arrow feels like before any of them ask her to go looking.
  { kind: 'pad', t: 0.05 },
  // 2. Same straight, one lane toward the infield. The smallest possible line choice.
  { kind: 'pad', t: 0.16, offset: -4 },

  // 3-5. THE LESSON. The outer lane of the wide right-hander, three arrows long, on the side
  //      nobody drives — because the inside of a corner looks shorter and shorter looks faster.
  //      Three in a row rather than one, so committing to the wide line pays three times and
  //      reads as a route rather than as a stray bit of paint.
  { kind: 'pad', t: 0.4, offset: 6 },
  { kind: 'pad', t: 0.46, offset: 6 },
  { kind: 'pad', t: 0.52, offset: 5 },

  // 6. Corner exit, back near the middle. A breather, and it rewards straightening up.
  { kind: 'pad', t: 0.6, offset: 1 },
  // 7. The wide side of the chicane — the other place the tidy line and the fast line part
  //    company, and the one she is most likely to miss twice.
  { kind: 'pad', t: 0.7, offset: 5.5 },
  // 8. Hairpin exit, tucked inside, where the tidy line already goes. Ending on a gift: the
  //    answer is not always "go wide", it is "go where the arrows are".
  { kind: 'pad', t: 0.95, offset: -4 },
];

const TOTAL_PADS = PAD_LAYOUT.length;

/** Said over the stage on a pad. Cycled rather than random, so a good lap does not repeat. */
const CHEERS = ['Boost!', 'Free speed.', 'Yes — that one.', 'Another.', 'Lovely.'];

/** Generous by design: lap one is meant to be the lap she misses things on. */
const LAPS = 3;

/**
 * The lab's quiz stylesheet is written against the testbed's variables, which do not exist on the
 * real site. Rather than reach into a shared file two other chapters are also mounting, the five
 * names are bridged onto the house tokens here, on the wrapper. If `quiz.css` is ever restyled
 * against the theme directly, these simply stop being read.
 */
const QUIZ_TOKENS =
  '--fg: var(--ink); --bg: var(--card); --muted: var(--ink-soft);' +
  ' --line: var(--rule); --accent: var(--boost);';

/**
 * Fill `{name}` and `{rival}` through a parsed deck.
 *
 * Mutating in place is safe and deliberate: {@link parseQuiz} builds fresh objects every call, so
 * there is no shared deck to corrupt, and rebuilding the structures instead would mean hand-rolling
 * every optional field back on under `exactOptionalPropertyTypes` for no gain.
 */
function fillNames(questions: QuizQuestion[], t: (text: string) => string): QuizQuestion[] {
  for (const question of questions) {
    question.situation = t(question.situation);
    question.prompt = t(question.prompt);
    question.takeaway = t(question.takeaway);
    for (const answer of question.answers) {
      answer.label = t(answer.label);
      answer.response = t(answer.response);
    }
    const diagram = question.diagram;
    if (!diagram) continue;
    if (diagram.caption !== undefined) diagram.caption = t(diagram.caption);
    for (const marker of diagram.markers) {
      if (marker.label !== undefined) marker.label = t(marker.label);
    }
  }
  return questions;
}

const content: ChapterContent = {
  concept(ctx) {
    return frag(
      el('h2', null, 'The orange arrows'),
      prose([
        'Somewhere on every track there are orange arrows painted on the road. Drive over one and the kart takes off like something bit it. You do not press anything, you cannot get the timing wrong, and it works every single lap. Officially they are called dash panels. Everyone calls them boost pads, and you can call them the orange arrows if you like — nobody is marking you.',
        'So far so easy. Here is the part nobody mentions: **they are often not where you would naturally drive.**',
        'On Mario Kart Stadium — the first track of the cup you are going to own — the road opens into three painted lanes after the first right turn, and the arrows are out in the **wide outer lane**. The long way round. Everybody who has not looked it up hugs the inside, because inside is shorter and shorter feels faster, and they hand back three boosts a lap to save a few kart lengths.',
        'Which means the fast way round is not the tight way round, and there is no way to work that out while you are driving. By the time an arrow is on your screen you are level with it.',
      ]),
      el(
        'div',
        // The card is an aside between two runs of prose, and neither the card nor a paragraph
        // brings spacing of its own to that join.
        { class: 'card', style: { margin: 'var(--gap) 0' } },
        el('p', { class: 'eyebrow' }, 'This is the whole plan, in one corner'),
        el(
          'p',
          null,
          rich(
            ctx.t(
              'You cannot react to a boost pad. You can only *remember* it. {rival} is faster than you at everything that happens in the moment — and this is not one of those things. It is homework, and it is sitting on the road waiting for whichever of you bothered to look.',
            ),
          ),
        ),
        el(
          'p',
          { style: { marginBottom: '0' } },
          rich(
            '**The one exception:** never slow down for an arrow. Shuffling across a straight to reach one is free. Braking to line one up gives back more than it hands you — and an arrow is a great fat stripe of road, not a target you have to aim at.',
          ),
        ),
      ),
      prose([
        'Next is a lap of the practice track. There are eight arrows on it, and four of them are nowhere near the line you would take the first time round. That is on purpose. Go and find them.',
      ]),
    );
  },

  interactive(mount: HTMLElement, ctx: ChapterContext): Mounted {
    /** Best drive of the session. A worse replay must never take a star back off her. */
    let padsHit = 0;
    let drill: Mounted | null = null;
    let quiz: Quiz | null = null;
    let cheer = 0;

    const drillSlot = el('div');

    const handoverButton = el(
      'button',
      { class: 'btn btn-go', type: 'button' },
      'Show me the first one',
    );
    const handover = el(
      'div',
      { class: 'card', hidden: true },
      el('p', { class: 'eyebrow' }, 'Part two'),
      el('h3', null, 'Now the map test'),
      el(
        'p',
        null,
        'Five corners, no driving. Just say which line you would take — because out on the Switch, the deciding is what you will actually be doing.',
      ),
      handoverButton,
    );

    const quizSlot = el('div', { attrs: { style: QUIZ_TOKENS } });
    const wrapUp = el('div', { class: 'card', hidden: true });

    const root = el('div', { class: 'stack' }, drillSlot, handover, quizSlot, wrapUp);
    mount.replaceChildren(root);

    // --- part one: drive the lap --------------------------------------------

    let lapSeen = 1;
    let scoreAtLapStart = 0;

    drill = createKartDrill({
      mount: drillSlot,
      sfx: ctx.sfx,
      layout: PAD_LAYOUT,
      goal: 'Drive over all eight arrows — including the ones out wide.',
      unit: 'pads',
      target: TOTAL_PADS,
      laps: LAPS,
      keys: 'Arrow keys to steer. That is the entire control scheme.',

      onTick(tick, api) {
        // A lap she did not sweep is the moment the lesson is available, so the nudge goes here
        // rather than at the end — she has a fresh lap to spend on it.
        if (tick.lap !== lapSeen) {
          const thisLap = api.score() - scoreAtLapStart;
          lapSeen = tick.lap;
          scoreAtLapStart = api.score();
          // Not on the tick that ends the drill: a hint arriving under the results card is
          // advice about a lap she is no longer driving.
          if (thisLap < TOTAL_PADS && tick.lap <= LAPS) {
            api.say('Three of them are out wide on the big right-hander.');
          }
        }

        if (!tick.events.padHit) return;
        api.add();
        ctx.sfx.play('coin');
        api.say(CHEERS[cheer++ % CHEERS.length] ?? 'Boost!', 'good');
      },

      onFinish(score) {
        padsHit = Math.max(padsHit, score);
        handover.hidden = false;
        // Focus is left on the drill's own "Try it again" button. Yanking it down here would
        // quietly take away the second go she might have wanted.
      },

      verdict(score) {
        if (score >= TOTAL_PADS) {
          return {
            title: 'All eight.',
            detail:
              'And you will notice you did not drive the neat way round to get them. That is the chapter.',
          };
        }
        if (score >= 5) {
          return {
            title: `${score} of eight.`,
            detail:
              'The ones you missed are the ones off your natural line: the outside of the big right-hander, and the far side of the chicane — the quick left-right-left wiggle on the way back round. Worth another lap, or carry on — the map test is where it sticks.',
          };
        }
        return {
          title: score === 1 ? 'One arrow.' : score === 0 ? 'None this time.' : `${score} arrows.`,
          detail:
            'Nothing here is timed and nothing is lost. Have another go if you fancy it — the arrows have not moved, and out on the Switch they never will.',
        };
      },
    });

    // --- part two: read the map ---------------------------------------------

    const questions = fillNames(parseQuiz(spotThePad), (text) => ctx.t(text));

    function finished(summary: QuizSummary): void {
      wrapUp.replaceChildren(
        el('p', { class: 'eyebrow' }, 'Chapter four, done'),
        el(
          'p',
          null,
          rich(
            `**${padsHit} of ${TOTAL_PADS} arrows** on the track, and **${summary.correct} of ${summary.total}** on the map.`,
          ),
        ),
        el(
          'p',
          { style: { marginBottom: '0' } },
          rich(
            ctx.t(
              'You now know something about a piece of road that {rival} has driven a hundred times and never once looked at. Take it to the Switch — the card below tells you exactly where to start.',
            ),
          ),
        ),
      );
      wrapUp.hidden = false;
      ctx.finish({ score: padsHit });
    }

    handoverButton.addEventListener('click', () => {
      handover.hidden = true;
      // The drill has done its job, and it is holding a WebGL context and a render loop she is
      // about to scroll away from.
      drill?.dispose();
      drill = null;

      quiz = new Quiz({
        mount: quizSlot,
        questions,
        onAnswer: (result) => ctx.sfx.play(result.correct ? 'right' : 'nudge'),
        onComplete: finished,
      });

      // Focus the first answer: it scrolls the card into view and hands the keyboard straight to
      // the thing she is meant to use next. Keyboard is her only input device.
      quizSlot.querySelector<HTMLButtonElement>('.quiz-answer')?.focus();
    });

    return {
      dispose() {
        drill?.dispose();
        quiz?.dispose();
        root.remove();
      },
    };
  },
};

export default content;
