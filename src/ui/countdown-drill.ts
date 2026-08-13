/**
 * Countdown-and-hold drill. (1c1)
 *
 * The start boost, and the only place in the whole site where an accelerate input exists —
 * Jodi drives with auto-accelerate, so holding the button is meaningless everywhere except
 * here, where the real game rewards it anyway. Riggs confirmed that in-game, which is why
 * Chapter 1 exists at all.
 *
 * Plain DOM, per the tech decisions. Nothing here needs a canvas, and DOM means the same
 * component can carry Chapter 1's copy and styling without being rebuilt.
 *
 * **The teaching device is the timeline, not the number.** "You were 180ms early" tells you
 * how badly you did; a bar showing your press sitting just outside a green band tells you
 * which way to move next time. Jodi gets no feedback at all on the Switch, so the browser has
 * to build the instinct that the real game will only ever confirm.
 */

import type { Input } from '../engine/input';

export type CountdownGrade = 'perfect' | 'boost' | 'early' | 'late' | 'released' | 'none';

// A type alias, not an interface, so it satisfies the tuning panel's index-signature constraint.
export type CountdownConfig = {
  /** Gap between 3, 2, 1 and GO. The real game runs about a second a step. */
  stepMs: number;
  /** How far either side of the moment still earns a boost. */
  windowMs: number;
  /** Inside this, it is a perfect start. */
  perfectMs: number;
  /** Whether letting go before GO throws the boost away, as it does in the real game. */
  requireHold: boolean;
};

/**
 * Generous by default, per the plan's "concepts, not grinding" rule. The tight preset exists
 * to prove the window can be tightened, not because Jodi should ever meet it.
 */
export const COUNTDOWN_CONFIG: CountdownConfig = {
  stepMs: 1000,
  windowMs: 260,
  perfectMs: 90,
  requireHold: true,
};

export const COUNTDOWN_PRESETS = {
  generous: { windowMs: 320, perfectMs: 120 },
  medium: { windowMs: 200, perfectMs: 80 },
  tight: { windowMs: 110, perfectMs: 45 },
} as const;

export interface CountdownResult {
  grade: CountdownGrade;
  /** Press time relative to the ideal moment, ms. Negative is early. Null if never pressed. */
  errorMs: number | null;
}

const VERDICTS: Record<CountdownGrade, { title: string; detail: string }> = {
  perfect: { title: 'PERFECT START', detail: 'That is the one. Exactly as the 2 disappears.' },
  boost: { title: 'BOOST!', detail: 'You got it.' },
  early: {
    title: 'Too early',
    detail: 'Hold on the 2, not before it. Early just burns the tyres.',
  },
  late: { title: 'Too late', detail: 'A moment sooner — start holding as the 2 vanishes.' },
  released: { title: 'You let go', detail: 'Keep holding all the way through GO.' },
  none: { title: 'No start', detail: 'Hold the key as the 2 disappears.' },
};

export interface CountdownOptions {
  mount: HTMLElement;
  input: Input;
  config: CountdownConfig;
  onResult?: ((result: CountdownResult) => void) | undefined;
}

export class CountdownDrill {
  private readonly mount: HTMLElement;
  private readonly input: Input;
  private readonly config: CountdownConfig;
  private readonly onResult: ((result: CountdownResult) => void) | undefined;

  private readonly numeral: HTMLDivElement;
  private readonly readyNote: HTMLDivElement;
  private readonly lamps: HTMLDivElement[] = [];
  private readonly verdict: HTMLDivElement;
  private readonly verdictDetail: HTMLDivElement;
  private readonly marker: HTMLDivElement;
  private readonly windowBand: HTMLDivElement;
  private readonly perfectBand: HTMLDivElement;
  private readonly timeline: HTMLDivElement;

  private running = false;
  private startedAt = 0;
  private pressedAt: number | null = null;
  private heldAtGo = false;
  private resolved = false;
  private rafId: number | null = null;

  /** Between goes: the loop keeps sampling, but only to watch for "I am ready". */
  private armed = false;
  /** Set once the key has been seen up since arming. See {@link arm}. */
  private releasedSinceArm = false;

