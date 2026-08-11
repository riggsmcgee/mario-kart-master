import type { FurnitureSpec } from '../engine/track';

/**
 * The Phase 1 test circuit. (1b5)
 *
 * A whole track, as data. This is the Q6 format doing the job it was chosen for — the layout
 * below is the entire track definition, and Phase 2's four drill layouts will look exactly
 * like it.
 *
 * **The shape.** Two straights joined by a wide U-turn at one end and a tight hairpin at the
 * other, with a chicane part-way along the back straight. The straights deliberately are not
 * parallel: they splay apart toward the U-turn and pinch together toward the hairpin. That is
 * not decoration — a 180° turn's radius sets how far apart the roads it joins must be, so a
 * circuit with one wide and one tight 180 has to be wedge-shaped to close at all.
 *
 * Every corner earns its place against the 1b6 gate:
 *
 *  - **The U-turn** is long enough to hold a line through, which is what Chapter 5 teaches.
 *  - **The hairpin** is tight enough to punish carrying too much speed in, which is what makes
 *    the steer assist's behaviour legible.
 *  - **The chicane** is the only place that asks for two corrections in quick succession, and
 *    it is where twitchy steering would show up first.
 */

/** Control points, in lap order. The spline runs through every one of them. */
export const TEST_TRACK_CONTROL: Array<{ x: number; y: number }> = [
  // Main straight, west to east, splaying outward toward the U-turn.
  { x: -66, y: 20 },
  { x: -35, y: 25 },
  { x: 0, y: 30 },
  { x: 32, y: 34 },

  // The wide U-turn.
  { x: 60, y: 29 },
  { x: 73, y: 12 },
  { x: 73, y: -12 },
  { x: 60, y: -29 },

  // Back straight, east to west, with the chicane in the middle of it.
  { x: 32, y: -34 },
  { x: 10, y: -26 },
  { x: -10, y: -38 },
  { x: -38, y: -26 },
  { x: -56, y: -21 },

  // The tight hairpin, pinching the two straights together.
  { x: -66, y: -16 },
  { x: -80, y: -9 },
  { x: -80, y: 9 },
  { x: -66, y: 16 },
];

export const TEST_TRACK_HALF_WIDTH = 10;

/**
 * Track furniture, positioned by `t` (fraction of the lap, by distance) and lateral `offset`.
 *
 * Roughly: t 0–0.28 is the main straight, 0.28–0.58 the U-turn, 0.58–0.84 the back straight
 * and chicane, 0.84–1 the hairpin.
 */
export const TEST_TRACK_LAYOUT: FurnitureSpec[] = [
  // Pad strips down the main straight, offset apart so hitting both means choosing a line
  // rather than driving in a straight line through the middle.
  { kind: 'pad', t: 0.07, offset: -3 },
  { kind: 'pad', t: 0.17, offset: 3 },

  // Ramps on the exits, where there is room to land before the next thing happens.
  { kind: 'ramp', t: 0.24 },
  { kind: 'ramp', t: 0.61, offset: -2 },

  // A pad on the outside of the U-turn exit, off the line you would naturally take. This is
  // the real Chapter 4 lesson and it is straight out of Mario Kart Stadium, where the dash
  // panels live in the wide outer lane: sometimes the fast way round is not the tight way
  // round, and the only way to know is to know the track.
  { kind: 'pad', t: 0.5, offset: 6 },

  // Coins on the inside of the chicane and the hairpin — the two places where the tidy line
  // and the fast line are the same line.
  ...coinLine(0.68, 0.78, 5, -4),
  ...coinLine(0.88, 0.96, 5, -5),
];

/**
 * Item boxes, for Shield Up (1e). Kept out of {@link TEST_TRACK_LAYOUT} so the kart piece is not
 * cluttered with furniture it has no use for; the shield harness concatenates the two.
 *
 * Four rows of three, roughly a quarter of a lap apart, so being caught empty-handed is never
 * more than a few seconds of driving away from being fixed. Rows sit across the road rather than
 * along it — picking one is a small line choice, exactly as it is in the real game.
 */
export const TEST_TRACK_ITEM_BOXES: FurnitureSpec[] = [
  ...boxRow(0.04),
  ...boxRow(0.3),
  ...boxRow(0.56),
  ...boxRow(0.8),
];

function boxRow(t: number): FurnitureSpec[] {
  return [-5, 0, 5].map((offset) => ({ kind: 'box' as const, t, offset }));
}

function coinLine(fromT: number, toT: number, count: number, offset: number): FurnitureSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    kind: 'coin' as const,
    t: fromT + ((toT - fromT) * i) / Math.max(1, count - 1),
    offset,
  }));
}
