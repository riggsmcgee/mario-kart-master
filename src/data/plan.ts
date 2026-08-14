/**
 * The practice programme, as data. (4b1)
 *
 * Chapter 8 is the only chapter that has to survive the browser being closed, so the programme is
 * authored here as plain typed data rather than as page markup: the same content renders twice —
 * once as the interactive page and once as the one-pager that goes on the fridge — and two
 * renderings of one source is the only version of that idea where the fridge copy cannot quietly
 * drift out of date.
 *
 * **Every checkable item has a stable string id, and ids are append-only.**
 *
 * Those ids are the key each tick is stored under. The stored entry *is* the tick. Renaming
 * `plan.skill.ch1.hold` — or renumbering a list so that item three becomes item four — does not
 * rename anything already saved: it silently unticks a box she earned, with no error anywhere. So
 * ids are semantic rather than positional (`plan.skill.ch5.ghost-stadium`, never `plan.item.14`),
 * which means the display order can be shuffled freely and nothing has to be renumbered. Adding is
 * free. Deleting leaves a harmless orphan entry. Renaming is the one move that costs something, so
 * it does not happen.
 *
 * **Everything checkable is a one-off.** A tick has no notion of a week and no reset, so a
 * box that needs unticking every Monday would be a chore rather than a plan. The repeating work —
 * the weekly rhythm itself — is described and never ticked; each drill below is instead phrased
 * as a first time ("play one whole race where…"), which is genuinely done once and then becomes
 * how she plays.
 *
 * Copy uses `{name}` and `{rival}`, never a literal name (4e1). Other family members are named
 * outright, which is the whole joke in a couple of places.
 */

import { allSessionIds } from './regimen';

/** One tickable line of the programme. */
export interface PlanItem {
  /** Stable, semantic, append-only. See the file header before you touch one. */
  id: string;
  text: string;
  /** A quieter second line. Why it works, or what it will feel like. */
  detail?: string | undefined;
}

export interface CupStage {
  title: string;
  goal: string;
  items: PlanItem[];
}

export interface Milestone {
  id: string;
  title: string;
  blurb: string;
  /** Chapter to go back to when this milestone is not happening. */
  revisit: string;
  revisitWhy: string;
}

export interface Combo {
  /** The archetype's name, e.g. "The Comfy Speedster". */
  name: string;
  character: string;
  kart: string;
  tyres: string;
  glider: string;
}

// --- the weekly rhythm ------------------------------------------------------

/**
 * How the grid is meant to be used, in four lines. (Rewritten 2026-08-12.)
 *
 * This used to carry its own tickable items — "pick which days are Mario Kart days" and so on.
 * They are gone, because the grid in `regimen.ts` now *is* the schedule and a box that says "make
 * a schedule" sitting above forty boxes containing the schedule is a box that makes the plan look
 * like homework about homework.
 */
export const RHYTHM = {
  sessions: 'One session a day',
  length: 'fifteen to twenty minutes, weekdays only',
  lines: [
    'One box a day, five days a week, weekends off. Forty boxes, so about two months — but there are no dates anywhere on this page and there never will be. Do two in an evening if it is going well. Miss a fortnight and nothing has gone wrong; the next box is still simply the next box.',
    'Short and often beats long and rare. This is your hands learning a thing, and hands learn overnight — twenty minutes on four evenings will beat two hours on a Sunday, every time.',
    'A session is the one job in the box, then a couple of races for fun. Never the other way round: once the fun races start, the practising is finished for the night, and that is completely fine.',
    'Time Trials only come at 150cc or 200cc — take 150cc. It is quicker than the 100cc you are training for, which is fine and is the point: the races feel slow and roomy afterwards.',
    '**This website is not the training.** The Switch is the training. Come back here to find out what tonight is, and in week three for the track deep dives.',
  ],
};

// --- the fundamentals -------------------------------------------------------

