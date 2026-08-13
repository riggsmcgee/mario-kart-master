/**
 * Reading it out loud. (4e4, second pass — Riggs, 2026-08-13: "are there any voice generators that
 * you can use? if its just text, then it goes by a bit fast.")
 *
 * The answer is yes, exactly one, and it is already in the browser: `SpeechSynthesis`. There is no
 * second option on the web platform, and every alternative worth having — a human recording, or
 * offline TTS pre-rendered into files — costs the thing this codebase is built on, which is that no
 * asset ever enters the repo and the script stays editable.
 *
 * **It is on from the first line, and there is no control to turn it off.** (Riggs, 2026-08-13:
 * *"Work the speech narrator into the actual game. Start with it narrating by default."*) The second
 * pass hid it behind a toggle, on the theory that a synthesiser would trample the clarinet reveal in
 * beat 4. That was wrong twice over. The clarinet is not upstaged — it is what she hears for the
 * whole muted stretch between beats 3 and 4, which sets the reveal up far better than a toggle
 * nobody pressed. And the mute war only becomes what it is meant to be once there is a real voice to
 * take away.
 *
 * The one thing that silences it is silence itself: the site's own mute, or the narrator's throat
 * being taken off it by beat 3. Both are inside the fiction, which is where the switch belongs.
 *
 * **`localService` is the whole engineering story.** Chrome's better-sounding "Google …" voices are
 * synthesised on a server, and that one fact causes all three of the API's serious problems: a
 * network round-trip on a site that makes none, a ~15-second cutoff on long utterances, and boundary
 * events that never fire so nothing can be synced to them. Filtering to on-device voices removes all
 * three at once, and costs a little polish on Chrome.
 *
 * Everything here fails quiet. A browser with no speech, a machine with no English voice, a tab that
 * has not been clicked yet — all of them end with the strip doing exactly what it does today, which
 * is the state this experience was designed in.
 */

/**
 * Ordered best to worst; first match wins. Aiming at dry and institutional rather than warm.
 *
 * `Daniel` is the target sound and is present on every Mac. Windows realistically lands on
 * `Microsoft David` unless the UK language pack is installed, which is fine — flat and slightly
 * nasal is a perfectly good bureaucrat.
 */
const WANTED = [
  'Daniel',
  'Microsoft George',
  'Microsoft Hazel',
  'Serena',
  'Microsoft David',
  'Alex',
  'Samantha',
];

/**
 * Deliberate rather than brisk, and a notch flat. Chirpy is the cringe risk, not robotic.
 *
 * Nudged up from 0.9 once the voice became the thing that sets the pace of the whole experience.
 * Every percent here is a percent off the running time, and at 0.95 it is still unmistakably a form
 * being read out by something that would rather be doing anything else.
 */
const RATE = 0.95;
const PITCH = 0.9;
const VOLUME = 0.85;

/** Characters per second at `RATE`. Used to pace the typewriter when boundaries never arrive. */
const CHARS_PER_SECOND = 15.2;

function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .trim();
}

function langOf(voice: SpeechSynthesisVoice): string {
  return (voice.lang || '').replace('_', '-').toLowerCase();
}

function pickVoice(all: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const local = all.filter((v) => v.localService && langOf(v).startsWith('en'));
  const pool = local.length > 0 ? local : all.filter((v) => langOf(v).startsWith('en'));

  for (const want of WANTED) {
    const hit = pool.find((v) => normalise(v.name).startsWith(normalise(want)));
    if (hit) return hit;
  }
  // No preferred voice is not "no speech": `utterance.lang` still steers the platform default.
  return (
    pool.find((v) => langOf(v) === 'en-gb') ?? pool.find((v) => langOf(v).startsWith('en')) ?? null
  );
}

/**
 * What the synthesiser is given, which is not what is on screen.
 *
 * `**bold**` markers would be read out as asterisks. An ellipsis is worse than useless — some
 * engines pause on it, some ignore it, and some say "dot dot dot" — so it becomes a full stop, which
 * every engine treats as the pause it was standing in for. There is no SSML on this API; punctuation
 * and separate utterances are the only prosody controls that exist.
 */
