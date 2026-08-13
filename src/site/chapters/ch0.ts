/**
 * Chapter 0: the goal. (2b1)
 *
 * The only chapter with nothing to do in it, which makes it the one most likely to be closed. It
 * has exactly one job: earn the next hour of her evening before she has spent any of
 * them. Everything here is argument, and the argument is made in a deliberate order.
 *
 * **Concede first.** The hook already admits {rival} is faster; this section refuses to walk that
 * back. A present that opens by telling her the problem is not really a problem reads as flattery
 * and gets closed politely. Only after the concession does the turn land — reactions are one way
 * to win a race, preparation is another, and only one of them can be practised at a kitchen
 * table on a Tuesday.
 *
 * **Kendahl carries the paragraph that matters.** Everything else on this page is a nephew's
 * claim. Kendahl is evidence she already has: same house, same sofa, same sister, no flashy
 * technique anywhere, and she wins anyway. Evidence-she-can-check beats expertise-she-cannot,
 * which is why the case study appears in the intro and not only in Chapter 5 where it is taught.
 *
 * **The chapter list is read from CHAPTERS rather than retyped.** Copy that duplicates data
 * drifts, and a promise that lists eight things and then delivers seven is a small betrayal at
 * the exact moment trust is being built. The count in the sentence is computed for the same
 * reason.
 *
 * **The practice page is five questions about the video.** (Riggs, 2026-08-12.) This chapter used
 * to have nothing to do at all, on the argument that a chapter selling "the browser part is small"
 * should not open with a browser exercise. That argument survives, and the lesson page is still
 * pure pitch.
 *
 * It is no longer motionless, though, and the distinction is worth keeping straight. The opener
 * (`ch0-opener.ts`, 3b1) animates, but it is not an exercise: it asks for no input, scores
 * nothing, and can be scrolled past without losing anything. What the old note was protecting was
 * the rule that this page must not *demand* anything of her before it has earned the right to.
 * A picture that argues on her behalf does not.
 *
 * What changed is the video's job. It used to be one of eight; it is now the anchor of the whole
 * course, covering in twelve minutes what Chapters 1 to 4 then take slowly. That makes "did she
 * watch it" a question worth asking, and the five cards are drawn one per section from the
 * uploader's own chapter markers — the start line, coins, tricks, drifting, items — so a right
 * answer confirms she watched and a wrong one teaches the thing anyway.
 *
 * It is not a gate and it is not marked. Every wrong answer explains itself warmly and she can
 * walk straight past it, which is the rule everywhere else in this course too.
 */

import { CHAPTERS } from '../../data/chapters';
import fromTheVideo from '../../data/quiz/from-the-video.json';
import { Quiz, fillQuiz, parseQuiz } from '../../ui/quiz';
import '../../ui/quiz.css';
import { el, prose, rich } from '../dom';
import type { ChapterContent, ChapterContext, Mounted } from '../types';
import { createOpener } from './ch0-opener';

/**
 * `quiz.css` was written for the Phase 1 testbed and reaches for its palette variables. Mapping
 * them onto the house tokens here scopes the bridge to the element the quiz renders into, exactly
 * as Chapter 2 does — one deck, two chapters, one mapping each and no global override.
 */
const QUIZ_TOKENS = [
  '--accent: var(--boost)',
  '--line: var(--rule)',
  '--muted: var(--ink-soft)',
  '--fg: var(--ink)',
  '--bg: #3a1c00',
].join('; ');

/** Parsed at import, so a typo in the deck fails loudly rather than drawing a blank card. */
const DECK = parseQuiz(fromTheVideo);

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
        'Not one of those is a reflex. {rival} has never had to learn a single one of them, because she has never needed to.',
      ),
    ),
  );
}

const content: ChapterContent = {
  concept(ctx) {
    return el(
      'div',
      { class: 'stack' },

      proseFor(ctx, [
        'Reaction speed is one way to win a race. It is the only one {rival} has got.',
      ]),

      // The picture goes here rather than at the top or the bottom, and the position is the
      // argument. (3b1.)
      //
      // The line above is the concession — she really is faster — and the drawing is the turn.
      // Putting it before the concession would have it contradicting a claim nobody had made yet;
      // putting it after the next four paragraphs would bury the one moment on this site that is
      // worth watching, on the page most likely to be closed early.
      createOpener({ t: (text) => ctx.t(text) }),

      proseFor(ctx, [
        'Because most of Mario Kart is not reflexes at all. Free speed on the start line, before anybody has moved. Free speed on every ramp. Free speed painted on the road in boost pads, usually in a lane nobody drives in. Items that do more for you held than thrown.',
        'None of that needs fast hands. All of it needs someone to have mentioned it to you once — and nobody has mentioned it to {rival}. Why would they? She is winning.',
        'So here is the deal, {name}. She keeps her reactions. You quietly collect **everything else**.',
      ]),

      skillsCard(ctx),

      proseFor(ctx, [
        `About an hour, and twelve minutes of that is a video. ${SKILLS.length} short chapters in order, and each one is two pages: the idea, and then a page where you get to try it, so it lands in your hands instead of just your head.`,
        'Most of the work is not in here, and that is on purpose. A keyboard cannot teach your thumbs. The last chapter is a training programme for the Switch — forty short sessions with one job each — and *that* is the real course. This website is the bit that tells you what to point yourself at.',
        'Nothing here can be failed. There are stars, because everything is nicer with stars, but nothing locks, nothing is marked, and you can stop halfway through and come back. It remembers where you were.',
        'One condition. When it works — and it is going to work — I want to hear exactly how {rival} took it. That is the whole fee.',
      ]),
    );
  },

  interactive(mount: HTMLElement, ctx: ChapterContext): Mounted {
    const t = (text: string): string => ctx.t(text);

    // No preamble card above the quiz.
    //
    // There was one, and measuring the page found it was 259px of a 900px screen spent restating
    // the blurb three inches above it — on the page Riggs picked out as the worst offender for
    // scrolling. The practice page's own one-line blurb already says "five quick ones, nothing is
    // marked", so the card was pure duplication with a heading on it.
    //
    // What it was genuinely for is the *ending*, and that still exists: on completion the summary
    // replaces the quiz rather than sitting above it, which is the same information in the place
    // she is already looking.
    const quizMount = el('div', { attrs: { style: QUIZ_TOKENS } });
    const done = el('div', { class: 'card stack' });
    done.hidden = true;
    let completed = false;

    const quiz = new Quiz({
      mount: quizMount,
      questions: fillQuiz(DECK, t),
      // Never a buzzer on a wrong answer. The plan is explicit that nothing here marks her, and
      // this is the chapter where that promise is being made rather than kept.
      onAnswer: (result) => ctx.sfx.play(result.correct ? 'right' : 'nudge'),
      onComplete: (summary) => {
        if (completed) return;
        completed = true;
        done.replaceChildren(
          el('p', { class: 'eyebrow' }, 'Straight off the video'),
          el('h3', null, t('That is the hard part over')),
          el(
            'p',
            null,
            rich(
              t(
                `**${summary.correct} of ${summary.total}**, and it genuinely does not matter which — every one of those five gets a chapter of its own from here, at a quarter of the speed. Chapter 1 is the start line, and it is the easiest free speed in the game.`,
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
