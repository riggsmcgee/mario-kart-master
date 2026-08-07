/**
 * Provisional test surface for the kart harness. (1b1)
 *
 * A stadium oval — two straights joined by semicircle ends — is the smallest shape that
 * exercises everything 1b1 needs to prove: sustained cornering, a straight long enough to reach
 * top speed, grass to bog down in, and walls to bounce off.
 *
 * This is NOT the track format. Real tracks are data (see WORKLOG Q6) and arrive with 1b5.
 * Nothing here should grow features; when the format lands, this file goes away.
 */

import type { Bounds, Surface } from './kart';

export interface StadiumOptions {
  centerX: number;
  centerY: number;
  /** Half-length of the straight section. */
  straightHalfLength: number;
  /** Radius of the centreline at the rounded ends. */
  cornerRadius: number;
  /** Road half-width either side of the centreline. */
  roadHalfWidth: number;
  /** Grass between the outer edge of the road and the wall. */
  grassMargin: number;
}

export const STADIUM: StadiumOptions = {
  centerX: 0,
  centerY: 0,
  straightHalfLength: 46,
  cornerRadius: 30,
  roadHalfWidth: 11,
  grassMargin: 14,
};

export interface StadiumSurface extends Surface {
  options: StadiumOptions;
  /** Signed distance from the road centreline; negative is inside the oval. */
  distanceFromCentreline(x: number, y: number): number;
  /** Pose to drop the kart at: on the centreline, pointing along the bottom straight. */
  startPose: { x: number; y: number; heading: number };
}

export function createStadiumSurface(options: StadiumOptions = STADIUM): StadiumSurface {
  const outer = options.cornerRadius + options.roadHalfWidth + options.grassMargin;
  const bounds: Bounds = {
    minX: options.centerX - options.straightHalfLength - outer,
    maxX: options.centerX + options.straightHalfLength + outer,
    minY: options.centerY - outer,
    maxY: options.centerY + outer,
  };

  /**
   * Distance to the centreline segment. Every point on the stadium centreline sits exactly
   * `cornerRadius` from that segment, so road membership is one subtraction.
   */
  const distanceToSegment = (x: number, y: number): number => {
    const dx = x - options.centerX;
    const dy = y - options.centerY;
    const clampedX = Math.max(
      -options.straightHalfLength,
      Math.min(options.straightHalfLength, dx),
    );
    return Math.hypot(dx - clampedX, dy);
  };

  return {
    options,
    bounds,
    isRoad(x, y) {
      return Math.abs(distanceToSegment(x, y) - options.cornerRadius) <= options.roadHalfWidth;
    },
    distanceFromCentreline(x, y) {
      return distanceToSegment(x, y) - options.cornerRadius;
    },
    startPose: {
      x: options.centerX,
      y: options.centerY + options.cornerRadius,
      heading: 0,
    },
  };
}
