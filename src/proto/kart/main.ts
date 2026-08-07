import '../../ui/testbed.css';
import '../../ui/proto.css';
import { installErrorBanner } from '../../ui/error-banner';
import { Input } from '../../engine/input';
import { Loop, lerp, lerpAngle, type LoopStats } from '../../engine/loop';
import {
  KART_CONFIG,
  createKart,
  resetKart,
  stepKart,
  type KartStepResult,
} from '../../engine/kart';
import { createStadiumSurface, stadiumCentreline } from '../../engine/surface';
import {
  TRACK_CONFIG,
  TrackRun,
  buildTrackPath,
  placeFurniture,
  type FurnitureSpec,
} from '../../engine/track';
import { TuningPanel, type TuningSchema } from '../../engine/tuning';
import { ChaseCamera, CHASE_CAMERA_CONFIG } from '../../engine/chase-camera';
import { createKartScene } from './scene';

installErrorBanner();

/**
 * Kart harness. (1b1 physics, 1b2 chase camera)
 *
 * Two views of one simulation. The chase view is the product — what Jodi sees. The top-down
 * view is the instrument, kept because a chase camera hides the slip angle and the slip angle
 * is what gets tuned. Both read the same interpolated pose each frame, so they can never
 * disagree about where the kart is.
 */

const CONFIG = { ...KART_CONFIG };

const SCHEMA: TuningSchema<typeof CONFIG> = {
  maxSpeed: {
    kind: 'number',
    label: 'Top speed',
    min: 4,
    max: 40,
    step: 0.5,
    unit: 'u/s',
    group: 'Speed',
  },
  acceleration: {
    kind: 'number',
    label: 'Acceleration',
    min: 1,
    max: 40,
    step: 0.5,
    unit: 'u/s²',
    group: 'Speed',
  },
  drag: { kind: 'number', label: 'Drag', min: 0, max: 3, step: 0.05, unit: '/s', group: 'Speed' },

  maxYawRate: {
    kind: 'number',
    label: 'Turn rate',
    min: 0.4,
    max: 6,
    step: 0.1,
    unit: 'rad/s',
    group: 'Steering',
  },
  steerRate: {
    kind: 'number',
    label: 'Steer ramp',
    min: 1,
    max: 30,
    step: 0.5,
    unit: '/s',
    group: 'Steering',
    help: 'How fast a key press reaches full lock. The anti-twitch constant — lower is smoother, too low feels unresponsive.',
  },
  steerReturnRate: {
    kind: 'number',
    label: 'Steer return',
    min: 1,
    max: 30,
    step: 0.5,
    unit: '/s',
    group: 'Steering',
  },
  highSpeedSteerPenalty: {
    kind: 'number',
    label: 'High-speed penalty',
    min: 0,
    max: 0.9,
    step: 0.05,
    group: 'Steering',
    help: 'How much wider the kart turns at top speed. Some makes speed feel committed; too much feels remote-controlled.',
  },
  steerAuthoritySpeed: {
    kind: 'number',
    label: 'Full-steering speed',
    min: 0.5,
    max: 15,
    step: 0.5,
    unit: 'u/s',
    group: 'Steering',
    help: 'Below this the kart turns less, so a standstill cannot pirouette.',
  },

  grip: {
    kind: 'number',
    label: 'Grip',
    min: 0.5,
    max: 20,
    step: 0.25,
    unit: '/s',
    group: 'Grip',
    help: 'How fast sideways speed bleeds off. Lower slides more.',
  },
  offRoadSpeedFactor: {
    kind: 'number',
    label: 'Off-road speed',
    min: 0.1,
    max: 1,
    step: 0.05,
    group: 'Grip',
  },
  offRoadGrip: {
    kind: 'number',
    label: 'Off-road grip',
    min: 0.2,
    max: 20,
    step: 0.25,
    unit: '/s',
    group: 'Grip',
  },

  wallSpeedKeep: {
    kind: 'number',
    label: 'Wall speed kept',
    min: 0,
    max: 1,
    step: 0.05,
    group: 'Walls',
  },
  wallBounce: { kind: 'number', label: 'Wall bounce', min: 0, max: 1, step: 0.05, group: 'Walls' },
};

const surface = createStadiumSurface();
const path = buildTrackPath(stadiumCentreline());

/**
 * The whole test layout. (1b3)
 *
 * This is the Q6 answer in practice: `t` is how far around the lap, `offset` is how far off
 * the centre line. Nothing here refers to a coordinate, so the oval could change shape and
 * every item would still be where it belongs.
 *
 * On this oval, t 0–0.2 is the bottom straight, 0.2–0.5 the right corner, 0.5–0.7 the top
 * straight, 0.7–1.0 the left corner.
 */
