/**
 * Drifting and mini-turbos. (Chapter 6, built 2026-08-12.)
 *
 * Chapter 6 used to be prose. Riggs watched Bayesic's intro video — which treats drifting as an
 * *essential mechanic* rather than an optional flourish — and asked for it implemented, so this
 * is the mechanic: hop into a corner, hold the drift, watch the sparks go blue and then orange,
 * let go and get a boost out of a corner you had to take anyway.
 *
 * **It layers on top of `stepKart` rather than living inside it.** Three other drills share that
 * function and none of them wants a drift, so this module produces the numbers a drift needs and
 * the drill feeds them in through hooks that already exist: yaw goes in as `assistYaw`, and the
 * grip reduction is a per-tick copy of the kart config. Turning the heading while the kart keeps
 * travelling its old way *is* a slide, so the visible drift falls out of the physics rather than
 * being animated on top of it.
 *
 * **A drift replaces her steering; it does not add to it.** (Riggs, 2026-08-12: "you still turn
 * just as sharp, so you can't drift for long — to get an orange I have to go in a full circle".)
 * The first version added `yawBonus` on top of whatever she was already steering, which made a
 * drifting kart turn *harder* than a normal one. That is backwards, and it produced exactly what
 * he describes: the only way to hold a drift long enough to charge was to spiral.
 *
 * A real drift is a *commitment to a wide arc*. So while one is running, `stepKart` gets a steer
 * input of zero and every bit of yaw comes from here — a modest fixed rate that traces a radius of
 * roughly eighteen units at full speed, which is a long sweeping curve on a road ten units wide.
 * Her steering still does something, but it *modulates* the arc rather than driving it: hold into
 * the drift to tighten, ease off to run wide.
 *
 * **The stick has three positions, and all three keep the drift alive.** Into the corner tightens
 * it, centred holds the natural arc, away from the corner widens it — which is what the real game
 * does and what Chapter 6 now teaches on the page. Only letting go of the button ends a drift (or
 * dropping below walking pace). The first version ended it the moment she stopped actively holding
 * into the corner, which meant she could never settle into one at all.
 *
 * **Three tiers in the game, two here.** Blue sparks (mini-turbo) and orange (super mini-turbo)
 * are in. Purple is not, and Chapter 6 says why out loud: Bayesic's own video files it under
 * "Advanced Drifting Tech" after the five-minute mark, which is the point the chapter tells her
 * to stop watching. A third tier she will never charge would be a bar that never fills.
 *
 * **The drift cannot be entered by accident.** It needs a hop *and* a steering input held through
 * the landing, which is how the real game does it and — more to the point here — means the three
 * other drills can share the hop key without ever starting a drift they do not know about.
 */

import { clamp } from './kart';

export type DriftTier = 'none' | 'blue' | 'orange';

export type DriftConfig = {
  /** Seconds of holding before blue sparks appear. */
  blueAt: number;
  /** Seconds before orange. Charging continues from blue rather than restarting. */
  orangeAt: number;
  /** Boost awarded on release, in seconds, per tier. */
  blueBoost: number;
  orangeBoost: number;

  /**
   * The arc, rad/s. All three replace her steering rather than adding to it.
   *
   * `base` is what a drift does if she touches nothing: at the kart's 11.5 units/s that is a
   * radius of about eighteen units, a long sweeper on a road ten units wide. `tighten` is holding
   * into the corner, `widen` is easing off — the two together are the whole of the control she
   * has, and neither is anywhere near the 2.0 rad/s a normal kart can pull.
   */
  baseYaw: number;
  tightenYaw: number;
  widenYaw: number;

  /**
   * Grip while drifting, as a fraction of normal. This is what makes it *look* like a drift: the
   * kart's sideways velocity stops bleeding off, so the nose points into the corner while the kart
   * keeps travelling toward the outside of it.
   */
  gripFactor: number;

  /**
   * How long after a hop the drift can still be started, in seconds. A grace window rather than a
   * single frame, because she is on a keyboard and "press two keys on the same tick" is not a
   * reasonable thing to ask of anybody.
   */
  hopWindow: number;
  /** Below this speed a drift ends on its own. Drifting at walking pace looks broken. */
  minSpeed: number;
};

/**
 * Tuned so the test circuit's long U-turn charges orange in one go and its hairpin does not —
 * which is the chapter's entire lesson, expressed as numbers rather than as a paragraph.
 *
 * At `baseYaw` a drift sweeps about 71° per second, so orange at 1.6s is a corner of roughly 115°.
 * The U-turn is a bit more than that; the hairpin is over long before it.
 */
export const DRIFT_CONFIG: DriftConfig = {
  blueAt: 0.6,
  orangeAt: 1.6,
  blueBoost: 0.55,
  orangeBoost: 1.15,

  baseYaw: 0.62,
  tightenYaw: 0.95,
  widenYaw: 0.3,

  gripFactor: 0.3,

  hopWindow: 0.35,
  minSpeed: 3,
};

export interface DriftState {
  /** 0 when not drifting, otherwise -1 or 1: the direction locked in at the start. */
  direction: number;
  /** Seconds held so far. */
  charge: number;
  /** Seconds since the last hop, or null if there has not been one. */
  sinceHop: number | null;
  /** Set for one tick when a drift is released. Read it, then it clears. */
  released: DriftTier;
  /** Boost seconds owed from that release. */
  releasedBoost: number;
}

