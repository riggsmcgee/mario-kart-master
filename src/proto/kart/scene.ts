import * as THREE from 'three';
import type { PathSurface } from '../../engine/path-surface';
import type { PathPoint, PlacedFurniture, TrackPath } from '../../engine/track';

/**
 * Three.js scene for the kart harness. (1b2 world, 1b3 furniture)
 *
 * Flat and unlit on purpose — the plan calls for stylized original art, lighting a scene this
 * simple only muddies it, and it keeps the frame budget clear for gate 1b6's 60fps check.
 *
 * Provisional, like `surface.ts`: this builds the stadium test oval specifically.
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
  pad: 0xff8a1f,
  padChevron: 0xfff3d6,
  ramp: 0xb98cff,
  coin: 0xffd23f,
  flame: 0xffb020,
  flameCore: 0xfff3d6,
};

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
  return geometry;
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

  const tris = [
    a,
    e,
    f,
    a,
    f,
    d, // the slope you drive up
    b,
    c,
    f,
    b,
    f,
    e, // vertical face at the lip
    a,
    b,
    e, // side
    d,
    f,
    c, // side
    a,
    d,
    c,
    a,
    c,
    b, // underside
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The kart, split into an outer group (position and heading) and an inner chassis (roll).
 * Keeping them separate means a trick barrel-roll cannot fight with the heading rotation.
 */
function buildKart(): { group: THREE.Group; chassis: THREE.Group; flames: THREE.Group } {
  const group = new THREE.Group();
  const chassis = new THREE.Group();
  group.add(chassis);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.7, 1.6),
    new THREE.MeshBasicMaterial({ color: PALETTE.kartBody }),
  );
  body.position.y = 0.55;
  chassis.add(body);

  // A nose, so which way the kart faces is unmistakable even at a glance.
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.4, 1.1),
    new THREE.MeshBasicMaterial({ color: PALETTE.kartNose }),
  );
  nose.position.set(1.4, 0.45, 0);
  chassis.add(nose);

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
    chassis.add(wheel);
  }

  // Exhaust flames, shown only while boosting. Attached to the chassis so they roll with it
  // during a trick, which is half the fun of landing one.
  const flames = new THREE.Group();
  for (const z of [-0.5, 0.5]) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 1.5, 8),
      new THREE.MeshBasicMaterial({ color: PALETTE.flame }),
    );
    flame.rotation.z = Math.PI / 2; // point the tip backwards
    flame.position.set(-1.9, 0.45, z);
    flames.add(flame);

    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.8, 8),
      new THREE.MeshBasicMaterial({ color: PALETTE.flameCore }),
    );
    core.rotation.z = Math.PI / 2;
    core.position.set(-1.5, 0.45, z);
    flames.add(core);
  }
  flames.visible = false;
  chassis.add(flames);

  return { group, chassis, flames };
}

function buildFurniture(items: PlacedFurniture[]): {
  group: THREE.Group;
  coinMeshes: Map<number, THREE.Object3D>;
} {
  const group = new THREE.Group();
  const coinMeshes = new Map<number, THREE.Object3D>();

  for (const item of items) {
    let mesh: THREE.Object3D;

    switch (item.kind) {
      case 'pad': {
        mesh = new THREE.Group();
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(item.halfLength * 2, 0.12, item.halfWidth * 2),
          new THREE.MeshBasicMaterial({ color: PALETTE.pad }),
        );
        slab.position.y = 0.06;
        mesh.add(slab);
        // Chevrons pointing the way you should be going: the pad reads as directional from a
        // distance, which is how you spot it in time to line up.
        for (let i = -1; i <= 1; i++) {
          const chevron = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.05, item.halfWidth * 1.4),
            new THREE.MeshBasicMaterial({ color: PALETTE.padChevron }),
          );
          chevron.position.set(i * 1.8, 0.14, 0);
          mesh.add(chevron);
        }
        break;
      }
      case 'ramp':
        mesh = new THREE.Mesh(
          wedgeGeometry(item.halfLength, item.halfWidth, item.height),
          new THREE.MeshBasicMaterial({ color: PALETTE.ramp, side: THREE.DoubleSide }),
        );
        break;
      case 'coin': {
        const coin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8, 0.8, 0.16, 14),
          new THREE.MeshBasicMaterial({ color: PALETTE.coin }),
        );
        // Stand it up and face it down the track, so you drive through it rather than over it.
        coin.rotation.z = Math.PI / 2;
        coin.position.y = 1.2;
        mesh = new THREE.Group();
        mesh.add(coin);
        coinMeshes.set(item.id, mesh);
        break;
      }
    }

    mesh.position.x = item.x;
    mesh.position.z = item.y;
    mesh.rotation.y = -item.heading;
    group.add(mesh);
  }

  return { group, coinMeshes };
}