function coinLine(fromT: number, toT: number, count: number, offset: number): FurnitureSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    kind: 'coin' as const,
    t: fromT + ((toT - fromT) * i) / Math.max(1, count - 1),
    offset,
  }));
}

const LAYOUT: FurnitureSpec[] = [
  // Straights: real pads you can line up for.
  { kind: 'pad', t: 0.05 },
  { kind: 'pad', t: 0.56, offset: -3 },

  // A ramp in each corner, so tricks have to be taken mid-turn rather than on a straight.
  { kind: 'ramp', t: 0.33 },
  { kind: 'ramp', t: 0.84, offset: 2 },

  // Half-pipe out near the edge, exactly where taking it costs you the corner. A real boost
  // for a real detour — the trade Chapter 4 is about.
  { kind: 'halfpipe', t: 0.14, offset: 7 },

  // Coins reward the inside line through the top straight and the left corner.
  ...coinLine(0.6, 0.68, 6, -4),
  ...coinLine(0.9, 0.97, 6, -5),
];

const items = placeFurniture(path, LAYOUT);
const run = new TrackRun(items);

// Ramps are the only thing on this track with height, and the physics asks the surface how
// high the ground is, so the surface delegates to the furniture.
surface.groundHeightAt = run.groundHeightAt;

const kart = createKart(surface.startPose.x, surface.startPose.y, surface.startPose.heading);
const input = new Input();

let last: KartStepResult = {
  speed: 0,
  slipAngle: 0,
  onRoad: true,
  hitWall: false,
  impactSpeed: 0,
  airborne: false,
  landed: false,
  boosting: false,
};

/** Recent positions, for a line showing what the last few seconds of driving looked like. */
const trail: Array<{ x: number; y: number }> = [];
const TRAIL_LIMIT = 260;
let trailCounter = 0;

const canvas = document.querySelector<HTMLCanvasElement>('#stage');
const ctx = canvas?.getContext('2d') ?? null;

// --- the chase view: what Jodi actually sees (1b2) ---

const CAMERA = { ...CHASE_CAMERA_CONFIG };

const CAMERA_SCHEMA: TuningSchema<typeof CAMERA> = {
  distance: {
    kind: 'number',
    label: 'Distance back',
    min: 3,
    max: 25,
    step: 0.5,
    unit: 'u',
    group: 'Placement',
  },
  height: {
    kind: 'number',
    label: 'Height',
    min: 0.5,
    max: 15,
    step: 0.2,
    unit: 'u',
    group: 'Placement',
  },
  lookAhead: {
    kind: 'number',
    label: 'Look ahead',
    min: 0,
    max: 30,
    step: 0.5,
    unit: 'u',
    group: 'Placement',
    help: 'How far up the road the camera aims. Higher reads as more committed to the corner.',
  },
  lookHeight: {
    kind: 'number',
    label: 'Look height',
    min: 0,
    max: 6,
    step: 0.1,
    unit: 'u',
    group: 'Placement',
  },
  positionLag: {
    kind: 'number',
    label: 'Position lag',
    min: 0.5,
    max: 30,
    step: 0.5,
    unit: '/s',
    group: 'Lag',
    help: 'How fast the camera catches its ideal spot. Lower swings wider in corners.',
  },
  headingLag: {
    kind: 'number',
    label: 'Heading lag',
    min: 0.5,
    max: 30,
    step: 0.5,
    unit: '/s',
    group: 'Lag',
    help: 'The big one. Lower lets the camera trail the turn so you see the kart’s flank.',
  },
  lean: {
    kind: 'number',
    label: 'Lean into turns',
    min: 0,
    max: 0.5,
    step: 0.01,
    unit: 'rad',
    group: 'Lag',
  },
  fovBase: {
    kind: 'number',
    label: 'Field of view',
    min: 30,
    max: 110,
    step: 1,
    unit: '°',
    group: 'Speed feel',
  },
  fovSpeedGain: {
    kind: 'number',
    label: 'FOV gain at speed',
    min: 0,
    max: 45,
    step: 1,
    unit: '°',
    group: 'Speed feel',
    help: 'Widening the view with speed is the cheapest possible sense of velocity. Zero it to hear the difference.',
  },
};

const canvas3d = document.querySelector<HTMLCanvasElement>('#stage3d');
const boostGlow = document.querySelector<HTMLDivElement>('#boost-glow');
const view = canvas3d ? createKartScene(canvas3d, surface, path, items) : null;
const chase = new ChaseCamera();

