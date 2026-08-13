/**
 * The course, as data. (2a1)
 *
 * Nine chapters in the order Riggs set on 2026-08-06: highest-impact skill first, the classroom
 * ending at Chapter 7 with "go and set up your Switch", and Chapter 8 as the material she keeps
 * after the browser is closed.
 *
 * Everything static about a chapter lives here — title, hook, video, whether it has a practice
 * page — so the chapter list, the lap map and the router can all be built without loading a
 * single chapter module. The modules themselves are dynamically imported (see
 * `chapter-registry.ts`), which is what keeps Three.js out of the concept-only chapters.
 *
 * **Copy in this file uses `{name}` and `{rival}`.** Never a literal "Jodi" — see `types.ts`.
 *
 * **On the videos. (Riggs, 2026-08-12 — this replaces the 2026-08-06 shortlist.)**
 *
 * The old rule was "one general tutorial per chapter where one exists", and it produced exactly
 * the problem Riggs called out on playtest: a chapter about the start boost sending her to a
 * thirty-seven-minute omnibus that covers the start boost somewhere in the middle. A video that
 * has to be scrubbed through is a video she will not watch.
 *
 * The rule now is **one mechanic per video, or no video at all.** A chapter with no
 * single-purpose video available gets none — the concept section and the drill are the teaching,
 * and the intro video in Chapter 0 already covers the fundamentals in one sitting.
 *
 * What survived that rule, and why. Every timestamp below is the uploader's own chapter marker,
 * read off the video page on 2026-08-12 rather than guessed:
 *
 *  - **Ch0 — Bayesic, "How to Play Mario Kart 8 Deluxe"** (12m32s). The anchor. Its own sections
 *    run Basics / Essential mechanics / Item management / Putting it together, which is the whole
 *    of Chapters 1–4 in one place from somebody who explains well.
 *  - **Ch5 — Bayesic, "What is the point of COINS?"** (5m00s). One mechanic, five minutes, and it
 *    ends by costing coins out in seconds-per-race. It is linked from the intro video's own
 *    description, which is how it was found.
 *  - **Ch6 — Bayesic, "Everything You Need to Know About Drifting"** (13m3s). Starts at 1:31, the
 *    uploader's "Basics of Drifting" mark. The two sections after 5:03 are competitive tech and
 *    she is told to stop there.
 *
 * All three are the same person, which was not the plan and is better than the plan: one voice
 * across the course reads as a recommendation rather than a pile of search results.
 *
 * **Cut, with reasons.** Shortcat's "FULL Beginner Guide" was Chapter 2's item video — it is
 * thirty-seven minutes long and reaches items at 11:03. SwitchPlay's "Complete Beginner's Guide"
 * was Chapter 5's; it is a nine-minute tour of the entire game, and its description states it was
 * narrated by an AI voice. On a present, that one disqualifies itself.
 */

export interface VideoRef {
  /** YouTube id. Embedded as `https://www.youtube.com/embed/<id>`. */
  id: string;
  title: string;
  channel: string;
  /** Seconds. Only ever set by a human who has watched it (2b9). */
  start?: number;
  /** Shown under the embed, in her voice: which bits of this apply to her. */
  note?: string;
}

/**
 * The practice page. (Riggs, 2026-08-12.)
 *
 * Every chapter used to be one long scroll: concept, then video, then a drill, then a card
 * telling her what to go and do on the Switch. Seeing it rendered settled it — the drill turned
 * up two thirds of the way down a page she was still reading, and reading and playing want
 * different postures.
 *
 * So a chapter is now two pages. **Learn** is prose and a video and nothing that moves. **Try it**
 * is the drill, on its own, with the chapter's one idea restated above it in a sentence. The split
 * is here in the data rather than inferred from whether a module exports an `interactive`, because
 * the home page and the router both need to know a practice page exists without loading the
 * chapter's chunk — which is the whole reason Three.js stays out of the concept chapters.
 */
export interface Drill {
  /** Heading on the practice page. Names the exercise, not the skill. */
  title: string;
  /** One line under it: what she is actually about to do. */
  blurb: string;
}

/**
 * How a drill earns its stars. (Answers WORKLOG Q7, which the plan left open.)
 *
 * Two rules behind every threshold below. One star is for *finishing*, never for performing —
 * the plan says every interactive ends on a win, so turning up has to be worth something. And
 * three stars is set at "she has clearly got it", not at mastery: this is a 2-to-5 minute
 * teaching moment, and a third star she can never reach is a third star that says she failed.
 */
export interface StarRule {
  /** What the drill counts, in her words. Shown on the results card. */
  unit: string;
  /** Score needed for two stars, then three. One star is awarded for finishing at all. */
  two: number;
  three: number;
}

export interface ChapterMeta {
  id: string;
  number: number;
  /** Short label for the lap map and the chapter list. */
  skill: string;
  title: string;
  /** One or two lines. The reason to care, before any teaching happens. */
  hook: string;
  video?: VideoRef;
  /** Present when this chapter has a practice page at `#/chapter/<id>/try`. */
  drill?: Drill;
  stars?: StarRule;
  /** Chapter 8 renders itself; the template steps aside. */
  custom?: boolean;
}