  constructor(options: CountdownOptions) {
    this.mount = options.mount;
    this.input = options.input;
    this.config = options.config;
    this.onResult = options.onResult;

    const root = document.createElement('div');
    root.className = 'countdown';

    const lights = document.createElement('div');
    lights.className = 'countdown-lights';
    for (let i = 0; i < 3; i++) {
      const lamp = document.createElement('div');
      lamp.className = 'countdown-lamp';
      lights.append(lamp);
      this.lamps.push(lamp);
    }

    this.numeral = document.createElement('div');
    this.numeral.className = 'countdown-numeral';
    this.numeral.textContent = 'Ready';

    this.readyNote = document.createElement('div');
    this.readyNote.className = 'countdown-ready';
    this.readyNote.hidden = true;

    this.verdict = document.createElement('div');
    this.verdict.className = 'countdown-verdict';

    this.verdictDetail = document.createElement('div');
    this.verdictDetail.className = 'countdown-detail';

    // The timeline runs from the moment "2" appears to GO, so the whole decision is on screen.
    this.timeline = document.createElement('div');
    this.timeline.className = 'countdown-timeline';

    this.windowBand = document.createElement('div');
    this.windowBand.className = 'countdown-window';

    this.perfectBand = document.createElement('div');
    this.perfectBand.className = 'countdown-perfect';

    const idealLine = document.createElement('div');
    idealLine.className = 'countdown-ideal';

    this.marker = document.createElement('div');
    this.marker.className = 'countdown-marker';
    this.marker.hidden = true;

    this.timeline.append(this.windowBand, this.perfectBand, idealLine, this.marker);

    const scale = document.createElement('div');
    scale.className = 'countdown-scale';
    for (const label of ['2', '1', 'GO']) {
      const tick = document.createElement('span');
      tick.textContent = label;
      scale.append(tick);
    }

    root.append(
      lights,
      this.numeral,
      this.verdict,
      this.verdictDetail,
      this.timeline,
      scale,
      this.readyNote,
    );
    this.mount.append(root);

    this.layoutTimeline();
  }

  /** Ideal press: the instant the "2" gives way to the "1". */
  private get idealMs(): number {
    return this.config.stepMs * 2;
  }

  private get timelineStart(): number {
    return this.config.stepMs;
  }

  private get timelineEnd(): number {
    return this.config.stepMs * 3;
  }

  private toPercent(ms: number): number {
    const span = this.timelineEnd - this.timelineStart;
    return ((ms - this.timelineStart) / span) * 100;
  }

  /** Redraw the bands, so changing the window on the tuning panel is visible immediately. */
  layoutTimeline(): void {
    const place = (element: HTMLDivElement, halfWidth: number): void => {
      const left = this.toPercent(this.idealMs - halfWidth);
      const right = this.toPercent(this.idealMs + halfWidth);
      element.style.left = `${left}%`;
      element.style.width = `${right - left}%`;
    };
    place(this.windowBand, this.config.windowMs);
    place(this.perfectBand, this.config.perfectMs);
  }

  /**
   * Hold, and run the next countdown when she says so. (Riggs, 2026-08-12.)
   *
   * Katharine could not read the verdict after a miss: Chapter 1 used to wait 1.7 seconds and then
   * relaunch, so the one sentence explaining *which way* she was wrong was gone before she had
   * finished it — on a drill whose entire teaching device is that sentence. A fixed delay cannot
   * be right anyway; it is either too short to read or too long to sit through, and which one
   * depends on whether she already knew what went wrong.
   *
   * So the verdict, the detail and the marker all stay exactly where they are, for as long as she
   * likes, and the next go starts on a key. Either accelerate or confirm will do — {@link Input}
   * calls preventDefault on both Space and Enter while it is alive, so neither a button nor the
   * usual keyboard affordances can be used here, and the gate has to be read off the input layer
   * itself.
   */
  arm(message: string): void {
    this.stopLoop();
    this.armed = true;
    // She is almost certainly still holding the key from the go that just ended. Requiring a
    // release first is what stops the next countdown launching under her finger — which would be
    // the auto-advance all over again, only faster.
    this.releasedSinceArm = false;
    this.readyNote.textContent = message;
    this.readyNote.hidden = false;
    this.numeral.textContent = 'Ready';

    this.running = true;
    this.rafId = requestAnimationFrame(this.frame);
  }