// --- track furniture (1b3) ---

const TRACK = { ...TRACK_CONFIG };

const TRACK_SCHEMA: TuningSchema<typeof TRACK> = {
  trickWindowMs: {
    kind: 'number',
    label: 'Trick window',
    min: 20,
    max: 500,
    step: 5,
    unit: 'ms',
    group: 'Tricks',
    help: 'How close to the lip the hop has to be, either side. The number Chapter 3 exists to teach — wide enough that Jodi lands it, tight enough that landing it means something.',
  },
  trickBoost: {
    kind: 'number',
    label: 'Trick boost',
    min: 0,
    max: 4,
    step: 0.1,
    unit: 's',
    group: 'Tricks',
  },
  rampLaunch: {
    kind: 'number',
    label: 'Ramp launch',
    min: 0,
    max: 5,
    step: 0.1,
    group: 'Tricks',
    help: 'How much air the ramp gives. Higher means longer to think, and a bigger miss when you get it wrong.',
  },
  padBoost: {
    kind: 'number',
    label: 'Pad boost',
    min: 0,
    max: 4,
    step: 0.1,
    unit: 's',
    group: 'Pads',
  },
  halfPipePush: {
    kind: 'number',
    label: 'Half-pipe throw',
    min: 0,
    max: 25,
    step: 0.5,
    unit: 'u/s',
    group: 'Pads',
    help: 'How far outward a half-pipe throws you. This is its whole cost — the boost is real, the line is not.',
  },
  coinTarget: { kind: 'number', label: 'Coin target', min: 1, max: 30, step: 1, group: 'Coins' },
};

/** Transient on-screen feedback: what just happened, and when it should fade. */
let flash = '';
let flashUntil = 0;

/** Barrel-roll animation start time, or 0 when not rolling. */
let rollStart = 0;
const ROLL_MS = 520;

function say(message: string, ms = 1200): void {
  flash = message;
  flashUntil = performance.now() + ms;
}

function update(dt: number): void {
  input.sample();
  last = stepKart(kart, CONFIG, input.steer(), surface, dt);

  const events = run.update(
    kart,
    TRACK,
    {
      now: performance.now(),
      hopJustPressed: input.justPressed('hop'),
      hopPressedAt: input.pressedAt('hop'),
    },
    last,
  );

  if (events.padHit) say('BOOST');
  if (events.launchedFromHalfPipe) say('Half-pipe — real boost, wrong line');
  if (events.trick === 'landed') {
    const error = events.trickErrorMs ?? 0;
    say(`TRICK — ${error > 0 ? '+' : ''}${error.toFixed(0)} ms`);
    rollStart = performance.now();
  } else if (events.trick === 'missed') {
    say('No trick. Hop at the lip.');
  }
  if (events.coinsCollected > 0 && run.coins === TRACK.coinTarget) {
    say(`${TRACK.coinTarget} coins!`, 2000);
  }

  // Every few ticks is plenty for a visual trail, and keeps the array short.
  if (++trailCounter % 6 === 0) {
    trail.push({ x: kart.x, y: kart.y });
    if (trail.length > TRAIL_LIMIT) trail.shift();
  }
}

// --- rendering -------------------------------------------------------------

function readCssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** World units to screen pixels, fitting the arena into the canvas. */
function viewTransform(): { scale: number; offsetX: number; offsetY: number } {
  const width = canvas?.clientWidth ?? 1;
  const height = canvas?.clientHeight ?? 1;
  const { bounds } = surface;
  const worldWidth = bounds.maxX - bounds.minX;
  const worldHeight = bounds.maxY - bounds.minY;
  const scale = Math.min(width / worldWidth, height / worldHeight) * 0.96;
  return {
    scale,
    offsetX: width / 2 - ((bounds.minX + bounds.maxX) / 2) * scale,
    offsetY: height / 2 - ((bounds.minY + bounds.maxY) / 2) * scale,
  };
}

/** A stadium of the given centreline radius, as a rounded rect. */
function stadiumPath(radius: number, scale: number, offsetX: number, offsetY: number): Path2D {
  const { straightHalfLength, centerX, centerY } = surface.options;
  const path = new Path2D();
  const w = (straightHalfLength * 2 + radius * 2) * scale;
  const h = radius * 2 * scale;
  const x = offsetX + (centerX - straightHalfLength - radius) * scale;
  const y = offsetY + (centerY - radius) * scale;
  path.roundRect(x, y, w, h, radius * scale);
  return path;
}