export function createDrift(): DriftState {
  return { direction: 0, charge: 0, sinceHop: null, released: 'none', releasedBoost: 0 };
}

export function resetDrift(drift: DriftState): void {
  drift.direction = 0;
  drift.charge = 0;
  drift.sinceHop = null;
  drift.released = 'none';
  drift.releasedBoost = 0;
}

export function tierFor(charge: number, config: DriftConfig): DriftTier {
  if (charge >= config.orangeAt) return 'orange';
  if (charge >= config.blueAt) return 'blue';
  return 'none';
}

/** 0–1 through the current tier, for a charge bar that fills twice rather than once. */
export function tierProgress(charge: number, config: DriftConfig): number {
  if (charge >= config.orangeAt) return 1;
  if (charge >= config.blueAt) {
    return clamp((charge - config.blueAt) / (config.orangeAt - config.blueAt), 0, 1);
  }
  return clamp(charge / config.blueAt, 0, 1);
}

export interface DriftInput {
  /** -1, 0 or 1, straight from the keyboard. */
  steer: number;
  /** Is the drift key down right now? */
  held: boolean;
  /** Did the hop key go down this tick? */
  hopped: boolean;
  speed: number;
  airborne: boolean;
}

export interface DriftResult {
  /** Yaw to hand `stepKart` as `assistYaw`, rad/s. While drifting this is *all* of the yaw. */
  yaw: number;
  /**
   * True while a drift is running, which means the caller must pass `stepKart` a steer input of
   * **zero** — the arc above already accounts for what she is holding. Adding both is the bug this
   * whole model was rewritten to fix.
   */
  overrideSteering: boolean;
  /** Multiply the kart config's `grip` by this. 1 when not drifting. */
  gripScale: number;
  /** Boost seconds to add to the kart. Non-zero only on the tick a drift is released. */
  boost: number;
  /** The tier just released, for sound and for the drill's counter. */
  released: DriftTier;
  tier: DriftTier;
  drifting: boolean;
  /** True on the single tick a drift begins, for the hop. */
  started: boolean;
}

const IDLE: DriftResult = {
  yaw: 0,
  overrideSteering: false,
  gripScale: 1,
  boost: 0,
  released: 'none',
  tier: 'none',
  drifting: false,
  started: false,
};

/**
 * Advance the drift by one fixed step.
 *
 * Order matters here and is worth stating: a release is detected *before* a new drift can start,
 * so tapping the key twice in quick succession banks the first boost rather than silently
 * replacing it with a fresh zero-charge drift.
 */
export function stepDrift(
  drift: DriftState,
  config: DriftConfig,
  input: DriftInput,
  dt: number,
): DriftResult {
  drift.released = 'none';
  drift.releasedBoost = 0;

  if (drift.sinceHop !== null) drift.sinceHop += dt;
  if (input.hopped) drift.sinceHop = 0;

  const wasDrifting = drift.direction !== 0;

  // --- release ---
  // Only two things end a drift: letting go of the button, and dropping below walking pace.
  //
  // Counter-steering used to end it as well, and that was wrong twice over. It is not what the
  // real game does — pushing away from the corner *widens* a drift rather than cancelling it —
  // and Chapter 6 now teaches the three stick positions explicitly (Riggs, 2026-08-12), so an
  // engine that cancelled on the third one would be contradicting the page it sits under.
  if (wasDrifting) {
    const tooSlow = input.speed < config.minSpeed;
    if (!input.held || tooSlow) {
      const tier = tierFor(drift.charge, config);
      drift.released = tier;
      drift.releasedBoost =
        tier === 'orange' ? config.orangeBoost : tier === 'blue' ? config.blueBoost : 0;
      drift.direction = 0;
      drift.charge = 0;
      return { ...IDLE, boost: drift.releasedBoost, released: tier };
    }
  }

  // --- start ---
  // A hop, recently, with the wheel already turned and enough speed to be worth it. Requiring the
  // steer is what stops the other three drills' hop key from ever opening a drift by accident.
  let started = false;
  if (!wasDrifting && input.held && input.steer !== 0 && input.speed >= config.minSpeed) {
    const hopped = drift.sinceHop !== null && drift.sinceHop <= config.hopWindow;
    if (hopped && !input.airborne) {
      drift.direction = Math.sign(input.steer);
      drift.charge = 0;
      drift.sinceHop = null;
      started = true;
    }
  }

  if (drift.direction === 0) return IDLE;

  drift.charge += dt;

  // Her steering modulates the arc rather than driving it. Into the drift tightens, off widens,
  // neutral holds the base radius.
  const holding = Math.sign(input.steer) === drift.direction;
  const rate = input.steer === 0 ? config.baseYaw : holding ? config.tightenYaw : config.widenYaw;

  return {
    yaw: rate * drift.direction,
    overrideSteering: true,
    gripScale: config.gripFactor,
    boost: 0,
    released: 'none',
    tier: tierFor(drift.charge, config),
    drifting: true,
    started,
  };
}