/**
 * The whole course, one line per chapter. (Added 2026-08-12 for the printable sheet.)
 *
 * Riggs asked for the fundamentals to go on paper alongside the grid and the kart, and this is
 * that list — deliberately the *shortest* possible form of each chapter, because a printed sheet
 * competes with a television and loses any argument that runs past one line.
 *
 * It is authored here rather than derived from the chapter hooks. The hooks are written to make
 * her want to read on, which is a different job from reminding her of something she already
 * knows; "there is free speed on the start line and most people never take it" sells the chapter,
 * and "hold as the 2 vanishes" is what belongs on the fridge.
 */
export interface Fundamental {
  chapterId: string;
  skill: string;
  /** Imperative, present tense, no more than a dozen words. */
  rule: string;
}

export const FUNDAMENTALS: Fundamental[] = [
  { chapterId: 'ch1', skill: 'Start boost', rule: 'Hold A as the 2 vanishes. Every single race.' },
  {
    chapterId: 'ch2',
    skill: 'Item smarts',
    rule: 'Hold your item behind you. Fire nothing but red shells.',
  },
  {
    chapterId: 'ch3',
    skill: 'Ramp tricks',
    rule: 'If the kart leaves the ground, press the trick button.',
  },
  {
    chapterId: 'ch4',
    skill: 'Boost pads',
    rule: 'Go the long way if the long way is boosted. Outer lane on Stadium.',
  },
  {
    chapterId: 'ch5',
    skill: 'Lines and coins',
    rule: 'Wide, tight, wide. Ten coins by the end of lap one.',
  },
  {
    chapterId: 'ch6',
    skill: 'The drift',
    rule: 'Long corners only. Blue sparks, then orange, then let go.',
  },
  {
    chapterId: 'ch7',
    skill: 'Your kart',
    rule: 'Roller tyres. Set it once and never think about it again.',
  },
];

// --- owning the cup ---------------------------------------------------------

export const CUP_TRAINING = {
  headline: 'Mushroom Cup. 100cc. Grand Prix.',
  lines: [
    'The computers are the sparring partner, and 100cc is the right speed to spar at. Grand Prix has no easy or hard setting to choose — the engine class does that job, and the quicker the karts, the quicker the computers. Do not drop to 50cc: 50cc lets you win while driving badly, which teaches you that driving badly works.',
    'Run the whole cup, all four races, in order. Not single races — the cup, because the cup is what you are going to play against her, and a cup is won by the person who has no disaster rather than the person with one brilliant race.',
    'Two stages. Do not skip stage one; "routine" is the entire word that matters in both of them.',
  ],
  stages: [
    {
      title: 'Stage one — get comfortable',
      goal: 'Finish top three. Then keep finishing top three.',
      items: [
        {
          id: 'plan.cup.first-top3',
          text: 'Finish the Mushroom Cup in the top three at 100cc, once.',
        },
        {
          id: 'plan.cup.routine-top3',
          text: 'Do it three cups in a row.',
          detail: 'When top three stops feeling like a good day, stage one is finished.',
        },
      ],
    },
    {
      title: 'Stage two — own it',
      goal: 'Win it. Then win it again.',
      items: [
        { id: 'plan.cup.first-win', text: 'Win the Mushroom Cup at 100cc, once.' },
        {
          id: 'plan.cup.routine-win',
          text: 'Win it twice in a row.',
          detail:
            'At that point the cup is yours, and {rival} is the only thing left on the track.',
        },
      ],
    },
  ] as CupStage[],
};

// --- the milestone ladder ---------------------------------------------------

/**
 * Five rungs, in order, from "you versus yourself" to "you versus her".
 *
 * Every rung names a chapter to go back to, because "I am stuck" is a question the site can
 * answer and "I am stuck and I do not know what to fix" is not.
 */
