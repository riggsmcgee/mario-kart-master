/**
 * Karts, drivers, tyres and gliders, as data. (4e2, and Chapter 7 reads it too.)
 *
 * The doorman's "Other" role opens a combo browser, so any cousin who wanders onto the site can
 * find a build that suits them rather than being handed Chapter 7's three. That browser needs a
 * parts list, and this is it.
 *
 * **These numbers are approximate published values, normalised — not scraped from the ROM.** The
 * real game stores stats in fussy quarter-bar increments across more weight classes than anyone
 * can name, and reproducing that exactly would be a data-entry project with its own bug reports.
 * What is here is honest about the *shape* of every part — a Roller is the accelerating one, a
 * Slick is the fast one that hates grass — on a flat 0 to 5 scale, which is all a bar chart in a
 * browser can communicate anyway. Nobody should tune a competitive build off this file, and
 * nobody in this family is going to.
 *
 * Two consequences of that decision, stated so nobody "fixes" them later:
 *
 *  - **Characters are grouped by weight class and share their class's bars.** Real within-class
 *    differences exist and are smaller than any single tyre choice, so showing them would imply a
 *    precision this file does not have.
 *  - **{@link comboStats} is a weighted average, not the game's formula.** It ranks two builds
 *    against each other correctly. It will not predict a lap time.
 *
 * Naming the parts in plain text is allowed (Riggs, 2026-08-11); shipping any of their artwork is
 * not, which is why this file is numbers and words and never an image.
 */

export type StatKey = 'speed' | 'acceleration' | 'weight' | 'handling' | 'traction';

/** Fixed order. Bars drawn in a different order per part would be unreadable. */
export const STAT_KEYS: readonly StatKey[] = [
  'speed',
  'acceleration',
  'weight',
  'handling',
  'traction',
];

/** Every bar is out of this. */
export const MAX_STAT = 5;

export interface StatLabel {
  /** Two words at most — it sits at the end of a bar. */
  label: string;
  /** What it actually means to someone who has never read a stat bar. */
  plain: string;
}

export const STAT_LABELS: Record<StatKey, StatLabel> = {
  speed: { label: 'Top speed', plain: 'How fast it goes once it is already going' },
  acceleration: { label: 'Pick-up', plain: 'How quickly you are back at speed after a hit' },
  weight: { label: 'Weight', plain: 'How hard it is for someone to shove you off your line' },
  handling: { label: 'Turning', plain: 'How tightly it goes round a corner' },
  traction: { label: 'Grip', plain: 'How well it holds on when you clip the grass' },
};

export type Stats = Record<StatKey, number>;

/**
 * Five classes, which is fewer than the game has. The extra ones sit between these and split
 * hairs; a browser that offered eight kinds of "medium" would be answering a question nobody
 * asked.
 */
export type WeightClass = 'feather' | 'light' | 'medium' | 'cruiser' | 'heavy';

export const WEIGHT_CLASS_LABELS: Record<WeightClass, string> = {
  feather: 'Featherweight',
  light: 'Light',
  medium: 'Medium',
  cruiser: 'Cruiserweight',
  heavy: 'Heavy',
};

export type PartSlot = 'character' | 'body' | 'tyres' | 'glider';

/** What the game calls each screen, in the order it asks. */
export const SLOT_LABELS: Record<PartSlot, string> = {
  character: 'Driver',
  body: 'Kart',
  tyres: 'Tyres',
  glider: 'Glider',
};

export interface Part {
  id: string;
  name: string;
  slot: PartSlot;
  stats: Stats;
  /** One line, in the site's voice: what this thing is like to drive. */
  note?: string | undefined;
}

export interface Character extends Part {
  slot: 'character';
  weightClass: WeightClass;
}

// --- authoring -------------------------------------------------------------
//
// Bars are written as a five-number tuple in STAT_KEYS order, because forty-odd parts written as
// object literals is four hundred lines nobody would ever read, let alone check.

