import '../../ui/testbed.css';
import '../../ui/proto.css';
import { installErrorBanner } from '../../ui/error-banner';
import { Loop, lerp, type LoopStats } from '../../engine/loop';

installErrorBanner();

/**
 * Game loop harness. (1a3)
 *
 * Two pucks off one sim: one drawn at the raw sim position, one interpolated. Drop the sim rate
 * and the difference is obvious, which is the whole argument for keeping render and sim separate.
 */

const canvas = document.querySelector<HTMLCanvasElement>('#stage');
const ctx = canvas?.getContext('2d') ?? null;

/** Sim state. `prev` is kept so the renderer has something to interpolate from. */
const puck = {
  x: 0.15,
  prevX: 0.15,
  /** Screen widths per second. */
  vx: 0.45,
};

const PUCK_RADIUS = 16;

function update(dt: number): void {
  puck.prevX = puck.x;
  puck.x += puck.vx * dt;
  if (puck.x > 0.95) {
    puck.x = 0.95;
    puck.vx = -puck.vx;
  } else if (puck.x < 0.05) {
    puck.x = 0.05;
    puck.vx = -puck.vx;
  }
}

function sizeCanvas(): void {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function readCssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function drawLane(y: number, label: string, x: number, accent: boolean): void {
  if (!ctx || !canvas) return;
  const width = canvas.clientWidth;

  ctx.strokeStyle = readCssVar('--line', '#ccc');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();

  ctx.fillStyle = readCssVar('--muted', '#666');
  ctx.font = '12px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillText(label, 8, y - 26);

  ctx.fillStyle = accent ? readCssVar('--accent', '#0b57d0') : readCssVar('--muted', '#666');
  ctx.beginPath();
  ctx.arc(x * width, y - PUCK_RADIUS - 1, PUCK_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

function render(alpha: number): void {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  // A bounce reverses direction, so prev and current sit on opposite sides of the wall;
  // interpolating across that frame would slingshot the puck backwards.
  const bounced = Math.sign(puck.x - puck.prevX) !== Math.sign(puck.vx);
  const interpolated = bounced ? puck.x : lerp(puck.prevX, puck.x, alpha);

  drawLane(70, 'raw sim position', puck.x, false);
  drawLane(160, 'interpolated by alpha', interpolated, true);
}

const loop = new Loop({ update, render });

// --- readout ---------------------------------------------------------------

const STAT_ROWS = [
  ['fps', (s: LoopStats) => s.fps.toFixed(1)],
  ['frame', (s: LoopStats) => `${s.frameMs.toFixed(2)} ms`],
  ['longest frame', (s: LoopStats) => `${s.longestFrameMs.toFixed(1)} ms`],
  ['sim rate', (s: LoopStats) => `${s.simHz.toFixed(0)} Hz`],
  ['ticks this frame', (s: LoopStats) => `${s.ticksLastFrame}`],
  ['ticks total', (s: LoopStats) => s.ticks.toLocaleString()],
  ['alpha', (s: LoopStats) => s.alpha.toFixed(3)],
  ['dropped', (s: LoopStats) => `${s.droppedMs.toFixed(0)} ms`],
  ['state', (s: LoopStats) => (s.paused ? 'paused' : 'running')],
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

/** The readout is for reading, so update it a few times a second, not every frame. */
function pumpStats(): void {
  const stats = loop.getStats();
  for (const [label, format] of STAT_ROWS) {
    const cell = statCells.get(label);
    if (cell) cell.textContent = format(stats);
  }
  const toggle = document.querySelector<HTMLButtonElement>('#toggle');
  if (toggle) toggle.textContent = stats.paused ? 'Resume' : 'Pause';
}

// --- wiring ----------------------------------------------------------------

function bindRange(
  id: string,
  outputId: string,
  format: (value: number) => string,
  apply: (value: number) => void,
): void {
  const input = document.querySelector<HTMLInputElement>(`#${id}`);
  const output = document.querySelector<HTMLOutputElement>(`#${outputId}`);
  if (!input) return;
  const sync = (): void => {
    const value = Number(input.value);
    if (output) output.textContent = format(value);
    apply(value);
  };
  input.addEventListener('input', sync);
  sync();
}

buildStats();
sizeCanvas();
window.addEventListener('resize', sizeCanvas);

bindRange(
  'hz',
  'hz-value',
  (v) => `${v} Hz`,
  (v) => loop.setHz(v),
);
bindRange(
  'scale',
  'scale-value',
  (v) => `${v.toFixed(2)}×`,
  (v) => loop.setTimeScale(v),
);

document.querySelector<HTMLButtonElement>('#toggle')?.addEventListener('click', () => {
  loop.toggle();
  pumpStats();
});

document.querySelector<HTMLButtonElement>('#stall')?.addEventListener('click', () => {
  // Genuinely block the main thread — a fake stall would not exercise the catch-up clamp.
  const until = performance.now() + 400;
  while (performance.now() < until) {
    /* burn */
  }
});

document.querySelector<HTMLButtonElement>('#reset')?.addEventListener('click', () => {
  loop.resetStats();
  pumpStats();
});

setInterval(pumpStats, 200);
loop.start();
