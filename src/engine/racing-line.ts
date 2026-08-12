/**
 * The racing line: a path offset from the centreline, and how far off it you are. (2b6, 2026-08-12.)
 *
 * Chapter 5's original drill laid a trail of coins along the good line and scored her on coins
 * collected, on the argument that the coins *were* the painted line. Riggs played it and asked for
 * the real thing — an actual line on the road, scored on how well she holds it — and he is right,
 * for a reason the first version talked itself out of: collecting a coin is a discrete event, so
 * the drill rewarded *touching* the line fifteen times rather than *staying on* it. Those are
 * different skills, and the one worth teaching is the boring one.
 *
 * So the line is a first-class object now. It is defined the same way the coins were — as
 * `(t, offset)` control points around the lap — which means the shape that was already tuned
 * survives the change, and the coins can sit on it rather than being it.
 *
 * **Offsets are interpolated with a cosine ease, not linearly.** A linear blend between control
 * points produces a polyline with corners in it, and a racing line with a kink is a racing line
 * that asks her to saw at the wheel at the exact moment the chapter is telling her not to. The
 * ease costs one `Math.cos` per sample and makes the whole thing differentiable.
 *
 * **Wrapping is handled explicitly.** The last control point blends into the first across the
 * start line, so the line closes. Getting this wrong is invisible in the middle of the lap and
 * produces a step exactly where she crosses for lap two.
 */

import { projectToPath, type TrackPath } from './track';

/** One control point: `t` is distance around the lap (0–1), `offset` is metres off centre. */
export interface LinePoint {
  t: number;
  /** Positive is one side, negative the other — same convention as furniture. */
  offset: number;
}

export interface RacingLine {
  /** Metres off the centreline at this fraction of the lap. */
  offsetAt(t: number): number;
  /** The control points, sorted and wrapped. */
  points: readonly LinePoint[];
}

function ease(a: number, b: number, mix: number): number {
  // Cosine ease: flat at both control points, so joins are smooth rather than kinked.
  return a + (b - a) * (0.5 - Math.cos(Math.PI * mix) / 2);
}

export function buildRacingLine(points: readonly LinePoint[]): RacingLine {
  const sorted = [...points].sort((a, b) => a.t - b.t);
  if (sorted.length === 0) {
    return { offsetAt: () => 0, points: [] };
  }

  return {
    points: sorted,
    offsetAt(t: number): number {
      const lap = ((t % 1) + 1) % 1;

      // Find the first control point past `lap`. Everything before the first and after the last
      // falls into the wrap segment, which is why this is not a plain binary search on a
      // half-open range.
      let after = sorted.findIndex((point) => point.t > lap);
      if (after === -1) after = 0;
      const beforeIndex = (after - 1 + sorted.length) % sorted.length;

      const before = sorted[beforeIndex];
      const next = sorted[after];
      if (!before || !next) return 0;

      // Span, measured forwards around the lap so the wrap segment gets a positive length.
      let span = next.t - before.t;
      if (span <= 0) span += 1;
      let travelled = lap - before.t;
      if (travelled < 0) travelled += 1;

      const mix = span === 0 ? 0 : Math.min(1, Math.max(0, travelled / span));
      return ease(before.offset, next.offset, mix);
    },
  };
}

export interface LineError {
  /** Metres from the ideal line. Always positive. */
  distance: number;
  /** Where round the lap the kart is, 0–1. */
  t: number;
  /** Signed: which side of the line she is on, for coaching that can say "you are inside". */
  side: number;
}

/**
 * How far the kart is from the line.
 *
 * Measured across the track rather than as a straight-line distance to the nearest point on the
 * ribbon. Those differ, and the cross-track version is the one that means something: it is
 * "how many metres would I have to move sideways", which is the correction she would actually
 * make. The true nearest-point distance would read as smaller than it is through every corner,
 * flattering exactly the mistake this drill exists to find.
 */
export function lineError(
  line: RacingLine,
  path: TrackPath,
  x: number,
  y: number,
): LineError | null {
  const projection = projectToPath(path, x, y);
  if (!projection) return null;

  const count = path.points.length;
  const t = count === 0 ? 0 : projection.point.index / count;
  const ideal = line.offsetAt(t);
  const delta = projection.offset - ideal;

  return { distance: Math.abs(delta), t, side: Math.sign(delta) };
}

/**
 * The rolling "am I on it" score.
 *
 * Counts sim ticks rather than seconds, which is the same thing at a fixed timestep and cannot
 * drift if a frame is long. `onLine` is generous by design — the plan's rule is that every drill
 * ends on a win, and a line she can only hold by threading a needle would teach her that the good
 * line is unreachable rather than that it is comfortable.
 */
export class LineTracker {
  private ticks = 0;
  private onTicks = 0;

  constructor(
    /** Metres either side that still counts as "on the line". */
    private readonly tolerance = 2.2,
  ) {}

  reset(): void {
    this.ticks = 0;
    this.onTicks = 0;
  }

  /** Feed one tick. Returns whether this tick counted as on the line. */
  sample(error: LineError | null): boolean {
    if (!error) return false;
    this.ticks++;
    const on = error.distance <= this.tolerance;
    if (on) this.onTicks++;
    return on;
  }

  /** 0–100. The drill's score, and the number on her results card. */
  percent(): number {
    if (this.ticks === 0) return 0;
    return Math.round((this.onTicks / this.ticks) * 100);
  }
}