export const MILESTONES: Milestone[] = [
  {
    id: 'plan.milestone.ghost',
    title: 'Beat your own ghost',
    blurb:
      'A Time Trial on Mario Kart Stadium or Water Park, against the you of a few days ago. The first proof that any of this works, and the only opponent in the game who is exactly your speed.',
    revisit: 'ch5',
    revisitWhy: 'If the ghost keeps winning, it is lines and coins. It is almost always lines.',
  },
  {
    id: 'plan.milestone.top3',
    title: 'Top three in the cup at 100cc',
    blurb:
      'The full Mushroom Cup, four races, finishing top three overall. This is the rung where the track knowledge starts paying and you stop thinking about the controller.',
    revisit: 'ch4',
    revisitWhy:
      'Top three is usually lost on free speed you drove straight past. Go back to the pads and take the outer lane.',
  },
  {
    id: 'plan.milestone.cup-cpu',
    title: 'Win the cup against the computer',
    blurb:
      'First place overall. Not a fluke race — the cup. When this is routine you are a genuinely good Mario Kart player, whatever happens next.',
    revisit: 'ch3',
    revisitWhy:
      'Second to first is usually a handful of ramps a lap that you are jumping off instead of tricking off.',
  },
  {
    id: 'plan.milestone.one-race',
    title: 'Take one race off {rival}',
    blurb:
      'One race. Not the cup, not the night, one race — and she will remember it, which is the point. Everything up to here was practice; this is the first time it counts.',
    revisit: 'ch1',
    revisitWhy:
      'The start boost is the one moment in a race where being prepared beats being quick. Get in front before her reactions are worth anything.',
  },
  {
    id: 'plan.milestone.full-cup',
    title: 'Win the full cup against her',
    blurb:
      'Four races, more points than {rival}, no arguments. Print this page, tick this box, and leave it on the fridge where she can see it.',
    revisit: 'ch2',
    revisitWhy:
      'A cup against a person is decided by what hits you. Hold the banana. Fire nothing but red shells. Be the boring one.',
  },
];

// --- the race-day card ------------------------------------------------------

/**
 * The kart she was sent to set up in Chapter 7.
 *
 * Duplicated here rather than imported from the Chapter 7 module on purpose: this file is data
 * and that file is a page, and the race-day card has to work even if she never opened Chapter 7.
 * The headline pick is the one from the plan's 2b8 decision (2026-08-06).
 */
export const HEADLINE_COMBO: Combo = {
  name: 'The Comfy Speedster',
  character: 'Peach',
  kart: 'Teddy Buggy',
  tyres: 'Roller tyres',
  glider: 'Cloud Glider',
};

/** The archetypes, for resolving whatever Chapter 7 saved back into a full combo. */
const ARCHETYPES: Record<string, Combo> = {
  comfy: HEADLINE_COMBO,
  zippy: {
    name: 'The Zippy One',
    character: 'Toadette',
    kart: 'Biddybuggy',
    tyres: 'Roller tyres',
    glider: 'Cloud Glider',
  },
  steady: {
    name: 'The Steady One',
    character: 'Rosalina',
    kart: 'Wild Wiggler',
    tyres: 'Roller tyres',
    glider: 'Super Glider',
  },
  muscle: {
    name: 'The Muscle',
    character: 'Waluigi',
    kart: 'Mach 8',
    tyres: 'Roller tyres',
    glider: 'Super Glider',
  },
};

const COMBO_KEY = 'mkm.combo.v1';

export interface ComboChoice {
  combo: Combo;
  /** True when this is genuinely what she picked, rather than the default we fell back to. */
  saved: boolean;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/** Match a saved id or name ("zippy", "The Zippy One") against the three archetypes. */
function archetypeFor(hint: string): Combo | undefined {
  const needle = hint.toLowerCase();
  for (const [key, combo] of Object.entries(ARCHETYPES)) {
    if (needle.includes(key) || needle.includes(combo.name.toLowerCase())) return combo;
    if (needle.includes(combo.character.toLowerCase())) return combo;
  }
  return undefined;
}

/**
 * Read the combo Chapter 7 saved, falling back to the headline pick.
 *
 * Chapter 7 owns that key and this file cannot see what shape it writes into it, so the read is
 * deliberately charitable: a bare archetype id, a name, or an object with some subset of
 * character / kart / tyres / glider all resolve to something sensible, and anything unreadable
 * quietly becomes the headline pick. The failure mode matters here — a race-day card that shrugs
 * is worse than one that confidently prints the default, because the default is the right answer
 * for almost everybody anyway.
 */
export function readCombo(): ComboChoice {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(COMBO_KEY);
  } catch {
    raw = null;
  }
  if (raw === null || raw.trim() === '') return { combo: HEADLINE_COMBO, saved: false };

