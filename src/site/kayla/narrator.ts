/**
 * The voice that does not want her here. (4e4)
 *
 * Two lines of text at the bottom of the screen and a voice reading them out. It is the entire cast
 * of Kayla's half of the site — there is no character art, no portrait, no name. A website talking to
 * you in a subtitle strip is funnier than a website with a mascot talking to you, because the
 * subtitle strip is *the website itself*, and being addressed personally by a piece of software you
 * were snooping through is the premise of the whole thing.
 *
 * ## The third pass: it talks now, and that is the default
 *
 * Riggs, 2026-08-13: *"Work the speech narrator into the actual game. Start with it narrating by
 * default. No need for the speech reader and transcript buttons. When the audio is off, speech is
 * automatically off — works better into the bit."*
 *
 * The second pass shipped speech behind an off-by-default toggle, out of a worry that an English
 * synthesiser would trample the clarinet gag in beat 4. That worry was wrong, and wrong in an
 * instructive way: **the mute war only becomes what it is meant to be once the voice is real.** When
 * silencing the narrator silences an actual speaking thing and leaves it typing at her in a dead
 * strip, beat 3 stops being a joke about a mute button and becomes the thing itself. And the clarinet
 * is not upstaged — it is what she hears for the whole muted stretch between beats 3 and 4, which is
 * a far better setup for the voice box than a toggle nobody pressed.
 *
 * So: **no controls at all.** The strip speaks from the first line. There is one thing that stops it
 * and it is inside the fiction — silence — reached either by the site's own mute or by the narrator's
 * throat being taken off it. The two plain buttons that used to sit here are gone; the transcript
 * went with them, because a record of a monologue is a feature of a document and this is not one.
 *
 * ## Pacing, which is the other half of the same note
 *
 * *"The pace of the reader is a lot better, but there is too much time between separate thoughts.
 * Long pauses waiting for something to do."*
 *
 * The dwell added in the second pass was solving a problem the voice now solves better. A spoken line
 * is legible for exactly as long as it takes to say, which is already a reading pass — so holding it
 * for another 2.6 seconds afterwards buys nothing and costs the thing Riggs is actually complaining
 * about, which is the silence between thoughts. Holds are therefore **two different numbers**: a few
 * hundred milliseconds when the line was spoken, and the full reading-time dwell when it was typed in
 * silence, where the old arithmetic still applies.
 *
 * ## The rules it enforces on every line
 *
 *  - **She can always skip.** A click anywhere on the strip, or any key the page is not already
 *    using, finishes the current line instantly. **But a key a puzzle has consumed is not a skip** —
 *    anything a beat has `preventDefault`ed is ignored here, or a keyboard player dragging the
 *    progress bar with six arrow presses destroys six lines of narration without reading one.
 *  - **It never gets stuck being clever.** Every beat hands over a ladder of hints and this runs it
 *    on a timer that resets whenever she does something. The genre's loudest complaint is hints that
 *    arrive before you have had a go; the opposite failure is a page with nothing happening on it,
 *    which is the one Riggs hit. The rungs are 16s, 34s and 62s, and `solved()` throws away anything
 *    still queued the moment a puzzle is finished.
 *  - **It is readable by machine.** The typed lines are `aria-hidden`; a live region gets the whole
 *    sentence on settle — except while the page is speaking, where two talking agents is worse than
 *    either.
 *  - **Silence is a legal state.** The mute button is a puzzle later on, so the voice has to be able
 *    to lose its voice and keep talking in text.
 */

import { el } from '../dom';
import type { Sfx } from '../../ui/sfx';
import type { Reed } from './reed';
import { Speech } from './speech';

/**
 * Milliseconds per character **when it is typing in silence**, which now only happens with the site
 * muted, the narrator's throat taken, or no speech voice on the machine. ~30 raw, ~20 effective once
 * the breaths below are averaged in, which is the Netflix ceiling for English adult subtitles.
 *
 * When it is speaking, this number is unused: the text is paced by the voice.
 */
const PER_CHARACTER = 30;

/** Extra pause after punctuation, in milliseconds. This is where the deadpan lives. */
const BREATH: Record<string, number> = {
  '.': 280,
  '?': 300,
  '!': 280,
  ',': 120,
  ';': 160,
  ':': 160,
  '—': 200,
  '…': 340,
};

