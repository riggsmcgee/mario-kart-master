/**
 * Shield Up: the item-defence drill. (1e1)
 *
 * Chapter 2's habit, in one sentence: **the item you are carrying is armour, and carrying it
 * costs you nothing.** Jodi loses races to shells she never saw coming, and the fix is not
 * reaction speed — it is holding the item button as a matter of course instead of firing
 * everything the moment she picks it up.
 *
 * So the drill is built to make that habit the obviously correct play, and to charge for the one
 * reflex that breaks it:
 *
 *  - **Holding early is free.** Raise the shield the instant the siren starts, or hold it the
 *    whole lap; nothing is deducted. Anything else would teach the opposite of the lesson.
 *  - **Letting go is what costs you.** Releasing during a threat throws the item away — which is
 *    exactly what the real game does with a held item — and leaves your back bare.
 *  - **The fake-outs exist to bait that release.** A fake threat looks identical right up to the
 *    last fraction of a second, then veers off. Relax and let go in the relief, and you have
 *    thrown your armour away for nothing, with the next siren already on its way.
 *
 * That is why there is no penalty for holding and a real one for flinching. A drill where
 * mashing the key wins would train mashing.
 *
 * No DOM and no Three.js in here: this decides what happened, the harness decides how to say it.
 */

/** Kept private until a threat resolves — the whole point is that they look the same. */
export type ThreatKind = 'shell' | 'fake';

export type ShieldOutcome =
  /** Real shell, shield up. The item is spent doing its job. */
  | 'blocked'
  /** Real shell, item in hand, shield never raised. */
  | 'hit'
  /** Raised, then released before impact: item thrown away, and whatever was coming arrived. */
  | 'dropped'
  /** Real shell, nothing in hand to raise. */
  | 'unarmed'
  /** False alarm, and you were covered anyway. Costs nothing — which is the lesson. */
  | 'fake-held'
  /** False alarm, and you were not covered. Got away with it. */
  | 'fake-clear';

export interface ShieldResolution {
  outcome: ShieldOutcome;
  kind: ThreatKind;
  /** How long before impact the shield went up, in ms. Null if it never did. */
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
  /** A fresh item just arrived. */
  rearmed: boolean;
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
  /** How long a new item takes to arrive after the last one is spent or thrown. */
  itemRefreshMs: number;
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
  itemRefreshMs: 3500,
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
  /** Is the road ahead straight enough to start a threat here. */
  clearRoad: boolean;
}

interface Threat {
  kind: ThreatKind;
  warnedAt: number;
  impactAt: number;
  /** When the shield first went up, with an item to raise. */
  raisedAt: number | null;
  /** Raised and then let go before impact. */
  dropped: boolean;
}

const NO_EVENTS: ShieldEvents = { warned: false, resolved: null, rearmed: false };

/** How far through the approach the fake reveals itself. Late enough that reacting is a mistake. */
const VEER_AT = 0.9;

export class ShieldRun {
  hasItem = true;
  threats = 0;
  blocked = 0;
  struck = 0;

  private threat: Threat | null = null;
  private nextThreatAt = 0;
  private itemBackAt = 0;
  private spinUntil = 0;
  private armed = false;

  reset(now: number, config: ShieldConfig): void {
    this.hasItem = true;
    this.threats = 0;
    this.blocked = 0;
    this.struck = 0;
    this.threat = null;
    this.itemBackAt = 0;
    this.spinUntil = 0;
    this.nextThreatAt = now + this.gap(config);
    this.armed = true;
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

  /** Seconds until the next item, or null when one is in hand. */
  itemWait(now: number): number | null {
    return this.hasItem ? null : Math.max(0, (this.itemBackAt - now) / 1000);
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
      side: veer * 9,
    };
  }

  update(config: ShieldConfig, ctx: ShieldContext): ShieldEvents {
    const events: ShieldEvents = { ...NO_EVENTS };
    if (!this.armed) this.reset(ctx.now, config);

    if (!this.hasItem && ctx.now >= this.itemBackAt) {
      this.hasItem = true;
      events.rearmed = true;
    }

    const threat = this.threat;

    if (!threat) {
      const ready = ctx.now >= this.nextThreatAt;
      // A threat that is due but the road is not straight simply waits. Being asked to hold a
      // key and survive a hairpin at once tests two things and teaches neither.
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

    const up = ctx.holding && this.hasItem;
    if (up && threat.raisedAt === null) threat.raisedAt = ctx.now;

    // Letting go throws the item, as it does in the real game — but only while something is
    // actually coming. Losing your armour for idly tapping the key outside a threat would be
    // consistent and would feel like a trap, and the flinch is the thing being trained.
    if (threat.raisedAt !== null && !ctx.holding && !threat.dropped) {
      threat.dropped = true;
      this.hasItem = false;
      this.itemBackAt = ctx.now + config.itemRefreshMs;
    }

    if (ctx.now < threat.impactAt) return events;

    events.resolved = this.resolve(config, ctx, threat);
    this.threat = null;
    this.nextThreatAt = ctx.now + this.gap(config);
    return events;
  }

  private resolve(config: ShieldConfig, ctx: ShieldContext, threat: Threat): ShieldResolution {
    const covered = ctx.holding && this.hasItem;
    const leadMs = threat.raisedAt === null ? null : threat.impactAt - threat.raisedAt;

    let outcome: ShieldOutcome;
    let struck = false;

    if (threat.kind === 'fake') {
      outcome = threat.dropped ? 'dropped' : covered ? 'fake-held' : 'fake-clear';
    } else if (covered) {
      outcome = 'blocked';
      this.blocked++;
      // Blocking spends the item: it did its job, and now you need another.
      this.hasItem = false;
      this.itemBackAt = ctx.now + config.itemRefreshMs;
    } else {
      outcome = threat.dropped ? 'dropped' : this.hasItem ? 'hit' : 'unarmed';
      struck = true;
    }

    if (struck) {
      this.struck++;
      this.spinUntil = ctx.now + config.spinMs;
    }

    return { outcome, kind: threat.kind, leadMs, struck };
  }

  private gap(config: ShieldConfig): number {
    const min = Math.min(config.gapMinMs, config.gapMaxMs);
    const max = Math.max(config.gapMinMs, config.gapMaxMs);
    return min + Math.random() * (max - min);
  }
}
