import '../../ui/testbed.css';
import '../../ui/proto.css';
import '../../ui/shield.css';
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
import { createPathSurface } from '../../engine/path-surface';
import {
  TRACK_CONFIG,
  TrackRun,
  bendAhead,
  buildLoopPath,
  placeFurniture,
  projectToPath,
} from '../../engine/track';
import {
  TEST_TRACK_CONTROL,
  TEST_TRACK_HALF_WIDTH,
  TEST_TRACK_LAYOUT,
} from '../../data/test-track';
import { TuningPanel, type TuningSchema } from '../../engine/tuning';
import { STEER_ASSIST_CONFIG, computeSteerAssist } from '../../engine/steer-assist';
import { ChaseCamera, CHASE_CAMERA_CONFIG } from '../../engine/chase-camera';
import { createKartScene } from '../../ui/kart-scene';
import { SHIELD_CONFIG, ShieldRun, type ShieldResolution } from '../../engine/shield';
import { ShieldHud } from '../../ui/shield-hud';
import { Beeper } from '../../ui/beeps';

installErrorBanner();

/**
 * Shield Up harness. (1e1)
 *
 * The kart piece with something chasing it. No top-down view here, unlike the kart harness —
 * an instrument showing the shell closing in from above would answer the exact question gate
 * 1e2 asks, which is whether the threat is legible from the driving view alone.
 */

const CONFIG = { ...KART_CONFIG };
const CAMERA = { ...CHASE_CAMERA_CONFIG };
const ASSIST = { ...STEER_ASSIST_CONFIG };
const TRACK = { ...TRACK_CONFIG };
const SHIELD = { ...SHIELD_CONFIG };

const SHIELD_SCHEMA: TuningSchema<typeof SHIELD> = {
  warningMs: {
    kind: 'number',
    label: 'Warning lead',
    min: 500,
    max: 5000,
    step: 100,
    unit: 'ms',
    group: 'The threat',
    help: 'From siren to impact. The number this drill exists to tune: long enough that noticing is a skill rather than a reflex test, short enough to still be a threat.',
  },
  fakeChance: {
    kind: 'number',
    label: 'Fake-outs',
    min: 0,
    max: 0.8,
    step: 0.05,
    group: 'The threat',
    help: 'Share of warnings that veer off harmlessly. Their job is to bait the release, not to punish holding.',
  },
  gapMinMs: {
    kind: 'number',
    label: 'Shortest gap',
    min: 1000,
    max: 12000,
    step: 250,
    unit: 'ms',
    group: 'The threat',
  },
  gapMaxMs: {
    kind: 'number',
    label: 'Longest gap',
    min: 1000,
    max: 15000,
    step: 250,
    unit: 'ms',
    group: 'The threat',
  },
  approachDistance: {
    kind: 'number',
    label: 'Starts back',
    min: 10,
    max: 140,
    step: 5,
    unit: 'u',
    group: 'The threat',
    help: 'How far behind it appears. Presentation only — the timing comes from the warning lead.',
  },

  itemRefreshMs: {
    kind: 'number',
    label: 'New item after',
    min: 500,
    max: 12000,
    step: 250,
    unit: 'ms',
    group: 'Consequences',
    help: 'How long you spend defenceless after spending or throwing an item.',
  },
  spinSpeedKeep: {
    kind: 'number',
    label: 'Speed kept on a hit',
    min: 0,
    max: 1,
    step: 0.05,
    group: 'Consequences',
  },
  spinMs: {
    kind: 'number',
    label: 'Spin length',
    min: 200,
    max: 3000,
    step: 50,
    unit: 'ms',
    group: 'Consequences',
  },

  straightsOnly: {
    kind: 'boolean',
    label: 'Straights only',
    group: 'Where',
    help: 'Keeps threats off the corners. Holding a key while surviving a hairpin tests two things at once and teaches neither.',
  },
  maxBend: {
    kind: 'number',
    label: 'Counts as straight',
    min: 0.05,
    max: 1.2,
    step: 0.05,
    unit: 'rad',
    group: 'Where',
  },
};

// Same world as the kart piece — this is that drill with something chasing you.
const path = buildLoopPath(TEST_TRACK_CONTROL);
const surface = createPathSurface(path, TEST_TRACK_HALF_WIDTH);
const items = placeFurniture(path, TEST_TRACK_LAYOUT);
const track = new TrackRun(items);
surface.groundHeightAt = track.groundHeightAt;