function render(alpha: number, stats: LoopStats): void {
  // One interpolated pose, shared by both views, so the instrument never disagrees with the
  // chase view about where the kart is.
  const poseX = lerp(kart.prevX, kart.x, alpha);
  const poseY = lerp(kart.prevY, kart.y, alpha);
  const poseHeading = lerpAngle(kart.prevHeading, kart.heading, alpha);
  const poseAltitude = lerp(kart.prevAltitude, kart.altitude, alpha);

  renderChase(poseX, poseY, poseHeading, poseAltitude, stats.frameMs / 1000);
  renderTopDown(poseX, poseY, poseHeading);
}

function renderChase(
  poseX: number,
  poseY: number,
  poseHeading: number,
  poseAltitude: number,
  dt: number,
): void {
  if (!view) return;

  const now = performance.now();
  const boosting = kart.boostRemaining > 0;

  view.kart.position.set(poseX, poseAltitude, poseY);
  view.syncFurniture(items, now / 1000);
  view.setBoosting(boosting, now / 1000);

  // Edge glow over the canvas while boosting. Peripheral rather than central, so it says
  // "you are going fast" without hiding the road you are meant to be reading. Set here rather
  // than on the stats timer so it appears on the frame the boost starts.
  if (boostGlow) boostGlow.dataset.on = String(boosting);

  // A landed trick spins the kart through a full barrel roll and stops level. Nothing else
  // signals "that counted" as immediately, which is why the real game does it too.
  if (rollStart > 0) {
    const progress = (now - rollStart) / ROLL_MS;
    if (progress >= 1) {
      rollStart = 0;
      view.setRoll(0);
    } else {
      view.setRoll(progress * Math.PI * 2);
    }
  }
  // Sim heading 0 points along +x; a Three.js Y-rotation of θ sends +x to (cosθ, 0, -sinθ),
  // so the mesh needs the negated angle to face where the physics says it faces.
  view.kart.rotation.y = -poseHeading;

  chase.update(
    view.camera,
    {
      x: poseX,
      y: poseY,
      heading: poseHeading,
      steerAmount: kart.steerAmount,
      speed: last.speed,
      maxSpeed: CONFIG.maxSpeed,
    },
    CAMERA,
    dt,
  );

  view.render();
}

