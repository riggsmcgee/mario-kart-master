/**
 * Course sound effects. (3d1)
 *
 * The same approach as the Shield Up pips (`beeps.ts`): synthesised on the fly, so no audio file
 * enters the repo, nothing needs licensing, nothing needs downloading, and every sound is a set
 * of numbers that can be tuned like any other feel constant.
 *
 * Two rules the plan sets and this obeys. **Subtle** — these are punctuation on an action she
 * already knows succeeded, never the notification itself; if the sound carried information the
 * screen did not, muting would cost her something. And **mutable**, with the choice persisted,
 * because a site that forgets you muted it is a site you mute once and then close.
 *
 * Everything is wrapped so that a browser refusing audio simply stays quiet. Audio is a helper
 * here and never a requirement.
 */

const STORAGE_KEY = 'mkm.muted.v1';

export type SfxName =
  /** A coin. Bright, short, and it rises — the sound of gaining something. */
  | 'coin'
  /** A star awarded. Rises further and rings on. */
  | 'star'
  /** All three stars. The only sound here allowed to be a flourish. */
  | 'fanfare'
  /** The done stamp landing. Low, blunt, physical. */
  | 'stamp'
  /** A correct quiz answer. */
  | 'right'
  /** A wrong quiz answer. Not a buzzer — the plan is explicit that nothing here marks her. */
  | 'nudge'
  /** Moving between chapters. */
  | 'page'
  /** A mini-turbo firing. Chapter 6's only feedback that the release actually paid. */
  | 'boost';

interface Note {
  /** Semitone-free: plain frequencies, because these are effects rather than music. */
  from: number;
  to: number;
  ms: number;
  type: OscillatorType;
  gain: number;
  /** Delay before this note starts, ms. Lets one name be a small chord or arpeggio. */
  at?: number;
}

const SOUNDS: Record<SfxName, Note[]> = {
  coin: [{ from: 1046, to: 1568, ms: 90, type: 'triangle', gain: 0.05 }],
  star: [
    { from: 784, to: 1175, ms: 120, type: 'triangle', gain: 0.06 },
    { from: 1175, to: 1568, ms: 200, type: 'triangle', gain: 0.05, at: 110 },
  ],
  // A rising arpeggio. Three stars is the biggest thing that happens in a chapter and it is
  // allowed to sound like it.
  fanfare: [
    { from: 523, to: 523, ms: 110, type: 'triangle', gain: 0.06 },
    { from: 659, to: 659, ms: 110, type: 'triangle', gain: 0.06, at: 100 },
    { from: 784, to: 784, ms: 110, type: 'triangle', gain: 0.06, at: 200 },
    { from: 1046, to: 1046, ms: 320, type: 'triangle', gain: 0.07, at: 300 },
  ],
  stamp: [{ from: 220, to: 70, ms: 160, type: 'square', gain: 0.07 }],
  right: [
    { from: 660, to: 880, ms: 120, type: 'sine', gain: 0.05 },
    { from: 880, to: 1100, ms: 140, type: 'sine', gain: 0.04, at: 90 },
  ],
  // Deliberately not a buzzer. Two soft notes going nowhere in particular: it marks that
  // something happened without passing judgement on it.
  nudge: [{ from: 420, to: 380, ms: 150, type: 'sine', gain: 0.045 }],
  page: [{ from: 520, to: 640, ms: 70, type: 'sine', gain: 0.035 }],
  // A short upward whoosh. Sawtooth rather than triangle because a boost should have some grit
  // to it — every other sound here is a chime, and this one is the kart doing something.
  boost: [
    { from: 180, to: 900, ms: 220, type: 'sawtooth', gain: 0.045 },
    { from: 900, to: 1300, ms: 160, type: 'triangle', gain: 0.035, at: 150 },
  ],
};

export class Sfx {
  private context: AudioContext | null = null;
  private mutedValue: boolean;
  private readonly listeners = new Set<(muted: boolean) => void>();

  constructor() {
    this.mutedValue = readMuted();
  }

  get muted(): boolean {
    return this.mutedValue;
  }

  set muted(value: boolean) {
    this.mutedValue = value;
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      // Private browsing. The choice holds for this session and that is enough.
    }
    for (const listener of this.listeners) listener(value);
  }

  toggle(): boolean {
    this.muted = !this.mutedValue;
    return this.mutedValue;
  }

  onChange(listener: (muted: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.mutedValue);
    return () => this.listeners.delete(listener);
  }

  play(name: SfxName): void {
    if (this.mutedValue) return;

    try {
      this.context ??= new AudioContext();
      const context = this.context;
      // Browsers hold the clock suspended until a gesture. Every sound here follows a click or
      // a key press, so resuming on play is enough — no "click to enable audio" button.
      if (context.state === 'suspended') void context.resume();

      for (const note of SOUNDS[name]) {
        const start = context.currentTime + (note.at ?? 0) / 1000;
        const seconds = note.ms / 1000;

        const oscillator = context.createOscillator();
        oscillator.type = note.type;
        oscillator.frequency.setValueAtTime(note.from, start);
        if (note.to !== note.from) {
          oscillator.frequency.exponentialRampToValueAtTime(note.to, start + seconds);
        }

        // Short attack, exponential tail. Switching a square wave on at full amplitude clicks,
        // and the click is louder than the note.
        const envelope = context.createGain();
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(note.gain, start + 0.01);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + seconds);

        oscillator.connect(envelope).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + seconds + 0.02);
      }
    } catch {
      // No audio available in this browser or context. Silence is a perfectly good fallback.
      this.mutedValue = true;
    }
  }

  /** Stars, with the fanfare reserved for all three. */
  playStars(stars: number): void {
    this.play(stars >= 3 ? 'fanfare' : 'star');
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

let shared: Sfx | null = null;

export function getSfx(): Sfx {
  shared ??= new Sfx();
  return shared;
}
