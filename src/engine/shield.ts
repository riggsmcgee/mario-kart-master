/**
 * Shield Up: the item-defence drill. (1e1)
 *
 * Chapter 2's habit, in one sentence: **the banana you are carrying is armour, and carrying it
 * costs you nothing.** Jodi loses races to shells she never saw coming, and the fix is not
 * reaction speed — it is holding the item button as a matter of course instead of firing
 * everything the moment she picks it up.
 *
 * There is no abstract shield anywhere in here. You carry a banana, picked up from an item box.
 * Hold the key and it trails behind your back bumper, where a red shell will hit it instead of
 * you. Let go and it does what a banana does: it falls on the road and stays there while you
 * drive away from it.
 *
 * That gives the drill its teeth without ever punishing the habit it is teaching:
 *
 *  - **Holding early is free.** Hold from the first pip, or hold the whole lap. Nothing is
 *    deducted, because in the real game nothing is.
 *  - **Letting go is the gamble.** A dropped banana can still catch the shell — it is sitting in
 *    the road behind you, after all — but only if the shell happens to come through where it
 *    fell. Steer at all, or drop it at the wrong moment, and the shell goes past it into you.
 *  - **The fake-outs bait exactly that release.** A fake looks identical until the last tenth of
 *    its approach, then veers off. Relax and let go in the relief and your banana is on the
 *    tarmac behind you, with the next siren already starting.
 *
 * No DOM and no Three.js in here: this decides what happened, the harness decides how to say it.
 */

import type { PlacedFurniture } from './track';

/** Kept private until a threat resolves — the whole point is that they look the same. */
export type ThreatKind = 'shell' | 'fake';

export type ShieldOutcome =
  /** Held it all the way. The banana takes the hit and is gone. */
  | 'blocked'
  /** Let go, and the shell ran over the banana anyway. Saved, but by luck as much as judgement. */
  | 'drop-blocked'
  /** Let go, and the shell went past where it fell. */
  | 'drop-missed'
  /** Banana in hand, never held out. */
  | 'hit'
  /** Nothing in hand. Find an item box. */
  | 'unarmed'
  /** False alarm, and you were covered anyway. Costs nothing — which is the lesson. */
  | 'fake-held'
  /** False alarm, and you were not covered. Got away with it. */
  | 'fake-clear'
  /** False alarm, and you threw the banana away in the relief. */
  | 'fake-dropped';

export interface ShieldResolution {
  outcome: ShieldOutcome;
  kind: ThreatKind;
  /** How long before impact the banana went out behind you, in ms. Null if it never did. */
  leadMs: number | null;
  /** Whether it cost speed. */
  struck: boolean;
}

export interface ShieldEvents {
  /**
   * A threat just appeared. Deliberately carries no `kind`: a caller that cannot know which it
   * is cannot accidentally show it, and a warning that gives the answer away is not a warning.
   */
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
  /** Share of threats that resolve harmlessly. */
  fakeChance: number;
  /** How long a used or taken item box stays empty. */
  boxRespawnMs: number;
  /** How close the kart has to pass to take a box. */
  pickupRadius: number;
  /** How far behind the kart a held banana sits — and so where a dropped one lands. */
  dropBack: number;
  /**
   * How near a dropped banana the shell has to pass to hit it.
   *
   * The single number that decides whether letting go is a reasonable defence or a gamble. Small
   * enough and only a well-judged late drop works; large enough and dropping is as good as
   * holding, which would teach the wrong thing.
   */
  catchRadius: number;
  /** How long a dropped banana stays on the road before it is tidied away. */
  dropLifeMs: number;
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
  fakeChance: 0.3,
  boxRespawnMs: 5000,
  pickupRadius: 2.6,
  dropBack: 3.4,
  catchRadius: 1.8,
  dropLifeMs: 9000,
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
  kind: ThreatKind;
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
}

const NO_EVENTS: ShieldEvents = {
  warned: false,
  resolved: null,
  gotItem: false,
  droppedItem: false,
};

/** How far through the approach a fake reveals itself. Late enough that reacting is a mistake. */
const VEER_AT = 0.9;
/** How far off line a fake swings by the moment it would have hit. */
const VEER_DISTANCE = 9;

export class ShieldRun {
  hasItem = true;
  threats = 0;
  blocked = 0;
  struck = 0;

  /** The banana on the road, if there is one. Null while it is in hand or gone. */
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

