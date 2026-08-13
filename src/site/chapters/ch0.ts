/**
 * Chapter 0: the goal. (2b1)
 *
 * The only chapter with nothing to teach, which makes it the one most likely to be closed. It has
 * exactly one job: earn the next hour of her evening before she has spent any of it.
 *
 * **The argument is no longer about reflexes.** (Riggs, 2026-08-13: "I don't feel like the emphasis
 * on reflexes are very applicable. Let's just craft the narrative around {rival} being a gamer and
 * knowing a few key things that differentiate her.")
 *
 * The old version opened by conceding that {rival} is faster and then turned on it — reactions are
 * one way to win a race, preparation is another. It read well and it was arguing with a claim
 * nobody in this house has made. {rival} does not beat her mum on reaction time; she beats her
 * because she has played hundreds of hours of this and has picked up things nobody ever said out
 * loud. That is a much smaller and much more useful gap, because it is made of specific facts and
 * facts can be handed over in an evening.
 *
 * So the shape of the page changed with it. It no longer concedes anything, because there is
 * nothing to concede: the honest framing is *she knows some things, here they are, most of the
 * game is not on this list and does not need to be.* The promise it makes is explicitly not "you
 * will understand Mario Kart" — it is "you will be told the eight things that pay best", which is
 * a promise this website can actually keep.
 *
 * **The big picture moved out.** (Same conversation: "I like this, but why is it in the opening
 * chapter?") The animated U-turn now opens Chapter 4, whose rule it is actually illustrating. See
 * `long-way-round.ts`.
 *
 * **The practice page is the benchmark, taken cold.** Twelve questions covering the whole course,
 * answered before any of it has been taught. Every one of them explains itself the moment she
 * answers — that is Riggs's call on 2026-08-13, from Katharine's playtest, and `benchmark.ts`
 * carries the argument. The same twelve come back at the end of Chapter 8.
 *
 * It is not a gate and it cannot be failed — the same rule as everywhere else here. It is the one
 * page in the course where getting things wrong is the intended outcome, and it is the only way the
 * last page gets to show her a number that means anything.
 */

import { CHAPTERS } from '../../data/chapters';
import { createIntroVideo } from '../../ui/intro-video';
import { BENCHMARK_TOTAL, createBenchmark } from './benchmark';
import { el, prose, rich } from '../dom';
import type { ChapterContent, ChapterContext, Mounted } from '../types';

/** Everything after this chapter. Chapter 0 is the pitch, not one of the eight things. */
const SKILLS = CHAPTERS.filter((chapter) => chapter.number > 0);

function proseFor(ctx: ChapterContext, lines: string[]): HTMLDivElement {
  return prose(lines.map((line) => ctx.t(line)));
}

function skillsCard(ctx: ChapterContext): HTMLElement {
  return el(
    'div',
    { class: 'card' },
    el('p', { class: 'eyebrow' }, 'What you are getting'),
    // Counted from the data, like the list below it and the line at the end. The one place this
    // was written out as a word was the one place the copy could quietly start lying the day a
    // chapter is added or cut.
    el('h3', null, ctx.t(`The ${SKILLS.length} chapters`)),
    el(
      'ol',
      { style: { margin: '1.1rem 0 0.6rem', paddingLeft: '1.4em' } },
      ...SKILLS.map((chapter) =>
        el(
          'li',
          { style: { marginBottom: '0.45em' } },
          el('strong', null, ctx.t(chapter.skill)),
          ' — ',
          el('span', { style: { color: 'var(--ink-soft)' } }, ctx.t(chapter.title)),
        ),
      ),
    ),
    el(
      'p',
      { style: { color: 'var(--ink-soft)', marginBottom: '0' } },
      ctx.t(
        'Every one of those is something to know rather than something to be good at. {rival} collected them one at a time, over years, without anybody handing her a list.',
      ),
    ),
  );
}

