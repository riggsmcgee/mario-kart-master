import * as THREE from 'three';
import type { StadiumSurface } from '../../engine/surface';

/**
 * Three.js scene for the kart harness. (1b2)
 *
 * Flat and unlit on purpose — the plan calls for stylized original art, and lighting a scene
 * this simple only makes it muddier. Materials are `MeshBasicMaterial` throughout, which also
 * keeps the frame budget clear for gate 1b6's 60fps check on a normal Mac.
 *
 * Provisional, like `surface.ts`: this builds the stadium test oval specifically. Real tracks
 * are data (WORKLOG Q6) and arrive with 1b5.
 *
 * Sim (x, y) maps to world (x, z); world y is up.
 */

const PALETTE = {
  sky: 0x8fd3ff,
  grass: 0x6fbf5f,
  road: 0x5a5f6a,
  roadEdge: 0xf2f2f2,
  wall: 0xd94f4f,
  postA: 0xffffff,
  postB: 0xd94f4f,
  kartBody: 0x2f6fd0,
  kartNose: 0xffd23f,
  kartWheel: 0x22252b,
  startLine: 0xf2f2f2,
};

/** How finely the oval is sampled. Enough that the corners read as curves, not polygons. */
const CENTRELINE_SAMPLES = 240;

interface CentrelinePoint {
  x: number;
  z: number;
  /** Unit normal pointing away from the centreline, toward the outside of the oval. */
  nx: number;
  nz: number;
}

/**
 * Walk the stadium centreline: bottom straight, right cap, top straight, left cap.
 * Returned in order and closed, so consecutive points can be stitched into a strip.
 */
function centreline(surface: StadiumSurface): CentrelinePoint[] {
  const { straightHalfLength: L, cornerRadius: R, centerX, centerY } = surface.options;
  const points: CentrelinePoint[] = [];

  const straightSamples = Math.max(2, Math.round(CENTRELINE_SAMPLES * 0.2));
  const capSamples = Math.max(8, Math.round(CENTRELINE_SAMPLES * 0.3));

  const push = (x: number, z: number, nx: number, nz: number): void => {
    points.push({ x: centerX + x, z: centerY + z, nx, nz });
  };

  // Bottom straight, +z side. Outward normal points further +z.
  for (let i = 0; i < straightSamples; i++) {
    push(-L + (2 * L * i) / straightSamples, R, 0, 1);
  }
  // Right cap, sweeping from +z round to -z.
  for (let i = 0; i < capSamples; i++) {
    const a = Math.PI / 2 - (Math.PI * i) / capSamples;
    push(L + R * Math.cos(a), R * Math.sin(a), Math.cos(a), Math.sin(a));
  }
  // Top straight, -z side.
  for (let i = 0; i < straightSamples; i++) {
    push(L - (2 * L * i) / straightSamples, -R, 0, -1);
  }
  // Left cap, closing the loop.
  for (let i = 0; i < capSamples; i++) {
    const a = -Math.PI / 2 - (Math.PI * i) / capSamples;
    push(-L + R * Math.cos(a), R * Math.sin(a), Math.cos(a), Math.sin(a));
  }

  return points;
}

/** A flat ribbon of the given half-width, centred on the oval. */
function ribbonGeometry(
  points: CentrelinePoint[],
  innerOffset: number,
  outerOffset: number,
  y: number,
): THREE.BufferGeometry {
  const count = points.length;
  const positions = new Float32Array(count * 2 * 3);
  const indices: number[] = [];

  points.forEach((p, i) => {
    const inner = i * 6;
    positions[inner] = p.x + p.nx * innerOffset;
    positions[inner + 1] = y;
    positions[inner + 2] = p.z + p.nz * innerOffset;
    positions[inner + 3] = p.x + p.nx * outerOffset;
    positions[inner + 4] = y;
    positions[inner + 5] = p.z + p.nz * outerOffset;
  });

  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count; // wrap, so the ribbon closes
    const a = i * 2;
    const b = i * 2 + 1;
    const c = next * 2;
    const d = next * 2 + 1;
    indices.push(a, b, c, b, d, c);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

function buildKart(): THREE.Group {
  const kart = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.7, 1.6),
    new THREE.MeshBasicMaterial({ color: PALETTE.kartBody }),
  );
  body.position.y = 0.55;
  kart.add(body);

  // A nose, so which way the kart faces is unmistakable even at a glance.
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.4, 1.1),
    new THREE.MeshBasicMaterial({ color: PALETTE.kartNose }),
  );
  nose.position.set(1.4, 0.45, 0);
  kart.add(nose);

  const wheelGeometry = new THREE.BoxGeometry(0.7, 0.6, 0.35);
  const wheelMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.kartWheel });
  for (const [x, z] of [
    [0.9, 0.85],
    [0.9, -0.85],
    [-0.9, 0.85],
    [-0.9, -0.85],
  ] as const) {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(x, 0.3, z);
    kart.add(wheel);
  }

  return kart;
}

