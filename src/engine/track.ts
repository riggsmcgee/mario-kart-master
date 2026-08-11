/**
 * Track path and furniture. (1b3)
 *
 * This is the answer to WORKLOG Q6 — how tracks get authored — and it is deliberately the
 * smallest thing that works. A track is a centreline plus a plain array of items positioned by
 * **how far around the lap** (`t`, 0..1) and **how far off the centre** (`offset`, world units).
 * Authoring a boost pad is one line, and it does not move when the track shape changes.
 *
 * No editor, no file format, no validation layer. When Phase 2 needs four real drill layouts,
 * they are four arrays. If that ever stops being enough, that is the moment to build more —
 * not before.
 *
 * Positions are converted to world space once, at load, so per-frame collision is a plain
 * rotated-rectangle test with no path maths in the hot loop.
 */

import type { KartState } from './kart';

export interface PathPoint {
  /** Position in `points`. Lets a caller look up the road from a point it was handed. */
  index: number;
  x: number;
  y: number;
  /** Unit tangent, pointing the way the lap runs. */
  tx: number;
  ty: number;
  /** Unit normal, pointing to the outside of the track. */
  nx: number;
  ny: number;
}

export interface TrackPath {
  points: PathPoint[];
  /** Point at fraction `t` around the lap. Wraps, so t = 1.1 is the same as t = 0.1. */
  at(t: number): PathPoint;
}

/**
 * Build a path from centreline samples. Samples are assumed roughly evenly spaced, which is
 * true for everything we generate; `t` indexes them directly rather than by arc length. Exact
 * arc-length parameterisation is a real thing to want later, and not today.
 */
export function buildTrackPath(samples: Array<{ x: number; y: number }>): TrackPath {
  const count = samples.length;
  const points: PathPoint[] = samples.map((p, i) => {
    const next = samples[(i + 1) % count];
    const prev = samples[(i - 1 + count) % count];
    // Central difference: smoother tangents than looking only forward, which matters where
    // the straights meet the corners.
    const dx = (next?.x ?? p.x) - (prev?.x ?? p.x);
    const dy = (next?.y ?? p.y) - (prev?.y ?? p.y);
    const len = Math.hypot(dx, dy) || 1;
    const tx = dx / len;
    const ty = dy / len;
    // Normal is the tangent rotated 90°, pointing to the OUTSIDE of the lap when samples run
    // in lap order. Positive `offset` is therefore outward, negative toward the infield.
    return { index: i, x: p.x, y: p.y, tx, ty, nx: -ty, ny: tx };
  });

  return {
    points,
    at(t) {
      const wrapped = ((t % 1) + 1) % 1;
      const index = Math.min(count - 1, Math.floor(wrapped * count));
      // Non-null: index is clamped into range and `points` is never empty in practice.
      return points[index] as PathPoint;
    },
  };
}

/** One Catmull-Rom span. Passes exactly through p1 and p2, curving to meet its neighbours. */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * Build a closed circuit from a handful of control points. (1b5)
 *
 * A Catmull-Rom loop passes through every point you give it, so authoring a track is placing
 * corners by eye rather than solving for tangents — and unlike stitching arcs and straights
 * together, it cannot fail to close.
 *
 * The result is resampled to even spacing by arc length. That matters for authoring: it makes
 * `t` mean "this far around the lap by distance", so a pad at t = 0.25 really is a quarter of
 * the way round, rather than a quarter of the way through the control points.
 */
export function buildLoopPath(control: Array<{ x: number; y: number }>, samples = 300): TrackPath {
  const n = control.length;
  const SUBDIVISIONS = 24;

  const dense: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const p0 = control[(i - 1 + n) % n];
    const p1 = control[i];
    const p2 = control[(i + 1) % n];
    const p3 = control[(i + 2) % n];
    if (!p0 || !p1 || !p2 || !p3) continue;
    for (let j = 0; j < SUBDIVISIONS; j++) {
      const t = j / SUBDIVISIONS;
      dense.push({
        x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
        y: catmullRom(p0.y, p1.y, p2.y, p3.y, t),
      });
    }
  }

  // Walk the dense curve, dropping a point every `spacing` units of travel.
  const cumulative: number[] = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1];
    const b = dense[i % dense.length];
    if (!a || !b) break;
    cumulative.push((cumulative[i - 1] ?? 0) + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = cumulative[cumulative.length - 1] ?? 0;
  const spacing = total / samples;

  const even: Array<{ x: number; y: number }> = [];
  let cursor = 0;
  for (let i = 0; i < samples; i++) {
    const target = i * spacing;
    while (cursor < cumulative.length - 2 && (cumulative[cursor + 1] ?? 0) < target) cursor++;

    const from = dense[cursor];
    const to = dense[(cursor + 1) % dense.length];
    const spanStart = cumulative[cursor] ?? 0;
    const spanEnd = cumulative[cursor + 1] ?? spanStart;
    if (!from || !to) break;

    const span = spanEnd - spanStart;
    const fraction = span > 0 ? (target - spanStart) / span : 0;
    even.push({
      x: from.x + (to.x - from.x) * fraction,
      y: from.y + (to.y - from.y) * fraction,
    });
  }

  return buildTrackPath(even);
}

