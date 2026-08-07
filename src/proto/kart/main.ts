import '../../ui/testbed.css';
import '../../ui/proto.css';
import { installErrorBanner } from '../../ui/error-banner';
import { Input } from '../../engine/input';
import { Loop, lerp, lerpAngle } from '../../engine/loop';
import {
  KART_CONFIG,
  createKart,
  resetKart,
  stepKart,
  type KartStepResult,
} from '../../engine/kart';
import { createStadiumSurface } from '../../engine/surface';
import { TuningPanel, type TuningSchema } from '../../engine/tuning';

installErrorBanner();

/**
 * Kart physics harness. (1b1)
 *
 * Top-down on purpose: the chase camera (1b2) hides the slip angle, and the slip angle is the
 * thing being tuned here.
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
const kart = createKart(surface.startPose.x, surface.startPose.y, surface.startPose.heading);
const input = new Input();

let last: KartStepResult = {
  speed: 0,
  slipAngle: 0,
  onRoad: true,
  hitWall: false,
  impactSpeed: 0,
};

/** Recent positions, for a line showing what the last few seconds of driving looked like. */
const trail: Array<{ x: number; y: number }> = [];
const TRAIL_LIMIT = 260;
let trailCounter = 0;

const canvas = document.querySelector<HTMLCanvasElement>('#stage');
const ctx = canvas?.getContext('2d') ?? null;

function update(dt: number): void {
  input.sample();
  last = stepKart(kart, CONFIG, input.steer(), surface, dt);

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

function render(alpha: number): void {
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

  // The kart, interpolated between sim states so it moves smoothly at any sim rate.
  const x = toScreenX(lerp(kart.prevX, kart.x, alpha));
  const y = toScreenY(lerp(kart.prevY, kart.y, alpha));
  const heading = lerpAngle(kart.prevHeading, kart.heading, alpha);

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
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// --- telemetry -------------------------------------------------------------

const STAT_ROWS = [
  ['speed', () => `${last.speed.toFixed(2)} u/s`],
  ['of top speed', () => `${((last.speed / CONFIG.maxSpeed) * 100).toFixed(0)} %`],
  ['slip angle', () => `${((last.slipAngle * 180) / Math.PI).toFixed(1)}°`],
  ['steering', () => kart.steerAmount.toFixed(2)],
  ['surface', () => (last.onRoad ? 'road' : 'GRASS')],
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
}

// --- wiring ----------------------------------------------------------------

buildStats();
sizeCanvas();
window.addEventListener('resize', sizeCanvas);

window.addEventListener('keydown', (event) => {
  if (event.code !== 'KeyR') return;
  resetKart(kart, surface.startPose.x, surface.startPose.y, surface.startPose.heading);
  trail.length = 0;
});

new TuningPanel({
  config: CONFIG,
  schema: SCHEMA,
  title: 'Kart config',
  exportName: 'KART_CONFIG',
  storageKey: 'mkm.tuning.kart.v1',
  mount: document.querySelector<HTMLElement>('#tuning-mount') ?? undefined,
});

setInterval(pumpStats, 100);
new Loop({ update, render }).start();
