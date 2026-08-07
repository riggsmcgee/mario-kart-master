/**
 * A driveable surface built from any track path. (1b5)
 *
 * Replaces the provisional stadium in `surface.ts`: the road is now "within half a width of
 * the centreline", whatever shape that centreline happens to be, so a new track is a new list
 * of control points and nothing else.
 */

import type { Bounds, Surface } from './kart';
import { projectToPath, type TrackPath } from './track';

export interface PathSurface extends Surface {
  path: TrackPath;
  halfWidth: number;
  /** On the centreline at the start of the lap, pointing the way the lap runs. */
  startPose: { x: number; y: number; heading: number };
}

export function createPathSurface(
  path: TrackPath,
  halfWidth: number,
  /** Grass between the edge of the road and the wall. */
  grassMargin = 16,
): PathSurface {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of path.points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  const pad = halfWidth + grassMargin;
  const bounds: Bounds = {
    minX: minX - pad,
    maxX: maxX + pad,
    minY: minY - pad,
    maxY: maxY + pad,
  };

  const start = path.at(0);

  return {
    path,
    halfWidth,
    bounds,
    isRoad(x, y) {
      const projection = projectToPath(path, x, y);
      return projection !== null && Math.abs(projection.offset) <= halfWidth;
    },
    startPose: {
      x: start.x,
      y: start.y,
      heading: Math.atan2(start.ty, start.tx),
    },
  };
}