const kart = createKart(surface.startPose.x, surface.startPose.y, surface.startPose.heading);
const input = new Input();
const shield = new ShieldRun();
const beeper = new Beeper();

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

const canvas3d = document.querySelector<HTMLCanvasElement>('#stage3d');
const stage = document.querySelector<HTMLElement>('#stage-wrap');
const boostGlow = document.querySelector<HTMLDivElement>('#boost-glow');
const view = canvas3d ? createKartScene(canvas3d, surface, path, items) : null;
const chase = new ChaseCamera();
const hud = stage ? new ShieldHud(stage) : null;

/** Next siren pip. The gap shortens as the threat closes — a parking sensor, essentially. */
let nextPipAt = 0;
/** When the last resolution burst started, for the expanding ring. */
let burstAt = 0;
let burstHit = false;
/** Whole turns a spin-out makes. Whole, so the kart finishes pointing where it started. */
const SPIN_TURNS = 2;

const VERDICTS: Record<
  string,
  { title: string; detail: string; tone: 'good' | 'bad' | 'neutral' }
> = {
  blocked: {
    title: 'BLOCKED',
    detail: 'The item took the hit instead of you. That is the whole habit.',
    tone: 'good',
  },
  'fake-held': {
    title: 'FALSE ALARM',
    detail:
      'That one was never going to hit you — and holding cost you nothing. You still have your item.',
    tone: 'good',
  },
  'fake-clear': {
    title: 'IT MISSED',
    detail: 'That one veered off on its own. You will not always be that lucky.',
    tone: 'neutral',
  },
  hit: {
    title: 'HIT',
    detail:
      'You had something to hold and never held it. Hold the item key as soon as the siren starts.',
    tone: 'bad',
  },
  unarmed: {
    title: 'HIT',
    detail: 'Nothing in your hands to raise. A new item is on its way.',
    tone: 'neutral',
  },
};

function announce(resolution: ShieldResolution): void {
  // "Dropped" is the lesson the fake-outs exist to teach, and it reads differently depending on
  // whether anything was actually coming — so it is the one outcome phrased here rather than in
  // the table above.
  if (resolution.outcome === 'dropped') {
    hud?.say(
      resolution.kind === 'fake' ? 'THROWN AWAY' : 'YOU LET GO',
      resolution.kind === 'fake'
        ? 'It veered off by itself, and you threw your item away in the relief. Nothing left to raise for the next one.'
        : 'Letting go throws the item away, so the shell arrived and found nothing in its way. Hold until it hits.',
      'bad',
      2400,
    );
    return;
  }

  const verdict = VERDICTS[resolution.outcome];
  if (!verdict) return;
  const detail =
    resolution.outcome === 'blocked' && resolution.leadMs !== null
      ? `Shield up ${resolution.leadMs.toFixed(0)} ms before it arrived. ${verdict.detail}`
      : verdict.detail;
  hud?.say(verdict.title, detail, verdict.tone, 2000);
}

function log(resolution: ShieldResolution): void {
  const list = document.querySelector<HTMLOListElement>('#log');
  if (!list) return;
  const li = document.createElement('li');
  li.className = resolution.struck ? '' : 'down';
  const lead =
    resolution.leadMs === null ? 'never raised' : `${resolution.leadMs.toFixed(0)} ms early`;
  li.textContent = `${String(shield.threats).padStart(3)}  ${resolution.kind.padEnd(6)} ${resolution.outcome.padEnd(11)} ${lead}`;
  list.prepend(li);
  while (list.children.length > 12) list.lastElementChild?.remove();
}

