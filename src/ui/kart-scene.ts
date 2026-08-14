import * as THREE from 'three';
import type { PathSurface } from '../engine/path-surface';
import type { PathPoint, PlacedFurniture, TrackPath } from '../engine/track';

/**
 * Three.js scene for the driving drills. (1b2 world, 1b3 furniture, 3b2 art pass)
 *
 * Lives in `src/ui` rather than beside a prototype because more than one drill drives the same
 * world — the kart piece, Shield Up (1e), and every Phase 2 chapter that puts Jodi on a track.
 * Prototypes are throwaway; this is not.
 *
 * **All original.** No Nintendo assets, names, shapes or characters — that is design principle
 * 5 and it is not negotiable. What makes a scene read as a kart racer is not their art anyway;
 * it is four things, and all four are ours to make:
 *
 *  1. **Saturated colour with a light sky.** Racers are cheerful. Grey is for simulators.
 *  2. **Round, chunky forms.** Cylindrical wheels instead of boxes does more for "this is a
 *     kart" than any amount of detail elsewhere.
 *  3. **Soft directional light.** Flat unlit shapes read as a diagram; one warm key light and
 *     a sky-coloured fill give form without going anywhere near realism.
 *  4. **A horizon with things on it.** Hills, trees and clouds are what make a track feel like
 *     a place rather than a ribbon in a void — and they are most of the sense of speed.
 *
 * Still provisional: the real style guide is 3a1, and this pass runs ahead of it while gate
 * 1b6 waits on a driver. Treat the palette as a proposal.
 */

const PALETTE = {
  skyTop: 0x2e8ce6,
  skyHorizon: 0xc7ecff,
  cloud: 0xfdfeff,
  grass: 0x5cc24e,
  grassDark: 0x46a83c,
  hill: 0x74cf63,
  road: 0x6e7480,
  roadEdge: 0xf4f6f8,
  kerbRed: 0xe8453c,
  kerbWhite: 0xf7f7f7,
  barrier: 0xf2f3f5,
  barrierAccent: 0xe8453c,
  trunk: 0x8a5a3b,
  leaves: 0x3fa346,
  leavesDark: 0x2f8438,
  kartBody: 0xe8453c,
  kartTrim: 0xffd23f,
  kartSeat: 0x2b2f38,
  tyre: 0x23262d,
  rim: 0xf2f3f5,
  driverSkin: 0xf6c99a,
  driverShirt: 0x3b7de0,
  helmet: 0xffd23f,
  pad: 0xff8a1f,
  padChevron: 0xfff6de,
  // The racing line. Teal rather than white or yellow: the road already uses white for its edges
  // and yellow for coins, and a guide she is meant to follow must not read as either.
  line: 0x2fc4b2,
  sparkBlue: 0x5ad1ff,
  sparkOrange: 0xff8a1f,
  ramp: 0x9b6cff,
  rampStripe: 0xffd23f,
  coin: 0xffcf33,
  flame: 0xffb020,
  flameCore: 0xfff3d6,
  shadow: 0x0a2a12,
  banana: 0xffd23f,
  bananaTip: 0x8a6a1c,
  itemBox: 0x2fc4b2,
  itemBoxGlow: 0x0e6f63,
  itemBoxCore: 0xfff6de,
  seeker: 0xff3b30,
  seekerCore: 0xffe6a8,
  burstBlock: 0x7fd4ff,
  burstHit: 0xff3b30,
};

/** Deterministic scatter, so the scenery is in the same place every reload while tuning. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- geometry helpers ------------------------------------------------------

function ribbonGeometry(
  points: PathPoint[],
  innerOffset: number,
  outerOffset: number,
  y: number,
): THREE.BufferGeometry {
  const count = points.length;
  const positions = new Float32Array(count * 2 * 3);
  const indices: number[] = [];

  points.forEach((p, i) => {
    const base = i * 6;
    positions[base] = p.x + p.nx * innerOffset;
    positions[base + 1] = y;
    positions[base + 2] = p.y + p.ny * innerOffset;
    positions[base + 3] = p.x + p.nx * outerOffset;
    positions[base + 4] = y;
    positions[base + 5] = p.y + p.ny * outerOffset;
  });

  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count; // wrap, so the ribbon closes
    indices.push(i * 2, i * 2 + 1, next * 2, i * 2 + 1, next * 2 + 1, next * 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.setAttribute('normal', flatUpNormals(count * 2));
  return geometry;
}

/**
 * Straight up, for every vertex.
 *
 * These surfaces are all flat and horizontal, so their normal is known. Deriving it with
 * `computeVertexNormals` instead makes it depend on triangle winding — and a ribbon whose
 * winding comes out clockwise gets normals pointing at the ground, which under a hemisphere
 * light means it is lit by the *ground* colour and renders as a dark green smear.
 */
function flatUpNormals(vertexCount: number): THREE.BufferAttribute {
  const normals = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) normals[i * 3 + 1] = 1;
  return new THREE.BufferAttribute(normals, 3);
}

/** Merge a pile of quads into one mesh, so hundreds of kerb stripes cost one draw call. */
function quadsGeometry(quads: Array<[number, number, number][]>): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const [a, b, c, d] of quads) {
    if (!a || !b || !c || !d) continue;
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', flatUpNormals(positions.length / 3));
  return geometry;
}

/**
 * Material for a flat layer painted on top of another flat layer.
 *
 * `polygonOffset` nudges the layer toward the camera in the depth buffer only — not in space —
 * so stacked road markings resolve in a fixed order however far away they are. Relying on tiny
 * height differences instead is what produces the shimmering stripes that move as you drive:
 * at distance the depth buffer cannot tell 2cm apart, so it picks a winner per pixel, per
 * frame. `order` counts upward from the road.
 */
