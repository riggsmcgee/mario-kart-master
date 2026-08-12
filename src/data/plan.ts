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
 * Those ids are the primary key in Supabase's `plan_checks` table (see the 1f1 migration). A row
 * *is* the tick. Renaming `plan.skill.ch1.hold` — or renumbering a list so that item three
 * becomes item four — does not rename anything in the database: it silently unticks a box she
 * earned, on every device, forever, with no error anywhere. So ids are semantic rather than
 * positional (`plan.skill.ch5.ghost-stadium`, never `plan.item.14`), which means the display
 * order can be shuffled freely and nothing has to be renumbered. Adding is free. Deleting leaves
 * a harmless orphan row. Renaming is the one move that costs something, so it does not happen.
 *
 * **Everything checkable is a one-off.** `plan_checks` has no notion of a week and no reset, so a
 * box that needs unticking every Monday would be a chore rather than a plan. The repeating work —
 * the weekly rhythm itself — is described and never ticked; each drill below is instead phrased
 * as a first time ("play one whole race where…"), which is genuinely done once and then becomes
 * how she plays.
 *
 * Copy uses `{name}` and `{rival}`, never a literal name (4e1). Other family members are named
 * outright, which is the whole joke in a couple of places.
 */

/** One tickable line of the programme. */
export interface PlanItem {
  /** Stable, semantic, append-only. See the file header before you touch one. */
  id: string;
  text: string;
  /** A quieter second line. Why it works, or what it will feel like. */
  detail?: string | undefined;
}

