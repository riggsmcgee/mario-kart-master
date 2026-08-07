/**
 * Fixed-timestep game loop. (1a3)
 *
 * The sim advances in fixed steps (120Hz by default) regardless of display refresh, and the
 * renderer interpolates between the last two sim states. That split matters here for one
 * concrete reason: this project measures things in milliseconds — trick windows at a ramp lip
 * (1b3), the start-boost window (1c1), how long a shield was held (1e1). If the physics step
 * varied with frame rate, those numbers would mean something different on every machine, and
 * a tuned window would stop being tuned the moment Jodi's Mac dropped a frame.
 *
 * Usage: `update(dt, tick)` runs 0..n times per frame with a constant `dt`; `render(alpha)`
 * runs exactly once, where alpha is 0..1 between the previous and current sim state.
 */

export interface LoopStats {
  /** Smoothed frames per second over the recent window. */
  fps: number;
  /** Duration of the last displayed frame, in ms. */
  frameMs: number;
  /** Worst frame seen since the last {@link Loop.resetStats}, in ms. */
  longestFrameMs: number;
  /** Sim steps run during the last frame. Above 1 means the display is slower than the sim. */
  ticksLastFrame: number;
  /** Total sim steps since start. */
  ticks: number;
  /** Interpolation factor handed to the last render, 0..1. */
  alpha: number;
  /** Sim time discarded by the long-frame clamp, in ms. Non-zero means we fell behind. */
  droppedMs: number;
  simHz: number;
  running: boolean;
  paused: boolean;
}

export interface LoopOptions {
  /** Advance the sim by exactly `dt` seconds. Called 0..n times per frame. */
  update: (dt: number, tick: number) => void;
  /** Draw. `alpha` is how far between the previous and current sim state to interpolate. */
  render: (alpha: number, stats: LoopStats) => void;
  /** Sim steps per second. Default 120. */
  hz?: number;
  /**
   * Longest frame the sim will try to catch up on, in ms. Anything beyond this is discarded.
   * Without it, one slow frame queues extra steps, which makes the next frame slower, which
   * queues more steps — the spiral of death. Better to drop time than to lock up.
   */
  maxFrameMs?: number;
  /** Pause when the window loses focus or the tab is hidden. Default true. */
  pauseOnBlur?: boolean;
  /** Multiplier on sim time. 0.25 for slow-motion feel work; 1 is normal. */
  timeScale?: number;
}

const FPS_WINDOW = 60;

export class Loop {
  private readonly update: (dt: number, tick: number) => void;
  private readonly render: (alpha: number, stats: LoopStats) => void;
  private readonly maxFrameMs: number;
  private readonly pauseOnBlur: boolean;

  private stepMs: number;
  private timeScale: number;
  private accumulator = 0;
  private lastFrameAt = 0;
  private rafId: number | null = null;
  private manuallyPaused = false;
  private autoPaused = false;

  private readonly frameTimes: number[] = [];
  private frameCursor = 0;

  private stats: LoopStats;

