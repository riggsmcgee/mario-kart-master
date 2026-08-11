/**
 * Shield Up: the item-defence drill. (1e1)
 *
 * Chapter 2's habit, in one sentence: **the banana you are carrying is armour, and carrying it
 * costs you nothing.** Jodi loses races to shells she never saw coming, and the fix is not
 * reaction speed — it is holding the item button as a matter of course instead of firing
 * everything the moment she picks it up.
 *
 * There is no abstract shield anywhere in here. You carry a banana, picked up from an item box.
 * Hold the key and it trails behind your back bumper, where a red shell hits it instead of you.
 * Let go and it falls on the road behind you, and it is gone.
 *
 * **The rule is deliberately absolute: a red shell that is locked on hits you unless the banana
 * is behind you when it arrives.** No near misses, no veering off, no lucky escapes (Riggs,
 * 2026-08-11 — "that's not a thing"). Any of those would teach that not holding sometimes works
 * out, which is exactly the belief that costs her races. Holding is free; nothing else saves you.
 *
 * No DOM and no Three.js in here: this decides what happened, the harness decides how to say it.
 */

import type { PlacedFurniture } from './track';

export type ShieldOutcome =
  /** Held it all the way. The banana takes the hit and is spent. */
  | 'blocked'
  /** Let go while it was coming. The banana is on the road and the shell arrived anyway. */
  | 'dropped'
  /** Banana in hand, never held out. */
  | 'hit'
  /** Nothing in hand. Find an item box. */
  | 'unarmed';

export interface ShieldResolution {
  outcome: ShieldOutcome;
  /** How long before impact the banana went out behind you, in ms. Null if it never did. */
  leadMs: number | null;
  /** Whether it cost speed. Everything except a block does. */
  struck: boolean;
}

export interface ShieldEvents {
  warned: boolean;
  resolved: ShieldResolution | null;
  /** An item box was just picked up. */
  gotItem: boolean;
  /** The banana was just let go of. */
  droppedItem: boolean;
}

// A type alias, not an interface, so it satisfies the tuning panel's index-signature constraint.
export type ShieldConfig = {
  /** Shortest and longest wait between threats. */
  gapMinMs: number;
  gapMaxMs: number;
  /**
   * Lead time from the siren to the impact. The number this drill exists to tune: long enough
   * that noticing is a skill rather than a reflex test, short enough to stay a threat.
   */
  warningMs: number;
  /** How long a taken item box stays empty. */
  boxRespawnMs: number;
  /** How close the kart has to pass to take a box. */
  pickupRadius: number;
  /** How far behind the kart a held banana sits — and so where a dropped one lands. */
  dropBack: number;
  /**
   * How long a dropped banana is visible before it is gone.
   *
   * Short on purpose. It exists to show you what letting go just cost, not to lie in wait: a
   * banana still sitting on the road when the shell drives over it would imply a rescue that
   * this drill does not offer.
   */
  dropShowMs: number;
  /** How long a hit leaves you flailing. */
  spinMs: number;
  /** Speed kept through a hit. */
  spinSpeedKeep: number;
  /** How far back the threat starts, in world units. Presentation, not timing. */
  approachDistance: number;
  /** Keep threats off the corners. */
  straightsOnly: boolean;
  /** How much upcoming bend still counts as a straight, in radians. */
  maxBend: number;
};

export const SHIELD_CONFIG: ShieldConfig = {
  gapMinMs: 4000,
  gapMaxMs: 7000,
  warningMs: 2000,
  boxRespawnMs: 5000,
  pickupRadius: 2.6,
  dropBack: 3.4,
  dropShowMs: 1200,
  spinMs: 900,
  spinSpeedKeep: 0.3,
  approachDistance: 55,
  straightsOnly: true,
  maxBend: 0.35,
};

export interface ShieldContext {
  now: number;
  /** Item key held this tick. */
  holding: boolean;
  x: number;
  y: number;
  heading: number;
  /** Is the road ahead straight enough to start a threat here. */
  clearRoad: boolean;
}

interface Threat {
  warnedAt: number;
  impactAt: number;
  /** When the banana first went out behind the kart, with one in hand to put there. */
  raisedAt: number | null;
  /** Held and then let go before impact. */
  dropped: boolean;
}

export interface DroppedItem {
  x: number;
  y: number;
  at: number;
  /** 1 the instant it lands, falling to 0 as it goes. */
  fade: number;
}

const NO_EVENTS: ShieldEvents = {
  warned: false,
  resolved: null,
  gotItem: false,
  droppedItem: false,
};

export class ShieldRun {
  hasItem = true;
  threats = 0;
  blocked = 0;
  struck = 0;

  /** The banana you just let go of, while it is still visible. */
  dropped: DroppedItem | null = null;

  private threat: Threat | null = null;
  private nextThreatAt = 0;
  private spinUntil = 0;
  private armed = false;
  /** Whether the banana was out behind the kart last tick, so a release is an edge. */
  private wasHolding = false;
  /** When each taken box comes back, by furniture id. */
  private readonly respawn = new Map<number, number>();

  constructor(readonly boxes: PlacedFurniture[]) {}

  reset(now: number, config: ShieldConfig): void {
    this.hasItem = true;
    this.threats = 0;
    this.blocked = 0;
    this.struck = 0;
    this.dropped = null;
    this.threat = null;
    this.spinUntil = 0;
    this.nextThreatAt = now + this.gap(config);
    this.armed = true;
    this.wasHolding = false;
    this.respawn.clear();
    for (const box of this.boxes) box.collected = false;
  }