type Bars = readonly [
  speed: number,
  acceleration: number,
  weight: number,
  handling: number,
  traction: number,
];

function toStats(bars: Bars): Stats {
  const [speed, acceleration, weight, handling, traction] = bars;
  return { speed, acceleration, weight, handling, traction };
}

/** The bars every member of a weight class shares. See the header for why they share them. */
const CLASS_BARS: Record<WeightClass, Bars> = {
  feather: [2, 5, 1, 4.75, 3.5],
  light: [2.5, 4.5, 2, 4.25, 3.5],
  medium: [3.25, 3.5, 3, 3.5, 3],
  cruiser: [4, 2.75, 4, 2.75, 2.75],
  heavy: [4.5, 2.25, 5, 2.25, 2.5],
};

function character(id: string, name: string, weightClass: WeightClass, note?: string): Character {
  return {
    id,
    name,
    slot: 'character',
    weightClass,
    stats: toStats(CLASS_BARS[weightClass]),
    note,
  };
}

function part(slot: PartSlot, id: string, name: string, bars: Bars, note?: string): Part {
  return { id, name, slot, stats: toStats(bars), note };
}

// --- the parts -------------------------------------------------------------

export const CHARACTERS: readonly Character[] = [
  character('baby-peach', 'Baby Peach', 'feather', 'Gets going faster than anything else alive.'),
  character('baby-rosalina', 'Baby Rosalina', 'feather'),
  character('lemmy', 'Lemmy', 'feather', 'A tiny menace. Identical to the babies where it counts.'),

  character('toadette', 'Toadette', 'light', 'Nippy, cheerful, and identical to Toad on paper.'),
  character('toad', 'Toad', 'light'),
  character('koopa-troopa', 'Koopa Troopa', 'light'),
  character('shy-guy', 'Shy Guy', 'light'),
  character('wendy', 'Wendy', 'light'),
  character(
    'isabelle',
    'Isabelle',
    'light',
    'Polite, organised, quietly quick. Make of that what you will.',
  ),

  character('peach', 'Peach', 'medium', 'The sensible middle. Nothing about her is a problem.'),
  character('daisy', 'Daisy', 'medium'),
  character('birdo', 'Birdo', 'medium'),
  character('yoshi', 'Yoshi', 'medium'),
  character('mario', 'Mario', 'medium'),
  character('luigi', 'Luigi', 'medium'),

  character('rosalina', 'Rosalina', 'cruiser', 'Tall, unbothered, and hard to shift off a line.'),
  character('waluigi', 'Waluigi', 'cruiser', 'Heavy enough to hold his ground, and still turns.'),
  character('donkey-kong', 'Donkey Kong', 'cruiser'),
  character('king-boo', 'King Boo', 'cruiser'),

  character(
    'pink-gold-peach',
    'Pink Gold Peach',
    'heavy',
    'Fast in a straight line and reluctant everywhere else. The one she is on now.',
  ),
  character('metal-mario', 'Metal Mario', 'heavy'),
  character('bowser', 'Bowser', 'heavy', 'Fast in a straight line, and a barge everywhere else.'),
  character('wario', 'Wario', 'heavy'),
];

/**
 * Every driver who is mechanically the same as this one.
 *
 * The single most useful fact about the character select screen, and one nobody tells you: within
 * a weight class the drivers are **identical**. Peach, Daisy, Birdo and Yoshi are one kart with
 * four costumes. So "which character should I be" has a real answer — whichever you like the look
 * of — and Chapter 7 can say so, which matters here for a specific reason: Jodi drives Pink Gold
 * Peach because {rival} told her heavier is better, and the fix is not "drive a boy character",
 * it is "the one you actually want is right there and it costs you nothing".
 *
 * Excludes the driver asked about, so the result reads as "…or any of these instead".
 */
export function sameClassAs(id: string): readonly Character[] {
  const driver = CHARACTERS.find((item) => item.id === id);
  if (!driver) return [];
  return CHARACTERS.filter(
    (item) => item.weightClass === driver.weightClass && item.id !== driver.id,
  );
}

