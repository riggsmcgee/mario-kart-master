/**
 * Shield Up, as a component. (2b3 mounts it; the piece itself is 1e1.)
 *
 * The 1e1 harness was a laboratory: fourteen tuning sliders, a telemetry table, a running log of
 * every threat, and R to reset. All of that existed to answer gate 1e2 — is the threat legible,
 * does the habit form — and none of it belongs in Chapter 2. A row of sliders beside a driving
 * game is an invitation to adjust the numbers instead of learning the lesson, and a reset hidden
 * on a keyboard shortcut is a reset that only its author can find. What crosses over is the
 * drill: a kart, item boxes, a siren, and a banana that is either behind you or it is not.
 *
 * **Item boxes and nothing else on the track.** The harness reused the kart piece's whole world,
 * ramps and dash panels and coin lines included, because it cost nothing to do so. Here it costs
 * something: Chapter 2 runs *before* Chapter 3 and Chapter 4, so a ramp is a question she has not
 * been taught the answer to and a dash panel is a second thing to think about during a drill
 * about one button. Twelve boxes, four rows of three, roughly a quarter-lap apart, so being
 * caught empty-handed is never more than a few seconds of driving away from being fixed.
 *
 * **It ends when the threats run out, not when she does well.** The chapter's star rule scores
 * how many of a fixed set she blocked, which means the drill always reaches its own ending —
 * the plan's "every interactive ends on a win", made structural rather than hoped for.
 *
 * **On the result card.** The drill draws its own ending and *then* calls `onFinish`. A caller
 * that swaps the drill out immediately (Chapter 2 does, for the quiz) is expected to carry the
 * verdict itself; the card is here so the component is never a thing that just stops, and so a
 * second go exists for anyone who wants one before moving on.
 *
 * **Disposal is not optional**, for the same reason it is not optional in `kart-drill.ts`: this
 * owns a WebGL context, a requestAnimationFrame loop, window key listeners, an AudioContext and
 * a subscription to the site's mute setting, and the course is one page she moves around all
 * evening.
 */

import { Input } from '../engine/input';
import { Loop, lerp, lerpAngle, type LoopStats } from '../engine/loop';
import { KART_CONFIG, createKart, resetKart, stepKart, type KartStepResult } from '../engine/kart';
import { createPathSurface } from '../engine/path-surface';
import { bendAhead, buildLoopPath, placeFurniture, projectToPath } from '../engine/track';
import {
  TEST_TRACK_CONTROL,
  TEST_TRACK_HALF_WIDTH,
  TEST_TRACK_ITEM_BOXES,
} from '../data/test-track';
import { STEER_ASSIST_CONFIG, computeSteerAssist } from '../engine/steer-assist';
import { ChaseCamera, CHASE_CAMERA_CONFIG } from '../engine/chase-camera';
import {
  SHIELD_CONFIG,
  ShieldRun,
  type ShieldOutcome,
  type ShieldResolution,
} from '../engine/shield';
import { createKartScene } from './kart-scene';
import { ShieldHud } from './shield-hud';
import { Beeper } from './beeps';
import { el } from '../site/dom';
import type { Mounted } from '../site/types';
import type { Sfx } from './sfx';
import './shield.css';

export interface ShieldDrillOptions {
  mount: HTMLElement;
  sfx: Sfx;
  /** How many threats have to resolve before the drill ends. */
  target: number;
  /** Called once, with how many of them she blocked. */
  onFinish: (blocked: number) => void;
}

/**
 * What each ending means, in her words.
 *
 * Every one of them names the *cause*, because the four outcomes are four different mistakes and
 * "you got hit" teaches none of them apart. The rule underneath is Riggs's, 2026-08-11: a
 * locked-on shell does not miss, so there is never a fifth outcome where not holding worked out.
 */
const VERDICTS: Record<
  ShieldOutcome,
  { title: string; detail: string; tone: 'good' | 'bad' | 'neutral' }
> = {
  blocked: {
    title: 'BLOCKED',
    detail: 'The banana took the hit instead of you. That is the whole habit.',
    tone: 'good',
  },
  dropped: {
    title: 'YOU LET GO',
    detail:
      'The banana was behind you and then it was on the road, and a locked-on shell does not miss. Keep holding until it hits.',
    tone: 'bad',
  },
  hit: {
    title: 'HIT',
    detail:
      'A banana in your hands the whole time. Hold the item key the moment the siren starts — it costs you nothing.',
    tone: 'bad',
  },
  unarmed: {
    title: 'HIT',
    detail: 'Nothing to defend yourself with. Drive through an item box and pick one up.',
    tone: 'neutral',
  },
};