  /**
   * How far through a spin-out, 0 to 1, or null when not spinning.
   *
   * A fraction rather than a rate so the caller can turn it into a whole number of rotations —
   * accumulating an angle per frame instead leaves the kart pointing somewhere arbitrary when
   * the spin ends, and it snaps back.
   */
  spinProgress(now: number, config: ShieldConfig): number | null {
    if (now >= this.spinUntil) return null;
    const startedAt = this.spinUntil - config.spinMs;
    return Math.min(1, Math.max(0, (now - startedAt) / config.spinMs));
  }

  /** How far through the approach a live threat is, 0 to 1. Null when nothing is coming. */
  progress(now: number, config: ShieldConfig): number | null {
    if (!this.threat) return null;
    const span = Math.max(1, config.warningMs);
    return Math.min(1, Math.max(0, (now - this.threat.warnedAt) / span));
  }

  /** How far behind the kart to draw the shell. Null when nothing is coming. */
  approach(now: number, config: ShieldConfig): number | null {
    const progress = this.progress(now, config);
    if (progress === null) return null;
    return config.approachDistance * (1 - progress) + 2.5;
  }

  update(config: ShieldConfig, ctx: ShieldContext): ShieldEvents {
    const events: ShieldEvents = { ...NO_EVENTS };
    if (!this.armed) this.reset(ctx.now, config);

    this.runBoxes(config, ctx, events);

    if (this.dropped) {
      const age = ctx.now - this.dropped.at;
      this.dropped.fade = 1 - age / Math.max(1, config.dropShowMs);
      if (this.dropped.fade <= 0) this.dropped = null;
    }

    // Letting go drops it whether or not anything is coming — it is a banana, not a force field.
    events.droppedItem = this.releaseCheck(config, ctx);

    const threat = this.threat;

    if (!threat) {
      // A threat that is due but the road is not straight simply waits. Being asked to hold a
      // key and survive a hairpin at once tests two things and teaches neither.
      const ready = ctx.now >= this.nextThreatAt;
      if (ready && (!config.straightsOnly || ctx.clearRoad)) {
        this.threat = {
          warnedAt: ctx.now,
          impactAt: ctx.now + config.warningMs,
          raisedAt: null,
          dropped: false,
        };
        this.threats++;
        events.warned = true;
      }
      return events;
    }

    if (events.droppedItem) threat.dropped = true;

    const covered = ctx.holding && this.hasItem;
    if (covered && threat.raisedAt === null) threat.raisedAt = ctx.now;

    if (ctx.now < threat.impactAt) return events;

    // The whole model, in one line: the banana is behind you or the shell hits you.
    const outcome: ShieldOutcome = covered
      ? 'blocked'
      : threat.dropped
        ? 'dropped'
        : this.hasItem
          ? 'hit'
          : 'unarmed';

    events.resolved = this.finish(config, ctx, threat, outcome);
    return events;
  }

  // --- internals -----------------------------------------------------------

  /** Item boxes: take one when empty-handed, and put it back a few seconds later. */
  private runBoxes(config: ShieldConfig, ctx: ShieldContext, events: ShieldEvents): void {
    for (const box of this.boxes) {
      if (box.collected) {
        const back = this.respawn.get(box.id) ?? 0;
        if (ctx.now >= back) {
          box.collected = false;
          this.respawn.delete(box.id);
        }
        continue;
      }
      if (this.hasItem) continue;
      if (Math.hypot(ctx.x - box.x, ctx.y - box.y) > config.pickupRadius) continue;

      box.collected = true;
      this.respawn.set(box.id, ctx.now + config.boxRespawnMs);
      this.hasItem = true;
      events.gotItem = true;
    }
  }

  /** Did the banana just leave your hands? Drops it on the road behind the kart if so. */
  private releaseCheck(config: ShieldConfig, ctx: ShieldContext): boolean {
    const out = ctx.holding && this.hasItem;
    const released = this.wasHolding && !out && this.hasItem;
    this.wasHolding = out;
    if (!released) return false;

    this.hasItem = false;
    this.dropped = {
      x: ctx.x - Math.cos(ctx.heading) * config.dropBack,
      y: ctx.y - Math.sin(ctx.heading) * config.dropBack,
      at: ctx.now,
      fade: 1,
    };
    return true;
  }

  /** Close the books on a threat: bookkeeping, then the verdict. */
  private finish(
    config: ShieldConfig,
    ctx: ShieldContext,
    threat: Threat,
    outcome: ShieldOutcome,
  ): ShieldResolution {
    const struck = outcome !== 'blocked';

    if (outcome === 'blocked') {
      this.blocked++;
      // The banana took the hit, so it is gone. Find another box.
      this.hasItem = false;
      this.wasHolding = false;
    } else {
      this.struck++;
      this.spinUntil = ctx.now + config.spinMs;
    }

    this.threat = null;
    this.nextThreatAt = ctx.now + this.gap(config);

    return {
      outcome,
      leadMs: threat.raisedAt === null ? null : threat.impactAt - threat.raisedAt,
      struck,
    };
  }

  private gap(config: ShieldConfig): number {
    const min = Math.min(config.gapMinMs, config.gapMaxMs);
    const max = Math.max(config.gapMinMs, config.gapMaxMs);
    return min + Math.random() * (max - min);
  }
}