/**
 * How long a finished line holds before the next one starts — spoken, then typed.
 *
 * **Spoken is nearly nothing on purpose.** The utterance was the reading pass; the pause afterwards
 * is pure dead air, and dead air between thoughts is the thing that made ten minutes feel like
 * twenty. What is left is a breath, scaled a little by length so a long sentence gets a beat to land.
 *
 * **Typed keeps a dwell**, because a line she is reading off the screen genuinely needs one — but a
 * smaller dwell than the second pass gave it. The character pace was the half Riggs said was right;
 * the gap between finished thoughts was the half he said was wrong, and that is true whether the
 * thought was spoken or typed. The two-line stack is what makes the smaller number safe: the line
 * stays legible right through the next one's reveal, which is where most of the reading time
 * actually comes from.
 *
 * The typed path is now only reached with the site muted, the narrator's throat taken, or no voice on
 * the machine — which in practice means the muted stretch between beats 3 and 4, the longest run of
 * silent text in the piece and the one most worth keeping brisk.
 */
const HOLD_SPOKEN_BASE = 170;
const HOLD_SPOKEN_PER_CHAR = 5;
const HOLD_SPOKEN_MIN = 200;
const HOLD_SPOKEN_MAX = 620;

const HOLD_TYPED_BASE = 280;
const HOLD_TYPED_PER_CHAR = 11;
const HOLD_TYPED_MIN = 460;
const HOLD_TYPED_MAX = 1200;

/** Lines that name a control, state a rule or carry a hint. Missing one of these actually costs. */
const HOLD_INSTRUCTIONAL = 1.25;

/**
 * Silence before each rung of the hint ladder. The last rung repeats on the final interval.
 *
 * Set between two failure modes. Hints that arrive before you have had a proper go solve the game
 * over your shoulder while you are still enjoying being stuck — the genre's best-known example is
 * notorious for it. Hints that arrive too late leave a page sitting there doing nothing, which is
 * exactly what Riggs hit. Sixteen seconds is long enough to have an idea in and short enough that
 * nothing is ever quiet for long.
 */
const NUDGE_AT = [16_000, 34_000, 62_000, 45_000];

interface Run {
  text: string;
  bold: boolean;
}

interface Queued {
  text: string;
  instructional: boolean;
  resolve: () => void;
}