function decalOffset(order: number): {
  polygonOffset: true;
  polygonOffsetFactor: number;
  polygonOffsetUnits: number;
} {
  return { polygonOffset: true, polygonOffsetFactor: -order, polygonOffsetUnits: -order * 2 };
}

function decalMaterial(color: number, order: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, ...decalOffset(order) });
}

/**
 * Where each flat layer sits in the stack painted on the road. Higher wins.
 *
 * Boost pads are up at the top, above the road markings, and that is a fix rather than a
 * preference (Riggs, 2026-08-12: "boost pads aren't appearing until you get really close to them…
 * it looks like it might be something with the road covering them up from a far"). It was exactly
 * that. The pad slab is a 14cm-tall box and had no offset at all, while the road underneath it is
 * pulled toward the camera by `polygonOffsetFactor: -2`. `factor` scales with the polygon's depth
 * slope, and a road seen from a low chase camera is close to edge-on in the distance — so far down
 * the straight the road's bias grew until it swallowed the pad, and the pad only surfaced once she
 * was near enough for 14cm to out-argue it. Which made the one thing the drill asks her to do —
 * plan a line to something ahead — impossible until it was too late to steer.
 */
const DECAL = {
  apron: 1,
  road: 2,
  edgeLine: 3,
  kerb: 4,
  racingLine: 4,
  startLine: 5,
  pad: 6,
  padChevron: 7,
} as const;

/**
 * The racing line, painted on the road. (Chapter 5.)
 *
 * A ribbon like the road markings, except its offset from the centreline varies per sample rather
 * than being constant — which is the whole point of it. Built as one geometry so the entire line
 * is a single draw call however long the lap is.
 *
 * Dashed rather than solid, and the dashes are made by *dropping quads* rather than by a dashed
 * material: a line texture would stretch and bunch through the corners, where the outer edge of a
 * curved ribbon covers more ground than the inner one. Skipping every third pair of samples gives
 * dashes that stay the same length everywhere, because the path is already sampled at even
 * distances (`buildLoopPath` guarantees it).
 */
function racingLineGeometry(
  points: PathPoint[],
  offsetAt: (t: number) => number,
  width: number,
  y: number,
): THREE.BufferGeometry {
  const count = points.length;
  const quads: Array<[number, number, number][]> = [];
  const half = width / 2;

  for (let i = 0; i < count; i++) {
    // Two on, one off. Long enough to read as a continuous line at speed, broken enough that it
    // reads as a guide rather than as a kerb.
    if (i % 3 === 2) continue;

    const current = points[i];
    const next = points[(i + 1) % count];
    if (!current || !next) continue;

    const a = offsetAt(i / count);
    const b = offsetAt(((i + 1) % count) / count);

    quads.push([
      [current.x + current.nx * (a - half), y, current.y + current.ny * (a - half)],
      [current.x + current.nx * (a + half), y, current.y + current.ny * (a + half)],
      [next.x + next.nx * (b + half), y, next.y + next.ny * (b + half)],
      [next.x + next.nx * (b - half), y, next.y + next.ny * (b - half)],
    ]);
  }

  return quadsGeometry(quads);
}

/** A ramp: flat at the back, rising to a lip at +x (the direction of travel). */
function wedgeGeometry(
  halfLength: number,
  halfWidth: number,
  height: number,
): THREE.BufferGeometry {
  const a: [number, number, number] = [-halfLength, 0, -halfWidth];
  const b: [number, number, number] = [halfLength, 0, -halfWidth];
  const c: [number, number, number] = [halfLength, 0, halfWidth];
  const d: [number, number, number] = [-halfLength, 0, halfWidth];
  const e: [number, number, number] = [halfLength, height, -halfWidth];
  const f: [number, number, number] = [halfLength, height, halfWidth];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [a, e, f, a, f, d, b, c, f, b, f, e, a, b, e, d, f, c, a, d, c, a, c, b].flat(),
      3,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}

// --- world -----------------------------------------------------------------

/**
 * Sky as a vertex-coloured dome. A flat background colour is the single biggest thing that
 * makes a 3D scene look unfinished; a gradient costs one sphere and no shader.
 */
function buildSky(radius: number): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 24, 16);
  const top = new THREE.Color(PALETTE.skyTop);
  const horizon = new THREE.Color(PALETTE.skyHorizon);
  const colors: number[] = [];
  const position = geometry.attributes.position;

  if (position) {
    for (let i = 0; i < position.count; i++) {
      const height = Math.max(0, position.getY(i) / radius);
      const colour = horizon.clone().lerp(top, Math.pow(height, 0.6));
      colors.push(colour.r, colour.g, colour.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }

  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }),
  );
}

function buildClouds(random: () => number, radius: number): THREE.Group {
  const clouds = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: PALETTE.cloud, fog: false });

  for (let i = 0; i < 14; i++) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(random() * 3);
    for (let j = 0; j < puffs; j++) {
      const size = 6 + random() * 7;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 8), material);
      puff.position.set((j - puffs / 2) * 7 + random() * 3, random() * 3, random() * 4);
      puff.scale.y = 0.55;
      cloud.add(puff);
    }
    const angle = random() * Math.PI * 2;
    const distance = radius * (0.55 + random() * 0.3);
    cloud.position.set(Math.cos(angle) * distance, 45 + random() * 40, Math.sin(angle) * distance);
    clouds.add(cloud);
  }
  return clouds;
}

/** Rolling hills on the horizon. Cheap, and they turn a flat plane into somewhere. */
function buildHills(random: () => number, radius: number): THREE.Group {
  const hills = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ color: PALETTE.hill });

  for (let i = 0; i < 22; i++) {
    const size = 26 + random() * 34;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 8), material);
    const angle = (i / 22) * Math.PI * 2 + random() * 0.2;
    const distance = radius * (0.62 + random() * 0.16);
    hill.position.set(Math.cos(angle) * distance, -size * 0.45, Math.sin(angle) * distance);
    hill.scale.y = 0.5 + random() * 0.35;
    hills.add(hill);
  }
  return hills;
}