  start(): void {
    this.stopLoop();
    this.running = true;
    this.armed = false;
    this.readyNote.hidden = true;
    this.resolved = false;
    this.pressedAt = null;
    this.heldAtGo = false;
    this.startedAt = performance.now();

    this.verdict.textContent = '';
    this.verdict.dataset.grade = '';
    this.verdictDetail.textContent = '';
    this.marker.hidden = true;
    for (const lamp of this.lamps) lamp.dataset.on = 'false';
    this.layoutTimeline();

    this.rafId = requestAnimationFrame(this.frame);
  }

  dispose(): void {
    this.stopLoop();
  }

  private stopLoop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.running = false;
  }

  private frame = (): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.frame);

    this.input.sample();

    // Parked between goes, waiting for her. Nothing on screen changes until she asks it to.
    if (this.armed) {
      if (!this.input.isDown('accelerate') && !this.input.isDown('uiConfirm')) {
        this.releasedSinceArm = true;
      }
      const asked = this.input.justPressed('accelerate') || this.input.justPressed('uiConfirm');
      if (this.releasedSinceArm && asked) this.start();
      return;
    }

    const elapsed = performance.now() - this.startedAt;

    // Record the first press only. Mashing should not let you find the window by accident.
    if (this.pressedAt === null && this.input.justPressed('accelerate')) {
      this.pressedAt = elapsed;
    }

    const step = this.config.stepMs;
    const lit = Math.min(3, Math.floor(elapsed / step) + 1);
    for (let i = 0; i < this.lamps.length; i++) {
      const lamp = this.lamps[i];
      if (lamp) lamp.dataset.on = String(i < lit);
    }

    if (elapsed < step) this.numeral.textContent = '3';
    else if (elapsed < step * 2) this.numeral.textContent = '2';
    else if (elapsed < step * 3) this.numeral.textContent = '1';
    else this.numeral.textContent = 'GO!';

    if (!this.resolved && elapsed >= step * 3) {
      this.heldAtGo = this.input.isDown('accelerate');
      this.resolve();
    }

    // Keep running a moment past GO so a very late press still gets told it was late rather
    // than being silently dropped.
    if (elapsed > step * 3 + 700) this.stopLoop();
  };

  private resolve(): void {
    this.resolved = true;
    const result = this.grade();

    const verdict = VERDICTS[result.grade];
    this.verdict.textContent = verdict.title;
    this.verdict.dataset.grade = result.grade;
    this.verdictDetail.textContent = verdict.detail;

    if (result.errorMs !== null && this.pressedAt !== null) {
      this.marker.hidden = false;
      this.marker.style.left = `${Math.max(0, Math.min(100, this.toPercent(this.pressedAt)))}%`;
      const sign = result.errorMs > 0 ? '+' : '';
      this.marker.dataset.label = `${sign}${result.errorMs.toFixed(0)} ms`;
    }

    this.onResult?.(result);
  }

  private grade(): CountdownResult {
    if (this.pressedAt === null) {
      // Holding from before the lights is not "no start" — it is the earliest start there is, and
      // saying "you never pressed" to someone with their finger on the key is just baffling. This
      // is reachable now that a go begins on a keypress: tap to start, forget to let go, and the
      // key is already down when the 3 appears.
      return this.heldAtGo
        ? { grade: 'early', errorMs: -this.idealMs }
        : { grade: 'none', errorMs: null };
    }

    const errorMs = this.pressedAt - this.idealMs;
    const distance = Math.abs(errorMs);

    // Letting go is judged before accuracy: a perfectly timed press you did not hold is still
    // no boost in the real game, and being told "perfect" would teach the wrong thing.
    if (this.config.requireHold && !this.heldAtGo && distance <= this.config.windowMs) {
      return { grade: 'released', errorMs };
    }
    if (distance <= this.config.perfectMs) return { grade: 'perfect', errorMs };
    if (distance <= this.config.windowMs) return { grade: 'boost', errorMs };
    return { grade: errorMs < 0 ? 'early' : 'late', errorMs };
  }
}
