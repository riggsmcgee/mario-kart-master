/**
 * The course, as data. (2a1)
 *
 * Nine chapters in the order Riggs set on 2026-08-06: highest-impact skill first, the classroom
 * ending at Chapter 7 with "go and set up your Switch", and Chapter 8 as the material she keeps
 * after the browser is closed.
 *
 * Everything static about a chapter lives here — title, hook, video, the On-the-Switch card —
 * so the chapter list, the lap map and the router can all be built without loading a single
 * chapter module. The modules themselves are dynamically imported (see `chapter-registry.ts`),
 * which is what keeps Three.js out of the concept-only chapters.
 *
 * **Copy in this file uses `{name}` and `{rival}`.** Never a literal "Jodi" — see `types.ts`.
 *
 * **On the videos.** Eight links were verified live on 2026-08-06 (titles and channels recorded
 * in the plan's shortlist). Only four of them are general tutorials, and the plan maps those to
 * specific chapters; the other four are per-track deep dives that belong to Chapter 8. Chapters
 * with no verified video get no video rather than a plausible-looking one, and no `start` time
 * is invented anywhere — trimming to a timestamp means watching the video, which is step 2b9 and
 * belongs to a human.
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

export interface SwitchCard {
  title: string;
  steps: string[];
  /** The one line to remember if she reads nothing else. */
  rule?: string;
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
  onSwitch?: SwitchCard;
  stars?: StarRule;
  /** Chapter 8 renders itself; the template steps aside. */
  custom?: boolean;
}