function buildTree(random: () => number): THREE.Group {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.42, 2.6, 7),
    new THREE.MeshLambertMaterial({ color: PALETTE.trunk }),
  );
  trunk.position.y = 1.3;
  tree.add(trunk);

  // Stacked cones: the cheapest shape that reads unmistakably as a tree.
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(2.6 - i * 0.6, 2.6, 8),
      new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? PALETTE.leaves : PALETTE.leavesDark }),
    );
    cone.position.y = 2.9 + i * 1.4;
    tree.add(cone);
  }

  const scale = 0.8 + random() * 0.7;
  tree.scale.setScalar(scale);
  tree.rotation.y = random() * Math.PI * 2;
  return tree;
}

function buildBush(random: () => number): THREE.Mesh {
  const bush = new THREE.Mesh(
    new THREE.SphereGeometry(1.1 + random() * 0.8, 8, 6),
    new THREE.MeshLambertMaterial({ color: PALETTE.leaves }),
  );
  bush.scale.y = 0.75;
  bush.position.y = 0.6;
  return bush;
}

/**
 * Scenery, placed relative to the centreline rather than scattered at random. Offsetting along
 * the track normal guarantees nothing ever lands on the road, without needing a single
 * collision check.
 */
function buildScenery(points: PathPoint[], halfWidth: number, random: () => number): THREE.Group {
  const scenery = new THREE.Group();

  for (let i = 0; i < points.length; i += 7) {
    const p = points[i];
    if (!p) continue;

    for (const side of [1, -1]) {
      if (random() < 0.45) continue;
      const distance = halfWidth + 6 + random() * 22;
      const object = random() < 0.62 ? buildTree(random) : buildBush(random);
      object.position.set(
        p.x + p.nx * distance * side,
        object.position.y,
        p.y + p.ny * distance * side,
      );
      scenery.add(object);
    }
  }
  return scenery;
}

/**
 * Red-and-white kerbs, on the corners only.
 *
 * Curvature decides where they go: a kerb on a straight means nothing, but on a corner it is
 * the clearest possible "the road bends here", readable from much further away than the edge
 * line. Every kart racer marks its corners this way for exactly that reason.
 */
function buildKerbs(points: PathPoint[], halfWidth: number): THREE.Group {
  const group = new THREE.Group();
  const count = points.length;
  const width = 1.6;
  const red: Array<[number, number, number][]> = [];
  const white: Array<[number, number, number][]> = [];

  for (let i = 0; i < count; i++) {
    const previous = points[(i - 2 + count) % count];
    const current = points[i];
    const next = points[(i + 2) % count];
    const after = points[(i + 1) % count];
    if (!previous || !current || !next || !after) continue;

    // Angle between the tangent before and after this point: how hard the road is turning.
    const bend = Math.abs(Math.atan2(next.ty, next.tx) - Math.atan2(previous.ty, previous.tx));
    const turning = Math.min(bend, Math.PI * 2 - bend);
    if (turning < 0.05) continue;

    const target = Math.floor(i / 3) % 2 === 0 ? red : white;
    for (const side of [1, -1]) {
      const innerA = halfWidth * side;
      const outerA = (halfWidth + width) * side;
      target.push([
        [current.x + current.nx * innerA, 0.03, current.y + current.ny * innerA],
        [current.x + current.nx * outerA, 0.03, current.y + current.ny * outerA],
        [after.x + after.nx * outerA, 0.03, after.y + after.ny * outerA],
        [after.x + after.nx * innerA, 0.03, after.y + after.ny * innerA],
      ]);
    }
  }

  group.add(new THREE.Mesh(quadsGeometry(red), decalMaterial(PALETTE.kerbRed, DECAL.kerb)));
  group.add(new THREE.Mesh(quadsGeometry(white), decalMaterial(PALETTE.kerbWhite, DECAL.kerb)));
  return group;
}

/**
 * A proper chequered start line rather than a white bar.
 *
 * Built inside a group that carries the track's heading, so each square inherits the rotation
 * instead of trying to hold it itself. Positioning squares in world space and leaving them
 * axis-aligned makes them overlap and gap wherever the track is not aligned to world x — which
 * is everywhere except by luck.
 */
function buildStartLine(surface: PathSurface, points: PathPoint[]): THREE.Group {
  const group = new THREE.Group();
  const start = points[0];
  if (!start) return group;

  group.position.set(start.x, 0.05, start.y);
  group.rotation.y = -Math.atan2(start.ty, start.tx);

  const columns = 10;
  const size = (surface.halfWidth * 2) / columns;
  const dark = decalMaterial(0x2b2f38, DECAL.startLine);
  const light = decalMaterial(0xf7f7f7, DECAL.startLine);

  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < columns; column++) {
      // A hair of overlap: abutting planes at exactly the same size leave hairline seams
      // wherever the edges land on the same pixel.
      const square = new THREE.Mesh(
        new THREE.PlaneGeometry(size * 1.02, size * 1.02),
        (row + column) % 2 === 0 ? dark : light,
      );
      square.rotation.x = -Math.PI / 2;
      square.position.set((row - 0.5) * size, 0, -surface.halfWidth + size * (column + 0.5));
      group.add(square);
    }
  }
  return group;
}

function buildBarriers(points: PathPoint[], halfWidth: number): THREE.Group {
  const group = new THREE.Group();
  const distance = halfWidth + 3.5;
  const postGeometry = new THREE.BoxGeometry(1.2, 1.5, 0.5);
  const materials = [
    new THREE.MeshLambertMaterial({ color: PALETTE.barrier }),
    new THREE.MeshLambertMaterial({ color: PALETTE.barrierAccent }),
  ];

  points.forEach((p, i) => {
    if (i % 5 !== 0) return;
    const material = materials[(i / 5) % 2 === 0 ? 0 : 1];
    if (!material) return;
    for (const side of [1, -1]) {
      const post = new THREE.Mesh(postGeometry, material);
      post.position.set(p.x + p.nx * distance * side, 0.75, p.y + p.ny * distance * side);
      post.rotation.y = -Math.atan2(p.ty, p.tx);
      group.add(post);
    }
  });
  return group;
}

