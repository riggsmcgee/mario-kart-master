import '../../ui/testbed.css';
import '../../ui/proto.css';
import { installErrorBanner } from '../../ui/error-banner';
import { Loop, lerp } from '../../engine/loop';
import { TuningPanel, type TuningSchema } from '../../engine/tuning';

installErrorBanner();

/**
 * Tuning panel harness. (1a4)
 *
 * A bouncing ball standing in for the kart: the panel mutates the config in place and the sim
 * picks it up on the next tick, which is exactly how the 1b physics constants will be tuned.
 */

const CONFIG = {
  gravity: 1400,
  bounce: 0.72,
  launchSpeed: 700,
  drag: 0.15,
  radius: 18,
  showTrail: true,
  shape: 'circle',
};

const SCHEMA: TuningSchema<typeof CONFIG> = {
  gravity: {
    kind: 'number',
    label: 'Gravity',
    min: 0,
    max: 4000,
    step: 25,
    unit: 'px/s²',
    group: 'Physics',
  },
  bounce: {
    kind: 'number',
    label: 'Bounce',
    min: 0,
    max: 1.1,
    step: 0.01,
    group: 'Physics',
    help: 'Fraction of speed kept on impact. Above 1 the ball gains energy every bounce.',
  },
  drag: { kind: 'number', label: 'Drag', min: 0, max: 2, step: 0.05, unit: '/s', group: 'Physics' },
  launchSpeed: {
    kind: 'number',
    label: 'Launch speed',
    min: 100,
    max: 2000,
    step: 25,
    unit: 'px/s',
    group: 'Physics',
  },
  radius: { kind: 'number', label: 'Radius', min: 4, max: 48, step: 1, unit: 'px', group: 'Look' },
  shape: { kind: 'select', label: 'Shape', options: ['circle', 'square'], group: 'Look' },
  showTrail: { kind: 'boolean', label: 'Trail', group: 'Look' },
};

const canvas = document.querySelector<HTMLCanvasElement>('#stage');
const ctx = canvas?.getContext('2d') ?? null;

const ball = { x: 120, y: 60, prevX: 120, prevY: 60, vx: 260, vy: 0 };
const trail: Array<{ x: number; y: number }> = [];
const TRAIL_LIMIT = 48;

function bounds(): { width: number; height: number } {
  return { width: canvas?.clientWidth ?? 0, height: canvas?.clientHeight ?? 0 };
}

function update(dt: number): void {
  const { width, height } = bounds();
  const r = CONFIG.radius;

  ball.prevX = ball.x;
  ball.prevY = ball.y;

  ball.vy += CONFIG.gravity * dt;

  // Exponential decay, so drag behaves the same at any sim rate.
  const damping = Math.exp(-CONFIG.drag * dt);
  ball.vx *= damping;
  ball.vy *= damping;

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x < r) {
    ball.x = r;
    ball.vx = Math.abs(ball.vx) * CONFIG.bounce;
  } else if (ball.x > width - r) {
    ball.x = width - r;
    ball.vx = -Math.abs(ball.vx) * CONFIG.bounce;
  }

  if (ball.y > height - r) {
    ball.y = height - r;
    ball.vy = -Math.abs(ball.vy) * CONFIG.bounce;
  } else if (ball.y < r) {
    ball.y = r;
    ball.vy = Math.abs(ball.vy) * CONFIG.bounce;
  }
}

function readCssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function render(alpha: number): void {
  if (!ctx || !canvas) return;
  const { width, height } = bounds();
  ctx.clearRect(0, 0, width, height);

  // A wall flips velocity, so prev and current straddle the wall; interpolating that frame
  // would drag the ball backwards through it.
  const hitWall =
    Math.sign(ball.x - ball.prevX) !== Math.sign(ball.vx) ||
    Math.sign(ball.y - ball.prevY) !== Math.sign(ball.vy);
  const x = hitWall ? ball.x : lerp(ball.prevX, ball.x, alpha);
  const y = hitWall ? ball.y : lerp(ball.prevY, ball.y, alpha);

  if (CONFIG.showTrail) {
    trail.push({ x, y });
    if (trail.length > TRAIL_LIMIT) trail.shift();
    ctx.strokeStyle = readCssVar('--line', '#ccc');
    ctx.lineWidth = 2;
    ctx.beginPath();
    trail.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  } else if (trail.length) {
    trail.length = 0;
  }

  ctx.fillStyle = readCssVar('--accent', '#0b57d0');
  const r = CONFIG.radius;
  if (CONFIG.shape === 'square') {
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  } else {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function sizeCanvas(): void {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function launchFrom(x: number, y: number): void {
  ball.x = x;
  ball.y = y;
  ball.prevX = x;
  ball.prevY = y;
  // Away from the click, biased upward, so a click always produces a visible arc.
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
  ball.vx = Math.cos(angle) * CONFIG.launchSpeed;
  ball.vy = Math.sin(angle) * CONFIG.launchSpeed;
  trail.length = 0;
}

sizeCanvas();
window.addEventListener('resize', sizeCanvas);

canvas?.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  launchFrom(event.clientX - rect.left, event.clientY - rect.top);
});

new TuningPanel({
  config: CONFIG,
  schema: SCHEMA,
  title: 'Ball config',
  exportName: 'BALL_CONFIG',
  storageKey: 'mkm.tuning.demo.v1',
  mount: document.querySelector<HTMLElement>('#tuning-mount') ?? undefined,
});

new Loop({ update, render }).start();
