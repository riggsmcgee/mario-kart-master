/**
 * The site's voice, which is a clarinet. (4e4)
 *
 * Kayla plays the clarinet, so the thing that talks to her is one — every line the narrator types is
 * voiced as a run of short reedy blips, the way a certain kind of game has always done dialogue.
 * That is a joke with a long fuse: for the first eight minutes it is simply the noise the website
 * makes, and then one beat late on asks her to play something, and the sound she has been hearing
 * all along turns out to have been an instrument she can pick up.
 *
 * **Why it actually sounds like a clarinet.** A clarinet is a cylindrical pipe stopped at one end by
 * the reed, and a stopped pipe only supports odd harmonics — 1, 3, 5, 7 — which is both why it has
 * that hollow, woody tone and why it overblows a twelfth rather than an octave. So the wave here is
 * built as a `PeriodicWave` with every even partial set to exactly zero. One oscillator, one table,
 * and the physics does the timbre. A stack of sine oscillators would cost eight nodes per note to
 * arrive at the same place.
 *
 * **No files, same as everywhere else** (`sfx.ts`, `beeps.ts`). Nothing to license, nothing to
 * download, and every part of the sound is a number that can be argued with.
 *
 * **It obeys the mute button**, which matters more here than anywhere else on the site: one of the
 * beats is *about* muting the narrator, and a voice that carried on regardless would break the
 * promise the same instant it made it.
 */

import type { Sfx } from '../../ui/sfx';

/**
 * Relative strength of the odd partials, fundamental first.
 *
 * A square wave is already odd-only at 1/n, which is why square waves have always been the cheap
 * clarinet. This is a square with the top taken off: the 3rd sits high enough to give the tone its
 * hollowness, and everything above the 9th falls away faster than 1/n so the result reads as woody
 * rather than as a buzzer. Kept as a list because it is the one number in the file most worth
 * fiddling with by ear.
 */
const PARTIALS = [1, 0.62, 0.31, 0.18, 0.09, 0.05, 0.02];

/** Concert pitches, chalumeau into clarion — the range a school clarinet actually lives in. */
export const PITCH: Record<string, number> = {
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  Bb3: 233.08,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  Eb4: 311.13,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  Bb4: 466.16,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
};

export interface NoteOptions {
  /** Milliseconds of steady tone, before the release tail. */
  ms?: number;
  /** 0 to 1, before the master trim. */
  gain?: number;
  /** Seconds from now. Lets a caller write a phrase in one pass. */
  at?: number;
  /**
   * Breathier and slower to speak, the way the bottom of the instrument behaves. Set on low notes
   * so the register actually sounds like a register rather than the same note transposed.
   */
  chalumeau?: boolean;
}

export class Reed {
  private context: AudioContext | null = null;
  private wave: PeriodicWave | null = null;
  private readonly sfx: Sfx;

  constructor(sfx: Sfx) {
    this.sfx = sfx;
  }

  private ready(): AudioContext | null {
    if (this.sfx.muted) return null;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume();
      if (!this.wave) {
        // Index 0 is DC and index 1 is the fundamental, so partial k sits at index k. Evens are
        // simply never written, which is the whole trick.
        const size = PARTIALS.length * 2 + 2;
        const real = new Float32Array(size);
        const imag = new Float32Array(size);
        PARTIALS.forEach((amplitude, i) => {
          const harmonic = i * 2 + 1;
          if (harmonic < size) imag[harmonic] = amplitude;
        });
        this.wave = this.context.createPeriodicWave(real, imag, { disableNormalization: false });
      }
      return this.context;
    } catch {
      // A browser that will not give us audio gets a silent narrator, and every line is on screen
      // in text anyway. Sound is never the only channel here.
      return null;
    }
  }

  /**
   * One note.
   *
   * The attack is 18ms rather than instant because a reed does not start instantly — it takes a
   * moment for the column to settle, and a hard onset is the difference between "clarinet" and
   * "organ". The lowpass rides with the note's own pitch so high notes keep their brightness
   * instead of being flattened by a fixed corner frequency.
   */
  note(frequency: number, options: NoteOptions = {}): void {
    const context = this.ready();
    if (!context || !this.wave) return;

    const ms = options.ms ?? 260;
    const gain = options.gain ?? 0.075;
    const start = context.currentTime + (options.at ?? 0);
    const hold = ms / 1000;
    const attack = options.chalumeau ? 0.034 : 0.018;
    const release = 0.09;

    const oscillator = context.createOscillator();
    oscillator.setPeriodicWave(this.wave);
    oscillator.frequency.setValueAtTime(frequency, start);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(frequency * (options.chalumeau ? 6 : 9), 9000), start);
    filter.Q.setValueAtTime(0.7, start);

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + attack);
    envelope.gain.setValueAtTime(gain, start + hold);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + hold + release);

    oscillator.connect(filter).connect(envelope).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + hold + release + 0.02);
  }

  /**
   * A syllable of narration.
   *
   * Short, quiet, and pitched a little differently each time so a sentence has contour rather than
   * a flat stutter. The jitter is small on purpose: wide enough to sound like speech, narrow enough
   * that the voice keeps a recognisable identity from one line to the next.
   */
  blip(seed: number): void {
    const base = 392;
    const wobble = 1 + (((seed * 2654435761) % 97) / 97 - 0.5) * 0.22;
    this.note(base * wobble, { ms: 26, gain: 0.028 });
  }

  /**
   * The squeak.
   *
   * Every clarinettist's private catastrophe: the reed loses the fundamental and the note jumps to a
   * high partial with a shriek. Reproduced honestly — the same note, twelfth up (the odd-harmonic
   * interval, not an octave, and that detail is the joke for anyone who would notice), thin and
   * loud and over immediately.
   */
  squeak(frequency = PITCH['A4'] ?? 440): void {
    this.note(frequency * 3, { ms: 90, gain: 0.06 });
    this.note(frequency * 5, { ms: 60, gain: 0.03, at: 0.02 });
  }

  /** Play a written phrase: `[frequency, milliseconds]` pairs, laid end to end. */
  phrase(notes: Array<[number, number]>, gap = 0.03): void {
    let at = 0;
    for (const [frequency, ms] of notes) {
      this.note(frequency, { ms, at, gain: 0.08 });
      at += ms / 1000 + gap;
    }
  }

  dispose(): void {
    // Closing the context is the difference between "she left the page" and "the tab still holds an
    // audio device". Everything scheduled has a stop time already, so nothing is cut off.
    void this.context?.close().catch(() => undefined);
    this.context = null;
    this.wave = null;
  }
}
