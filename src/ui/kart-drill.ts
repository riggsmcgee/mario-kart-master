/**
 * The kart drill, as a component. (2b4, 2b5, 2b6 all mount this.)
 *
 * Three chapters put her in a kart and ask for different things: land a trick off every ramp,
 * hit every dash panel, finish a lap holding ten coins. Underneath, all three are the same
 * machine — the Phase 1 kart piece with a layout, a thing to count, and a moment where it stops
 * and tells her how she did.
 *
 * So the machine lives here once and the chapters supply three small pieces: **what furniture is
 * on the track**, **what counts**, and **when it is over**. That is the Lego rule holding at the
 * point it was meant to hold: Phase 2 chapters are content, not engine work.
 *
 * **Disposal is not optional.** Every drill owns a WebGL context, a requestAnimationFrame loop
 * and a set of window listeners, and the course is a single page she navigates around all
 * evening. Leak one of these per chapter visit and the browser starts refusing new contexts
 * somewhere around her third pass through Chapter 4.
 */

import { Input } from '../engine/input';
import { Loop, lerp, lerpAngle, type LoopStats } from '../engine/loop';
import { KART_CONFIG, createKart, resetKart, stepKart, type KartStepResult } from '../engine/kart';
import { createPathSurface } from '../engine/path-surface';
import {
  TRACK_CONFIG,
  TrackRun,
  buildLoopPath,
  placeFurniture,
  projectToPath,
  type FurnitureEvents,
  type FurnitureSpec,
} from '../engine/track';
import { TEST_TRACK_CONTROL, TEST_TRACK_HALF_WIDTH } from '../data/test-track';
import { STEER_ASSIST_CONFIG, computeSteerAssist } from '../engine/steer-assist';
import { lineError, type LineError, type RacingLine } from '../engine/racing-line';
// No charge bar in the HUD, deliberately: the sparks on the kart are the feedback, and the
// chapter's whole instruction is "watch for them to turn orange". A bar in the corner would teach
// her to watch the bar, which is not a thing her Switch has.
import { DRIFT_CONFIG, createDrift, resetDrift, stepDrift, type DriftResult } from '../engine/drift';
import { ChaseCamera, CHASE_CAMERA_CONFIG } from '../engine/chase-camera';
import { createKartScene } from './kart-scene';
import { el } from '../site/dom';
import type { Mounted } from '../site/types';
import type { Sfx } from './sfx';

export interface DrillTick {
  events: FurnitureEvents;
  step: KartStepResult;
  /** Laps completed so far. */
  lap: number;
  /** Coins currently held, straight from the track run. */
  coins: number;
  /** How far off the racing line, when one was supplied. Null otherwise. */
  line: LineError | null;
  /** Drift state this tick, when drifting is enabled. Null otherwise. */
  drift: DriftResult | null;
}

export interface DrillApi {
  /** Add to the score. The only way the number moves. */
  add(amount?: number): void;
  /** Set the score outright. Chapter 5 uses this — coins can go down as well as up. */
  set(value: number): void;
  score(): number;
  /** End the drill and show the result card. */
  finish(): void;
  /** Say something over the stage for a moment. */
  say(text: string, tone?: 'good' | 'bad' | 'neutral'): void;
}

export interface KartDrillOptions {
  mount: HTMLElement;
  sfx: Sfx;

  /** Track furniture for this chapter. */
  layout: FurnitureSpec[];
  /** Defaults to the Phase 1 test circuit, which every drill has been tuned against. */
  control?: Array<{ x: number; y: number }>;
  halfWidth?: number;

  /** One line, always on screen: what she is being asked to do. */
  goal: string;
  /** What the counter counts, e.g. "tricks". Shown beside the number. */
  unit: string;
  /**
   * Override the counter's wording. Defaults to `score / target unit`, which is right for the
   * drills that count things and wrong for Chapter 5, where the score is a percentage and
   * "62 / 100 % on the line" reads like a fraction of a percentage.
   */
  format?: (score: number, target: number, unit: string) => string;
  /** Reaching this ends the drill. */
  target: number;
  /** Laps allowed before it ends anyway. Generous — nothing here is a time trial. */
  laps?: number;
  /** Key hint for the bar. */
  keys?: string;