/** Whole turns a spin-out makes. Whole, so the kart finishes pointing where it started. */
const SPIN_TURNS = 2;

export function createShieldDrill(options: ShieldDrillOptions): Mounted {
  const { mount, sfx, target, onFinish } = options;

  // --- world ---------------------------------------------------------------

  const path = buildLoopPath(TEST_TRACK_CONTROL);
  const surface = createPathSurface(path, TEST_TRACK_HALF_WIDTH);
  const items = placeFurniture(path, TEST_TRACK_ITEM_BOXES);

  const kart = createKart(surface.startPose.x, surface.startPose.y, surface.startPose.heading);
  const input = new Input();
  const chase = new ChaseCamera();
  const shield = new ShieldRun(items.filter((item) => item.kind === 'box'));
  const beeper = new Beeper();

  const kartConfig = { ...KART_CONFIG };
  const cameraConfig = { ...CHASE_CAMERA_CONFIG };
  const assistConfig = { ...STEER_ASSIST_CONFIG };
  const shieldConfig = { ...SHIELD_CONFIG };

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

  // The HUD goes over the canvas, never under it. The threat arrives from behind, where there is
  // nothing to see, so the warning is the only thing that says it exists — printed below the
  // picture it would train her to look away from the road to find out whether she is about to
  // be hit, which is precisely the habit this drill is trying to replace.
  const hud = new ShieldHud(stage);

  const resultTitle = el('h3');
  const resultDetail = el('p');
  const again = el('button', { class: 'btn', type: 'button' }, 'Try it again');
  const result = el('div', { class: 'drill-result' }, resultTitle, resultDetail, again);
  result.hidden = true;
  stage.append(result);

  const counter = el('span', { class: 'ms' });
  const threatCount = el('span', { class: 'ms' });
  const restart = el(
    'button',
    { class: 'btn', type: 'button', style: { fontSize: '0.9rem', padding: '0.5em 1.1em' } },
    'Start over',
  );

  const bar = el(
    'div',
    { class: 'drill-bar' },
    el('span', null, 'Hold the item key the moment the siren starts'),
    counter,
    threatCount,
    el('span', { class: 'drill-keys' }, 'Arrow keys to steer · hold Shift for the banana'),
    restart,
  );

  const root = el('div', { class: 'drill' }, stage, bar);
  mount.replaceChildren(root);

  const view = createKartScene(canvas, surface, path, items);

  // --- state ---------------------------------------------------------------

  let resolved = 0;
  let running = true;
  /** Next siren pip. The gap shortens as the threat closes — a parking sensor, essentially. */
  let nextPipAt = 0;
  /** When the last resolution burst started, for the expanding ring. */
  let burstAt = 0;
  let burstHit = false;

  function refresh(): void {
    counter.textContent = `${shield.blocked} / ${target} blocked`;
    threatCount.textContent = `threat ${Math.min(resolved + 1, target)} of ${target}`;
  }

  /**
   * The closing line. Warm at every score, and never a scolding: the ways to be hit here are
   * having nothing in hand or having something and not holding it, and both are fixed by the
   * same free action, so the honest note to end on is "hold it sooner" rather than "try harder".
   */
  function verdict(blocked: number): { title: string; detail: string } {
    if (blocked >= target) {
      return {
        title: 'NOT A SCRATCH',
        detail: `${target} shells, ${target} bananas, and not one of them touched you. That is one button, held.`,
      };
    }
    if (blocked * 3 >= target * 2) {
      return {
        title: 'MOSTLY ARMOURED',
        detail: `Blocked ${blocked} of ${target}. The ones that got through were the ones where your hands were empty or the button was not down. Nothing else can reach you.`,
      };
    }
    if (blocked * 3 >= target) {
      return {
        title: 'GETTING THERE',
        detail: `Blocked ${blocked} of ${target}. Try holding before the siren rather than after it — carrying a banana costs you nothing at all, so there is no moment when letting go is the better idea.`,
      };
    }
    return {
      title: 'NOW YOU KNOW WHY',
      detail: `Blocked ${blocked} of ${target}. This is not a reaction test. Hold the item key the whole way round, keep an eye out for boxes, and the shells simply stop landing.`,
    };
  }

  function end(): void {
    if (!running) return;
    running = false;
    const copy = verdict(shield.blocked);
    resultTitle.textContent = copy.title;
    resultDetail.textContent = copy.detail;
    result.hidden = false;
    onFinish(shield.blocked);
  }

  function reset(): void {
    resetKart(kart, surface.startPose.x, surface.startPose.y, surface.startPose.heading);
    shield.reset(performance.now(), shieldConfig);
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
    resolved = 0;
    burstAt = 0;
    nextPipAt = 0;
    running = true;
    result.hidden = true;
    refresh();
  }

  again.addEventListener('click', reset);
  restart.addEventListener('click', reset);

  function announce(resolution: ShieldResolution): void {
    const copy = VERDICTS[resolution.outcome];
    const detail =
      resolution.outcome === 'blocked' && resolution.leadMs !== null
        ? `Out behind you ${resolution.leadMs.toFixed(0)} ms before it arrived. ${copy.detail}`
        : copy.detail;
    hud.say(copy.title, detail, copy.tone, resolution.struck ? 2400 : 2000);
  }

  // --- loop ----------------------------------------------------------------

  function update(dt: number): void {
    input.sample();
    if (!running) return;

    const now = performance.now();

    const assist = computeSteerAssist(kart, path, surface.halfWidth, assistConfig);
    last = stepKart(kart, kartConfig, input.steer(), surface, dt, assist.yawRate);

    // Threats wait for a straight. Being asked to hold a key and survive a hairpin at the same
    // time tests two things at once and teaches neither.
    const projected = projectToPath(path, kart.x, kart.y);
    const clearRoad = projected ? bendAhead(path, projected.point) <= shieldConfig.maxBend : true;

    const events = shield.update(shieldConfig, {
      now,
      holding: input.isDown('item'),
      x: kart.x,
      y: kart.y,
      heading: kart.heading,
      clearRoad,
    });

    if (events.warned) nextPipAt = now;
    if (events.gotItem) beeper.play('item');
    if (events.droppedItem) beeper.play('drop');

    // Pips speed up as it closes. Sound is what lets the warning reach her while she is looking
    // at the road, which is where this drill wants her eyes.
    const progress = shield.progress(now, shieldConfig);
    if (progress !== null && now >= nextPipAt) {
      beeper.play(progress > 0.55 ? 'urgent' : 'warn');
      nextPipAt = now + 460 - progress * 330;
    }

    if (events.resolved) {
      announce(events.resolved);
      burstAt = now;
      burstHit = events.resolved.struck;
      beeper.play(events.resolved.struck ? 'hit' : 'block');

      if (events.resolved.struck) {
        // One hit, one cost. Bleeding speed every tick of the spin would turn a knock into a stop.
        kart.vx *= shieldConfig.spinSpeedKeep;
        kart.vy *= shieldConfig.spinSpeedKeep;
        kart.boostRemaining = 0;
      }

      resolved++;
      refresh();
      if (resolved >= target) end();
    }
  }

  function render(alpha: number, stats: LoopStats): void {
    const dt = stats.frameMs / 1000;
    const now = performance.now();
    const time = now / 1000;

    const poseX = lerp(kart.prevX, kart.x, alpha);
    const poseY = lerp(kart.prevY, kart.y, alpha);
    const poseHeading = lerpAngle(kart.prevHeading, kart.heading, alpha);
    const poseAltitude = lerp(kart.prevAltitude, kart.altitude, alpha);

    view.kart.position.set(poseX, poseAltitude, poseY);
    view.syncFurniture(items, time);
    view.setBoosting(kart.boostRemaining > 0, time);
    view.syncKart(last.speed, poseAltitude, kart.steerAmount, dt);

    // The banana is only *behind* the kart while the key is down. Unheld, it sits in the item
    // slot in the top-left corner, which is exactly the distinction the chapter is teaching.
    const covered = input.isDown('item') && shield.hasItem;
    view.setItem(covered, time);
    view.setDroppedItem(shield.dropped);
    view.setThreat(shield.approach(now, shieldConfig), time);

    const burst = (now - burstAt) / 420;
    view.setBurst(burstAt > 0 && burst < 1 ? burst : null, burstHit);

    // Spun by a hit: the kart keeps travelling but stops pointing where it is going, which is
    // both what the real game does and a cost she can see rather than read.
    const spin = shield.spinProgress(now, shieldConfig);
    view.kart.rotation.y = -poseHeading + (spin ?? 0) * Math.PI * 2 * SPIN_TURNS;

    hud.setWarning(shield.progress(now, shieldConfig));
    hud.setItem(covered ? 'up' : shield.hasItem ? 'ready' : 'empty');
    hud.update(now);

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

  // The pips answer to the site's mute button rather than to one of their own. A drill with a
  // private sound toggle is a drill she can mute the site and still be beeped by.
  const unsubscribe = sfx.onChange((muted) => {
    beeper.muted = muted;
  });

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
      hud.dispose();
      beeper.dispose();
      unsubscribe();
      window.removeEventListener('resize', size);
      root.remove();
    },
  };
}
