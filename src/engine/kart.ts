/**
 * Kart physics core. (1b1)
 *
 * A hand-rolled arcade model on a 2D plane. Not a vehicle simulation — the goal is a kart that
 * reads as Mario Kart to someone who has only ever played Mario Kart, on a keyboard, with steer
 * assist and auto-accelerate on.
 *
 * Two constraints from the plan shape everything here:
 *
 * 1. **Auto-forward is always on.** Jodi plays with auto-accelerate, so there is no throttle
 *    input and no brake. The kart drives itself; her only job is where to point it. Every drill
 *    inherits this — steering is the whole interface.
 * 2. **The input is digital.** Keys are on or off, a stick is not. Smoothing that into something
 *    that feels analog is `steerRate`/`steerReturnRate`, and it is the single most important
 *    constant for the 1b6 gate's "responsive, not twitchy."
 *
 * The slide comes from tracking velocity as a vector separately from heading, then letting grip
 * pull the two together. Turn the heading and the kart keeps drifting the old way for a moment,
 * which is what makes a kart feel like a kart rather than a cursor.
 */

// A type alias, not an interface, so it satisfies the tuning panel's index-signature
// constraint — TypeScript only grants implicit index signatures to aliases.
export type KartConfig = {
  /** Top speed on road, world units per second. */
  maxSpeed: number;
  /** How hard auto-forward pushes, units/s². */
  acceleration: number;
  /** Passive slowdown along the forward axis, fraction per second. */
  drag: number;

  /** Yaw at full steer, radians per second. */
  maxYawRate: number;
  /** How fast steering ramps to full lock, per second. The anti-twitch constant. */
  steerRate: number;
  /** How fast steering re-centres when keys are released, per second. */
  steerReturnRate: number;
  /** Fraction of steering authority lost at top speed. 0 turns as hard at speed as when slow. */
  highSpeedSteerPenalty: number;
  /** Speed at which full steering authority is available. Below it, turning fades toward zero. */
  steerAuthoritySpeed: number;

  /** How fast sideways velocity bleeds off, per second. Higher grips, lower slides. */
  grip: number;

  /** Top speed multiplier off road. */
  offRoadSpeedFactor: number;
  /** Grip off road. Lower than on-road grip means the back end steps out in the grass. */
  offRoadGrip: number;

  /** Fraction of speed kept after hitting a wall. */
  wallSpeedKeep: number;
  /** How much the kart rebounds off a wall, 0 slides along it, 1 mirrors. */
  wallBounce: number;

  /** Downward pull while airborne, units/s². Higher makes jumps shorter and snappier. */
  gravity: number;
  /** Steering authority in the air, as a fraction of ground steering. */
  airSteerFactor: number;
  /** Top-speed multiplier while boosting. */
  boostSpeedFactor: number;
  /** How hard a boost pushes, units/s². Much higher than normal, so a boost feels instant. */
  boostAcceleration: number;
};

/**
 * Tuned 2026-08-07 after the first outside playtest; see TUNING.md. Notably slower than the
 * values Riggs picked driving it himself — a first-time driver needed it slower, and a
 * first-time driver is the entire audience.
 */
export const KART_CONFIG: KartConfig = {
  maxSpeed: 11.5,
  acceleration: 10,
  drag: 0.35,

  maxYawRate: 2,
  steerRate: 5.5,
  steerReturnRate: 8,
  highSpeedSteerPenalty: 0.3,
  steerAuthoritySpeed: 4,

  grip: 5.5,

  offRoadSpeedFactor: 0.45,
  offRoadGrip: 2.5,

  wallSpeedKeep: 0.5,
  wallBounce: 0.3,

  gravity: 34,
  airSteerFactor: 0.35,
  boostSpeedFactor: 1.5,
  boostAcceleration: 70,
};

export interface KartState {
  x: number;
  y: number;
  /** Radians. 0 points along +x. */
  heading: number;
  vx: number;
  vy: number;
  /** Smoothed steering, -1..1. The analog value the digital keys are turned into. */
  steerAmount: number;

  /** Height above the ground. 0 while driving; positive on a ramp or in the air. */
  altitude: number;
  /** Vertical speed. Only meaningful while airborne. */
  vAltitude: number;
  /** Seconds of boost left. Set by pads and successful tricks. */
  boostRemaining: number;