/**
 * Nearest point on the centreline, and how far off it the query point sits — positive to the
 * outside of the lap, negative to the infield.
 *
 * A plain scan of every sample. At 300 samples, twice a tick, at 120Hz, that is ~72k distance
 * checks a second — nothing — and unlike a cached local search it cannot get the wrong answer
 * where the track doubles back on itself, which this circuit's hairpin does.
 */
export function projectToPath(
  path: TrackPath,
  x: number,
  y: number,
): { point: PathPoint; offset: number } | null {
  let best: PathPoint | null = null;
  let bestDistance = Infinity;

  for (const p of path.points) {
    const distance = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = p;
    }
  }
  if (!best) return null;

  return { point: best, offset: (x - best.x) * best.nx + (y - best.y) * best.ny };
}

/**
 * How much the road turns over the next `span` samples, in radians. Near zero is a straight.
 *
 * Shield Up (1e) uses it to keep threats on the straights: being told to hold a key while also
 * being asked to survive a hairpin tests two things at once and teaches neither.
 */
export function bendAhead(path: TrackPath, from: PathPoint, span = 26): number {
  const count = path.points.length;
  const to = path.points[(from.index + span) % count];
  if (!to) return 0;
  const delta = Math.abs(Math.atan2(to.ty, to.tx) - Math.atan2(from.ty, from.tx));
  return Math.min(delta, Math.PI * 2 - delta);
}

// --- furniture -------------------------------------------------------------

export type FurnitureKind = 'pad' | 'ramp' | 'coin';

/** One authored item. The only thing anyone writes by hand. */
export interface FurnitureSpec {
  kind: FurnitureKind;
  /** How far around the lap, 0..1. */
  t: number;
  /** Lateral offset from the centreline. Negative is toward the inside of the track. */
  offset?: number;
  /** Along-track size. Ignored by coins. */
  length?: number;
  /** Across-track size. Ignored by coins. */
  width?: number;
  /** Lip height, ramps only. */
  height?: number;
}

export interface PlacedFurniture {
  id: number;
  kind: FurnitureKind;
  x: number;
  y: number;
  /** Direction of travel at this point on the lap. */
  heading: number;
  halfLength: number;
  halfWidth: number;
  height: number;
  /** Coins only. */
  collected: boolean;
}

const DEFAULT_SIZE: Record<FurnitureKind, { length: number; width: number; height: number }> = {
  pad: { length: 7, width: 5, height: 0 },
  ramp: { length: 9, width: 8, height: 1.8 },
  coin: { length: 1.6, width: 1.6, height: 0 },
};

export function placeFurniture(path: TrackPath, specs: FurnitureSpec[]): PlacedFurniture[] {
  return specs.map((spec, id) => {
    const point = path.at(spec.t);
    const offset = spec.offset ?? 0;
    const size = DEFAULT_SIZE[spec.kind];
    return {
      id,
      kind: spec.kind,
      x: point.x + point.nx * offset,
      y: point.y + point.ny * offset,
      heading: Math.atan2(point.ty, point.tx),
      halfLength: (spec.length ?? size.length) / 2,
      halfWidth: (spec.width ?? size.width) / 2,
      height: spec.height ?? size.height,
      collected: false,
    };
  });
}

/**
 * Where a world point falls inside an item's own frame: `along` runs with the track, `across`
 * runs sideways. Both are 0 at the item's centre.
 */
export function localCoords(
  item: PlacedFurniture,
  x: number,
  y: number,
): { along: number; across: number } {
  const dx = x - item.x;
  const dy = y - item.y;
  const cos = Math.cos(item.heading);
  const sin = Math.sin(item.heading);
  return { along: dx * cos + dy * sin, across: -dx * sin + dy * cos };
}

export function isOver(item: PlacedFurniture, x: number, y: number): boolean {
  const { along, across } = localCoords(item, x, y);
  return Math.abs(along) <= item.halfLength && Math.abs(across) <= item.halfWidth;
}