/** The Switch homework for one chapter of the course. */
export interface SkillDrill {
  /** The chapter this came from. Chapter 8 links straight back to it. */
  chapterId: string;
  skill: string;
  /** The one line to remember if she reads nothing else. */
  rule: string;
  items: PlanItem[];
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

export const RHYTHM = {
  sessions: 'Three or four sessions a week',
  length: 'fifteen to twenty minutes each',
  lines: [
    'Three or four short sessions a week, fifteen to twenty minutes each. That is the whole time commitment. Anyone who tells you it takes more than that is enjoying themselves too much.',
    'Short and often beats long and rare. This is hands learning a thing, and hands learn overnight — twenty minutes on four evenings will beat two hours on a Sunday, every time.',
    'A session is one job off the list below, then a couple of races for fun. Never the other way round: once the fun races start, the practising is over for the night, and that is fine.',
    '**This website is not the training.** The Switch is the training. Come back here when something has stopped making sense — and in week three, for the track deep dives.',
  ],
  items: [
    {
      id: 'plan.rhythm.days',
      text: 'Pick which days are Mario Kart days, and tell somebody out loud.',
      detail: 'It is much harder to skip a thing Bill knows about.',
    },
    {
      id: 'plan.rhythm.first',
      text: 'Do the first session within two days of finishing this course.',
      detail: 'While the words are still warm. After a week, this is a website you once read.',
    },
  ] as PlanItem[],
};

// --- per-skill practice -----------------------------------------------------

/**
 * One entry per chapter of the course, each pointing back at the chapter that taught it.
 *
 * Chapter 0 is missing on purpose: it is a promise, not a skill, and there is nothing to go and
 * practise. Everything else in the course earns a line in this list, which is the check that the
 * course was never teaching anything the Switch could not use.
 */
export const SKILL_DRILLS: SkillDrill[] = [
  {
    chapterId: 'ch1',
    skill: 'Start boost',
    rule: 'Every race. Start holding as the 2 vanishes.',
    items: [
      {
        id: 'plan.skill.ch1.five',
        text: 'Play five races in a row and go for the start boost in every single one — including the races you do not care about.',
        detail: 'Getting it wrong costs nothing. There has never been a reason not to try.',
      },
      {
        id: 'plan.skill.ch1.heard-it',
        text: 'Get one start where you hear it and feel the lurch.',
        detail: 'Once you have felt it once, you will never have to wonder whether it worked.',
      },
    ],
  },
  {
    chapterId: 'ch2',
    skill: 'Item smarts',
    rule: 'One banana held behind you beats ten mid-pack heroics.',
    items: [
      {
        id: 'plan.skill.ch2.defence-only',
        text: 'Play one whole race where you never fire anything forwards. Everything you pick up gets held behind you instead.',
        detail:
          'Count how many times something hits the thing you were carrying instead of hitting you.',
      },
      {
        id: 'plan.skill.ch2.red-shell',
        text: 'Play one race where the only thing you ever fire is a red shell.',
        detail:
          'It steers itself. It is the only item that does not need you to aim, so it is the only one worth firing.',
      },
      {
        id: 'plan.skill.ch2.free-slot',
        text: 'Spend a junk item before the next item box, so you never drive through a box with both hands full.',
        detail: 'A box you cannot take anything from is a box {rival} just got instead of you.',
      },
    ],
  },
  {
    chapterId: 'ch3',
    skill: 'Ramp tricks',
    rule: 'If the kart leaves the ground, press the button.',
    items: [
      {
        id: 'plan.skill.ch3.every-ramp',
        text: 'One lap of Mario Kart Stadium where you trick off every single ramp. Position does not matter.',
      },
      {
        id: 'plan.skill.ch3.flourish',
        text: 'Learn to spot the flourish — the flip or the spin. No flourish, no boost.',
        detail: 'That is your feedback, and it is instant. You never have to look at a number.',
      },
    ],
  },
  {
    chapterId: 'ch4',
    skill: 'Boost pads',
    rule: 'Go the long way if the long way is boosted.',
    items: [
      {
        id: 'plan.skill.ch4.outer-lane',
        text: 'On Mario Kart Stadium, drive the outer lane after the first turn until it stops feeling like a detour.',
        detail: 'It is not a detour. It is the fast way, and it feels wrong for about four laps.',
      },
      {
        id: 'plan.skill.ch4.four-maps',
        text: 'One lap on each of the four Mushroom Cup tracks with a single goal: hit every orange arrow you can find.',
        detail: 'You are drawing a map, not racing. Ignore your position completely.',
      },
    ],
  },
  {
    chapterId: 'ch5',
    skill: 'Lines and coins',
    rule: 'Ten coins by the end of lap one. Every race.',
    items: [
      {
        id: 'plan.skill.ch5.ten-coins',
        text: 'One solo 100cc race where the only score that counts is finishing with ten coins.',
        detail: 'Coins are speed and armour: you drop three every time something hits you.',
      },
      {
        id: 'plan.skill.ch5.ghost-stadium',
        text: 'Time Trial on Mario Kart Stadium. Save a ghost, then come back and beat it.',
        detail: 'Not a record. Yesterday-you. That is a fair fight and you can win it.',
      },
      {
        id: 'plan.skill.ch5.ghost-water-park',
        text: 'Time Trial on Water Park. Same job: beat yesterday-you.',
      },
      {
        id: 'plan.skill.ch5.boring',
        text: 'Drive the same line three laps running until it feels boring.',
        detail: 'Boring is the target. Kendahl is extremely boring and she wins.',
      },
    ],
  },
  {
    chapterId: 'ch6',
    skill: 'The drift',
    rule: 'Long corners only. Blue sparks, then orange.',
    items: [
      {
        id: 'plan.skill.ch6.sweepers',
        text: 'Hold the drift button through the long sweeping corners on Sweet Sweet Canyon and watch for blue sparks.',
      },
      {
        id: 'plan.skill.ch6.decide',
        text: 'Decide, out loud, whether you are going to bother with drifting at all.',
        detail:
          'Either answer is correct. Kendahl does not drift, and Kendahl beats {rival} regularly.',
      },
    ],
  },
  {
    chapterId: 'ch7',
    skill: 'Your kart',
    rule: 'Set it once. Never think about it again.',
    items: [
      {
        id: 'plan.skill.ch7.set-combo',
        text: 'Set your combo on the Switch: character, kart, tyres, glider.',
        detail: 'It stays set. This is the only item on this entire list you do exactly once.',
      },
      {
        id: 'plan.skill.ch7.roller',
        text: 'Check the tyres say Roller.',
        detail: 'If you change one single thing about your kart, change the tyres.',
      },
    ],
  },
];

// --- owning the cup ---------------------------------------------------------

export const CUP_TRAINING = {
  headline: 'Mushroom Cup. 100cc. Hard computers.',
  lines: [
    'The computers are the sparring partner, and Hard is the right setting: Normal lets you win while driving badly, which teaches you that driving badly works.',
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
          text: 'Finish the Mushroom Cup in the top three against Hard computers, once.',
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
        { id: 'plan.cup.first-win', text: 'Win the Mushroom Cup against Hard computers, once.' },
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

// --- steering the pick ------------------------------------------------------

export const CUP_STEERING = {
  lines: [
    'When it is your turn to choose, you choose the Mushroom Cup. Not usually. Every time.',
    '**No mercy picks.** She is not choosing a cup to be kind to you, and you would not want her to. Picking your own tracks is not cheating, it is the only part of the race you control before the lights go out.',
    'If she asks why you always pick the same cup, tell her the truth: you like those tracks. It is completely true and she will find it unbearable.',
    'If she picks first and picks something else, that is fine. You still know four tracks better than she knows any track — and your cup is coming round again.',
  ],
  items: [
    {
      id: 'plan.steer.pledge',
      text: 'Agree with yourself now: when it is your pick, it is your cup.',
      detail: 'Decide it here, in a calm room, rather than on the sofa with somebody watching.',
    },
  ] as PlanItem[],
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
    title: 'Top three against Hard computers',
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
  character: 'Yoshi',
  kart: 'Teddy Buggy',
  tyres: 'Roller tyres',
  glider: 'Cloud Glider',
};

/** The three archetypes, for resolving whatever Chapter 7 saved back into a full combo. */
const ARCHETYPES: Record<string, Combo> = {
  comfy: HEADLINE_COMBO,
  zippy: {
    name: 'The Zippy One',
    character: 'Toad',
    kart: 'Biddybuggy',
    tyres: 'Roller tyres',
    glider: 'Cloud Glider',
  },
  steady: {
    name: 'The Steady One',
    character: 'Waluigi',
    kart: 'Wild Wiggler',
    tyres: 'Roller tyres',
    glider: 'Cloud Glider',
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
    const hint = text(source['id']) ?? text(source['name']) ?? text(source['label']) ?? '';
    const base = archetypeFor(hint) ?? HEADLINE_COMBO;

    const combo: Combo = {
      name: text(source['name']) ?? text(source['label']) ?? base.name,
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
    ...RHYTHM.items.map((item) => item.id),
    ...SKILL_DRILLS.flatMap((drill) => drill.items.map((item) => item.id)),
    ...CUP_TRAINING.stages.flatMap((stage) => stage.items.map((item) => item.id)),
    ...CUP_STEERING.items.map((item) => item.id),
    ...MILESTONES.map((milestone) => milestone.id),
  ];
}
