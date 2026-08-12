/**
 * Drifting and mini-turbos. (Chapter 6, built 2026-08-12.)
 *
 * Chapter 6 used to be prose. Riggs watched Bayesic's intro video — which treats drifting as an
 * *essential mechanic* rather than an optional flourish — and asked for it implemented, so this
 * is the mechanic: hop into a corner, hold the drift, watch the sparks go blue and then orange,
 * let go and get a boost out of a corner you had to take anyway.
 *
 * **It layers on top of `stepKart` rather than living inside it.** Three other drills share that
 * function and none of them wants a drift, so this module produces two numbers — extra yaw, and a
 * boost when the drift is released — and the drill feeds them in through hooks that already
 * exist. The extra yaw goes in as `assistYaw`, which `stepKart` adds to the player's steering
 * without touching the velocity vector; the effect of turning the heading while the kart keeps
 * travelling its old way *is* a slide, so the visible drift falls out of the physics rather than
 * being animated on top of it.
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
  /** Extra yaw while drifting, rad/s at full lock. This is what makes the back end come round. */
  yawBonus: number;
  /**
   * How long after a hop the drift can still be started, in seconds. A grace window rather than a
   * single frame, because she is on a keyboard and "press two keys on the same tick" is not a
   * reasonable thing to ask of anybody.
   */
  hopWindow: number;
  /** Below this speed a drift ends on its own. Drifting at walking pace looks broken. */
  minSpeed: number;
};

/** Tuned against the test circuit's corners: a long sweeper charges orange, a tight one does not. */
export const DRIFT_CONFIG: DriftConfig = {
  blueAt: 0.75,
  orangeAt: 1.9,
  blueBoost: 0.55,
  orangeBoost: 1.1,
  yawBonus: 1.15,
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
  /** Extra yaw to hand `stepKart` as `assistYaw`, rad/s. */
  yaw: number;
  /** Boost seconds to add to the kart. Non-zero only on the tick a drift is released. */
  boost: number;
  /** The tier just released, for sound and for the drill's counter. */
  released: DriftTier;
  tier: DriftTier;
  drifting: boolean;
}

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

  const drifting = drift.direction !== 0;

  // --- release ---
  // Letting go, stopping, or straightening up all end it. Straightening counts because a drift
  // held through a straight is not a drift, and continuing to award charge for it would teach
  // exactly the wrong habit.
  if (drifting) {
    const tooSlow = input.speed < config.minSpeed;
    const straightened = Math.sign(input.steer) !== drift.direction;
    if (!input.held || tooSlow || straightened) {
      const tier = tierFor(drift.charge, config);
      drift.released = tier;
      drift.releasedBoost =
        tier === 'orange' ? config.orangeBoost : tier === 'blue' ? config.blueBoost : 0;
      drift.direction = 0;
      drift.charge = 0;
      return {
        yaw: 0,
        boost: drift.releasedBoost,
        released: tier,
        tier: 'none',
        drifting: false,
      };
    }
  }

  // --- start ---
  // A hop, recently, with the wheel already turned and enough speed to be worth it.
  if (!drifting && input.held && input.steer !== 0 && input.speed >= config.minSpeed) {
    const hopped = drift.sinceHop !== null && drift.sinceHop <= config.hopWindow;
    if (hopped && !input.airborne) {
      drift.direction = Math.sign(input.steer);
      drift.charge = 0;
      drift.sinceHop = null;
    }
  }

  if (drift.direction === 0) {
    return { yaw: 0, boost: 0, released: 'none', tier: 'none', drifting: false };
  }

  drift.charge += dt;

  return {
    yaw: config.yawBonus * drift.direction,
    boost: 0,
    released: 'none',
    tier: tierFor(drift.charge, config),
    drifting: true,
  };
}