export function speakable(text: string): string {
  return text.replace(/\*\*/g, '').replace(/…/g, '.').replace(/—/g, ',').trim();
}

export interface SpeakOptions {
  /** Rattled lines go up a little and get quicker. Free characterisation, per utterance. */
  panicked?: boolean;
  /** Fired as the voice moves through the text, when the platform supports it. */
  onProgress?: (charIndex: number) => void;
  onEnd?: () => void;
}

export class Speech {
  private voice: SpeechSynthesisVoice | null = null;
  private ready = false;
  private current: SpeechSynthesisUtterance | null = null;
  /**
   * Every utterance ever spoken, kept alive on purpose.
   *
   * Chrome and Safari have both shipped a bug where an utterance that goes out of scope while it is
   * still speaking gets collected mid-sentence and the voice simply stops. A reference somewhere the
   * collector can see is the whole fix. `dispose()` empties it.
   */
  private readonly anchors: SpeechSynthesisUtterance[] = [];
  private onVoices: (() => void) | null = null;

  /** Whether this browser has the API at all. Not whether it will actually make a sound. */
  static get supported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  constructor() {
    if (!Speech.supported) return;
    // Voices load asynchronously and the first call almost always returns an empty list. Ask once,
    // then listen — and keep working if the event never comes, which is the Safari case.
    this.load();
    this.onVoices = () => this.load();
    window.speechSynthesis.addEventListener('voiceschanged', this.onVoices);
  }

  private load(): void {
    try {
      const all = window.speechSynthesis.getVoices();
      if (all.length === 0) return;
      this.voice = pickVoice(all);
      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  /**
   * Estimated milliseconds to speak this, for pacing the typewriter when the platform gives no
   * boundary events. Deliberately an over-estimate — text finishing slightly before the voice does
   * reads as fine, and text still crawling after the voice has stopped reads as broken.
   */
  estimate(text: string): number {
    return (speakable(text).length / CHARS_PER_SECOND) * 1000;
  }

  speak(text: string, options: SpeakOptions = {}): void {
    if (!Speech.supported) {
      options.onEnd?.();
      return;
    }
    const body = speakable(text);
    if (body === '') {
      options.onEnd?.();
      return;
    }

    try {
      const synth = window.speechSynthesis;
      // `cancel()` immediately followed by `speak()` drops the new utterance on several engines.
      // A zero-delay timeout is enough to let the queue actually clear.
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(body);
      if (this.voice) utterance.voice = this.voice;
      utterance.lang = this.voice?.lang ?? 'en-GB';
      utterance.rate = options.panicked ? 1 : RATE;
      utterance.pitch = options.panicked ? 1.05 : PITCH;
      utterance.volume = VOLUME;

      let done = false;
      const finish = (): void => {
        if (done) return;
        done = true;
        if (this.current === utterance) this.current = null;
        options.onEnd?.();
      };
      utterance.addEventListener('end', finish);
      utterance.addEventListener('error', finish);
      if (options.onProgress) {
        utterance.addEventListener('boundary', (event) => options.onProgress?.(event.charIndex));
      }

      this.current = utterance;
      this.anchors.push(utterance);
      // The `try` around this method does **not** cover the callback — it has already returned by the
      // time this runs. An engine that throws in here (a device with the voice list pulled out from
      // under it, an extension that has replaced the API badly) would otherwise raise an uncaught
      // error and, worse, never fire `end`, leaving the line that called this waiting forever.
      setTimeout(() => {
        if (this.current !== utterance) return;
        try {
          synth.speak(utterance);
        } catch {
          finish();
        }
      }, 0);
    } catch {
      options.onEnd?.();
    }
  }

  cancel(): void {
    if (!Speech.supported) return;
    this.current = null;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Nothing to stop.
    }
  }

  dispose(): void {
    this.cancel();
    this.anchors.length = 0;
    if (this.onVoices && Speech.supported) {
      window.speechSynthesis.removeEventListener('voiceschanged', this.onVoices);
    }
    this.onVoices = null;
  }

  /** True once at least one usable voice has been enumerated. */
  get usable(): boolean {
    return Speech.supported && this.ready;
  }
}
