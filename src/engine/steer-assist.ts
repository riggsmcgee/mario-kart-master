/**
 * Steer-assist guardrail. (1b4)
 *
 * Jodi plays with smart steering ON, so every drill has to behave the way her real game does.
 * That makes this one of the few constants in the project with a *correct* answer rather than
 * a taste answer: if our assist is stronger than Nintendo's, she learns to rely on help the
 * Switch will not give her; if it is weaker, the drills feel meaner than the game and she
 * stops playing. It errs toward the real thing, not toward whatever is most fun here.
 *
 * What the real assist does, and what this copies:
 *
 *  - It keeps you on the road, but it does not drive for you. You still choose your line
 *    within the road; it only objects near the edges.
 *  - It **steers**, rather than shoving. The correction is a yaw rate, not a sideways force,
 *    so on screen it looks like the kart turning itself rather than being pushed.
 *  - It anticipates. Reacting only once a wheel is already off would feel like a rescue; the
 *    real thing reads the corner coming and starts turning early, which is why `lookAhead`
 *    matters more than `strength` for making this feel right.
 */

import { wrapAngle, clamp } from './kart';
import { projectToPath, type TrackPath } from './track';

// A type alias, not an interface, so it satisfies the tuning panel's index-signature constraint.
export type SteerAssistConfig = {
  /** Off reveals what the drills would feel like without her setting. Toggle it and drive. */
  enabled: boolean;
  /**
   * How far toward the edge you get before the assist objects, as a fraction of the road's
   * half-width. 1 means it never helps until you are already off.
   */
  startFraction: number;
  /** How sharply it aims you back in at the very edge, radians away from straight. */
  maxCorrectionAngle: number;
  /** Ceiling on the corrective yaw rate, rad/s. Keeps it from snapping the kart round. */
  strength: number;
  /** How far ahead it looks, in seconds of travel. The anticipation constant. */
  lookAheadSeconds: number;
};

export const STEER_ASSIST_CONFIG: SteerAssistConfig = {
  enabled: true,
  startFraction: 0.55,
  maxCorrectionAngle: 0.85,
  strength: 2.2,
  lookAheadSeconds: 0.35,
};

export interface SteerAssistResult {
  /** Corrective yaw rate to add this tick, rad/s. */
  yawRate: number;
  /** Where the kart is across the road, -1 inside edge to +1 outside edge. For readouts. */
  lateral: number;
  active: boolean;
}

const IDLE: SteerAssistResult = { yawRate: 0, lateral: 0, active: false };

export function computeSteerAssist(
  kart: { x: number; y: number; heading: number; vx: number; vy: number },
  path: TrackPath,
  roadHalfWidth: number,
  config: SteerAssistConfig,
): SteerAssistResult {
  if (!config.enabled) return IDLE;

  // Judge the position the kart is *about* to be in. Anticipation is most of the feel.
  const aheadX = kart.x + kart.vx * config.lookAheadSeconds;
  const aheadY = kart.y + kart.vy * config.lookAheadSeconds;

  const projection = projectToPath(path, aheadX, aheadY);
  if (!projection) return IDLE;

  const lateral = clamp(projection.offset / roadHalfWidth, -1.5, 1.5);
  const start = config.startFraction;
  const excess = (Math.abs(lateral) - start) / Math.max(0.001, 1 - start);
  if (excess <= 0) return { yawRate: 0, lateral, active: false };

  // Aim along the road, angled back toward the middle in proportion to how far out we are.
  // The normal points outward, so a positive offset needs a negative correction.
  const pathHeading = Math.atan2(projection.point.ty, projection.point.tx);
  const correction = -Math.sign(lateral) * Math.min(1, excess) * config.maxCorrectionAngle;
  const desired = pathHeading + correction;

  // Turn toward that heading rather than snapping to it, capped so the assist can always be
  // felt as a nudge and never as the kart being taken away from you.
  const difference = wrapAngle(desired - kart.heading);
  const yawRate = clamp(difference * config.strength, -config.strength, config.strength);

  return { yawRate, lateral, active: true };
}