export const BODIES: readonly Part[] = [
  part(
    'body',
    'standard-kart',
    'Standard Kart',
    [2.5, 2.5, 2.5, 2.5, 2.5],
    'The one it starts you on. Nothing wrong with it, nothing special about it.',
  ),
  part(
    'body',
    'pipe-frame',
    'Pipe Frame',
    [1.5, 4.5, 1.5, 4.5, 3.5],
    'Looks like scaffolding, drives like a go-kart.',
  ),
  part(
    'body',
    'teddy-buggy',
    'Teddy Buggy',
    [2.25, 4.25, 2, 4.25, 3.25],
    'Quick off the mark, turns tightly, and has a face on it.',
  ),
  part(
    'body',
    'biddybuggy',
    'Biddybuggy',
    [1.5, 5, 1.25, 5, 3.5],
    'Absurdly small. Absurdly quick to recover.',
  ),
  part(
    'body',
    'mr-scooty',
    'Mr. Scooty',
    [1.25, 5, 1, 5, 3.5],
    'A scooter. Yes, really. It is very good.',
  ),
  part(
    'body',
    'wild-wiggler',
    'Wild Wiggler',
    [2.25, 4.25, 2.25, 4.5, 3.5],
    'A caterpillar with a steering wheel, and a genuinely forgiving one.',
  ),
  part(
    'body',
    'city-tripper',
    'City Tripper',
    [1.75, 4.5, 1.5, 4.75, 4],
    'A bike. Bikes lean instead of sliding, which changes nothing for you.',
  ),
  part(
    'body',
    'landship',
    'Landship',
    [2.75, 3.25, 3, 3.25, 3.5],
    'A pirate ship on wheels, and remarkably middle-of-the-road.',
  ),
  part(
    'body',
    'mach-8',
    'Mach 8',
    [3.5, 2.5, 3.5, 2.5, 2.5],
    'Faster and firmer, without going full brick.',
  ),
  part(
    'body',
    'sports-coupe',
    'Sports Coupe',
    [3.75, 2.25, 3.75, 2.25, 2.5],
    'A proper car, and just as reluctant to turn as one.',
  ),
  part(
    'body',
    'circuit-special',
    'Circuit Special',
    [4.5, 1.5, 4, 1.75, 2],
    'What the very serious people drive. Punishing if you get hit.',
  ),
  part(
    'body',
    'badwagon',
    'Badwagon',
    [4.75, 1.25, 4.75, 1.5, 2],
    'A muscle car. Enormous top speed, and it takes an age to find it again.',
  ),
];

export const TYRES: readonly Part[] = [
  part(
    'tyres',
    'roller',
    'Roller',
    [1.25, 5, 1, 5, 3.5],
    'The small indoor-looking ones. They carry every build on this site.',
  ),
  part(
    'tyres',
    'azure-roller',
    'Azure Roller',
    [1.25, 5, 1, 5, 3.5],
    'Roller, in blue. Identical in every way that matters.',
  ),
  part(
    'tyres',
    'button',
    'Button',
    [1.25, 5, 1, 5, 3.5],
    'Roller wearing a different hat. Same numbers exactly.',
  ),
  part(
    'tyres',
    'standard',
    'Standard',
    [2.5, 2.5, 2.5, 2.5, 3],
    'Perfectly fine, and the reason most people never find out about Rollers.',
  ),
  part('tyres', 'blue-standard', 'Blue Standard', [2.75, 2.5, 2.75, 2.25, 2.75]),
  part('tyres', 'slim', 'Slim', [3, 2.75, 2.5, 3, 2.25], 'A little faster, a little slippier.'),
  part(
    'tyres',
    'slick',
    'Slick',
    [4.5, 1.5, 3.5, 1.5, 1],
    'Brilliant on tarmac, hopeless the moment you touch grass.',
  ),
  part(
    'tyres',
    'monster',
    'Monster',
    [3.5, 1.75, 4.5, 1.75, 4.5],
    'Huge. Grips anything, gets going slowly.',
  ),
  part(
    'tyres',
    'off-road',
    'Off-Road',
    [3, 2.25, 3.75, 2.25, 4.5],
    'Knobbly and unbothered by mud.',
  ),
];

