/**
 * Chapter 4: boost pads. (2b5)
 *
 * The chapter has one idea and it is the strategic thesis in miniature, so everything here is
 * bent toward making that one idea land rather than toward teaching a technique. Boost pads are
 * not a skill: you do not press anything, you cannot mistime them, and there is no such thing as
 * a decoy (Riggs, 2026-08-07 — Mario Kart has no fake pads, so "spot the fake" was never the
 * lesson). What there is, is a track where the pads sit **off the line you would naturally
 * drive**, which makes the fast way round different from the tight way round, and makes the only
 * way to know it *knowing the track*. Preparation beating reaction, painted on the road.
 *
 * **Cut back on 2026-08-12**, from Riggs's playtest: "Ch4 is a bit convoluted. They're called
 * boost pads and they are not always orange. I think the big thing is emphasizing that using a pad
 * is usually faster than not using one, even if its out of the way. Lose the rest of the
 * complexity." Three things followed. The chapter is named for the object rather than its colour,
 * everywhere, because a reader who has learned "orange arrows" and then meets a blue one on
 * another track has been taught wrong. The lesson is stated as a single portable rule — *worth
 * going out of your way for* — instead of being inferred from a worked example of one corner of
 * one track. And the worked example itself is gone: the three-painted-lanes tour of Mario Kart
 * Stadium was four sentences proving a thing the rule now says in one, and the drill and the map
 * cards below demonstrate it better than any paragraph could.
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
 * asked is which line takes the boosts. The handover is automatic and has no button on it
 * (2026-08-13, see `startMapTest`), and the drill is disposed on the first answer rather than at
 * the handover, because it owns a WebGL context and a render loop but also owns the "Try it again"
 * she may still want.
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
import { createLongWayRound } from './long-way-round';

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
      el('h2', null, 'Boost pads'),
      prose([
        'Painted on the road, on every track, there are strips that shove you forward when you drive over one. They are called **boost pads**.',
        // Riggs, 2026-08-13: "Just say that I'm representing them with orange arrows. They're often
        // not orange." The old sentence tried to teach the exception and the rule at once —
        // "usually orange, though not on every track, so what you are looking for is…" — which is
        // three clauses of hedging about a thing she has not seen yet. Naming the drawing as a
        // drawing is shorter and cannot be got wrong: this is how *I* am drawing them; out there,
        // look for the shape.
        'I draw them as **orange arrows** all the way through this course. Out in the game they are often not orange at all — every track picks its own colour. The shape is the constant: a painted strip with arrows on it, pointing the way you are going.',
        'Free speed. You do not press anything and there is no timing to get wrong.',
        'Here is the whole chapter: **a boost pad is worth going out of your way for.** Even when it is on the far side of the road. Even when reaching it means taking the long way round a corner. The few extra kart lengths cost you less than the boost gives back — and hardly anyone believes that, which is why hardly anyone does it.',
      ]),

      // The picture, immediately under the rule it is a picture of. (Moved here from Chapter 0 on
      // 2026-08-13 — see `long-way-round.ts` for why it was in the wrong chapter.) It is doing the
      // job the deleted worked example used to do, in one watchable corner instead of four
      // sentences: red takes the short way, green takes the long way over a pad, green wins.
      createLongWayRound({ t: (text) => ctx.t(text) }),

      el(
        'div',
        // The card is an aside between two runs of prose, and neither the card nor a paragraph
        // brings spacing of its own to that join.
        { class: 'card', style: { margin: 'var(--gap) 0' } },
        el('p', { class: 'eyebrow' }, 'The one exception'),
        el(
          'p',
          { style: { marginBottom: '0' } },
          rich(
            // "Slowing down" meant "braking", and only the author knew that. (Riggs, 2026-08-13.)
            // Read cold it sounds like a rule against easing off at all, which would contradict
            // the sentence directly after it — you *do* move across the road for a pad, and moving
            // across costs a little speed. Naming the pedal removes the ambiguity in one word.
            '**Never brake for one.** Shuffling across a straight to line yourself up with a pad is free, and you should do it. Touching the brake to make sure you hit one costs more than the pad pays back. A pad is a great fat stripe of road, not a target you have to aim at.',
          ),
        ),
      ),
      prose([
        ctx.t(
          'You cannot react to a boost pad — by the time it is on your screen you are level with it. You can only already know it is there. That is homework, and homework is the one race {rival} is not running.',
        ),
        'Eight pads on the practice lap. Four of them are nowhere near the line you would take first time round. Go and find them.',
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

    /**
     * Part two arrives on its own, with no button on it. (Riggs, 2026-08-13.)
     *
     * There used to be a "Show me the first one" here, and the practice page therefore ended with
     * two orange buttons on screen at once: this one, which starts the map test, and the template's
     * "Next: <chapter>", which leaves. "Having functionally two different Next buttons is
     * confusing. Just have one button that leads into the next practice." He is right — they look
     * identical and they go to completely different places, and the one that stays on the page is
     * the one that looks like leaving.
     *
     * So the handover is a heading and a sentence, and the quiz simply appears under it when the
     * lap ends. Nothing was lost by deleting the button: it never asked a question, it only
     * required a click to answer it.
     */
    const handover = el(
      'div',
      { class: 'card', hidden: true },
      el('p', { class: 'eyebrow' }, 'Part two'),
      el('h3', null, 'Now the map test'),
      el(
        'p',
        { style: { marginBottom: '0' } },
        'Five corners, no driving. Just say which line you would take — because out on the Switch, the deciding is what you will actually be doing.',
      ),
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
      goal: 'Drive over all eight boost pads — including the ones out wide.',
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
        startMapTest();
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
              'The ones you missed are off your natural line: the outside of the big right-hander, and the far side of the chicane. Worth another lap, or carry on — the map test is where it sticks.',
          };
        }
        return {
          title: score === 1 ? 'One pad.' : score === 0 ? 'None this time.' : `${score} pads.`,
          detail:
            'Nothing here is timed and nothing is lost. Have another go if you fancy it — the pads have not moved, and out on the Switch they never will.',
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
            `**${padsHit} of ${TOTAL_PADS} pads** on the track, and **${summary.correct} of ${summary.total}** on the map.`,
          ),
        ),
        el(
          'p',
          { style: { marginBottom: '0' } },
          rich(
            ctx.t(
              'You now know something about a piece of road that {rival} has driven a hundred times and never once looked at.',
            ),
          ),
        ),
      );
      wrapUp.hidden = false;
      ctx.finish({ score: padsHit });
    }

    /**
     * Reveal the map test. Called once, the moment the lap ends.
     *
     * **The drill is not torn down here, and that is the whole trade.** It owns a WebGL context and
     * a render loop, so the old code disposed it at the handover click — which was fine when a
     * click was what got you here. Without the button there is no such moment, and disposing on
     * `onFinish` would take away the "Try it again" the drill has just drawn, on a page whose one
     * promise is that nothing is ever taken back. So it stays alive until she commits to part two
     * by answering the first card, which is the last instant at which another lap is plausible.
     */
    function startMapTest(): void {
      if (quiz) return;
      handover.hidden = false;

      quiz = new Quiz({
        mount: quizSlot,
        questions,
        onAnswer: (result) => {
          drill?.dispose();
          drill = null;
          ctx.sfx.play(result.correct ? 'right' : 'nudge');
        },
        onComplete: finished,
      });

      // No focus grab. The drill has just put focus on its own "Try it again", and pulling the
      // page down to the quiz would answer a question she has not been asked yet.
    }

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
