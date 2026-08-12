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
  /** Reaching this ends the drill. */
  target: number;
  /** Laps allowed before it ends anyway. Generous — nothing here is a time trial. */
  laps?: number;
  /** Key hint for the bar. */
  keys?: string;

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
  const counter = el('span', { class: 'ms' }, `0 / ${target} ${unit}`);
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

  const view = createKartScene(canvas, surface, path, items);

  // --- state ---------------------------------------------------------------

  let score = 0;
  let lap = 1;
  let running = true;
  let lastIndex = 0;
  let toastUntil = 0;
  /** Last hop press, whether or not still held. Tricks are taps; live key state misses them. */
  let lastHopAt: number | null = null;

  function refresh(): void {
    counter.textContent = `${score} / ${target} ${unit}`;
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

    const assist = computeSteerAssist(kart, path, surface.halfWidth, assistConfig);
    last = stepKart(kart, kartConfig, input.steer(), surface, dt, assist.yawRate);

    const events = track.update(
      kart,
      trackConfig,
      { now, hopJustPressed: input.justPressed('hop'), lastHopAt },
      last,
    );

    if (events.coinsCollected > 0) sfx.play('coin');

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
          onTick({ events, step: last, lap, coins: track.coins }, api);
          end();
          return;
        }
      }
      lastIndex = index;
    }

    onTick({ events, step: last, lap, coins: track.coins }, api);
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
    const poseAltitude = lerp(kart.prevAltitude, kart.altitude, alpha);

    view.kart.position.set(poseX, poseAltitude, poseY);
    view.kart.rotation.y = -poseHeading;
    view.syncFurniture(items, time);
    view.setBoosting(kart.boostRemaining > 0, time);
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