export interface KartScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  kart: THREE.Group;
  resize(width: number, height: number): void;
  render(): void;
  dispose(): void;
}

export function createKartScene(canvas: HTMLCanvasElement, surface: StadiumSurface): KartScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  // Fog hides the ground plane's far edge, so the world reads as continuous rather than
  // as a tabletop that stops.
  scene.fog = new THREE.Fog(PALETTE.sky, 60, 220);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);

  const { bounds } = surface;
  const arenaWidth = bounds.maxX - bounds.minX;
  const arenaDepth = bounds.maxY - bounds.minY;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(arenaWidth * 3, arenaDepth * 3),
    new THREE.MeshBasicMaterial({ color: PALETTE.grass }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((bounds.minX + bounds.maxX) / 2, 0, (bounds.minY + bounds.maxY) / 2);
  scene.add(ground);

  const points = centreline(surface);
  const halfWidth = surface.options.roadHalfWidth;

  // Road sits a hair above the grass to avoid z-fighting between coplanar surfaces.
  const road = new THREE.Mesh(
    ribbonGeometry(points, -halfWidth, halfWidth, 0.02),
    new THREE.MeshBasicMaterial({ color: PALETTE.road }),
  );
  scene.add(road);

  // White edge lines. Without them the road boundary is invisible at speed, and knowing
  // exactly where the grass starts is the entire point of Chapter 5.
  const edgeMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.roadEdge });
  scene.add(new THREE.Mesh(ribbonGeometry(points, halfWidth - 0.5, halfWidth, 0.04), edgeMaterial));
  scene.add(
    new THREE.Mesh(ribbonGeometry(points, -halfWidth, -halfWidth + 0.5, 0.04), edgeMaterial),
  );

  // Roadside posts. A flat plane gives the eye nothing to measure motion against; vertical
  // objects streaming past are most of what "fast" actually looks like.
  const postGeometry = new THREE.BoxGeometry(0.4, 2.2, 0.4);
  const postMaterials = [
    new THREE.MeshBasicMaterial({ color: PALETTE.postA }),
    new THREE.MeshBasicMaterial({ color: PALETTE.postB }),
  ];
  points.forEach((p, i) => {
    if (i % 8 !== 0) return;
    const material = postMaterials[(i / 8) % 2 === 0 ? 0 : 1];
    if (!material) return;
    const post = new THREE.Mesh(postGeometry, material);
    post.position.set(p.x + p.nx * (halfWidth + 2.2), 1.1, p.z + p.nz * (halfWidth + 2.2));
    scene.add(post);
  });

  // Start line, so laps and progress are legible.
  const startLine = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, halfWidth * 2),
    new THREE.MeshBasicMaterial({ color: PALETTE.startLine }),
  );
  startLine.rotation.x = -Math.PI / 2;
  startLine.rotation.z = Math.PI / 2;
  startLine.position.set(surface.startPose.x, 0.05, surface.startPose.y);
  scene.add(startLine);

  // Arena walls, matching the collision bounds in the physics exactly.
  const wallMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.wall });
  const wallHeight = 2.5;
  const walls: Array<[number, number, number, number]> = [
    [(bounds.minX + bounds.maxX) / 2, bounds.minY, arenaWidth, 1],
    [(bounds.minX + bounds.maxX) / 2, bounds.maxY, arenaWidth, 1],
    [bounds.minX, (bounds.minY + bounds.maxY) / 2, 1, arenaDepth],
    [bounds.maxX, (bounds.minY + bounds.maxY) / 2, 1, arenaDepth],
  ];
  for (const [x, z, w, d] of walls) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight, d), wallMaterial);
    wall.position.set(x, wallHeight / 2, z);
    scene.add(wall);
  }

  const kart = buildKart();
  scene.add(kart);

  return {
    scene,
    camera,
    kart,
    resize(width, height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    },
    render() {
      renderer.render(scene, camera);
    },
    dispose() {
      renderer.dispose();
    },
  };
}