  /** Where to draw the threat: units behind the kart, and units across it. */
  approach(now: number, config: ShieldConfig): { behind: number; side: number } | null {
    const progress = this.progress(now, config);
    if (progress === null || !this.threat) return null;

    // A fake gives itself away only in the last fraction of a second, by sliding off line. Any
    // earlier and reading it would be a skill; this late, acting on it is a mistake.
    const veer =
      this.threat.kind === 'fake' && progress > VEER_AT
        ? ((progress - VEER_AT) / (1 - VEER_AT)) ** 2
        : 0;

    return {
      behind: config.approachDistance * (1 - progress) + 2.5,
      side: veer * VEER_DISTANCE,
    };
  }

  update(config: ShieldConfig, ctx: ShieldContext): ShieldEvents {
    const events: ShieldEvents = { ...NO_EVENTS };
    if (!this.armed) this.reset(ctx.now, config);

    this.runBoxes(config, ctx, events);

    // A banana on the road is tidied away eventually, or the track fills up with them.
    if (this.dropped && ctx.now - this.dropped.at > config.dropLifeMs) this.dropped = null;

    // Letting go drops it whether or not anything is coming — it is a banana, not a force field.
    events.droppedItem = this.releaseCheck(config, ctx);

    const threat = this.threat;

    if (!threat) {
      // A threat that is due but the road is not straight simply waits. Being asked to hold a
      // key and survive a hairpin at once tests two things and teaches neither.
      const ready = ctx.now >= this.nextThreatAt;
      if (ready && (!config.straightsOnly || ctx.clearRoad)) {
        this.threat = {
          kind: Math.random() < config.fakeChance ? 'fake' : 'shell',
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

    // The dropped banana gets its chance every tick, because that is what it is doing sitting
    // there: waiting for the shell to come through. It works only if the shell's line happens
    // to pass over it, which is what makes letting go a gamble rather than a plan.
    if (this.dropped && this.caught(config, ctx)) {
      events.resolved = this.finish(config, ctx, threat, 'drop-blocked', false);
      this.dropped = null;
      return events;
    }

    if (ctx.now < threat.impactAt) return events;

    events.resolved = this.settle(config, ctx, threat, covered);
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
    };
    return true;
  }

  /** Is the shell currently passing over the dropped banana? */
  private caught(config: ShieldConfig, ctx: ShieldContext): boolean {
    const approach = this.approach(ctx.now, config);
    if (!approach || !this.dropped) return false;

    // The shell tracks the kart, so it sits on the line the kart is pointing along *now* — not
    // on the path the kart drove. That is exactly why a banana dropped early tends to be left
    // off to one side by the time the shell arrives.
    const cos = Math.cos(ctx.heading);
    const sin = Math.sin(ctx.heading);
    const shellX = ctx.x - cos * approach.behind - sin * approach.side;
    const shellY = ctx.y - sin * approach.behind + cos * approach.side;

    return Math.hypot(shellX - this.dropped.x, shellY - this.dropped.y) <= config.catchRadius;
  }

  private settle(
    config: ShieldConfig,
    ctx: ShieldContext,
    threat: Threat,
    covered: boolean,
  ): ShieldResolution {
    if (threat.kind === 'fake') {
      const outcome: ShieldOutcome = threat.dropped
        ? 'fake-dropped'
        : covered
          ? 'fake-held'
          : 'fake-clear';
      return this.finish(config, ctx, threat, outcome, false);
    }

    if (covered) return this.finish(config, ctx, threat, 'blocked', false);

    const outcome: ShieldOutcome = threat.dropped
      ? 'drop-missed'
      : this.hasItem
        ? 'hit'
        : 'unarmed';
    return this.finish(config, ctx, threat, outcome, true);
  }

  /** Close the books on a threat: bookkeeping, then the verdict. */
  private finish(
    config: ShieldConfig,
    ctx: ShieldContext,
    threat: Threat,
    outcome: ShieldOutcome,
    struck: boolean,
  ): ShieldResolution {
    if (outcome === 'blocked') {
      this.blocked++;
      // The banana took the hit, so it is gone. Find another box.
      this.hasItem = false;
      this.wasHolding = false;
    }
    if (outcome === 'drop-blocked') this.blocked++;

    if (struck) {
      this.struck++;
      this.spinUntil = ctx.now + config.spinMs;
    }

    this.threat = null;
    this.nextThreatAt = ctx.now + this.gap(config);

    return {
      outcome,
      kind: threat.kind,
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