function renderTopDown(poseX: number, poseY: number, poseHeading: number): void {
  if (!ctx || !canvas) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);

  const { scale, offsetX, offsetY } = viewTransform();
  const { cornerRadius, roadHalfWidth } = surface.options;
  const toScreenX = (x: number): number => offsetX + x * scale;
  const toScreenY = (y: number): number => offsetY + y * scale;

  const line = readCssVar('--line', '#ccc');
  const muted = readCssVar('--muted', '#666');
  const accent = readCssVar('--accent', '#0b57d0');

  // Grass, then road, then the inside of the oval punched back out to grass.
  const { bounds } = surface;
  ctx.fillStyle = line;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(
    toScreenX(bounds.minX),
    toScreenY(bounds.minY),
    (bounds.maxX - bounds.minX) * scale,
    (bounds.maxY - bounds.minY) * scale,
  );
  ctx.globalAlpha = 1;

  // The road is an annulus: outer edge and inner edge in one path, filled even-odd so the
  // infield is never painted. Punching it out with compositing instead would erase the grass
  // underneath it too.
  const road = new Path2D();
  road.addPath(stadiumPath(cornerRadius + roadHalfWidth, scale, offsetX, offsetY));
  road.addPath(stadiumPath(cornerRadius - roadHalfWidth, scale, offsetX, offsetY));
  ctx.fillStyle = line;
  ctx.fill(road, 'evenodd');

  ctx.strokeStyle = muted;
  ctx.globalAlpha = 0.5;
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 1;
  ctx.stroke(stadiumPath(cornerRadius, scale, offsetX, offsetY));
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Furniture, so the instrument view shows the same track the chase view does.
  for (const item of items) {
    if (item.kind === 'coin') {
      ctx.fillStyle = '#e0a800';
      ctx.globalAlpha = item.collected ? 0.2 : 1;
      ctx.beginPath();
      ctx.arc(toScreenX(item.x), toScreenY(item.y), 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }

    ctx.save();
    ctx.translate(toScreenX(item.x), toScreenY(item.y));
    ctx.rotate(item.heading);
    ctx.fillStyle = item.kind === 'pad' ? '#ff8a1f' : item.kind === 'ramp' ? '#b98cff' : '#3fa9ff';
    ctx.fillRect(
      -item.halfLength * scale,
      -item.halfWidth * scale,
      item.halfLength * 2 * scale,
      item.halfWidth * 2 * scale,
    );
    ctx.restore();
  }

  // Trail
  if (trail.length > 1) {
    ctx.strokeStyle = muted;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    trail.forEach((p, i) => {
      const sx = toScreenX(p.x);
      const sy = toScreenY(p.y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const x = toScreenX(poseX);
  const y = toScreenY(poseY);
  const heading = poseHeading;

  // Where it is actually going, which is the whole point of the top-down view.
  if (last.speed > 0.5) {
    const travel = Math.atan2(kart.vy, kart.vx);
    ctx.strokeStyle = muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(travel) * 34, y + Math.sin(travel) * 34);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.fillStyle = last.onRoad ? accent : '#b3261e';
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-9, 8);
  ctx.lineTo(-9, -8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function sizeCanvas(): void {
  if (canvas) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // Three.js owns the backing-store size of its own canvas; hand it CSS pixels.
  if (canvas3d && view) view.resize(canvas3d.clientWidth, canvas3d.clientHeight);
}

// --- telemetry -------------------------------------------------------------

const STAT_ROWS = [
  ['speed', () => `${last.speed.toFixed(2)} u/s`],
  ['of top speed', () => `${((last.speed / CONFIG.maxSpeed) * 100).toFixed(0)} %`],
  ['slip angle', () => `${((last.slipAngle * 180) / Math.PI).toFixed(1)}°`],
  ['steering', () => kart.steerAmount.toFixed(2)],
  ['surface', () => (last.airborne ? 'AIR' : last.onRoad ? 'road' : 'GRASS')],
  ['altitude', () => `${kart.altitude.toFixed(2)} u`],
  ['boost', () => (kart.boostRemaining > 0 ? `${kart.boostRemaining.toFixed(2)} s` : '—')],
  ['coins', () => `${run.coins} / ${TRACK.coinTarget}`],
  ['heading', () => `${((kart.heading * 180) / Math.PI).toFixed(0)}°`],
] as const;

const statCells = new Map<string, HTMLTableCellElement>();

function buildStats(): void {
  const body = document.querySelector<HTMLTableSectionElement>('#stats');
  if (!body) return;
  for (const [label] of STAT_ROWS) {
    const tr = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = label;
    name.style.width = '12rem';
    const value = document.createElement('td');
    value.className = 'num';
    tr.append(name, value);
    body.append(tr);
    statCells.set(label, value);
  }
}

function pumpStats(): void {
  for (const [label, format] of STAT_ROWS) {
    const cell = statCells.get(label);
    if (cell) cell.textContent = format();
  }

  const hud = document.querySelector<HTMLParagraphElement>('#hud');
  if (hud) {
    const live = performance.now() < flashUntil;
    hud.textContent = live ? flash : `${run.coins} / ${TRACK.coinTarget} coins`;
    hud.dataset.live = String(live);
  }
}

// --- wiring ----------------------------------------------------------------

buildStats();
sizeCanvas();
window.addEventListener('resize', sizeCanvas);

window.addEventListener('keydown', (event) => {
  if (event.code !== 'KeyR') return;
  resetKart(kart, surface.startPose.x, surface.startPose.y, surface.startPose.heading);
  run.reset();
  trail.length = 0;
  say('Reset', 700);
  // Snap the camera too, or it swoops across the arena to catch up with the reset kart.
  chase.reset(
    {
      x: kart.x,
      y: kart.y,
      heading: kart.heading,
      steerAmount: 0,
      speed: 0,
      maxSpeed: CONFIG.maxSpeed,
    },
    CAMERA,
  );
});

new TuningPanel({
  config: CONFIG,
  schema: SCHEMA,
  title: 'Kart config',
  exportName: 'KART_CONFIG',
  storageKey: 'mkm.tuning.kart.v1',
  mount: document.querySelector<HTMLElement>('#tuning-mount') ?? undefined,
});

new TuningPanel({
  config: CAMERA,
  schema: CAMERA_SCHEMA,
  title: 'Camera config',
  exportName: 'CHASE_CAMERA_CONFIG',
  storageKey: 'mkm.tuning.camera.v1',
  mount: document.querySelector<HTMLElement>('#camera-mount') ?? undefined,
});

new TuningPanel({
  config: TRACK,
  schema: TRACK_SCHEMA,
  title: 'Track config',
  exportName: 'TRACK_CONFIG',
  storageKey: 'mkm.tuning.track.v1',
  mount: document.querySelector<HTMLElement>('#track-mount') ?? undefined,
});

setInterval(pumpStats, 100);
new Loop({ update, render }).start();