// --- kart ------------------------------------------------------------------

interface KartParts {
  group: THREE.Group;
  chassis: THREE.Group;
  flames: THREE.Group;
  wheels: THREE.Mesh[];
  /** Front wheels sit inside these so they can be steered without fighting their spin. */
  steering: THREE.Group[];
  /** Turns with the front wheels, because a driver who does not is unsettling. */
  steeringWheel: THREE.Group;
}

function buildKart(): KartParts {
  const group = new THREE.Group();
  const chassis = new THREE.Group();
  group.add(chassis);

  const bodyMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.kartBody });
  const trimMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.kartTrim });
  const darkMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.kartSeat });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.55, 1.75), bodyMaterial);
  body.position.y = 0.66;
  chassis.add(body);

  // A floor pan a little wider than the body. Two stacked slabs of slightly different size
  // reads as a moulded shell; one box reads as a box.
  const floor = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.28, 2), darkMaterial);
  floor.position.y = 0.38;
  chassis.add(floor);

  // Side pods, tucked between the wheels.
  for (const z of [1.02, -1.02]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.42), bodyMaterial);
    pod.position.set(0, 0.7, z);
    chassis.add(pod);
  }

  // A tapered nose. Rounding the front is most of what separates "kart" from "brick".
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.9, 1.4, 12), bodyMaterial);
  nose.rotation.z = Math.PI / 2;
  nose.position.set(2, 0.66, 0);
  chassis.add(nose);

  const noseTrim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 1.5), trimMaterial);
  noseTrim.position.set(2.35, 0.62, 0);
  chassis.add(noseTrim);

  // Headlights. Tiny, but eyes on the front of a vehicle read as a face, and a face is
  // friendly — which is the entire brief for this site.
  const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xfff6cc });
  for (const z of [0.45, -0.45]) {
    const light = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 12), lightMaterial);
    light.rotation.z = Math.PI / 2;
    light.position.set(2.5, 0.78, z);
    chassis.add(light);
  }

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1, 1.05), darkMaterial);
  seat.position.set(-0.85, 1.25, 0);
  chassis.add(seat);

  // Rear wing on two posts.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 1.7), trimMaterial);
  wing.position.set(-1.75, 1.5, 0);
  chassis.add(wing);
  for (const z of [0.6, -0.6]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), darkMaterial);
    post.position.set(-1.75, 1.18, z);
    chassis.add(post);
  }

  // Exhaust pipes, so the boost flames come out of something.
  for (const z of [0.55, -0.55]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 10), darkMaterial);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(-1.9, 0.62, z);
    chassis.add(pipe);
  }

  // --- the driver: an original round-headed figure, no likeness of anyone ---

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.54, 0.9, 12),
    new THREE.MeshLambertMaterial({ color: PALETTE.driverShirt }),
  );
  torso.position.set(-0.4, 1.5, 0);
  chassis.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 14, 12),
    new THREE.MeshLambertMaterial({ color: PALETTE.driverSkin }),
  );
  head.position.set(-0.4, 2.18, 0);
  chassis.add(head);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 14, 12, 0, Math.PI * 2, 0, Math.PI / 1.7),
    new THREE.MeshLambertMaterial({ color: PALETTE.helmet }),
  );
  helmet.position.set(-0.4, 2.19, 0);
  chassis.add(helmet);

  // A visor band. One dark stripe is all it takes for a sphere to read as looking forward.
  const visor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.47, 0.47, 0.24, 14, 1, true, -Math.PI / 2.6, Math.PI / 1.3),
    new THREE.MeshLambertMaterial({ color: 0x2b3550, side: THREE.DoubleSide }),
  );
  visor.position.set(-0.4, 2.16, 0);
  chassis.add(visor);

  // Steering wheel and the arms holding it. The arms are what make the driver look like they
  // are driving rather than being carried.
  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(0.35, 1.5, 0);
  steeringWheel.rotation.set(0, Math.PI / 2, -0.5);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 18), darkMaterial);
  steeringWheel.add(rim);
  chassis.add(steeringWheel);

  const armMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.driverShirt });
  const handMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.driverSkin });
  for (const z of [0.3, -0.3]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 8), armMaterial);
    arm.position.set(-0.05, 1.6, z);
    arm.rotation.z = Math.PI / 2.4;
    chassis.add(arm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), handMaterial);
    hand.position.set(0.35, 1.48, z * 0.8);
    chassis.add(hand);
  }

  // --- wheels ---

  const tyreMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.tyre });
  const rimMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.rim });
  const wheels: THREE.Mesh[] = [];
  const steering: THREE.Group[] = [];

  for (const [x, z, front] of [
    [1.15, 1.02, true],
    [1.15, -1.02, true],
    [-1.15, 1.05, false],
    [-1.15, -1.05, false],
  ] as const) {
    // Rear wheels are fatter than the front. Real karts do it, and it makes the back end look
    // planted, which is what you want when the whole model is this simple.
    const radius = front ? 0.52 : 0.62;
    const width = front ? 0.44 : 0.58;

    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, width, 16),
      tyreMaterial,
    );
    wheel.rotation.x = Math.PI / 2; // roll axis across the kart

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, width * 1.05, 10),
      rimMaterial,
    );
    wheel.add(hub);

    // Front wheels hang inside a pivot so steering rotates them without disturbing their spin.
    const pivot = new THREE.Group();
    pivot.position.set(x, radius, z);
    pivot.add(wheel);
    chassis.add(pivot);

    wheels.push(wheel);
    if (front) steering.push(pivot);
  }

  // Exhaust flames, shown only while boosting. On the chassis so they roll with a trick.
  const flames = new THREE.Group();
  for (const z of [-0.55, 0.55]) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 1.7, 8),
      new THREE.MeshBasicMaterial({ color: PALETTE.flame }),
    );
    flame.rotation.z = Math.PI / 2;
    flame.position.set(-3.1, 0.62, z);
    flames.add(flame);

    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.9, 8),
      new THREE.MeshBasicMaterial({ color: PALETTE.flameCore }),
    );
    core.rotation.z = Math.PI / 2;
    core.position.set(-2.65, 0.62, z);
    flames.add(core);
  }
  flames.visible = false;
  chassis.add(flames);

  return { group, chassis, flames, wheels, steering, steeringWheel };
}

