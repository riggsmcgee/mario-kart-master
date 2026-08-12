/**
 * The voiceover player. (3c3)
 *
 * Riggs records the audio (3c2) — that step belongs to a person and cannot be faked, and the
 * plan is clear that his actual voice is the gift here rather than a nice-sounding substitute.
 * So this is built to be correct in both states, and to look deliberate in the state it will
 * spend its first weeks in.
 *
 * **No audio file means no play button.** Not a greyed-out one, not a "coming soon", not a
 * player that throws when clicked: the control simply is not there, and the transcript is the
 * chapter. Drop `ch3.mp3` into `public/audio/` later and the button appears on its own with no
 * code change. A broken-looking control is worse than an absent one, especially on a present.
 *
 * **The transcript is always visible**, whether or not audio exists. That is the plan's own
 * requirement and it is the right one twice over: it is the accessible version, and it is the
 * skimmable version for someone who does not want to sit through ninety seconds of talking.
 */

import { el, rich } from '../site/dom';

export interface VoiceoverOptions {
  chapterId: string;
  /** Paragraphs, in the order they are spoken. */
  transcript: string[];
  /** Fills `{name}` / `{rival}`. */
  t: (text: string) => string;
}

export interface VoiceoverHandle {
  root: HTMLElement;
  /** Stop playback. Called when a drill starts — the plan asks for exactly this. */
  pause(): void;
  dispose(): void;
}

export function createVoiceover(options: VoiceoverOptions): VoiceoverHandle {
  const { chapterId, transcript, t } = options;

  const head = el('div', { class: 'vo-head' });
  const label = el('p', { class: 'eyebrow', style: { margin: '0' } }, 'Riggs, talking at you');
  head.append(label);

  const body = el(
    'div',
    { class: 'vo-transcript' },
    ...transcript.map((line) => el('p', null, rich(t(line)))),
  );

  const root = el('section', { class: 'vo' }, head, body);

  // `import.meta.env.BASE_URL` is '/' in dev and '/mario-kart-master/' in a build, always with
  // a trailing slash. Concatenated, never fed to `new URL()` — that needs an absolute base and
  // throws on both of those values. (The bug that cost session 3 an afternoon; see WORKLOG.)
  const src = `${import.meta.env.BASE_URL}audio/${chapterId}.mp3`;
  const audio = new Audio();
  audio.preload = 'metadata';

  const button = el('button', { class: 'btn', type: 'button' }, '▶  Play');
  let playing = false;

  const setPlaying = (value: boolean): void => {
    playing = value;
    button.textContent = value ? '❚❚  Pause' : '▶  Play';
  };

  button.addEventListener('click', () => {
    if (playing) {
      audio.pause();
      return;
    }
    void audio.play().catch(() => {
      // Autoplay policy, a decoding failure, a file that 404s as HTML. Nothing here is worth
      // an error message on a chapter page — the transcript already says everything the audio
      // would have.
      button.remove();
    });
  });

  audio.addEventListener('play', () => setPlaying(true));
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => setPlaying(false));

  // The probe. A missing file fires `error`; a real one fires `loadedmetadata`, and only then
  // does a control appear. Vite's dev server answers unknown paths with index.html rather than
  // a 404, which decodes as an audio error anyway — so this is right in dev and in production.
  audio.addEventListener('loadedmetadata', () => {
    head.append(button);
    label.textContent = 'Riggs, talking at you';
  });
  audio.addEventListener('error', () => {
    button.remove();
  });

  audio.src = src;

  return {
    root,
    pause() {
      if (!audio.paused) audio.pause();
    },
    dispose() {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      root.remove();
    },
  };
}
