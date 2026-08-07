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
    // Normal is the tangent rotated 90°, chosen so it points to the OUTSIDE of the lap for
    // samples ordered the way `stadiumCentreline` orders them. Positive `offset` is therefore
    // outward, negative is toward the infield.
    return { x: p.x, y: p.y, tx, ty, nx: -ty, ny: tx };
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

// --- furniture -------------------------------------------------------------

export type FurnitureKind = 'pad' | 'ramp' | 'decoy' | 'coin';

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
  decoy: { length: 7, width: 5, height: 0.9 },
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
  /** Seconds of boost for a clean trick. Worth clearly more than a pad, or why bother. */
  trickBoost: number;
  /** Converts speed and ramp steepness into launch speed. */
  rampLaunch: number;
  /** Fraction of speed kept after committing to a decoy. The cost of not looking. */
  decoySpeedKeep: number;
  coinTarget: number;
};

export const TRACK_CONFIG: TrackConfig = {
  padBoost: 0.9,
  trickWindowMs: 150,
  trickBoost: 1.3,
  rampLaunch: 1.6,
  decoySpeedKeep: 0.62,
  coinTarget: 10,
};

export interface FurnitureContext {
  now: number;
  hopJustPressed: boolean;
  /** Timestamp of the current hop press, or null. Lets an early hop still count. */
  hopPressedAt: number | null;
}

export type TrickOutcome = 'none' | 'landed' | 'missed';

export interface FurnitureEvents {
  coinsCollected: number;
  padHit: boolean;
  decoyHit: boolean;
  launched: boolean;
  trick: TrickOutcome;
  /** How far the hop was from the lip, in ms. Negative is early. Null when no trick landed. */
  trickErrorMs: number | null;
}

const NO_EVENTS: FurnitureEvents = {
  coinsCollected: 0,
  padHit: false,
  decoyHit: false,
  launched: false,
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
  private trickArmedUntil = 0;
  private trickLanded = false;
  private trickErrorMs: number | null = null;

  constructor(readonly items: PlacedFurniture[]) {}

  reset(): void {
    this.coins = 0;
    this.currentRamp = null;
    this.lastPadId = null;
    this.trickArmedUntil = 0;
    this.trickLanded = false;
    this.trickErrorMs = null;
    for (const item of this.items) item.collected = false;
  }

  /** Solid ground under a point: flat everywhere except on ramps and decoys. */
  groundHeightAt = (x: number, y: number): number => {
    let height = 0;
    for (const item of this.items) {
      if (item.kind !== 'ramp' && item.kind !== 'decoy') continue;
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

    // --- pads and decoys ---
    let padUnderKart: PlacedFurniture | null = null;
    for (const item of this.items) {
      if (item.kind !== 'pad' && item.kind !== 'decoy') continue;
      if (!isOver(item, kart.x, kart.y)) continue;

      if (item.kind === 'pad') {
        padUnderKart = item;
        if (this.lastPadId !== item.id) {
          kart.boostRemaining = Math.max(kart.boostRemaining, config.padBoost);
          events.padHit = true;
        }
      } else if (this.lastPadId !== item.id) {
        padUnderKart = item;
        // No boost, and it costs you speed. The lesson of Chapter 4 is entirely this line.
        kart.vx *= config.decoySpeedKeep;
        kart.vy *= config.decoySpeedKeep;
        events.decoyHit = true;
      }
    }
    this.lastPadId = padUnderKart?.id ?? null;

    // --- ramps ---
    let rampUnderKart: PlacedFurniture | null = null;
    for (const item of this.items) {
      if (item.kind !== 'ramp' && item.kind !== 'decoy') continue;
      if (isOver(item, kart.x, kart.y)) rampUnderKart = item;
    }

    const leftARamp = this.currentRamp !== null && rampUnderKart === null;
    if (leftARamp && this.currentRamp) {
      const ramp = this.currentRamp;
      const slope = ramp.height / (ramp.halfLength * 2);
      kart.vAltitude = Math.max(kart.vAltitude, stepped.speed * slope * config.rampLaunch);

      this.launchedAt = ctx.now;
      this.trickLanded = false;
      this.trickErrorMs = null;
      events.launched = true;

      // An early hop counts: pressing just before the lip is the same instinct as pressing
      // just after, and punishing one but not the other would teach nothing useful.
      const pressed = ctx.hopPressedAt;
      if (pressed !== null && ctx.now - pressed <= config.trickWindowMs) {
        this.trickLanded = true;
        this.trickErrorMs = pressed - ctx.now;
        this.trickArmedUntil = 0;
      } else {
        this.trickArmedUntil = ctx.now + config.trickWindowMs;
      }
    }
    this.currentRamp = rampUnderKart;

    // A hop after the lip, still inside the window.
    if (!this.trickLanded && ctx.hopJustPressed && ctx.now <= this.trickArmedUntil) {
      this.trickLanded = true;
      this.trickErrorMs = ctx.now - this.launchedAt;
      this.trickArmedUntil = 0;
    }

    // --- touchdown ---
    // The boost arrives on landing, not at the lip, so the reward reads as "you stuck it".
    if (stepped.landed && this.launchedAt > 0) {
      if (this.trickLanded) {
        kart.boostRemaining = Math.max(kart.boostRemaining, config.trickBoost);
        events.trick = 'landed';
        events.trickErrorMs = this.trickErrorMs;
      } else {
        events.trick = 'missed';
      }
      this.launchedAt = 0;
      this.trickLanded = false;
      this.trickArmedUntil = 0;
    }

    return events;
  }
}