export interface KartScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  kart: THREE.Group;
  /** Roll the kart around its nose-to-tail axis, for trick barrel rolls. */
  setRoll(radians: number): void;
  /** Show or hide the exhaust flames. `time` drives their flicker. */
  setBoosting(on: boolean, time: number): void;
  /** Hide collected coins and spin the rest. */
  syncFurniture(items: PlacedFurniture[], time: number): void;
  resize(width: number, height: number): void;
  render(): void;
  dispose(): void;
}

export function createKartScene(
  canvas: HTMLCanvasElement,
  surface: PathSurface,
  path: TrackPath,
  items: PlacedFurniture[],
): KartScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  // Fog hides the ground plane's far edge, so the world reads as continuous rather than as a
  // tabletop that stops.
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

  const points = path.points;
  const halfWidth = surface.halfWidth;

  // Road sits a hair above the grass to avoid z-fighting between coplanar surfaces.
  scene.add(
    new THREE.Mesh(
      ribbonGeometry(points, -halfWidth, halfWidth, 0.02),
      new THREE.MeshBasicMaterial({ color: PALETTE.road }),
    ),
  );

  // White edge lines. Without them the road boundary is invisible at speed, and knowing exactly
  // where the grass starts is the entire point of Chapter 5.
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
    post.position.set(p.x + p.nx * (halfWidth + 2.2), 1.1, p.y + p.ny * (halfWidth + 2.2));
    scene.add(post);
  });

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
  for (const [x, z, w, d] of [
    [(bounds.minX + bounds.maxX) / 2, bounds.minY, arenaWidth, 1],
    [(bounds.minX + bounds.maxX) / 2, bounds.maxY, arenaWidth, 1],
    [bounds.minX, (bounds.minY + bounds.maxY) / 2, 1, arenaDepth],
    [bounds.maxX, (bounds.minY + bounds.maxY) / 2, 1, arenaDepth],
  ] as Array<[number, number, number, number]>) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight, d), wallMaterial);
    wall.position.set(x, wallHeight / 2, z);
    scene.add(wall);
  }

  const { group: furniture, coinMeshes } = buildFurniture(items);
  scene.add(furniture);

  const { group: kart, chassis, flames } = buildKart();
  scene.add(kart);

  return {
    scene,
    camera,
    kart,
    setRoll(radians) {
      chassis.rotation.x = radians;
    },
    setBoosting(on, time) {
      flames.visible = on;
      if (!on) return;
      // Flicker, so a boost reads as alive rather than as a decal stuck to the bumper.
      const pulse = 0.8 + Math.sin(time * 40) * 0.25;
      flames.scale.set(pulse, 1, 1);
    },
    syncFurniture(currentItems, time) {
      for (const item of currentItems) {
        if (item.kind !== 'coin') continue;
        const mesh = coinMeshes.get(item.id);
        if (!mesh) continue;
        mesh.visible = !item.collected;
        // A spinning coin catches the eye from much further away than a static one.
        mesh.rotation.y = -item.heading + time * 2;
      }
    },
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