/**
 * Drift sparks, off the inside rear wheel. (Chapter 6.)
 *
 * Two clusters, one per side, and only the inside one is ever shown — which is what makes the
 * sparks read as *coming from* the slide rather than being an effect bolted onto the kart. The
 * colour is the charge tier and is the entire feedback mechanism for the drill, so it is the one
 * thing in this scene that must be unmistakable at a glance: blue, then a hot orange.
 *
 * Built from small spheres rather than a particle system. There are eight of them, they live for
 * as long as the drift does, and a full particle engine to animate eight blobs would be a lot of
 * machinery for something a sine wave does adequately.
 */
function buildSparks(): { group: THREE.Group; blobs: THREE.Mesh[] } {
  const group = new THREE.Group();
  const blobs: THREE.Mesh[] = [];

  // Twelve, and bigger than they first were. The chapter's instruction is literally "watch the
  // sparks turn from blue to orange", so if they are not readable from the chase camera at speed
  // the drill has no feedback at all — which is exactly how the first version played.
  for (let i = 0; i < 12; i++) {
    const blob = new THREE.Mesh(
      new THREE.SphereGeometry(0.26 + (i % 3) * 0.09, 6, 5),
      new THREE.MeshBasicMaterial({ color: PALETTE.sparkBlue, transparent: true, opacity: 0.95 }),
    );
    group.add(blob);
    blobs.push(blob);
  }

  group.visible = false;
  return { group, blobs };
}

/**
 * A soft blob under the kart. Cheaper than a shadow map and better for this look — and while
 * airborne it is the only cue for how high the kart actually is.
 */
function buildShadow(): THREE.Mesh {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.9, 20),
    new THREE.MeshBasicMaterial({
      color: PALETTE.shadow,
      transparent: true,
      opacity: 0.28,
      // A transparent decal must not write depth, or it fights the road it is painted on.
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -12,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  return shadow;
}

// --- item defence (1e) -----------------------------------------------------

/**
 * A banana. Held behind the kart while you hold the key, lying on the road once you let go.
 *
 * There is no abstract "shield" anywhere in this drill on purpose: the thing protecting you is a
 * real object in the world, in the place where it does its work — between your back bumper and
 * whatever is coming. An icon in the corner of the screen would teach the opposite.
 *
 * A curved arc of a torus, with a stalk. No Nintendo geometry involved: it is a banana because
 * bananas are yellow and curved.
 */
function buildBanana(): THREE.Group {
  const group = new THREE.Group();

  const flesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.17, 8, 14, Math.PI * 0.85),
    new THREE.MeshLambertMaterial({ color: PALETTE.banana }),
  );
  // Rotated so the curve opens downward: a banana resting on its two ends.
  flesh.rotation.z = Math.PI * 0.575;
  group.add(flesh);

  for (const end of [-1, 1]) {
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshLambertMaterial({ color: PALETTE.bananaTip }),
    );
    tip.position.set(0.42 * end, 0.34, 0);
    group.add(tip);
  }

  return group;
}

/** The banana in your hands, trailing behind the kart. Parented to the kart, so it follows. */
function buildHeldBanana(): THREE.Group {
  const banana = buildBanana();
  banana.position.set(-3.2, 0.5, 0);
  banana.visible = false;
  return banana;
}

/**
 * The banana you let go of. Lives in world space, not on the kart — that is the entire point:
 * once dropped it stays where it fell while you drive away from it.
 */
function buildDroppedBanana(): THREE.Group {
  const banana = buildBanana();
  banana.position.y = 0.35;
  banana.visible = false;
  return banana;
}

/** An item box: a slowly tumbling cube, bright enough to aim for from a distance. */
function buildItemBox(): THREE.Group {
  const group = new THREE.Group();

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 1.7, 1.7),
    new THREE.MeshLambertMaterial({
      color: PALETTE.itemBox,
      transparent: true,
      opacity: 0.72,
      emissive: PALETTE.itemBoxGlow,
      emissiveIntensity: 0.35,
    }),
  );
  group.add(cube);

  // A solid core inside the translucent shell, so it still reads as an object at distance
  // rather than as a faint smudge.
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 10, 8),
    new THREE.MeshBasicMaterial({ color: PALETTE.itemBoxCore }),
  );
  group.add(core);

  group.position.y = 1.4;
  return group;
}

/**
 * The thing chasing you. Original art: a red seeker orb with a tail, not anyone else's shell.
 *
 * It hangs off the kart group, so it inherits the kart's heading and sits exactly behind
 * whichever way you are pointing — which is what a homing item does anyway, and costs no maths.
 */