/** Height of a ramp's surface under a point, 0 at its foot rising to `height` at the lip. */
export function rampHeightAt(item: PlacedFurniture, x: number, y: number): number {
  const { along } = localCoords(item, x, y);
  const progress = (along + item.halfLength) / (item.halfLength * 2);
  return item.height * Math.min(1, Math.max(0, progress));
}

// --- behaviour -------------------------------------------------------------

// A type alias, not an interface, so it satisfies the tuning panel's index-signature constraint.
export type TrackConfig = {
  /** Seconds of boost from a real pad. */
  padBoost: number;
  /**
   * How close to the lip the hop has to be, in milliseconds either side. This is the number
   * Chapter 3 exists to teach, and the one place the plan's "generous difficulty" rule has
   * to be argued with: too wide and landing it means nothing, too tight and Jodi never does.
   */
  trickWindowMs: number;
  /**
   * How far either side of the lip a hop still counts as *trying*, so it can be told "too
   * early" or "too late" instead of being ignored. A miss that says nothing teaches nothing;
   * a miss that says which way you were wrong is a lesson.
   */
  trickAttemptMs: number;
  /** Seconds of boost for a clean trick. Worth clearly more than a pad, or why bother. */
  trickBoost: number;
  /** Converts speed and ramp steepness into launch speed. */
  rampLaunch: number;
  coinTarget: number;
};

/** Tuned by Riggs 2026-08-07; see TUNING.md. */
export const TRACK_CONFIG: TrackConfig = {
  padBoost: 1,
  // Back to 150 once the barrel roll made landings legible — the 500 was measuring "I could
  // not tell it worked", not a genuinely tight window. See TUNING.md.
  trickWindowMs: 150,
  trickAttemptMs: 750,
  trickBoost: 1.3,
  // Raised from 1.6 after the playtest slowdown. Launch speed scales with how fast you hit the
  // ramp, so dropping top speed 20 → 11.5 had quietly cut airtime by ~40% and left the hop
  // nowhere to live. This restores roughly the old hang time at the new speed.
  rampLaunch: 3.2,
  coinTarget: 10,
};

export interface FurnitureContext {
  now: number;
  hopJustPressed: boolean;
  /**
   * When the hop key was **last pressed**, whether or not it is still held.
   *
   * Must not be the input layer's `pressedAt`, which goes null the moment the key comes back
   * up. A hop is a tap: by the time the kart reaches the lip the key is long released, so
   * reading the live press state means every early hop looks like no hop at all.
   */
  lastHopAt: number | null;
}

export type TrickOutcome = 'none' | 'landed' | 'missed';

/** The verdict on one hop attempt, delivered the moment it can be known. */
export type TrickCall = 'got-it' | 'early' | 'late';

export interface FurnitureEvents {
  coinsCollected: number;
  padHit: boolean;
  launched: boolean;
  /**
   * The verdict on a hop, delivered the tick it can be known rather than on landing: the
   * player needs to know how they did at the moment they did it. The boost still belongs to
   * the landing.
   */
  trickCall: TrickCall | null;
  trick: TrickOutcome;
  /** How far the hop was from the lip, in ms. Negative is early. Null when nobody hopped. */
  trickErrorMs: number | null;
}

const NO_EVENTS: FurnitureEvents = {
  coinsCollected: 0,
  padHit: false,
  launched: false,
  trickCall: null,
  trick: 'none',
  trickErrorMs: null,
};

/**
 * Runs the furniture for one drill: what the kart is touching, and what that does to it.
 *
 * Called once per tick **after** the physics step. Launching a tick late is deliberate and
 * harmless — the kart is already airborne by then, falling off the lip under gravity, so the
 * upward push simply turns a drop into a jump. Detecting it beforehand would mean predicting
 * the step, which is a lot of machinery to save eight milliseconds nobody can feel.
 */
export class TrackRun {
  coins = 0;
  private currentRamp: PlacedFurniture | null = null;
  private lastPadId: number | null = null;
  private launchedAt = 0;
  private trickLanded = false;
  private boostGiven = false;
  /** The verdict already given for this flight, so it is not repeated every hop. */
  private call: TrickCall | null = null;

  constructor(readonly items: PlacedFurniture[]) {}

  reset(): void {
    this.coins = 0;
    this.currentRamp = null;
    this.lastPadId = null;
    this.launchedAt = 0;
    this.trickLanded = false;
    this.boostGiven = false;
    this.call = null;
    for (const item of this.items) item.collected = false;
  }

  /** Solid ground under a point: flat everywhere except on ramps and decoys. */
  groundHeightAt = (x: number, y: number): number => {
    let height = 0;
    for (const item of this.items) {
      if (item.kind !== 'ramp') continue;
      if (!isOver(item, x, y)) continue;
      height = Math.max(height, rampHeightAt(item, x, y));
    }
    return height;
  };