function update(dt: number): void {
  input.sample();
  const now = performance.now();

  const assist = computeSteerAssist(kart, path, surface.halfWidth, ASSIST);
  last = stepKart(kart, CONFIG, input.steer(), surface, dt, assist.yawRate);

  const hopJustPressed = input.justPressed('hop');
  track.update(kart, TRACK, { now, hopJustPressed, lastHopAt: null }, last);

  // Threats wait for a straight. Asking someone to hold a key and survive a hairpin at the same
  // time tests two things at once and teaches neither.
  const projected = projectToPath(path, kart.x, kart.y);
  const clearRoad = projected ? bendAhead(path, projected.point) <= SHIELD.maxBend : true;

  const events = shield.update(SHIELD, {
    now,
    holding: input.isDown('item'),
    clearRoad,
  });

  if (events.warned) nextPipAt = now;
  if (events.rearmed) beeper.play('item');

  // Pips speed up as it closes. Sound is what lets the warning reach you while you are looking
  // at the road, which is where the drill wants your eyes.
  const progress = shield.progress(now, SHIELD);
  if (progress !== null && now >= nextPipAt) {
    const urgent = progress > 0.55;
    beeper.play(urgent ? 'urgent' : 'warn');
    nextPipAt = now + 460 - progress * 330;
  }

  if (events.resolved) {
    announce(events.resolved);
    log(events.resolved);
    burstAt = now;
    burstHit = events.resolved.struck;
    beeper.play(events.resolved.struck ? 'hit' : 'block');

    if (events.resolved.struck) {
      // One hit, one cost. Bleeding speed every tick of the spin would turn a knock into a stop.
      kart.vx *= SHIELD.spinSpeedKeep;
      kart.vy *= SHIELD.spinSpeedKeep;
      kart.boostRemaining = 0;
    }
  }
}

function render(alpha: number, stats: LoopStats): void {
  if (!view) return;
  const dt = stats.frameMs / 1000;
  const now = performance.now();
  const time = now / 1000;

  const poseX = lerp(kart.prevX, kart.x, alpha);
  const poseY = lerp(kart.prevY, kart.y, alpha);
  const poseHeading = lerpAngle(kart.prevHeading, kart.heading, alpha);
  const poseAltitude = lerp(kart.prevAltitude, kart.altitude, alpha);

  const boosting = kart.boostRemaining > 0;
  view.kart.position.set(poseX, poseAltitude, poseY);
  view.syncFurniture(items, time);
  view.setBoosting(boosting, time);
  view.syncKart(last.speed, poseAltitude, kart.steerAmount, dt);
  if (boostGlow) boostGlow.dataset.on = String(boosting);

  const covered = input.isDown('item') && shield.hasItem;
  view.setItem(shield.hasItem, time);
  view.setShield(covered, time);

  const approach = shield.approach(now, SHIELD);
  view.setThreat(approach?.behind ?? null, approach?.side ?? 0, time);

  const burst = (now - burstAt) / 420;
  view.setBurst(burstAt > 0 && burst < 1 ? burst : null, burstHit);

  // Spun by a hit: the kart keeps travelling but stops pointing where it is going, which is
  // both what the real game does and a cost you can see rather than read.
  const spin = shield.spinProgress(now, SHIELD);
  view.kart.rotation.y = -poseHeading + (spin ?? 0) * Math.PI * 2 * SPIN_TURNS;

  hud?.setWarning(shield.progress(now, SHIELD));
  hud?.setItem(covered ? 'up' : shield.hasItem ? 'ready' : 'empty', shield.itemWait(now));
  hud?.update(now);

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

// --- telemetry -------------------------------------------------------------

const STAT_ROWS = [
  ['threats', () => String(shield.threats)],
  ['blocked', () => `${shield.blocked} / ${shield.threats}`],
  ['times hit', () => String(shield.struck)],
  [
    'item',
    () =>
      shield.hasItem ? 'in hand' : `${(shield.itemWait(performance.now()) ?? 0).toFixed(1)} s`,
  ],
  ['speed', () => `${last.speed.toFixed(2)} u/s`],
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

function sizeCanvas(): void {
  if (canvas3d && view) view.resize(canvas3d.clientWidth, canvas3d.clientHeight);
}

buildStats();
sizeCanvas();
window.addEventListener('resize', sizeCanvas);

window.addEventListener('keydown', (event) => {
  if (event.code !== 'KeyR') return;
  resetKart(kart, surface.startPose.x, surface.startPose.y, surface.startPose.heading);
  track.reset();
  shield.reset(performance.now(), SHIELD);
  burstAt = 0;
  document.querySelector<HTMLOListElement>('#log')?.replaceChildren();
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

const mute = document.querySelector<HTMLButtonElement>('#mute');
mute?.addEventListener('click', () => {
  beeper.muted = !beeper.muted;
  mute.textContent = beeper.muted ? 'Sound off' : 'Sound on';
});

new TuningPanel({
  config: SHIELD,
  schema: SHIELD_SCHEMA,
  title: 'Shield Up config',
  exportName: 'SHIELD_CONFIG',
  storageKey: 'mkm.tuning.shield.v1',
  mount: document.querySelector<HTMLElement>('#shield-mount') ?? undefined,
});

setInterval(pumpStats, 100);
new Loop({ update, render }).start();