function buildSeeker(): THREE.Group {
  const group = new THREE.Group();

  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 14, 12),
    new THREE.MeshBasicMaterial({ color: PALETTE.seeker }),
  );
  group.add(orb);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 12, 10),
    new THREE.MeshBasicMaterial({ color: PALETTE.seekerCore }),
  );
  core.position.x = 0.25;
  group.add(core);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.09, 8, 20),
    new THREE.MeshBasicMaterial({ color: PALETTE.seekerCore }),
  );
  ring.rotation.y = Math.PI / 2;
  group.add(ring);

  // A tail streaming away from the kart, so which way it is travelling is never in doubt.
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 2.4, 10),
    new THREE.MeshBasicMaterial({ color: PALETTE.seeker, transparent: true, opacity: 0.45 }),
  );
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -1.6;
  group.add(tail);

  group.visible = false;
  return group;
}

/** A ring that expands and fades. Every resolution gets one, so something always happens. */
function buildBurst(): THREE.Mesh {
  const burst = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.16, 8, 28),
    new THREE.MeshBasicMaterial({
      color: PALETTE.burstBlock,
      transparent: true,
      depthWrite: false,
    }),
  );
  burst.rotation.x = Math.PI / 2;
  burst.position.y = 1.1;
  burst.visible = false;
  return burst;
}

// --- furniture -------------------------------------------------------------

interface FurnitureHandles {
  group: THREE.Group;
  coins: Map<number, THREE.Object3D>;
  boxes: Map<number, THREE.Object3D>;
  chevrons: Array<{ mesh: THREE.Object3D; span: number; base: number }>;
}

function buildFurniture(items: PlacedFurniture[]): FurnitureHandles {
  const group = new THREE.Group();
  const coins = new Map<number, THREE.Object3D>();
  const boxes = new Map<number, THREE.Object3D>();
  const chevrons: Array<{ mesh: THREE.Object3D; span: number; base: number }> = [];

  for (const item of items) {
    let mesh: THREE.Object3D;

    switch (item.kind) {
      case 'pad': {
        mesh = new THREE.Group();
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(item.halfLength * 2, 0.14, item.halfWidth * 2),
          decalMaterial(PALETTE.pad, DECAL.pad),
        );
        slab.position.y = 0.07;
        mesh.add(slab);

        // Chevrons that scroll toward the exit. Movement is what makes a pad look like it
        // does something, and it reads from far enough away to line up for.
        const span = item.halfLength * 2;
        for (let i = 0; i < 4; i++) {
          const chevron = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.06, item.halfWidth * 1.5),
            new THREE.MeshBasicMaterial({
              color: PALETTE.padChevron,
              ...decalOffset(DECAL.padChevron),
            }),
          );
          const base = -item.halfLength + (span / 4) * i;
          chevron.position.set(base, 0.16, 0);
          mesh.add(chevron);
          chevrons.push({ mesh: chevron, span, base });
        }
        break;
      }
      case 'ramp': {
        mesh = new THREE.Group();
        const wedge = new THREE.Mesh(
          wedgeGeometry(item.halfLength, item.halfWidth, item.height),
          new THREE.MeshLambertMaterial({ color: PALETTE.ramp, side: THREE.DoubleSide }),
        );
        mesh.add(wedge);
        // A bright lip, because the lip is the thing you are being asked to time.
        const lip = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.28, item.halfWidth * 2),
          new THREE.MeshLambertMaterial({ color: PALETTE.rampStripe }),
        );
        lip.position.set(item.halfLength - 0.1, item.height, 0);
        mesh.add(lip);
        break;
      }
      case 'coin': {
        const coin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.85, 0.85, 0.14, 16),
          new THREE.MeshLambertMaterial({ color: PALETTE.coin, emissive: 0x6b4a00 }),
        );
        coin.rotation.z = Math.PI / 2;
        mesh = new THREE.Group();
        mesh.add(coin);
        mesh.position.y = 1.3;
        coins.set(item.id, mesh);
        break;
      }
      case 'box': {
        mesh = buildItemBox();
        boxes.set(item.id, mesh);
        break;
      }
    }

    mesh.position.x = item.x;
    mesh.position.z = item.y;
    mesh.rotation.y = -item.heading;
    group.add(mesh);
  }

  return { group, coins, boxes, chevrons };
}

// --- scene -----------------------------------------------------------------

export interface KartScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  kart: THREE.Group;
  /** Roll the kart around its nose-to-tail axis, for trick barrel rolls. */
  setRoll(radians: number): void;
  /** Show or hide the exhaust flames. `time` drives their flicker. */
  setBoosting(on: boolean, time: number): void;
  /** Spin the wheels, steer the front axle, lean into the turn, and place the shadow. */
  syncKart(speed: number, altitude: number, steerAmount: number, dt: number): void;
  /** Hide collected coins, and animate coins and pads. */
  syncFurniture(items: PlacedFurniture[], time: number): void;
  /** Show the banana being carried, trailing behind the kart. (1e) */
  setItem(has: boolean, time: number): void;
  /**
   * Place the banana you let go of, in world coordinates, shrinking away as `fade` runs 1 to 0.
   * Null when there is none. (1e)
   */
  setDroppedItem(at: { x: number; y: number; fade: number } | null): void;
  /** Place the incoming threat, `behind` world units back along the kart's heading. (1e) */
  setThreat(behind: number | null, time: number): void;
  /** Expanding ring at the kart: 0 to 1, or null for none. (1e) */
  setBurst(progress: number | null, hit: boolean): void;
  /**
   * Drift sparks off the inside rear wheel. `direction` is -1 or 1 and picks the side; `tier` is
   * the charge colour. Pass `'none'` to hide them. (Chapter 6)
   */
  setSparks(tier: 'none' | 'blue' | 'orange', direction: number, time: number): void;
  resize(width: number, height: number): void;
  render(): void;
  dispose(): void;
}

export interface KartSceneOptions {
  /**
   * Paint a racing line on the road: metres off the centreline at each fraction of the lap.
   * Chapter 5 only — every other drill leaves the road unmarked.
   */
  racingLine?: (t: number) => number;
}