export const GLIDERS: readonly Part[] = [
  part(
    'glider',
    'super-glider',
    'Super Glider',
    [2.5, 2.5, 2.5, 2.5, 2.5],
    'The default. Completely unobjectionable.',
  ),
  part(
    'glider',
    'cloud-glider',
    'Cloud Glider',
    [2.25, 3, 2.25, 3, 2.5],
    'A small nudge toward pick-up and turning.',
  ),
  part('glider', 'flower-glider', 'Flower Glider', [2.25, 3, 2.25, 3, 2.5]),
  part('glider', 'paper-glider', 'Paper Glider', [2.25, 3, 2.25, 3, 2.75]),
  part('glider', 'parafoil', 'Parafoil', [2.5, 2.5, 2.5, 2.5, 2.5]),
  part(
    'glider',
    'wario-wing',
    'Wario Wing',
    [3, 2.25, 3, 2.25, 2.25],
    'Leans toward speed, like everything of his.',
  ),
  part('glider', 'bowser-kite', 'Bowser Kite', [3, 2.25, 3, 2.25, 2.25]),
];

export const ALL_PARTS: readonly Part[] = [...CHARACTERS, ...BODIES, ...TYRES, ...GLIDERS];

/** For a browser that wants to lay out four columns in the order the game asks for them. */
export const SLOTS: ReadonlyArray<{ slot: PartSlot; parts: readonly Part[] }> = [
  { slot: 'character', parts: CHARACTERS },
  { slot: 'body', parts: BODIES },
  { slot: 'tyres', parts: TYRES },
  { slot: 'glider', parts: GLIDERS },
];

export function findPart(id: string): Part | undefined {
  return ALL_PARTS.find((item) => item.id === id);
}

// --- the three (and a half) archetypes -------------------------------------

/**
 * `muscle` is the fourth: Bill's heavier alternate from the doorman spec (4e). It is in the same
 * enum as the other three because it is the same kind of thing — a complete, named, pickable
 * build — and giving it its own type would only mean writing every function twice.
 */
export type ArchetypeId = 'comfy' | 'zippy' | 'steady' | 'muscle';

export interface Combo {
  id: ArchetypeId;
  character: Character;
  body: Part;
  tyres: Part;
  glider: Part;
}

/**
 * A build referred to by part id, resolved at load.
 *
 * Loud on failure by design: a typo here is a data bug that would otherwise render as a blank
 * card halfway through the chapter, and the same argument the quiz parser makes (1d1) applies —
 * a data file should say what is wrong with it.
 */
function must<T extends Part>(list: readonly T[], id: string): T {
  const found = list.find((item) => item.id === id);
  if (!found) throw new Error(`parts.ts: no part with id "${id}"`);
  return found;
}

function combo(
  id: ArchetypeId,
  driver: string,
  body: string,
  tyres: string,
  glider: string,
): Combo {
  return {
    id,
    character: must(CHARACTERS, driver),
    body: must(BODIES, body),
    tyres: must(TYRES, tyres),
    glider: must(GLIDERS, glider),
  };
}

/**
 * The picks, from the plan's 2b8 research: at 100cc with items on, pick-up and turning beat top
 * speed, and Roller-class tyres are on all four builds for exactly that reason.
 *
 * This is the single source of truth for which parts are recommended. Chapter 7 reads it for its
 * copy and the combo browser reads it to mark the picks, so the two can never quietly disagree
 * about what "the headline build" is.
 */