  constructor(options: LoopOptions) {
    this.update = options.update;
    this.render = options.render;
    this.maxFrameMs = options.maxFrameMs ?? 250;
    this.pauseOnBlur = options.pauseOnBlur ?? true;
    this.timeScale = options.timeScale ?? 1;
    this.stepMs = 1000 / (options.hz ?? 120);

    this.stats = {
      fps: 0,
      frameMs: 0,
      longestFrameMs: 0,
      ticksLastFrame: 0,
      ticks: 0,
      alpha: 0,
      droppedMs: 0,
      simHz: 1000 / this.stepMs,
      running: false,
      paused: false,
    };

    if (this.pauseOnBlur) {
      window.addEventListener('blur', this.onBlur);
      window.addEventListener('focus', this.onFocus);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  // --- control -------------------------------------------------------------

  start(): void {
    if (this.rafId !== null) return;
    this.lastFrameAt = performance.now();
    this.accumulator = 0;
    this.stats.running = true;
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.stats.running = false;
  }

  /** Stop advancing the sim but keep rendering, so the paused frame stays on screen. */
  pause(): void {
    this.manuallyPaused = true;
    this.stats.paused = true;
  }

  resume(): void {
    this.manuallyPaused = false;
    this.autoPaused = false;
    this.stats.paused = false;
    // Discard the wall-clock time spent paused; catching up on it would fast-forward the kart.
    this.lastFrameAt = performance.now();
    this.accumulator = 0;
  }

  toggle(): void {
    if (this.stats.paused) this.resume();
    else this.pause();
  }

  dispose(): void {
    this.stop();
    if (this.pauseOnBlur) {
      window.removeEventListener('blur', this.onBlur);
      window.removeEventListener('focus', this.onFocus);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  // --- configuration -------------------------------------------------------

  setHz(hz: number): void {
    this.stepMs = 1000 / Math.max(1, hz);
    this.stats.simHz = 1000 / this.stepMs;
    this.accumulator = Math.min(this.accumulator, this.stepMs);
  }

  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
  }

  getStats(): Readonly<LoopStats> {
    return this.stats;
  }

  resetStats(): void {
    this.stats.longestFrameMs = 0;
    this.stats.droppedMs = 0;
    this.frameTimes.length = 0;
    this.frameCursor = 0;
  }

  // --- the loop ------------------------------------------------------------

  private frame = (now: number): void => {
    this.rafId = requestAnimationFrame(this.frame);

    const rawFrameMs = now - this.lastFrameAt;
    this.lastFrameAt = now;

    this.stats.frameMs = rawFrameMs;
    if (rawFrameMs > this.stats.longestFrameMs) this.stats.longestFrameMs = rawFrameMs;
    this.trackFps(rawFrameMs);

    if (this.stats.paused) {
      this.stats.ticksLastFrame = 0;
      this.render(this.accumulator / this.stepMs, this.stats);
      return;
    }

    let frameMs = rawFrameMs;
    if (frameMs > this.maxFrameMs) {
      this.stats.droppedMs += frameMs - this.maxFrameMs;
      frameMs = this.maxFrameMs;
    }

    this.accumulator += frameMs * this.timeScale;

    const stepSeconds = this.stepMs / 1000;
    let ticks = 0;
    while (this.accumulator >= this.stepMs) {
      this.update(stepSeconds, this.stats.ticks);
      this.accumulator -= this.stepMs;
      this.stats.ticks++;
      ticks++;
    }
    this.stats.ticksLastFrame = ticks;

    this.stats.alpha = this.accumulator / this.stepMs;
    this.render(this.stats.alpha, this.stats);
  };

  private trackFps(frameMs: number): void {
    this.frameTimes[this.frameCursor] = frameMs;
    this.frameCursor = (this.frameCursor + 1) % FPS_WINDOW;

    let total = 0;
    for (const ms of this.frameTimes) total += ms;
    this.stats.fps = total > 0 ? (this.frameTimes.length * 1000) / total : 0;
  }

  // --- focus handling ------------------------------------------------------

  private onBlur = (): void => {
    if (this.manuallyPaused) return;
    this.autoPaused = true;
    this.stats.paused = true;
  };

  private onFocus = (): void => {
    if (!this.autoPaused) return;
    this.resume();
  };

  private onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') this.onBlur();
    else this.onFocus();
  };
}

/** Linear interpolation for renderers blending the previous and current sim state. */
export function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

/**
 * Interpolate an angle the short way around, so a kart crossing from +179° to -179°
 * turns 2° rather than spinning 358°.
 */
export function lerpAngle(from: number, to: number, alpha: number): number {
  const twoPi = Math.PI * 2;
  let delta = (to - from) % twoPi;
  if (delta > Math.PI) delta -= twoPi;
  if (delta < -Math.PI) delta += twoPi;
  return from + delta * alpha;
}
