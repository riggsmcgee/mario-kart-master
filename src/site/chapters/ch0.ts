/**
 * Chapter 0: the promise. (2b1)
 *
 * The only chapter with nothing to do in it, which makes it the one most likely to be closed. It
 * has exactly one job: earn the next forty minutes of her evening before she has spent any of
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
 * should not open with a browser exercise. That argument survives — the lesson page is still pure
 * pitch, and nothing moves on it.
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

function kendahlCard(ctx: ChapterContext): HTMLElement {
  return el(
    'div',
    { class: 'card' },
    el('p', { class: 'eyebrow' }, 'Exhibit A'),
    el('h3', null, ctx.t('It already works in your house')),
    proseFor(ctx, [
      "Kendahl doesn't drift. She doesn't defend with items. She takes no risks whatsoever. She drives a tidy line, picks up her coins, finishes the lap — and she beats {rival} regularly.",
      'Same sofa, same sister, nothing flashy. She is not out-reacting anybody. She just knows where she is going and quietly refuses to throw races away.',
      '*That* is the thing we are going to teach you, in pieces, one chapter at a time.',
    ]),
  );
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
        'Reaction speed is one way to win a race. It is not the only way, and it is the only one {rival} has got.',
        'Because most of Mario Kart is not reflexes at all. There is free speed sitting on the start line before anybody has moved. There is free speed on every ramp. There is free speed painted on the road in orange arrows, usually in a lane nobody is driving in. There are items that do far more for you held than thrown.',
        'None of that needs fast hands. All of it needs someone to have mentioned it to you once.',
        'Nobody has mentioned it to {rival}. Why would they? She is winning.',
      ]),

      kendahlCard(ctx),

      proseFor(ctx, [
        'So here is the deal, {name}. She keeps her reactions — you were never getting those anyway. You go and quietly collect **everything else**, and the race stops being a fight you were always going to lose.',
      ]),

      skillsCard(ctx),

      proseFor(ctx, [
        `Forty minutes, give or take. ${SKILLS.length} short chapters, in order, each one a small idea and one thing to try so it lands in your hands instead of just your head.`,
        'Most of the work is not in here, and that is on purpose. A keyboard cannot teach your thumbs. Every chapter ends with a card telling you exactly what to go and do on the Switch, and *that* card is the real course — this website is just the bit that tells you what to point yourself at.',
        'Nothing here can be failed. There are stars, because everything is nicer with stars, but nothing locks, nothing is marked, and you can stop halfway through and come back. It remembers where you were.',
        'One condition. When it works — and it is going to work — I want to hear exactly how {rival} took it. That is the whole fee.',
      ]),
    );
  },

  interactive(mount: HTMLElement, ctx: ChapterContext): Mounted {
    const t = (text: string): string => ctx.t(text);

    const heading = el('h3', null, t('Five things he mentioned'));
    const comment = el(
      'p',
      null,
      rich(
        t(
          'One from each part of the video. **Nothing here is marked** — get one wrong and it just tells you the answer, which is the entire point of a first chapter.',
        ),
      ),
    );
    const board = el(
      'div',
      { class: 'card stack' },
      el('p', { class: 'eyebrow' }, 'Straight off the video'),
      heading,
      comment,
    );

    const quizMount = el('div', { attrs: { style: QUIZ_TOKENS } });
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
        heading.textContent = t('That is the hard part over');
        comment.replaceChildren(
          rich(
            t(
              `**${summary.correct} of ${summary.total}**, and it genuinely does not matter which — every one of those five gets a chapter of its own from here, at a quarter of the speed. Chapter 1 is the start line, and it is the easiest free speed in the game.`,
            ),
          ),
        );
        ctx.finish({ score: summary.correct });
      },
    });

    mount.replaceChildren(board, quizMount);

    return { dispose: () => quiz.dispose() };
  },
};

export default content;