export const ARCHETYPES: Record<ArchetypeId, Combo> = {
  comfy: combo('comfy', 'peach', 'teddy-buggy', 'roller', 'cloud-glider'),
  zippy: combo('zippy', 'toadette', 'biddybuggy', 'roller', 'cloud-glider'),
  steady: combo('steady', 'rosalina', 'wild-wiggler', 'roller', 'super-glider'),
  muscle: combo('muscle', 'waluigi', 'mach-8', 'roller', 'super-glider'),
};

const USED_BY = new Map<string, ArchetypeId[]>();
for (const build of Object.values(ARCHETYPES)) {
  for (const item of [build.character, build.body, build.tyres, build.glider]) {
    const list = USED_BY.get(item.id) ?? [];
    list.push(build.id);
    USED_BY.set(item.id, list);
  }
}

/** Which recommended builds use this part. Empty for everything else. */
export function archetypesUsing(partId: string): readonly ArchetypeId[] {
  return USED_BY.get(partId) ?? [];
}

/**
 * Roughly what a whole build feels like, on the same 0 to 5 scale as its pieces.
 *
 * A weighted average rather than the game's real formula (see the header). The weights say what
 * every guide says out loud: the driver and the kart body decide most of it, the tyres are the
 * part people forget and shouldn't, and the glider is nearly decoration.
 */
export function comboStats(build: {
  character: Part;
  body: Part;
  tyres: Part;
  glider: Part;
}): Stats {
  const weights: Array<[Part, number]> = [
    [build.character, 0.35],
    [build.body, 0.3],
    [build.tyres, 0.25],
    [build.glider, 0.1],
  ];

  const out: Stats = { speed: 0, acceleration: 0, weight: 0, handling: 0, traction: 0 };
  for (const key of STAT_KEYS) {
    let total = 0;
    for (const [item, weight] of weights) total += item.stats[key] * weight;
    out[key] = Math.round(total * 100) / 100;
  }
  return out;
}

// --- what she picked -------------------------------------------------------

/**
 * The handoff from Chapter 7 to Chapter 8's race-day card.
 *
 * Kept in localStorage rather than in the progress store, because this is a *preference* and not
 * an achievement: it should survive being signed out, it is worth nothing to sync, and Chapter 8
 * must be able to read it without waiting on the network. Part names are stored alongside the
 * ids so the race-day card can print the build without resolving anything, and still reads
 * correctly if this file's ids ever move.
 */
export const COMBO_STORAGE_KEY = 'mkm.combo.v1';

export interface ComboChoice {
  archetype: ArchetypeId;
  /** The name Chapter 7 gave the build, e.g. "The Comfy Speedster". */
  title: string;
  character: string;
  body: string;
  tyres: string;
  glider: string;
}

const ARCHETYPE_IDS: ReadonlySet<string> = new Set<ArchetypeId>([
  'comfy',
  'zippy',
  'steady',
  'muscle',
]);

export function saveCombo(choice: ComboChoice): void {
  try {
    localStorage.setItem(COMBO_STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Private browsing, or a full quota. She has still made the choice and the chapter still
    // finishes; only Chapter 8's reminder is lost, and Chapter 8 handles not knowing.
  }
}

export function loadCombo(): ComboChoice | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(COMBO_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const value = parsed as Record<string, unknown>;
    const strings = ['title', 'character', 'body', 'tyres', 'glider'] as const;
    if (typeof value['archetype'] !== 'string' || !ARCHETYPE_IDS.has(value['archetype'])) {
      return null;
    }
    for (const key of strings) {
      if (typeof value[key] !== 'string') return null;
    }

    return {
      archetype: value['archetype'] as ArchetypeId,
      title: value['title'] as string,
      character: value['character'] as string,
      body: value['body'] as string,
      tyres: value['tyres'] as string,
      glider: value['glider'] as string,
    };
  } catch {
    // Someone edited it by hand, or an older version wrote a different shape. Treat it as
    // "nothing chosen yet" rather than crashing a chapter over a stale string.
    return null;
  }
}