  let value: unknown = raw;
  try {
    value = JSON.parse(raw);
  } catch {
    // Not JSON. Then it is a bare id, which is exactly as valid a thing to have stored.
  }

  if (typeof value === 'string') {
    const match = archetypeFor(value);
    return match ? { combo: match, saved: true } : { combo: HEADLINE_COMBO, saved: false };
  }

  if (typeof value === 'object' && value !== null) {
    const source = value as Record<string, unknown>;
    /**
     * **`archetype` and `title` come first, because those are the keys Chapter 7 actually writes.**
     *
     * The charitable read below was written blind — this file deliberately does not import
     * `parts.ts` — and it guessed wrong. `saveCombo` (parts.ts) stores
     * `{ archetype, title, character, body, tyres, glider }`, and the only two keys this function
     * looked at for the *name* were `id` and `name`. So `hint` was always the empty string,
     * `archetypeFor('')` always returned undefined, and the name always fell through to the
     * headline pick — while `character`, `body`, `tyres` and `glider` all resolved correctly.
     *
     * The result was a card that printed **The Comfy Speedster** above Toadette on a Biddybuggy,
     * for every build except the one it happens to name, on the one page she takes to the sofa.
     * Worse for Bill, whose headline is The Steady One and who was told he was on Peach's kart.
     *
     * The lesson is the one this project keeps relearning: a reader that cannot fail is not
     * charitable, it is silent. It still accepts every shape it did before — the extra keys are
     * added in front rather than in place of the old ones.
     */
    const hint =
      text(source['archetype']) ??
      text(source['id']) ??
      text(source['title']) ??
      text(source['name']) ??
      text(source['label']) ??
      '';
    const base = archetypeFor(hint) ?? HEADLINE_COMBO;

    const combo: Combo = {
      name: text(source['title']) ?? text(source['name']) ?? text(source['label']) ?? base.name,
      character: text(source['character']) ?? text(source['driver']) ?? base.character,
      kart: text(source['kart']) ?? text(source['body']) ?? text(source['vehicle']) ?? base.kart,
      tyres: text(source['tyres']) ?? text(source['tires']) ?? text(source['wheels']) ?? base.tyres,
      glider: text(source['glider']) ?? base.glider,
    };
    return { combo, saved: true };
  }

  return { combo: HEADLINE_COMBO, saved: false };
}

/** The seven lines for the fridge. Read them before you sit down, not during. */
export const RACE_DAY_RULES: string[] = [
  '**One banana held behind you beats ten mid-pack heroics.** If you remember one sentence from this entire website, that is the one.',
  'Hold A as the 2 vanishes. Free speed, every single race.',
  'Ten coins by the end of lap one.',
  'If the kart leaves the ground, press the trick button.',
  'Outer lane on Stadium. The long way round is the fast way round.',
  'If the road splits and you can see her, take the other path.',
  'You *know* these four tracks. She has only driven them.',
];

// --- everything tickable, for the counter -----------------------------------

/**
 * Every check id on the page, in reading order. Chapter 8 counts them for the "x of y" readout.
 *
 * Derived rather than listed: a hand-maintained second list of ids is a list that goes stale, and
 * a stale one here would make the progress counter lie.
 */
export function allCheckIds(): string[] {
  return [
    ...allSessionIds(),
    ...CUP_TRAINING.stages.flatMap((stage) => stage.items.map((item) => item.id)),
    ...MILESTONES.map((milestone) => milestone.id),
  ];
}