/** `**like this**` becomes a bold run. Nothing else is markup — see `dom.ts` for the same argument. */
function runs(line: string): Run[] {
  const out: Run[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let cursor = 0;
  for (let match = pattern.exec(line); match !== null; match = pattern.exec(line)) {
    if (match.index > cursor) out.push({ text: line.slice(cursor, match.index), bold: false });
    out.push({ text: match[1] ?? '', bold: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < line.length) out.push({ text: line.slice(cursor), bold: false });
  return out;
}

function plain(line: string): string {
  return line.replace(/\*\*/g, '');
}

/**
 * Does this line tell her how to do something?
 *
 * Cheap heuristic, and it only ever buys extra time — being wrong costs a quarter of one hold. Bold
 * is the narrator's own emphasis marker and it is used almost exclusively on controls and rules; the
 * verbs catch the hint ladders, which are the lines most expensive to miss.
 */
function instructional(line: string): boolean {
  return (
    /\*\*/.test(line) || /\b(drag|click|press|play|open|turn|answer|put|take|pick)\b/i.test(line)
  );
}

function holdFor(text: string, isInstruction: boolean, spoken: boolean): number {
  const length = plain(text).length;
  const raw = spoken
    ? HOLD_SPOKEN_BASE + length * HOLD_SPOKEN_PER_CHAR
    : HOLD_TYPED_BASE + length * HOLD_TYPED_PER_CHAR;
  const scaled = isInstruction ? raw * HOLD_INSTRUCTIONAL : raw;
  return spoken
    ? Math.min(HOLD_SPOKEN_MAX, Math.max(HOLD_SPOKEN_MIN, scaled))
    : Math.min(HOLD_TYPED_MAX, Math.max(HOLD_TYPED_MIN, scaled));
}

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export interface NarratorDeps {
  sfx: Sfx;
  reed: Reed;
}

export class Narrator {
  readonly root: HTMLElement;

  private readonly previous = el('p', { class: 'nar-prev', attrs: { 'aria-hidden': 'true' } });
  private readonly line = el('p', { class: 'nar-line', attrs: { 'aria-hidden': 'true' } });
  private readonly caret = el('span', { class: 'nar-caret', attrs: { 'aria-hidden': 'true' } });
  private readonly live = el('p', {
    class: 'nar-live',
    attrs: { role: 'status', 'aria-live': 'polite' },
  });

  private readonly reed: Reed;
  private readonly sfx: Sfx;
  private readonly speech = new Speech();
  private readonly offMute: () => void;

  private queue: Queued[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private finishCurrent: (() => void) | null = null;
  private speaking = false;
  private dead = false;
  private voiced = true;
  private panicked = false;
  private skips = 0;
  private remarked = false;

  private ladder: string[] = [];
  private rung = 0;
  private nudgeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(deps: NarratorDeps) {
    this.sfx = deps.sfx;
    this.reed = deps.reed;

    this.root = el(
      'div',
      { class: 'narrator' },
      el(
        'div',
        { class: 'nar-inner' },
        el(
          'div',
          { class: 'nar-stack' },
          this.previous,
          el('div', { class: 'nar-current' }, this.line, this.caret),
        ),
        this.live,
      ),
    );

    this.root.addEventListener('pointerdown', this.skip);
    // Bubble phase, not capture. See `onKey`.
    document.addEventListener('keydown', this.onKey);

    // Muting the site mid-sentence has to stop the sentence, not merely stop the next one. This is
    // also the honest reading of "when the audio is off, speech is off": the site's own mute is a
    // real preference and a synthesiser talking over it would be the rudest thing here by a distance.
    this.offMute = this.sfx.onChange((muted) => {
      if (muted) this.speech.cancel();
    });
  }

  /**
   * Will the next line be spoken out loud?
   *
   * Three ways to be silent and all of them are the same silence: the site is muted, the narrator's
   * throat has been taken off it by beat 3, or this browser has no usable voice. Nothing else can
   * turn it off, because nothing else should be able to.
   */
  private get speaks(): boolean {
    return this.voiced && !this.sfx.muted && this.speech.usable;
  }

  /**
   * Any key finishes the line — unless a puzzle has already used it.
   *
   * An early version listened in the *capture* phase and skipped on everything but Tab, which meant
   * every arrow press used to drag an object, every digit used to play a vent, and every Enter used
   * to pick something up also destroyed the sentence explaining what she was doing. It was invisible
   * to a mouse player, which is how it survived.
   *
   * `defaultPrevented` is the right test because the beats already call `preventDefault()` on exactly
   * the keys they consume — so the two systems agree without either knowing about the other.
   */
  private onKey = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) return;
    if (event.key === 'Tab') return;
    this.skip();
  };

  /**
   * Finish the current line at once, and count it.
   *
   * She reads far faster than this speaks and she will hammer through. So the narrator notices, once,
   * and says so — the most personal observation the site can make, because it is about something she
   * is doing at that moment rather than something it has assumed about her.
   */
  private skip = (): void => {
    if (this.speaking) this.skips += 1;
    this.finishCurrent?.();
    if (this.skips === 7 && !this.remarked) {
      this.remarked = true;
      void this.say('You are getting ahead of me.', 'I do have a delivery. It is considered.');
    }
  };

  say(...lines: string[]): Promise<void> {
    if (this.dead) return Promise.resolve();
    this.restartNudge();
    return new Promise((resolve) => {
      lines.forEach((text, index) => {
        this.queue.push({
          text,
          instructional: instructional(text),
          resolve: index === lines.length - 1 ? resolve : () => undefined,
        });
      });
      if (!this.speaking) this.pump();
    });
  }

  /** Drop whatever was queued and say this instead. For reacting to something she just did. */
  cut(...lines: string[]): Promise<void> {
    for (const pending of this.queue) pending.resolve();
    this.queue = [];
    this.finishCurrent?.();
    return this.say(...lines);
  }

  /**
   * She has done it. Stop nudging, throw away anything still queued, and say this instead.
   *
   * The queue-clearing half is the important half and it is easy to leave out. Hints fire on a timer,
   * so a nudge that went out four seconds before she solved the puzzle is still in the queue when she
   * solves it — and it plays *after*, telling her how to do the thing she has just done.
   */
  solved(...lines: string[]): Promise<void> {
    this.hush();
    return this.cut(...lines);
  }

  private pump(): void {
    const next = this.queue.shift();
    if (!next) {
      this.speaking = false;
      this.caret.classList.remove('typing');
      // **The ladder measures silence, not time since somebody called `say()`.** Without this a
      // beat that opens with twenty seconds of banter gets a hint fired into the middle of it,
      // which is both the wrong information and the wrong moment — and it is exactly what happened
      // once the rungs came down to sixteen seconds.
      this.restartNudge();
      return;
    }
    // It is talking. Nothing is stuck while it is talking.
    if (this.nudgeTimer) clearTimeout(this.nudgeTimer);
    this.nudgeTimer = null;
    this.speaking = true;
    this.type(next, (spoken) => {
      next.resolve();
      this.timer = setTimeout(() => this.pump(), holdFor(next.text, next.instructional, spoken));
    });
  }

  /** Push the finished line up into the dimmed slot. */
  private shelve(text: string): void {
    this.previous.textContent = plain(text);
  }

  private type(entry: Queued, done: (spoken: boolean) => void): void {
    const text = entry.text;
    const parts = runs(text);
    const nodes = parts.map((run) => el(run.bold ? 'strong' : 'span', null));

    // The line that just finished moves up before this one starts, so there are always two.
    const outgoing = this.line.textContent ?? '';
    if (outgoing !== '') this.shelve(outgoing);

    this.line.replaceChildren(...nodes);
    this.caret.classList.add('typing');

    const full = plain(text);
    const total = full.length;
    const spoken = this.speaks;
    let revealed = 0;
    let blips = 0;
    let ended = false;
    let guard: ReturnType<typeof setTimeout> | null = null;

    /** Paint the first `count` characters across the runs. */
    const paint = (count: number): void => {
      let left = count;
      parts.forEach((part, i) => {
        const node = nodes[i];
        if (!node) return;
        const take = Math.max(0, Math.min(part.text.length, left));
        node.textContent = part.text.slice(0, take);
        left -= part.text.length;
      });
    };

    const settle = (): void => {
      if (ended) return;
      ended = true;
      paint(total);
      // The live region is the accessible channel only when the page is not speaking. Writing
      // nothing announces nothing, which is the robust form of switching it off — mutating the
      // `aria-live` attribute itself is unreliable across screen readers.
      if (!spoken) this.live.textContent = full;
      this.finishCurrent = null;
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      if (guard) clearTimeout(guard);
      guard = null;
      if (spoken) this.speech.cancel();
      done(spoken);
    };

    this.finishCurrent = settle;

    // --- spoken: the text follows the voice ----------------------------------

    if (spoken) {
      const estimated = Math.max(600, this.speech.estimate(text));
      const perChar = estimated / Math.max(1, total);
      const started = performance.now();
      let boundaryAt = 0;

      /**
       * **The line must never be able to stall on a missing event.**
       *
       * `SpeechSynthesis` is the least reliable API on the platform: an engine that swallows `end`,
       * a tab backgrounded mid-utterance, a voice that disappears when the OS switches output
       * device. With speech behind a toggle that was a spoiled sentence; with speech as the default
       * channel it is the whole experience stopping dead. So the clock always wins in the end.
       */
      guard = setTimeout(settle, estimated * 2.2 + 3000);

      this.speech.speak(text, {
        panicked: this.panicked,
        onProgress: (charIndex) => {
          // Boundaries are the truth when they arrive; the clock is the fallback when they do not.
          boundaryAt = Math.max(boundaryAt, charIndex);
        },
        onEnd: settle,
      });

      // Reduced motion still gets the sentence at once — it just waits for the voice to finish it.
      if (reducedMotion()) {
        paint(total);
        return;
      }

      const follow = (): void => {
        if (this.dead || ended) return;
        const byClock = Math.floor((performance.now() - started) / perChar);
        revealed = Math.max(revealed, Math.min(total, Math.max(byClock, boundaryAt)));
        paint(revealed);
        if (revealed >= total) return;
        this.timer = setTimeout(follow, 40);
      };
      follow();
      return;
    }

    // Reduced motion gets the sentence, not the performance. Same rule as everywhere else on the
    // site: the resting state is the finished state.
    if (reducedMotion()) {
      settle();
      return;
    }

    // --- typed: character by character, in a clarinet -------------------------

    const step = (): void => {
      if (this.dead) return;
      if (revealed >= total) {
        settle();
        return;
      }
      const character = full[revealed] ?? '';
      revealed += 1;
      paint(revealed);

      // Every other character, and never on a space. One blip per letter is a machine gun.
      if (this.voiced && character.trim() !== '' && blips % 2 === 0) this.reed.blip(blips);
      blips += 1;

      this.timer = setTimeout(step, PER_CHARACTER + (BREATH[character] ?? 0));
    };

    step();
  }

  // --- the hint ladder -------------------------------------------------------

  /**
   * Set the hints for the beat that is now running. Call once per beat.
   *
   * Written worst-to-best on purpose: rung one is barely a hint, rung three is the answer in plain
   * words. A player who wants to work it out is never spoiled and a player who is stuck is never
   * abandoned, because the only thing between those two outcomes is patience.
   */
  nudge(...ladder: string[]): void {
    this.ladder = ladder;
    this.rung = 0;
    this.restartNudge();
  }

  /** She did something. Reset the clock — she is not stuck. */
  poke(): void {
    this.restartNudge();
  }

  /** Beat solved. Stop nudging until the next one arms itself. */
  hush(): void {
    this.ladder = [];
    if (this.nudgeTimer) clearTimeout(this.nudgeTimer);
    this.nudgeTimer = null;
  }

  private restartNudge(): void {
    if (this.nudgeTimer) clearTimeout(this.nudgeTimer);
    this.nudgeTimer = null;
    if (this.ladder.length === 0 || this.dead) return;
    const wait = NUDGE_AT[Math.min(this.rung, NUDGE_AT.length - 1)] ?? 45_000;
    this.nudgeTimer = setTimeout(() => {
      const hint = this.ladder[Math.min(this.rung, this.ladder.length - 1)];
      this.rung += 1;
      if (hint) void this.say(hint);
      else this.restartNudge();
    }, wait);
  }

  // --- state -----------------------------------------------------------------

  /** Add a class to the strip. Beats use it to make the voice look rattled, or official, or off. */
  mood(name: string | null): void {
    this.panicked = name === 'rattled';
    this.root.className = name ? `narrator narrator-${name}` : 'narrator';
    this.root.classList.toggle('narrator-silenced', !this.voiced);
  }

  /**
   * Take its voice away, or give it back.
   *
   * Deliberately *not* the site's own mute button. Muting the site is a real preference that gets
   * written to `localStorage` and survives the tab, and a puzzle has no business reaching into that —
   * she would silence the narrator here and Jodi would lose chapter 2's warning pip next week. This
   * is the narrator's own throat, and it is the thing the mute beat is fighting over.
   *
   * **It now costs it something.** Since the third pass this stops an actual voice mid-word and
   * leaves the thing typing at her in a dead strip, which is the version of that joke that was always
   * intended. The subtitles keep working, which is both the point and the accessibility position:
   * nothing here has ever been carried by sound alone, so losing the sound costs the narrator its
   * dignity and costs the player nothing. It is very annoyed about this.
   */
  voice(on: boolean): void {
    this.voiced = on;
    this.root.classList.toggle('narrator-silenced', !on);
    if (!on) this.speech.cancel();
  }

  get muted(): boolean {
    return this.sfx.muted || !this.voiced;
  }

  dispose(): void {
    this.dead = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.nudgeTimer) clearTimeout(this.nudgeTimer);
    for (const pending of this.queue) pending.resolve();
    this.queue = [];
    this.finishCurrent?.();
    this.offMute();
    this.speech.dispose();
    this.root.removeEventListener('pointerdown', this.skip);
    document.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }
}