  /**
   * Paint a racing line on the road and report how far off it the kart is. Chapter 5 only.
   *
   * Passed as a whole {@link RacingLine} rather than as a bare function so the drill can both
   * draw it and measure against it from one source — a scene painting one line while the scorer
   * measured a different one is the sort of bug that reads as "the drill is unfair".
   */
  racingLine?: RacingLine;

  /**
   * Enable drifting: hop plus a held steer starts one, sparks charge, releasing pays a boost.
   * Chapter 6 only — the other drills share the hop key for tricks and must never start a drift
   * they do not know about, which is why this is opt-in rather than always on.
   */
  drift?: boolean;

  /** Called every sim tick. Where a chapter decides what counts. */
  onTick: (tick: DrillTick, api: DrillApi) => void;
  /** Called when the drill ends, with the final score. */
  onFinish: (score: number) => void;
  /** Result copy. Gets the score and how many laps it took. */
  verdict: (score: number) => { title: string; detail: string };
}

export function createKartDrill(options: KartDrillOptions): Mounted {
  const {
    mount,
    sfx,
    layout,
    control = TEST_TRACK_CONTROL,
    halfWidth = TEST_TRACK_HALF_WIDTH,
    goal,
    unit,
    target,
    laps = 2,
    keys = 'Arrow keys to steer · Space to hop',
    format = (score, max, label) => `${score} / ${max} ${label}`,
    racingLine,
    drift: driftEnabled = false,
    onTick,
    onFinish,
    verdict,
  } = options;

  // --- world ---------------------------------------------------------------

  const path = buildLoopPath(control);
  const surface = createPathSurface(path, halfWidth);
  const items = placeFurniture(path, layout);
  const track = new TrackRun(items);
  surface.groundHeightAt = track.groundHeightAt;

  const kart = createKart(surface.startPose.x, surface.startPose.y, surface.startPose.heading);
  const input = new Input();
  const chase = new ChaseCamera();
  const drift = createDrift();
  const driftConfig = { ...DRIFT_CONFIG };

  const kartConfig = { ...KART_CONFIG };
  const cameraConfig = { ...CHASE_CAMERA_CONFIG };
  const assistConfig = { ...STEER_ASSIST_CONFIG };
  const trackConfig = { ...TRACK_CONFIG };

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

  // --- DOM -----------------------------------------------------------------

  const canvas = el('canvas');
  const stage = el('div', { class: 'drill-stage' }, canvas);

  const goalText = el('span', null, goal);
  const counter = el('span', { class: 'ms' }, format(0, target, unit));
  const lapText = el('span', { class: 'ms' }, `lap 1 / ${laps}`);
  const toast = el('div', {
    class: 'drill-toast',
    style: {
      position: 'absolute',
      left: '50%',
      top: '14%',
      transform: 'translateX(-50%)',
      padding: '0.5em 1em',
      borderRadius: '999px',
      fontFamily: 'var(--display)',
      fontWeight: '600',
      background: 'rgba(20,24,32,0.82)',
      color: '#fff',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.18s ease',
    },
  });
  stage.append(toast);

  const resultTitle = el('h3');
  const resultDetail = el('p');
  const again = el('button', { class: 'btn', type: 'button' }, 'Try it again');
  const result = el(
    'div',
    { class: 'drill-result' },
    resultTitle,
    resultDetail,
    el(
      'div',
      { style: { display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' } },
      again,
    ),
  );
  result.hidden = true;
  stage.append(result);

  const bar = el(
    'div',
    { class: 'drill-bar' },
    goalText,
    counter,
    lapText,
    el('span', { class: 'drill-keys' }, keys),
  );

  const root = el('div', { class: 'drill' }, stage, bar);
  mount.replaceChildren(root);

  const view = createKartScene(
    canvas,
    surface,
    path,
    items,
    racingLine ? { racingLine: (t) => racingLine.offsetAt(t) } : {},
  );

  // --- state ---------------------------------------------------------------

  let score = 0;
  let lap = 1;
  let running = true;
  let lastIndex = 0;
  let toastUntil = 0;
  /** Last hop press, whether or not still held. Tricks are taps; live key state misses them. */
  let lastHopAt: number | null = null;
  let driftTier: 'none' | 'blue' | 'orange' = 'none';
  let driftSide = 0;
  /** When the drift hop started, for the renderer's bounce. Null when there is none. */
  let hopAt: number | null = null;

  function refresh(): void {
    counter.textContent = format(score, target, unit);
    lapText.textContent = `lap ${Math.min(lap, laps)} / ${laps}`;
  }

  function end(): void {
    if (!running) return;
    running = false;
    const copy = verdict(score);
    resultTitle.textContent = copy.title;
    resultDetail.textContent = copy.detail;
    result.hidden = false;
    again.focus();
    onFinish(score);
  }

  const api: DrillApi = {
    add(amount = 1) {
      score += amount;
      refresh();
      if (score >= target) end();
    },
    set(value) {
      score = value;
      refresh();
    },
    score: () => score,
    finish: end,
    say(text, tone = 'neutral') {
      toast.textContent = text;
      toast.style.opacity = '1';
      toast.style.background =
        tone === 'good'
          ? 'rgba(63,163,70,0.92)'
          : tone === 'bad'
            ? 'rgba(232,69,60,0.92)'
            : 'rgba(20,24,32,0.82)';
      toastUntil = performance.now() + 1200;
    },
  };

  function restart(): void {
    resetKart(kart, surface.startPose.x, surface.startPose.y, surface.startPose.heading);
    track.reset();
    chase.reset(
      {
        x: kart.x,
        y: kart.y,
        heading: kart.heading,
        steerAmount: 0,
        speed: 0,
        maxSpeed: kartConfig.maxSpeed,
      },
      cameraConfig,
    );
    score = 0;
    lap = 1;
    lastIndex = 0;
    lastHopAt = null;
    resetDrift(drift);
    driftTier = 'none';
    driftSide = 0;
    running = true;
    result.hidden = true;
    refresh();
    canvas.focus();
  }

  again.addEventListener('click', restart);

  // --- loop ----------------------------------------------------------------

  function update(dt: number): void {
    input.sample();
    const now = performance.now();

    if (input.justPressed('hop')) lastHopAt = now;

    if (!running) return;

    // Drifting is stepped before the kart, because its yaw is an input to the same physics tick.
    // `assistYaw` is the seam: `stepKart` adds it to the player's steering without touching the
    // velocity vector, and heading rotating faster than the kart is travelling *is* the slide.
    let driftResult: DriftResult | null = null;
    if (driftEnabled) {
      driftResult = stepDrift(
        drift,
        driftConfig,
        {
          steer: input.steer(),
          held: input.isDown('hop'),
          hopped: input.justPressed('hop'),
          speed: last.speed,
          airborne: last.airborne,
        },
        dt,
      );
      if (driftResult.boost > 0) {
        kart.boostRemaining = Math.max(kart.boostRemaining, driftResult.boost);
        sfx.play('boost');
      }
      // The hop. (Riggs, 2026-08-12: he could feel the boost but could not see the drift start.)
      // Purely visual — it lifts the kart in the renderer and never touches `altitude`, because a
      // genuinely airborne kart has no grip and would slide out of the drift it is beginning.
      if (driftResult.started) hopAt = now;
    }

    // While a drift is running it owns the steering: `stepKart` gets zero input and the arc
    // arrives as assist yaw.
    //
    // The steer assist is turned down rather than off. Off is the principled answer — a drift is a
    // commitment, and the assist exists to fight exactly the sort of sideways travel a drift is
    // made of — but the first build of this drove her straight off the road and into the grass the
    // moment she committed, which is not the lesson. A third of the usual correction is enough to
    // keep a badly-aimed drift on the tarmac without ever pulling the kart straight.
    const slide = driftResult?.overrideSteering === true ? driftResult : null;
    const DRIFT_ASSIST = 0.34;
    const assist = computeSteerAssist(kart, path, surface.halfWidth, assistConfig);
    const config = slide
      ? { ...kartConfig, grip: kartConfig.grip * slide.gripScale }
      : kartConfig;

    last = stepKart(
      kart,
      config,
      slide ? 0 : input.steer(),
      surface,
      dt,
      slide ? slide.yaw + assist.yawRate * DRIFT_ASSIST : assist.yawRate,
    );

    const events = track.update(
      kart,
      trackConfig,
      { now, hopJustPressed: input.justPressed('hop'), lastHopAt },
      last,
    );

    if (events.coinsCollected > 0) sfx.play('coin');

    // Measured before the lap bookkeeping below, so the tick that crosses the start line still
    // reports where the kart actually is rather than being skipped.
    const line = racingLine ? lineError(racingLine, path, kart.x, kart.y) : null;

    // Lap counting off the centreline index. The kart passes the start when its nearest sample
    // wraps from the end of the array back to the beginning; a plain "is it near the start
    // point" test fires several times as it drives through.
    const projected = projectToPath(path, kart.x, kart.y);
    if (projected) {
      const index = projected.point.index;
      const count = path.points.length;
      if (lastIndex > count * 0.75 && index < count * 0.25) {
        lap++;
        if (lap > laps) {
          onTick({ events, step: last, lap, coins: track.coins, line, drift: driftResult }, api);
          end();
          return;
        }
      }
      lastIndex = index;
    }

    onTick({ events, step: last, lap, coins: track.coins, line, drift: driftResult }, api);

    // Stashed for the renderer, which runs on its own clock and cannot re-derive them.
    if (driftEnabled) {
      driftTier = driftResult?.tier ?? 'none';
      driftSide = drift.direction;
    }
  }

  function render(alpha: number, stats: LoopStats): void {
    const dt = stats.frameMs / 1000;
    const now = performance.now();
    const time = now / 1000;

    if (toastUntil > 0 && now > toastUntil) {
      toast.style.opacity = '0';
      toastUntil = 0;
    }

    const poseX = lerp(kart.prevX, kart.x, alpha);
    const poseY = lerp(kart.prevY, kart.y, alpha);
    const poseHeading = lerpAngle(kart.prevHeading, kart.heading, alpha);
    let poseAltitude = lerp(kart.prevAltitude, kart.altitude, alpha);

    // A quarter-second bounce as a drift begins. Half a sine so it goes up and comes back down
    // once, rather than oscillating.
    const HOP_MS = 260;
    if (hopAt !== null) {
      const elapsed = now - hopAt;
      if (elapsed >= HOP_MS) hopAt = null;
      else poseAltitude += Math.sin((elapsed / HOP_MS) * Math.PI) * 0.7;
    }

    view.kart.position.set(poseX, poseAltitude, poseY);
    view.kart.rotation.y = -poseHeading;
    view.syncFurniture(items, time);
    view.setBoosting(kart.boostRemaining > 0, time);
    view.setSparks(driftTier, driftSide, time);
    view.syncKart(last.speed, poseAltitude, kart.steerAmount, dt);

    chase.update(
      view.camera,
      {
        x: poseX,
        y: poseY,
        heading: poseHeading,
        steerAmount: kart.steerAmount,
        speed: last.speed,
        maxSpeed: kartConfig.maxSpeed,
      },
      cameraConfig,
      dt,
    );

    view.render();
  }

  function size(): void {
    view.resize(canvas.clientWidth, canvas.clientHeight);
  }

  const loop = new Loop({ update, render });

  size();
  window.addEventListener('resize', size);
  refresh();
  loop.start();

  return {
    dispose() {
      loop.stop();
      loop.dispose();
      input.dispose();
      view.dispose();
      window.removeEventListener('resize', size);
      root.remove();
    },
  };
}