export const CHAPTERS: ChapterMeta[] = [
  {
    id: 'ch0',
    number: 0,
    skill: 'The goal',
    title: 'So you want to beat {rival} at Mario Kart?',
    hook: '{rival} is faster than you. So we are going to beat her with homework instead.',
    video: {
      id: 'CpeyjM8dyuk',
      title: 'How to Play Mario Kart 8 Deluxe — The video I WISH I had when I first started',
      channel: 'Bayesic',
      note: 'Twelve minutes, and the only long one in the whole course. Watch it now and the next six chapters will feel like things you already half knew. He is the only person you will hear from besides me.',
    },
    drill: {
      title: 'Five from the video',
      blurb:
        'Five quick ones, straight off the back of that video. Nothing is marked and nothing is locked — a wrong answer just explains itself.',
    },
    stars: { unit: 'right out of 5', two: 3, three: 4 },
  },
  {
    id: 'ch1',
    number: 1,
    skill: 'Start boost',
    title: 'The strongest start on the grid',
    hook: 'There is free speed sitting on the start line, and almost nobody picks it up.',
    drill: {
      title: 'Five starts',
      blurb: 'A countdown, five times over. Hold as the 2 vanishes, and keep holding through GO.',
    },
    stars: { unit: 'good starts out of 5', two: 3, three: 4 },
  },
  {
    id: 'ch2',
    number: 2,
    skill: 'Item smarts',
    title: 'The banana behind you',
    hook: 'Stop throwing things. Carry them behind you instead.',
    drill: {
      title: 'Hold the banana',
      blurb: 'Six shells are coming. Hold your banana behind you and they hit that instead of you.',
    },
    stars: { unit: 'shells blocked out of 6', two: 3, three: 5 },
  },
  {
    id: 'ch3',
    number: 3,
    skill: 'Ramp tricks',
    title: 'Every ramp is free speed',
    hook: 'Every ramp has a free boost hidden in it. One button, at the top.',
    drill: {
      title: 'Six ramps',
      blurb:
        'Six ramps, one lap. Press the button at the top of each one and watch for the flourish — no flourish, no boost.',
    },
    stars: { unit: 'clean tricks out of 6', two: 3, three: 5 },
  },
  {
    id: 'ch4',
    number: 4,
    skill: 'Boost pads',
    title: 'The fast way round is not the tight way round',
    hook: 'The fast way round is not the tight way round.',
    drill: {
      title: 'Find the boost pads',
      blurb: 'Eight of them, and several are nowhere near the line you would drive by instinct.',
    },
    stars: { unit: 'pads hit out of 8', two: 5, three: 7 },
  },
  {
    id: 'ch5',
    number: 5,
    skill: 'Lines and coins',
    title: 'The fast way round a corner',
    hook: 'Wide going in. Tight through the middle. Wide coming out.',
    video: {
      id: 'IlQRlP7FAlc',
      title: 'What is the point of COINS in Mario Kart 8 Deluxe?',
      channel: 'Bayesic',
      note: 'Five minutes, one subject. He works out at the end roughly how many seconds a race full coins is worth, which is the number nobody ever tells you.',
    },
    drill: {
      title: 'Follow the line',
      blurb:
        'There is a line painted on the road. Sit on it. The score is the share of the lap you spend on it, so smooth beats quick every single time.',
    },
    stars: { unit: '% of the lap on the line', two: 55, three: 75 },
  },
  {
    id: 'ch6',
    number: 6,
    skill: 'The drift',
    title: 'Drifting is a boost you steer with',
    hook: 'A drift is a boost you make out of a corner you had to take anyway.',
    video: {
      id: '_21NuS0xjfc',
      title: 'Everything You Need to Know About Drifting in Mario Kart 8 Deluxe',
      channel: 'Bayesic',
      // 1:31 is the uploader's own "Basics of Drifting" mark; 5:03 begins "Mini Turbo Deep Dive",
      // which is competitive tech and not for her. Both read off the video page, not guessed.
      start: 91,
      note: 'It starts you at the good bit. **Stop at about five minutes** — after that it turns into a deep dive for people who play this for money.',
    },
    drill: {
      title: 'Six corners',
      blurb:
        'Hop into the corner, hold it, watch the sparks turn from blue to orange, and let go on the way out. Six chances, and a missed one costs you nothing.',
    },
    stars: { unit: 'mini-turbos out of 6', two: 3, three: 5 },
  },
  {
    id: 'ch7',
    number: 7,
    skill: 'Your kart',
    title: 'Pick your weapon',
    hook: 'Pick the kart that gets going again fastest, not the one that goes fastest.',
    drill: {
      title: 'Build your kart',
      blurb:
        'Three builds that all work, and the numbers behind them. Pick one and the plan at the end of the course will remember it.',
    },
  },
  {
    id: 'ch8',
    number: 8,
    skill: 'The plan',
    title: 'The {rival} Plan',
    hook: 'Forty sessions. One a day, weekdays off at the weekend, one job each.',
    custom: true,
  },
];

export const CHAPTER_IDS = CHAPTERS.map((chapter) => chapter.id);

export function getChapter(id: string): ChapterMeta | undefined {
  return CHAPTERS.find((chapter) => chapter.id === id);
}

export function nextChapter(id: string): ChapterMeta | undefined {
  const index = CHAPTERS.findIndex((chapter) => chapter.id === id);
  return index >= 0 ? CHAPTERS[index + 1] : undefined;
}

export function previousChapter(id: string): ChapterMeta | undefined {
  const index = CHAPTERS.findIndex((chapter) => chapter.id === id);
  return index > 0 ? CHAPTERS[index - 1] : undefined;
}

/** The last chapter. Finishing it is what unlocks the plan as her landing page. */
export const FINAL_CHAPTER_ID = 'ch8';

/**
 * Stars for a score, against a chapter's rule. One for finishing, which is the plan's
 * "every interactive ends on a win" made concrete.
 */
export function starsFor(meta: ChapterMeta, score: number): number {
  const rule = meta.stars;
  if (!rule) return 0;
  if (score >= rule.three) return 3;
  if (score >= rule.two) return 2;
  return 1;
}