export const CHAPTERS: ChapterMeta[] = [
  {
    id: 'ch0',
    number: 0,
    skill: 'The promise',
    title: 'So you want to beat {rival} at Mario Kart?',
    hook: '{rival} wins because she reacts faster than you. That is a real advantage and you are not going to beat it. So we are not going to try — we are going to beat her with something she has not got, which is homework.',
    video: {
      id: 'CpeyjM8dyuk',
      title: 'How to Play Mario Kart 8 Deluxe — The video I WISH I had when I first started',
      channel: 'Bayesic',
      note: 'Worth eight minutes of your life. Ignore the drifting section for now — that is Chapter 6, and it is optional.',
    },
  },
  {
    id: 'ch1',
    number: 1,
    skill: 'Start boost',
    title: 'The race is won before it starts',
    hook: 'There is free speed on the start line and most people never take it. It costs you nothing, it works with your settings, and it happens before {rival} has touched anything.',
    onSwitch: {
      title: 'Do this on the Switch',
      rule: 'Every single race. Start holding as the 2 disappears.',
      steps: [
        'Start any race. As the countdown shows 2 and it begins to vanish, hold A and keep holding it through GO.',
        'You will hear it and feel it — the kart lurches forward instead of pulling away normally.',
        'Do it every race for a week, including races you do not care about. This is the one skill that should become automatic.',
        'If you get it wrong, you simply start normally. There is no penalty for trying, so there is no reason not to.',
      ],
    },
    stars: { unit: 'good starts out of 5', two: 3, three: 4 },
  },
  {
    id: 'ch2',
    number: 2,
    skill: 'Item smarts',
    title: 'The banana behind you',
    hook: 'You do not need to aim anything. You do not need to be fast. You need to stop firing things the second you get them, and start carrying them behind you like a shield.',
    video: {
      id: 'KADBlsfmIjQ',
      title: 'FULL Beginner Guide | Tips to Help You WIN at Mario Kart 8 Deluxe!',
      channel: 'Shortcat',
      note: 'The item section is the part that matters to you. The shortcuts are not for us.',
    },
    onSwitch: {
      title: 'Do this on the Switch',
      rule: 'One banana held behind you beats ten mid-pack heroics.',
      steps: [
        'Play one whole race where you never fire a single item forwards. Hold everything behind you instead.',
        'Notice how often something hits the thing you are carrying rather than hitting you.',
        'The one exception: a red shell. Fire it, because it steers itself and does not need aiming.',
        'If you have two items and one is junk, spend the junk before the next item box — a full pair means the box gives you nothing.',
      ],
    },
    stars: { unit: 'shells blocked out of 6', two: 3, three: 5 },
  },
  {
    id: 'ch3',
    number: 3,
    skill: 'Ramp tricks',
    title: 'Every ramp is free speed',
    hook: 'Every time you go over a bump, a ramp or a jump, there is a boost sitting there waiting. One button, at the right moment, and you land going faster than you took off.',
    onSwitch: {
      title: 'Do this on the Switch',
      rule: 'If the kart leaves the ground, press the button.',
      steps: [
        'Press R (or whichever shoulder button you have) right as the kart reaches the top of a ramp.',
        'You will see the kart do a flip or a spin. That flourish is the tell — no flourish means no boost.',
        'Practise on one track until you get it on every ramp, then stop thinking about it.',
        'Getting it wrong costs you nothing at all. A missed trick is just a normal jump.',
      ],
    },
    stars: { unit: 'clean tricks out of 6', two: 3, three: 5 },
  },
  {
    id: 'ch4',
    number: 4,
    skill: 'Boost pads',
    title: 'The fast way round is not the tight way round',
    hook: 'The orange arrows on the road are free speed, and here is the thing nobody tells you: they are often not on the line you would naturally drive. Knowing where they are is worth more than driving well.',
    onSwitch: {
      title: 'Do this on the Switch',
      rule: 'Go the long way if the long way is boosted.',
      steps: [
        'On Mario Kart Stadium, after the first right turn, take the OUTER lane. The dash panels and the coins are both out there.',
        'Drive one lap where your only goal is hitting every orange arrow you can find. Ignore your position entirely.',
        'Do that on each of the four Mushroom Cup tracks once. You are building a map, not practising driving.',
        '{rival} is hugging the inside because it looks shorter. Let her.',
      ],
    },
    stars: { unit: 'pads hit out of 8', two: 5, three: 7 },
  },
  {
    id: 'ch5',
    number: 5,
    skill: 'Lines and coins',
    title: 'What Kendahl already knows',
    hook: 'Kendahl does not drift. She does not defend with items. She takes no risks at all. And she beats {rival} regularly, because she drives a tidy line and picks up coins. This is the highest-scoring chapter in the whole course.',
    video: {
      id: 'yRuAdvRxCQA',
      title: "Mario Kart 8 Deluxe Complete Beginner's Guide 2023",
      channel: 'SwitchPlay Gaming',
      note: 'The coins section is the one to watch. Ten coins is a real speed increase and almost nobody bothers.',
    },
    onSwitch: {
      title: 'Do this on the Switch',
      rule: 'Ten coins by the end of lap one. Every race.',
      steps: [
        'Run one solo 100cc race where the only goal is finishing with ten coins. Do not think about position.',
        'Time Trials on Mario Kart Stadium and Water Park. Race your own ghost and try to beat it — not a record, just yesterday-you.',
        'Coins are speed AND armour: you lose three every time something hits you, which is another reason to carry that banana.',
        'Follow the same line every lap until it feels boring. Boring is the goal.',
      ],
    },
    stars: { unit: 'coins held at the line', two: 6, three: 10 },
  },
  {
    id: 'ch6',
    number: 6,
    skill: 'The drift',
    title: 'Drifting, explained once',
    hook: 'This is the one everybody talks about, and it is the one you need least. Here is what it actually is, why your settings still allow most of it, and why you should learn it last if at all.',
    video: {
      id: '_21NuS0xjfc',
      title: 'Everything You Need to Know About Drifting in Mario Kart 8 Deluxe',
      channel: 'Bayesic',
      note: 'This gets technical fast. Watch the first couple of minutes; the purple sparks near the end are switched off by your steering setting anyway.',
    },
    onSwitch: {
      title: 'Do this on the Switch — but only when the rest is automatic',
      rule: 'Blue sparks then orange sparks, on long corners only.',
      steps: [
        'Hold the drift button through one long sweeping corner. Sweet Sweet Canyon has the best ones in your cup.',
        'Watch for blue sparks, then orange. Let go and you get a boost.',
        'Do not attempt this in tight corners or in traffic. It is worth nothing there and it costs you your line.',
        'If this feels like too much, skip it. Kendahl does.',
      ],
    },
  },
  {
    id: 'ch7',
    number: 7,
    skill: 'Your kart',
    title: 'Pick your weapon',
    hook: 'One decision, made once, and then never again. At 100cc with items on, the kart that recovers quickly beats the kart that goes fastest — because you are going to get hit, and what matters is how quickly you are back up to speed.',
    onSwitch: {
      title: 'Do this on the Switch — right now, before you forget',
      rule: 'Set it once. Never think about it again.',
      steps: [
        'Go to the character select screen and set your combo up now, while it is fresh.',
        'The headline pick: Yoshi, Teddy Buggy, Roller tyres, Cloud glider.',
        'Roller tyres are the important part. If you change nothing else, change the tyres.',
        'That is the classroom finished. Chapter 8 is what you take with you.',
      ],
    },
  },
  {
    id: 'ch8',
    number: 8,
    skill: 'The plan',
    title: 'The {rival} Plan',
    hook: 'Everything above was the classroom. This is the training programme, the cup you are going to own, and a map of all four of its tracks. Print it and stick it on the fridge.',
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