export function createKartScene(
  canvas: HTMLCanvasElement,
  surface: PathSurface,
  path: TrackPath,
  items: PlacedFurniture[],
  options: KartSceneOptions = {},
): KartScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const random = makeRandom(0x5eed);
  const scene = new THREE.Scene();
  const { bounds } = surface;
  const arenaWidth = bounds.maxX - bounds.minX;
  const arenaDepth = bounds.maxY - bounds.minY;
  const skyRadius = Math.max(arenaWidth, arenaDepth) * 2.2;

  scene.fog = new THREE.Fog(PALETTE.skyHorizon, 120, skyRadius * 0.85);

  // A warm key from one side plus a sky-to-ground fill. Two lights, no shadow maps: enough to
  // give every surface a light and a dark face, which is all a cartoon look needs.
  scene.add(new THREE.HemisphereLight(PALETTE.skyHorizon, PALETTE.grassDark, 1.5));
  const sun = new THREE.DirectionalLight(0xfff3e0, 1.5);
  sun.position.set(-60, 90, 40);
  scene.add(sun);

  scene.add(buildSky(skyRadius));
  scene.add(buildClouds(random, skyRadius));
  scene.add(buildHills(random, skyRadius));

  // The ground sits a clear step below everything drawn on top of it. Every layer above is
  // separated in space as well as by polygon offset, belt and braces.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(skyRadius * 2, skyRadius * 2),
    new THREE.MeshLambertMaterial({ color: PALETTE.grass }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((bounds.minX + bounds.maxX) / 2, -0.3, (bounds.minY + bounds.maxY) / 2);
  scene.add(ground);

  const points = path.points;
  const halfWidth = surface.halfWidth;

  // A darker apron just off the road, so the driveable width still reads at speed now that
  // the surrounding grass runs to the horizon.
  scene.add(
    new THREE.Mesh(
      ribbonGeometry(points, -(halfWidth + 5), halfWidth + 5, -0.1),
      decalMaterial(PALETTE.grassDark, DECAL.apron),
    ),
  );

  scene.add(
    new THREE.Mesh(
      ribbonGeometry(points, -halfWidth, halfWidth, 0),
      decalMaterial(PALETTE.road, DECAL.road),
    ),
  );

  scene.add(
    new THREE.Mesh(
      ribbonGeometry(points, halfWidth - 0.5, halfWidth, 0.02),
      decalMaterial(PALETTE.roadEdge, DECAL.edgeLine),
    ),
  );
  scene.add(
    new THREE.Mesh(
      ribbonGeometry(points, -halfWidth, -halfWidth + 0.5, 0.02),
      decalMaterial(PALETTE.roadEdge, DECAL.edgeLine),
    ),
  );

  // Above the edge lines in the decal stack, so it stays visible where it runs near them, and
  // below the kerbs and the start line, which are part of the track rather than an overlay on it.
  if (options.racingLine) {
    scene.add(
      new THREE.Mesh(
        racingLineGeometry(points, options.racingLine, 1.5, 0.03),
        decalMaterial(PALETTE.line, DECAL.racingLine),
      ),
    );
  }

  scene.add(buildKerbs(points, halfWidth));
  scene.add(buildStartLine(surface, points));
  scene.add(buildBarriers(points, halfWidth));
  scene.add(buildScenery(points, halfWidth, random));

  const furniture = buildFurniture(items);
  scene.add(furniture.group);

  const { group: kart, chassis, flames, wheels, steering, steeringWheel } = buildKart();
  scene.add(kart);

  // Item defence. (1e) The held banana, the seeker and the burst hang off the kart so they
  // inherit its position and heading; the dropped banana does not, because staying where it
  // fell while the kart drives away is the whole point of it.
  const heldBanana = buildHeldBanana();
  const seeker = buildSeeker();
  const burst = buildBurst();
  const sparks = buildSparks();
  kart.add(heldBanana, seeker, burst, sparks.group);

  const droppedBanana = buildDroppedBanana();
  scene.add(droppedBanana);

  // Barrel roll and cornering lean both roll the chassis about its nose-to-tail axis, so they
  // are tracked separately and summed rather than fighting over one rotation.
  let barrelRoll = 0;
  let lean = 0;

  const shadow = buildShadow();
  scene.add(shadow);

  // Depth precision is set by the near plane far more than the far plane: halving `near`
  // halves how finely the depth buffer can separate two surfaces at *any* distance. The chase
  // camera never sits closer than a few units to anything, so 1 is safe and buys a 10x
  // improvement over the usual 0.1 — which is the difference between road markings that hold
  // still and road markings that crawl.
  const camera = new THREE.PerspectiveCamera(62, 1, 1, skyRadius * 1.6);

  return {
    scene,
    camera,
    kart,
    setRoll(radians) {
      barrelRoll = radians;
      chassis.rotation.x = barrelRoll + lean;
    },
    setBoosting(on, time) {
      flames.visible = on;
      if (!on) return;
      const pulse = 0.8 + Math.sin(time * 40) * 0.25;
      flames.scale.set(pulse, 1, 1);
    },
    syncKart(speed, altitude, steerAmount, dt) {
      for (const wheel of wheels) wheel.rotation.y -= speed * dt * 1.6;

      // Turn the front wheels, and the steering wheel with them. A driver whose hands stay
      // straight through a corner is the sort of thing you notice without knowing why.
      const angle = -steerAmount * 0.5;
      for (const pivot of steering) pivot.rotation.y = angle;
      steeringWheel.rotation.x = steerAmount * 0.8;

      // A small lean into the corner. Karts do not really roll much, but a few degrees is the
      // difference between a model that is being moved and one that is being driven.
      lean = steerAmount * 0.07;
      chassis.rotation.x = barrelRoll + lean;

      // The shadow stays on the ground and shrinks with height, which is the only readable
      // cue for how high a jump actually went.
      shadow.position.set(kart.position.x, 0.03, kart.position.z);
      const lift = Math.min(1, altitude / 6);
      shadow.scale.setScalar(1 - lift * 0.45);
      const material = shadow.material as THREE.MeshBasicMaterial;
      material.opacity = 0.28 * (1 - lift * 0.6);
    },
    syncFurniture(currentItems, time) {
      for (const item of currentItems) {
        if (item.kind !== 'coin') continue;
        const mesh = furniture.coins.get(item.id);
        if (!mesh) continue;
        mesh.visible = !item.collected;
        // Spinning and bobbing: a moving coin catches the eye far sooner than a static one.
        mesh.rotation.y = -item.heading + time * 2.4;
        mesh.position.y = 1.3 + Math.sin(time * 2.6 + item.id) * 0.22;
      }

      for (const item of currentItems) {
        if (item.kind !== 'box') continue;
        const mesh = furniture.boxes.get(item.id);
        if (!mesh) continue;
        // `collected` is the drill's respawn state, so a box that has been taken simply vanishes
        // until it is put back.
        mesh.visible = !item.collected;
        mesh.rotation.set(time * 0.9, -item.heading + time * 1.3, time * 0.6);
        mesh.position.y = 1.4 + Math.sin(time * 2 + item.id) * 0.15;
      }

      for (const chevron of furniture.chevrons) {
        const travel = (time * 9) % chevron.span;
        chevron.mesh.position.x =
          ((chevron.base + travel + chevron.span * 1.5) % chevron.span) - chevron.span / 2;
      }
    },
    setItem(has, time) {
      heldBanana.visible = has;
      if (!has) return;
      // Bobbing and swinging a little, as something dragged along behind a kart would.
      heldBanana.position.y = 0.5 + Math.sin(time * 3.4) * 0.07;
      heldBanana.position.z = Math.sin(time * 1.7) * 0.18;
      heldBanana.rotation.y = Math.sin(time * 1.7) * 0.35;
    },
    setDroppedItem(at) {
      droppedBanana.visible = at !== null;
      if (!at) return;
      droppedBanana.position.set(at.x, 0.35, at.y);
      // Shrinking rather than lingering. A banana still lying there when the shell drives over
      // it would imply a rescue the drill deliberately does not offer.
      droppedBanana.scale.setScalar(Math.max(0.01, at.fade));
    },
    setThreat(behind, time) {
      seeker.visible = behind !== null;
      if (behind === null) return;
      seeker.position.set(-behind, 1.15 + Math.sin(time * 7) * 0.12, 0);
      seeker.rotation.x = time * 9;
      // Grows as it closes, on top of getting nearer. Perspective alone is a weak signal when
      // the thing is behind you and the camera is low.
      seeker.scale.setScalar(1 + Math.max(0, 1 - behind / 18) * 0.5);
    },
    setSparks(tier, direction, time) {
      sparks.group.visible = tier !== 'none';
      if (tier === 'none') return;

      const colour = tier === 'orange' ? PALETTE.sparkOrange : PALETTE.sparkBlue;
      // Inside rear wheel: the side the kart is rotating toward is the one loaded up.
      const side = direction >= 0 ? 1.05 : -1.05;

      sparks.blobs.forEach((blob, i) => {
        const material = blob.material as THREE.MeshBasicMaterial;
        material.color.setHex(colour);

        // Two streams — one off each rear wheel, the inside one twice as dense. Sparks on one
        // side only read as a rendering glitch from behind; sparks on both, weighted, read as the
        // back of the kart working.
        const inner = i % 3 !== 0;
        const z = inner ? side : -side;

        // Staggered phases so the cluster shimmers rather than pulsing as one lump.
        const phase = (time * 5 + i * 0.41) % 1;
        blob.position.set(
          -1.5 - phase * 2.4,
          0.3 + phase * 0.75 + Math.sin(time * 18 + i) * 0.14,
          z + Math.sin(time * 11 + i * 2) * 0.3,
        );
        blob.scale.setScalar((inner ? 1 : 0.7) * (1 - phase * 0.55));
        material.opacity = 0.95 * (1 - phase * 0.85);
      });
    },
    setBurst(progress, hit) {
      burst.visible = progress !== null;
      if (progress === null) return;
      const material = burst.material as THREE.MeshBasicMaterial;
      material.color.setHex(hit ? PALETTE.burstHit : PALETTE.burstBlock);
      material.opacity = Math.max(0, 1 - progress);
      burst.scale.setScalar(0.6 + progress * 3.4);
    },
    resize(width, height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    },
    render() {
      renderer.render(scene, camera);
    },
    /**
     * **Give the GPU everything back, not just the renderer's own caches.**
     *
     * `renderer.dispose()` alone releases the render lists and the program cache. It does not free a
     * single geometry or material, and it does not release the WebGL context — so every visit to a
     * 3D chapter left a full scene's worth of buffers and one live context behind, and browsers cap
     * contexts at around sixteen before they start killing the oldest. Four drills, revisited over
     * an hour, is well inside the range where that matters, and the failure mode is the worst kind:
     * a drill that renders black on the fifth visit and nowhere near the code that caused it.
     *
     * `scene.traverse` is the documented way to do this — Three.js does not track what it made, so
     * walking the graph is the only way to find it. `forceContextLoss()` last, because it is the
     * only thing that actually hands the context back rather than waiting for garbage collection.
     */
    dispose() {
      scene.traverse((node) => {
        const mesh = node as Partial<THREE.Mesh>;
        mesh.geometry?.dispose();
        const material = mesh.material;
        for (const one of Array.isArray(material) ? material : material ? [material] : []) {
          // Textures are owned by the material that references them and are not walked separately.
          for (const value of Object.values(one)) {
            if (value instanceof THREE.Texture) value.dispose();
          }
          one.dispose();
        }
      });
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
