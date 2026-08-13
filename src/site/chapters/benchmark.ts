/**
 * The benchmark: twelve questions, asked twice. (Riggs, 2026-08-13.)
 *
 * "I think we should have her take a big quiz at the beginning and at the end to see how much she
 * learned." That is the whole brief, and it is a better idea than it looks, because it is the only
 * thing on this website that measures the website. Nine chapters, forty sessions and a stack of
 * drills all rest on an assumption nobody has ever checked: that any of it lands. Two numbers with
 * an evening between them check it.
 *
 * **Where the two halves live.** Chapter 0's practice page and the front of Chapter 8 — the same
 * deck, the same order, the same wording. Neither got a route of its own, which would have meant
 * teaching the router, the home page and the lockout about a new kind of page and buying nothing:
 * `#/chapter/ch0/try` already exists, and Chapter 8 already renders itself. So the before reading is
 * `ch0`'s `bestScore` and the after reading is `ch8`'s, and no new storage was invented for either.
 *
 * The second half stands *in front of* the plan rather than beside it (Riggs, 2026-08-13: "have the
 * quiz be the first thing in the chapter"). It had been a card near the top of a page whose next
 * four screens are the thing she came for, which is a good way for a feature to be quietly never
 * used. See `ch8.ts`.
 *
 * **Both runs explain every answer, and that was argued about.** The first version of this made the
 * cold run blind — no verdict, no reason, next card — so that the score at the end of Chapter 8
 * measured the course rather than a memory of twelve cards. Riggs overruled it the same day, with
 * the better evidence: "telling them why the answer was right or wrong on each question was a great
 * addition that Katharine learned a lot from. I'd like to see that return."
 *
 * He is right, and the reason is that the two things were never equally valuable. A clean
 * measurement is worth something to whoever is reading the numbers afterwards. A wrong answer
 * explained on the spot is worth something to the person the website was built for, at the moment
 * she is most likely to take it in — twelve minutes into a course she has not committed to yet. The
 * comparison at the end survives it; it is simply a smaller claim, and the copy at both ends says
 * what it is rather than pretending the second run is untouched.
 *
 * **Neither half is marked.** Chapter 0's meta carries no star rule: stars on a cold guess would
 * dress a measurement up as a result, on the one page in the course where getting things wrong is
 * the intended outcome. The score is kept because it is half of a comparison, and it is never once
 * called a score to her face.
 *
 * **The deck is the course, one or two cards per chapter.** Five of the twelve are the old
 * `from-the-video` deck, which asked about the intro video's five sections; those five sections
 * were the course's own subjects, so the questions transferred with barely a word changed and the
 * old file is gone. The other seven cover the chapters the video does not: boost pads worth a
 * detour, the line through a corner, when to let a drift go, and which kart to be in.
 */

import benchmarkDeck from '../../data/quiz/benchmark.json';
import type { ProgressStore } from '../../backend/progress';
import { Quiz, fillQuiz, parseQuiz, type QuizSummary } from '../../ui/quiz';
import { el } from '../dom';
import type { ChapterContext } from '../types';
import '../../ui/quiz.css';

/** Parsed at import, so a typo in the deck fails loudly rather than drawing a blank card. */
const DECK = parseQuiz(benchmarkDeck);

export const BENCHMARK_TOTAL = DECK.length;

/** Chapter 0 holds the cold reading; Chapter 8 holds the one taken after the course. */
export const BEFORE_ID = 'ch0';
export const AFTER_ID = 'ch8';

/**
 * `quiz.css` was written for the Phase 1 testbed and reaches for its palette variables. Mapping
 * them onto the house tokens here scopes the bridge to the element the quiz renders into, exactly
 * as Chapters 2 and 4 do. `--bg` is the *text* colour of the next button, hence the dark brown.
 */
const QUIZ_TOKENS = [
  '--accent: var(--boost)',
  '--line: var(--rule)',
  '--muted: var(--ink-soft)',
  '--fg: var(--ink)',
  '--bg: #3a1c00',
].join('; ');

/**
 * Her cold reading, or null if she has never taken it.
 *
 * Null is a real case and has to be handled rather than defaulted to zero: she can reach Chapter 8
 * having skipped Chapter 0's practice, and "you went from 0 to 11" would be a made-up number
 * printed on the most important card in the course.
 */
export function beforeScore(progress: ProgressStore): number | null {
  return progress.getChapter(BEFORE_ID).bestScore;
}

export interface BenchmarkOptions {
  mount: HTMLElement;
  ctx: ChapterContext;
  onComplete: (summary: QuizSummary) => void;
}

/** The deck, mounted. Returns the quiz so the caller can dispose it. */
export function createBenchmark(options: BenchmarkOptions): Quiz {
  const { mount, ctx, onComplete } = options;
  const t = (text: string): string => ctx.t(text);

  const host = el('div', { attrs: { style: QUIZ_TOKENS } });
  mount.append(host);

  return new Quiz({
    mount: host,
    questions: fillQuiz(DECK, t),
    // Never a buzzer on a wrong answer. Same rule as every other deck in the course: the reply is
    // the teaching, and marking her is not.
    onAnswer: (result) => ctx.sfx.play(result.correct ? 'right' : 'nudge'),
    onComplete,
  });
}