const content: ChapterContent = {
  concept(ctx) {
    return el(
      'div',
      { class: 'stack' },

      // Riggs's own clip, and the only one in the course. It is absent from the page entirely until
      // the file exists — see `intro-video.ts` — so this line costs nothing until he records it.
      //
      // No teardown handle is kept, and none is needed: `concept()` returns a node rather than
      // mounting one (`types.ts`), and a `<video>` inside the returned tree stops when the tree is
      // dropped. That was not true of the audio player it replaces, which owned an `Audio` object
      // living outside the DOM.
      createIntroVideo({ t: (text) => ctx.t(text) }).root,

      proseFor(ctx, [
        '{rival} is a gamer. She has put hundreds of hours into this game and games like it, and somewhere in all of those hours she picked up a set of things the game never bothers to tell anybody.',
        'That set is the whole of the gap. It is not a talent and it is not something she is doing faster than you — it is a handful of facts about Mario Kart that you either know or you do not, and every single one of them can be written down.',
        'So that is what this is. Not all of Mario Kart: it is a big game, most of it does not matter, and nobody is going to make you fluent in it over one evening. **What you are getting is the short list** — the things that pay the most for the least learning, in order, with the biggest one first.',
      ]),

      skillsCard(ctx),

      proseFor(ctx, [
        'Free speed on the start line, before anybody has moved. Free speed on top of every ramp. Free speed painted on the road in boost pads, usually in a lane nobody drives in. Items that do more for you held than thrown. None of it is difficult, and all of it is invisible until somebody points at it.',
        `About an hour, and twelve minutes of that is a video. ${SKILLS.length} short chapters in order, and each one is two pages: the idea, and then a page where you get to try it, so it lands in your hands instead of just your head.`,
        'Most of the work is not in here, and that is on purpose. A keyboard cannot teach your thumbs. The last chapter is a training programme for the Switch — forty short sessions with one job each — and *that* is the real course. This website is the bit that tells you what to point yourself at.',
        'Nothing here can be failed. There are stars, because everything is nicer with stars, but nothing locks, nothing is marked, and you can stop halfway through and come back. It remembers where you were.',
        'One condition. When it works — and it is going to work — I want to hear exactly how {rival} took it. That is the whole fee.',
      ]),
    );
  },

  /**
   * The cold reading.
   *
   * No preamble card above the quiz. There was one, and measuring the page found it was 259px of a
   * 900px screen spent restating the blurb three inches above it — on the page Riggs picked out as
   * the worst offender for scrolling. The practice page's own one-line blurb says the one thing she
   * needs to know before she starts: most of these are meant to go wrong.
   */
  interactive(mount: HTMLElement, ctx: ChapterContext): Mounted {
    const t = (text: string): string => ctx.t(text);

    const quizMount = el('div');
    const done = el('div', { class: 'card stack' });
    done.hidden = true;
    let completed = false;

    const quiz = createBenchmark({
      mount: quizMount,
      ctx,
      onComplete: (summary) => {
        if (completed) return;
        completed = true;
        done.replaceChildren(
          el('p', { class: 'eyebrow' }, 'Filed away'),
          el('h3', null, t('That is your starting line')),
          el(
            'p',
            null,
            rich(
              t(
                `**${summary.correct} of ${BENCHMARK_TOTAL}**, and there is no version of that number worth being pleased or annoyed about — nobody had told you any of it yet, which is the only reason it was worth asking. It is a photograph of today, and it goes in the drawer.`,
              ),
            ),
          ),
          el(
            'p',
            { style: { marginBottom: '0' } },
            rich(
              t(
                'Every chapter from here takes one of those twelve slowly, at a quarter of the speed. You get the same twelve at the very end, next to this number. Chapter 1 is the start line, and it is the easiest free speed in the game.',
              ),
            ),
          ),
        );
        done.hidden = false;
        ctx.finish({ score: summary.correct });
      },
    });

    mount.replaceChildren(quizMount, done);

    return { dispose: () => quiz.dispose() };
  },
};

export default content;