  update(
    kart: KartState,
    config: TrackConfig,
    ctx: FurnitureContext,
    stepped: { speed: number; landed: boolean; airborne: boolean },
  ): FurnitureEvents {
    const events: FurnitureEvents = { ...NO_EVENTS };

    // --- coins ---
    for (const item of this.items) {
      if (item.kind !== 'coin' || item.collected) continue;
      // Generous radius: coins are a reward for taking the right line, not a precision test.
      const reach = item.halfWidth + 1.6;
      if (Math.hypot(kart.x - item.x, kart.y - item.y) <= reach) {
        item.collected = true;
        this.coins++;
        events.coinsCollected++;
      }
    }

    // --- boost pads ---
    let padUnderKart: PlacedFurniture | null = null;
    for (const item of this.items) {
      if (item.kind !== 'pad') continue;
      if (!isOver(item, kart.x, kart.y)) continue;
      padUnderKart = item;
      if (this.lastPadId !== item.id) {
        kart.boostRemaining = Math.max(kart.boostRemaining, config.padBoost);
        events.padHit = true;
      }
    }
    this.lastPadId = padUnderKart?.id ?? null;

    // --- ramps ---
    let rampUnderKart: PlacedFurniture | null = null;
    for (const item of this.items) {
      if (item.kind !== 'ramp') continue;
      if (isOver(item, kart.x, kart.y)) rampUnderKart = item;
    }

    const leftARamp = this.currentRamp !== null && rampUnderKart === null;
    if (leftARamp && this.currentRamp) {
      const ramp = this.currentRamp;
      const slope = ramp.height / (ramp.halfLength * 2);
      kart.vAltitude = Math.max(kart.vAltitude, stepped.speed * slope * config.rampLaunch);

      this.launchedAt = ctx.now;
      this.trickLanded = false;
      this.boostGiven = false;
      this.call = null;
      events.launched = true;

      // A hop before the lip is judged here, because "too early" only becomes knowable once
      // the lip arrives. An early hop inside the window still counts: pressing just before is
      // the same instinct as pressing just after, and rewarding one but not the other would
      // teach nothing useful.
      const pressed = ctx.lastHopAt;
      if (pressed !== null) {
        const error = pressed - ctx.now; // negative: before the lip
        if (-error <= config.trickWindowMs) {
          this.trickLanded = true;
          this.call = 'got-it';
        } else if (-error <= config.trickAttemptMs) {
          this.call = 'early';
        }
        if (this.call) {
          events.trickCall = this.call;
          events.trickErrorMs = error;
        }
      }
    }
    this.currentRamp = rampUnderKart;

    // Judging runs for the whole attempt window, which deliberately outlives the flight. Jumps
    // are short — a couple of hundred milliseconds — so closing the books on touchdown means a
    // hop a moment too late gets silence instead of "too late", which is the one thing it most
    // needs to hear.
    const judging = this.launchedAt > 0 && ctx.now - this.launchedAt <= config.trickAttemptMs;

    if (judging && ctx.hopJustPressed && !this.trickLanded) {
      const error = ctx.now - this.launchedAt;
      // A trick has to happen in the air. Inside the window but already back on the ground is
      // still late, however narrowly.
      if (error <= config.trickWindowMs && stepped.airborne) {
        // Upgrades an earlier "too early" — hopping again at the right moment should be
        // rewarded, not locked out by the first attempt.
        this.trickLanded = true;
        this.call = 'got-it';
        events.trickCall = 'got-it';
        events.trickErrorMs = error;
      } else if (this.call !== 'late') {
        this.call = 'late';
        events.trickCall = 'late';
        events.trickErrorMs = error;
      }
    }

    // --- touchdown ---
    // The boost arrives on landing, not at the lip, so the reward reads as "you stuck it".
    if (stepped.landed && this.trickLanded && !this.boostGiven) {
      kart.boostRemaining = Math.max(kart.boostRemaining, config.trickBoost);
      this.boostGiven = true;
      events.trick = 'landed';
    }

    // Close the books once the attempt window is spent, not on touchdown.
    if (this.launchedAt > 0 && ctx.now - this.launchedAt > config.trickAttemptMs) {
      // Only nag if they never tried at all. Someone already told "too early" does not need
      // telling again that they missed.
      if (this.call === null) events.trick = 'missed';
      this.launchedAt = 0;
      this.trickLanded = false;
      this.boostGiven = false;
      this.call = null;
    }

    return events;
  }
}
