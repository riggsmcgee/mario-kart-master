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

  // Half-pipe on the outside of the U-turn: taking it is a genuine boost and a genuine detour,
  // in the one place on the circuit where going wide costs the most.
  { kind: 'halfpipe', t: 0.42, offset: 9 },

  // Coins on the inside of the chicane and the hairpin — the two places where the tidy line
  // and the fast line are the same line.
  ...coinLine(0.68, 0.78, 5, -4),
  ...coinLine(0.88, 0.96, 5, -5),
];

function coinLine(fromT: number, toT: number, count: number, offset: number): FurnitureSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    kind: 'coin' as const,
    t: fromT + ((toT - fromT) * i) / Math.max(1, count - 1),
    offset,
  }));
}