  /** Previous-tick pose, for the renderer to interpolate from. */
  prevX: number;
  prevY: number;
  prevHeading: number;
  prevAltitude: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Surface {
  /** Is this point on the driveable road? Off road means slower and looser. */
  isRoad(x: number, y: number): boolean;
  /** Hard walls. The kart cannot leave these. */
  bounds: Bounds;
  /** Height of solid ground here — a ramp's slope. Absent means flat. */
  groundHeightAt?(x: number, y: number): number;
}

export interface KartStepResult {
  /** Speed along the heading, units/s. */
  speed: number;
  /** Angle between where the kart points and where it is going, radians. The visible drift. */
  slipAngle: number;
  onRoad: boolean;
  hitWall: boolean;
  /** Impact speed when hitting a wall, for SFX and camera shake later. */
  impactSpeed: number;
  airborne: boolean;
  /** True on the single tick the kart touches down. Drives the trick-landing boost. */
  landed: boolean;
  boosting: boolean;
}

export function createKart(x: number, y: number, heading = 0): KartState {
  return {
    x,
    y,
    heading,
    vx: 0,
    vy: 0,
    steerAmount: 0,
    altitude: 0,
    vAltitude: 0,
    boostRemaining: 0,
    prevX: x,
    prevY: y,
    prevHeading: heading,
    prevAltitude: 0,
  };
}

export function resetKart(kart: KartState, x: number, y: number, heading = 0): void {
  kart.x = x;
  kart.y = y;
  kart.heading = heading;
  kart.vx = 0;
  kart.vy = 0;
  kart.steerAmount = 0;
  kart.altitude = 0;
  kart.vAltitude = 0;
  kart.boostRemaining = 0;
  kart.prevX = x;
  kart.prevY = y;
  kart.prevHeading = heading;
  kart.prevAltitude = 0;
}

/**
 * Advance one fixed step.
 *
 * @param steerInput -1, 0 or 1 straight from the input layer. Smoothing happens here, on
 *   purpose: the input layer reports what the keyboard did, the physics decides what that
 *   means for the kart.
 */
export function stepKart(
  kart: KartState,
  config: KartConfig,
  steerInput: number,
  surface: Surface,
  dt: number,
): KartStepResult {
  kart.prevX = kart.x;
  kart.prevY = kart.y;
  kart.prevHeading = kart.heading;
  kart.prevAltitude = kart.altitude;

  if (kart.boostRemaining > 0) kart.boostRemaining = Math.max(0, kart.boostRemaining - dt);

  // --- vertical ---
  // The ground under the kart is flat except on a ramp, where it slopes. Being above it means
  // airborne, and airborne changes almost everything below: no surface, weak steering, no grip.
  const groundHeight = surface.groundHeightAt?.(kart.x, kart.y) ?? 0;
  const wasAirborne = kart.altitude > groundHeight + 0.001;

  if (wasAirborne) {
    kart.vAltitude -= config.gravity * dt;
    kart.altitude += kart.vAltitude * dt;
  } else {
    // Following the ramp surface rather than integrating up it: a kart driving up a slope
    // should not need its own vertical velocity, and this way the slope cannot launch it early.
    kart.altitude = groundHeight;
    kart.vAltitude = 0;
  }

  let landed = false;
  if (kart.altitude <= groundHeight) {
    landed = wasAirborne;
    kart.altitude = groundHeight;
    kart.vAltitude = 0;
  }
  const airborne = kart.altitude > groundHeight + 0.001;

  // --- steering: digital in, analog out ---
  // Ramping toward the key and springing back when released is what stops arrow keys from
  // feeling like a light switch. Release is faster than press so corrections settle quickly.
  const target = Math.sign(steerInput);
  const rate = target === 0 ? config.steerReturnRate : config.steerRate;
  kart.steerAmount = approach(kart.steerAmount, target, rate * dt);

  // In the air there is no surface to be off, so grass cannot slow a kart that is over it.
  const onRoad = airborne ? true : surface.isRoad(kart.x, kart.y);
  const boosting = kart.boostRemaining > 0;
  const grip = onRoad ? config.grip : config.offRoadGrip;
  const speedCap =
    config.maxSpeed *
    (onRoad ? 1 : config.offRoadSpeedFactor) *
    (boosting ? config.boostSpeedFactor : 1);

  // --- split velocity into "along the nose" and "sideways" ---
  const cos = Math.cos(kart.heading);
  const sin = Math.sin(kart.heading);
  let forward = kart.vx * cos + kart.vy * sin;
  let lateral = -kart.vx * sin + kart.vy * cos;

  // --- auto-forward ---
  // No throttle input exists; the kart always drives. Over the cap (coming off a boost pad,
  // or crossing onto grass) it decays instead of snapping, so speed loss reads as a slide
  // rather than a wall.
  const push = boosting ? config.boostAcceleration : config.acceleration;
  if (forward < speedCap) {
    forward = Math.min(speedCap, forward + push * dt);
  } else {
    forward = Math.max(speedCap, forward - config.acceleration * dt);
  }
  forward *= Math.exp(-config.drag * dt);

  // --- grip: sideways velocity bleeds away, and the leftover is the drift ---
  // Exponential decay so the feel is identical at any sim rate. Wheels off the ground grip
  // nothing, so a kart launched sideways stays sideways until it lands.
  if (!airborne) lateral *= Math.exp(-grip * dt);

  kart.vx = forward * cos - lateral * sin;
  kart.vy = forward * sin + lateral * cos;

  // --- yaw ---
  // Two speed terms, pulling opposite ways and both wanted. Authority fades to nothing at a
  // standstill, because a parked kart pirouetting on the spot instantly breaks the illusion.
  // The high-speed penalty then widens the turn at top speed, which is what makes a fast lap
  // feel committed instead of remote-controlled.
  const speed = Math.hypot(kart.vx, kart.vy);
  const authority = clamp(speed / Math.max(0.001, config.steerAuthoritySpeed), 0, 1);
  const speedFraction = clamp(speed / config.maxSpeed, 0, 1);
  const penalty = 1 - config.highSpeedSteerPenalty * speedFraction;
  const air = airborne ? config.airSteerFactor : 1;
  const yawRate = config.maxYawRate * kart.steerAmount * authority * penalty * air;

  // Reverse would need the yaw sign flipped; auto-forward means it cannot happen.
  kart.heading = wrapAngle(kart.heading + yawRate * dt);

  kart.x += kart.vx * dt;
  kart.y += kart.vy * dt;

  const collision = collideWithWalls(kart, config, surface.bounds);

  const finalSpeed = Math.hypot(kart.vx, kart.vy);
  return {
    speed: finalSpeed,
    slipAngle: finalSpeed > 0.05 ? wrapAngle(Math.atan2(kart.vy, kart.vx) - kart.heading) : 0,
    onRoad,
    hitWall: collision.hit,
    impactSpeed: collision.impactSpeed,
    airborne,
    landed,
    boosting,
  };
}

function collideWithWalls(
  kart: KartState,
  config: KartConfig,
  bounds: Bounds,
): { hit: boolean; impactSpeed: number } {
  let hit = false;
  let impactSpeed = 0;

  // Axis-aligned, so each wall only touches one velocity component. Speed loss applies to
  // both components: scraping a wall should cost momentum, not just bounce the kart.
  if (kart.x < bounds.minX) {
    kart.x = bounds.minX;
    impactSpeed = Math.abs(kart.vx);
    kart.vx = Math.abs(kart.vx) * config.wallBounce;
    hit = true;
  } else if (kart.x > bounds.maxX) {
    kart.x = bounds.maxX;
    impactSpeed = Math.abs(kart.vx);
    kart.vx = -Math.abs(kart.vx) * config.wallBounce;
    hit = true;
  }

  if (kart.y < bounds.minY) {
    kart.y = bounds.minY;
    impactSpeed = Math.max(impactSpeed, Math.abs(kart.vy));
    kart.vy = Math.abs(kart.vy) * config.wallBounce;
    hit = true;
  } else if (kart.y > bounds.maxY) {
    kart.y = bounds.maxY;
    impactSpeed = Math.max(impactSpeed, Math.abs(kart.vy));
    kart.vy = -Math.abs(kart.vy) * config.wallBounce;
    hit = true;
  }

  if (hit) {
    kart.vx *= config.wallSpeedKeep;
    kart.vy *= config.wallSpeedKeep;
  }
  return { hit, impactSpeed };
}

// --- math helpers ----------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Move toward a target by at most `maxDelta`, without overshooting. */
export function approach(current: number, target: number, maxDelta: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}

/** Fold an angle into -π..π so slip angles and headings stay comparable. */
export function wrapAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  let a = (angle + Math.PI) % twoPi;
  if (a < 0) a += twoPi;
  return a - Math.PI;
}
