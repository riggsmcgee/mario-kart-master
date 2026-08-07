/**
 * Behind-the-kart chase camera. (1b2)
 *
 * This is the step that makes the drills read as Mario Kart rather than as a physics demo, so
 * the camera is treated as a feel system with tunable constants, not as plumbing.
 *
 * Everything here is lag. A camera welded rigidly behind the kart looks correct and feels dead:
 * the world snaps around the moment you touch a key, and speed stops registering because
 * nothing in frame ever moves relative to anything else. Four separate lags do the work:
 *
 *  - **Position lag** — the camera chases its ideal spot rather than occupying it, so hard
 *    cornering swings it wide and the kart slides across frame.
 *  - **Heading lag** — the camera's yaw trails the kart's, so you briefly see the kart's flank
 *    as it turns. This is the single biggest contributor to "that looks like Mario Kart."
 *  - **Lean** — a small roll into the turn.
 *  - **Speed FOV** — the field of view widens with speed. Nothing else sells velocity as
 *    cheaply, because it makes the edges of the frame rush outward.
 *
 * Physics stays 2D underneath: the sim's (x, y) maps to world (x, z), with y as up.
 */

import type { PerspectiveCamera } from 'three';

// A type alias, not an interface, so it satisfies the tuning panel's index-signature constraint.
export type ChaseCameraConfig = {
  /** How far behind the kart the camera sits, world units. */
  distance: number;
  /** How high above the ground, world units. */
  height: number;
  /** How far ahead of the kart the camera looks. Higher reads as more committed to the corner. */
  lookAhead: number;
  /** Height of the look-at point, so the camera aims slightly down at the kart. */
  lookHeight: number;
  /** How fast the camera catches up to its ideal position, per second. Lower is looser. */
  positionLag: number;
  /** How fast the camera's yaw catches the kart's heading, per second. Lower shows more flank. */
  headingLag: number;
  /** Roll into a turn, radians at full steering lock. */
  lean: number;
  /** Field of view at a standstill, degrees. */
  fovBase: number;
  /** Degrees added to the FOV at top speed. */
  fovSpeedGain: number;
};

/** Tuned by Riggs 2026-08-07 against the stadium test oval; see TUNING.md. */
export const CHASE_CAMERA_CONFIG: ChaseCameraConfig = {
  distance: 17.5,
  height: 7.5,
  lookAhead: 7,
  lookHeight: 1.1,
  positionLag: 7,
  headingLag: 5,
  // Zeroed deliberately, not left unset — Riggs tried the roll and did not want it.
  // Do not reintroduce without asking.
  lean: 0,
  fovBase: 56,
  fovSpeedGain: 12,
};

export interface ChaseTarget {
  x: number;
  y: number;
  heading: number;
  /** -1..1, for lean. */
  steerAmount: number;
  speed: number;
  maxSpeed: number;
}

export class ChaseCamera {
  private camX = 0;
  private camY = 0;
  private camZ = 0;
  private camHeading = 0;
  private initialised = false;

  /**
   * @param dt Real elapsed frame time, not the sim step. The camera is presentation, and
   *   smoothing it per rendered frame is what keeps it fluid when the sim rate changes.
   */
  update(
    camera: PerspectiveCamera,
    target: ChaseTarget,
    config: ChaseCameraConfig,
    dt: number,
  ): void {
    // Frame-rate independent smoothing: the same fraction of the remaining gap closes per
    // unit of time regardless of how the frames land.
    const positionBlend = 1 - Math.exp(-config.positionLag * dt);
    const headingBlend = 1 - Math.exp(-config.headingLag * dt);

    if (!this.initialised) {
      this.camHeading = target.heading;
      this.snapToIdeal(target, config);
      this.initialised = true;
    }

    this.camHeading = approachAngle(this.camHeading, target.heading, headingBlend);

    // The ideal spot sits behind the kart along the *camera's* lagging heading, not the
    // kart's. Using the kart's heading here would cancel the lag out entirely.
    const idealX = target.x - Math.cos(this.camHeading) * config.distance;
    const idealZ = target.y - Math.sin(this.camHeading) * config.distance;

    this.camX += (idealX - this.camX) * positionBlend;
    this.camZ += (idealZ - this.camZ) * positionBlend;
    this.camY += (config.height - this.camY) * positionBlend;

    camera.position.set(this.camX, this.camY, this.camZ);
    camera.up.set(0, 1, 0);
    camera.lookAt(
      target.x + Math.cos(target.heading) * config.lookAhead,
      config.lookHeight,
      target.y + Math.sin(target.heading) * config.lookAhead,
    );

    // Roll after aiming, in the camera's own space, so it is a true camera roll.
    camera.rotateZ(-config.lean * target.steerAmount);

    const speedFraction = clamp01(target.speed / Math.max(0.001, target.maxSpeed));
    const fov = config.fovBase + config.fovSpeedGain * speedFraction;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  /** Drop the camera straight to its ideal pose, with no catch-up swing. Use after a reset. */
  reset(target: ChaseTarget, config: ChaseCameraConfig): void {
    this.camHeading = target.heading;
    this.snapToIdeal(target, config);
    this.initialised = true;
  }

  private snapToIdeal(target: ChaseTarget, config: ChaseCameraConfig): void {
    this.camX = target.x - Math.cos(this.camHeading) * config.distance;
    this.camZ = target.y - Math.sin(this.camHeading) * config.distance;
    this.camY = config.height;
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Blend toward an angle the short way around, so crossing ±π does not spin the camera. */
function approachAngle(from: number, to: number, blend: number): number {
  const twoPi = Math.PI * 2;
  let delta = (to - from) % twoPi;
  if (delta > Math.PI) delta -= twoPi;
  if (delta < -Math.PI) delta += twoPi;
  return from + delta * blend;
}
