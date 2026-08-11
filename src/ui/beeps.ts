/**
 * Small synthesised sounds. (1e1)
 *
 * Shield Up asks for a siren pip, and a siren pip has to be heard rather than seen — the whole
 * point of a warning is that it reaches you while you are looking at the road. A visual-only
 * warning trains looking away from the road, which is the opposite of the lesson.
 *
 * Synthesised rather than sampled: no audio file enters the repo, nothing to license, nothing to
 * download, and the pitch and length are numbers we can tune like any other feel constant.
 *
 * Everything is wrapped in try/catch and nothing is created until the first sound is asked for.
 * A browser that blocks audio, or one where the user has never touched a key, simply stays quiet
 * — sound is a helper here, never a requirement.
 */

export type Sound = 'warn' | 'urgent' | 'block' | 'hit' | 'item' | 'drop';

interface Recipe {
  /** Start and end frequency, Hz. */
  from: number;
  to: number;
  ms: number;
  type: OscillatorType;
  gain: number;
}

const RECIPES: Record<Sound, Recipe> = {
  // The approach pip. Short and dry, because it repeats and repeats faster.
  warn: { from: 880, to: 880, ms: 70, type: 'square', gain: 0.05 },
  // Same pip, higher, for the last stretch. Pitch does more for urgency than volume.
  urgent: { from: 1245, to: 1245, ms: 70, type: 'square', gain: 0.06 },
  // Rising and bright: the sound of something working.
  block: { from: 700, to: 1500, ms: 180, type: 'triangle', gain: 0.09 },
  // Falling and rough: the sound of something going wrong.
  hit: { from: 260, to: 90, ms: 260, type: 'sawtooth', gain: 0.09 },
  item: { from: 660, to: 990, ms: 120, type: 'sine', gain: 0.06 },
  // A small downward plop: something leaving your hands and landing on the road.
  drop: { from: 420, to: 220, ms: 110, type: 'sine', gain: 0.05 },
};

export class Beeper {
  muted = false;
  private context: AudioContext | null = null;

  play(sound: Sound): void {
    if (this.muted) return;
    const recipe = RECIPES[sound];

    try {
      this.context ??= new AudioContext();
      const context = this.context;
      // Browsers start the clock suspended until a gesture. Every drill here begins with a key
      // press, so this resumes on the first pip rather than needing a "click to enable" button.
      if (context.state === 'suspended') void context.resume();

      const now = context.currentTime;
      const seconds = recipe.ms / 1000;

      const oscillator = context.createOscillator();
      oscillator.type = recipe.type;
      oscillator.frequency.setValueAtTime(recipe.from, now);
      if (recipe.to !== recipe.from) {
        oscillator.frequency.exponentialRampToValueAtTime(recipe.to, now + seconds);
      }

      // A short attack and an exponential tail. A square wave switched on and off at full
      // amplitude clicks, and the click is louder than the note.
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(recipe.gain, now + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + seconds);

      oscillator.connect(envelope).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + seconds + 0.02);
    } catch {
      // No audio available. Not worth a word to the user — the drill is playable in silence.
      this.muted = true;
    }
  }

  dispose(): void {
    try {
      void this.context?.close();
    } catch {
      // Already gone.
    }
    this.context = null;
  }
}
