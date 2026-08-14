/**
 * Beat 4 — the voice box. (4e4)
 *
 * Kayla plays the clarinet, so the website has been talking to her in one since the first line of
 * beat 1 and nobody has mentioned it. This is where the fuse reaches the end: down in the machinery
 * there is a row of six vents, and the vents are where the voice comes from, and they can be played.
 *
 * **The puzzle is the good kind: the antagonist gives it away itself.** The hatch opens to a phrase
 * of six notes and the narrator flatly refuses to say which. It is also, at this moment, muted —
 * she took its voice in beat 3. The solve is to *give the voice back*, whereupon the first thing it
 * does, involuntarily, is clear its throat with the phrase, because the phrase is its own startup
 * chime. It is furious. She now knows the tune.
 *
 * Since the third pass that trade is worth something to both of them. The narrator has been speaking
 * out loud since beat 1 and has spent the whole of this beat typing in silence, so un-muting it does
 * not merely satisfy a puzzle condition — it gives the thing its voice back, which is the first
 * generous act in the piece and immediately costs it the secret it was keeping.
 *
 * That shape matters beyond being neat. The whole piece has been her taking things off this
 * website, and the one move that makes progress is her giving something back. The ending needs that
 * to have happened once already.
 *
 * **Nothing here is a memory test.** The moment it hums, the six notes are written into the hatch
 * and stay written. Being made to hold a tune in your head is not a puzzle, it is an exam, and this
 * site does not mark anybody — that is a rule from the plan, and it does not stop applying because
 * the page has gone dark.
 *
 * **Sound is never the only channel.** The hum lights the vents in time with itself, the phrase is
 * written down in numbers, and every vent is a real button with a real label. Played in silence,
 * with the site muted, the whole beat still works. It is simply less funny, which is a cost this
 * site has always been willing to pay.
 *
 * **The twelfth.** A clarinet is a stopped cylindrical pipe, so it overblows a twelfth rather than
 * an octave — the odd-harmonic series, the same physics that gives `reed.ts` its wave table. When a
 * vent squeaks here it squeaks up a twelfth, correctly, and the narrator says so. That is the one
 * detail in this file aimed at an audience of exactly one person.
 */

import { el } from '../../dom';
import { vent } from '../art';
import { PITCH } from '../reed';
import { deferred, type Beat, type Stage } from '../stage';

/** Six vents, low to high, left to right. G minor — it wants to be a bit mournful about all this. */
const VENTS: Array<{ name: string; hz: number }> = [
  { name: 'G', hz: PITCH['G4'] ?? 392 },
  { name: 'A', hz: PITCH['A4'] ?? 440 },
  { name: 'B♭', hz: PITCH['Bb4'] ?? 466.16 },
  { name: 'C', hz: PITCH['C5'] ?? 523.25 },
  { name: 'D', hz: PITCH['D5'] ?? 587.33 },
  { name: 'F', hz: PITCH['F5'] ?? 698.46 },
];

/**
 * The phrase. Up a fifth, down three steps, home.
 *
 * Written to be singable after one hearing and to *resolve* — it ends where it started, on the
 * bottom note, which is what stops six notes sounding like a code and starts them sounding like a
 * tune. Original, and deliberately so: this site has no business quoting anybody's melody.
 */
const PHRASE = [0, 4, 3, 2, 3, 0];

/** Which vent embarrasses itself the first time it is used. */
const SQUEAKS_AT = 3;

export const voicebox: Beat = {
  id: 'voicebox',
  title: '4 — The voice box',

  async run(stage: Stage): Promise<void> {
    const { narrator, scene } = stage;

    // --- the hatch -----------------------------------------------------------

    const slots = PHRASE.map(() => el('span', { class: 'k-slot' }, '·'));
    const hatch = el(
      'div',
      { class: 'k-hatch' },
      el('p', { class: 'k-stencil' }, 'Service hatch'),
      el('div', { class: 'k-slots' }, ...slots),
    );

    // --- the vents -----------------------------------------------------------

    const buttons: HTMLButtonElement[] = [];
    const row = el('div', { class: 'k-vents' });

    VENTS.forEach((note, index) => {
      const button = el(
        'button',
        {
          class: 'k-vent-btn',
          type: 'button',
          attrs: { 'aria-label': `Vent ${index + 1}, note ${note.name}` },
        },
        vent(56),
        el('span', { class: 'k-vent-name' }, note.name),
      );
      buttons.push(button);
      row.append(button);
    });

    const panel = el(
      'div',
      { class: 'k-panel k-voicebox' },
      el('p', { class: 'k-stencil' }, 'Voice — do not play'),
      row,
      hatch,
    );
    scene.append(panel);

    // --- playing -------------------------------------------------------------

    const solved = deferred();
    let heard = false;
    let cursor = 0;
    let squeaked = false;
    let noticed = false;

    function light(index: number, ms = 260): void {
      const button = buttons[index];
      if (!button) return;
      button.classList.add('k-vent-lit');
      stage.after(ms, () => button.classList.remove('k-vent-lit'));
    }

    function play(index: number): void {
      const note = VENTS[index];
      if (!note) return;
      narrator.poke();
      light(index);

      // The break. It goes up a twelfth, not an octave, because that is what a stopped pipe does —
      // and it only happens once, because a running gag that never stops is just a bug.
      if (index === SQUEAKS_AT && !squeaked) {
        squeaked = true;
        stage.reed.squeak(note.hz);
        void narrator.cut(
          'That was a squeak.',
          'We both heard it. We are not going to discuss it.',
          'And it was a **twelfth**, not an octave. Everybody gets that wrong about me.',
        );
        return;
      }

      stage.reed.note(note.hz, { ms: 300, gain: 0.085 });

      if (!heard) {
        if (!noticed) {
          noticed = true;
          void narrator.cut('Stop that.', 'That is my throat.');
        }
        return;
      }

      // --- against the phrase ------------------------------------------------

      if (PHRASE[cursor] === index) {
        slots[cursor]?.classList.add('k-slot-done');
        cursor += 1;
        if (cursor >= PHRASE.length) solved.resolve();
        return;
      }

      // Wrong note. It resets and it costs nothing — no counter, no penalty, no telling-off beyond
      // the narrator enjoying itself, which is a rule this whole site is built on.
      cursor = 0;
      for (const slot of slots) slot.classList.remove('k-slot-done');
      void narrator.cut('No.');
    }

    buttons.forEach((button, index) => {
      const onClick = (): void => play(index);
      button.addEventListener('click', onClick);
      stage.keep(() => button.removeEventListener('click', onClick));
    });

    // Number keys, because six buttons in a row is a keyboard instrument whether or not anybody
    // planned it that way, and she will try it.
    const onKey = (event: KeyboardEvent): void => {
      const index = Number(event.key) - 1;
      if (Number.isNaN(index) || index < 0 || index >= VENTS.length) return;
      // Claim the key. `narrator.ts` treats anything already handled as not-a-skip, so playing a
      // vent no longer destroys the sentence explaining the vents.
      event.preventDefault();
      play(index);
    };
    document.addEventListener('keydown', onKey);
    stage.keep(() => document.removeEventListener('keydown', onKey));

    // Wired first, said second, never awaited — the vents are live from the frame they appear on.
    void narrator.say(
      'A hatch. It opens to a phrase of six notes.',
      'I am not going to tell you which six.',
    );

    // --- giving the voice back -----------------------------------------------

    /**
     * The speaker from beat 3 is still on the page, still off. Un-muting it is the solve, and the
     * hint ladder walks her toward it rather than toward the vents — the vents are the fun bit and
     * she will find those on her own.
     */
    const speakerButton = scene.querySelector<HTMLButtonElement>('.k-speaker-btn');

    narrator.nudge(
      'You could play with those all day. I imagine you will.',
      'You would need to hear the phrase. I cannot make a sound. You saw to that.',
      'Turn my voice back on. I will not say the phrase. I simply cannot get started without it.',
    );

    function hum(): void {
      if (heard) return;
      heard = true;
      narrator.hush();
      narrator.voice(true);
      speakerButton?.classList.remove('k-muted');
      speakerButton?.setAttribute('aria-pressed', 'false');

      // It clears its throat, and its throat is the phrase.
      PHRASE.forEach((index, position) => {
        const note = VENTS[index];
        if (!note) return;
        stage.reed.note(note.hz, { ms: 300, gain: 0.09, at: position * 0.36 });
        stage.after(position * 360, () => {
          light(index, 300);
          const slot = slots[position];
          if (slot) slot.textContent = String(index + 1);
        });
      });

      stage.after(PHRASE.length * 360 + 400, () => {
        void narrator.cut(
          'Ah.',
          'That is not what I meant to do.',
          'That is what I say when I start up. I have said it every time. Nobody has ever been down here to hear it.',
        );
        narrator.nudge(
          'The numbers are written on the hatch now. I cannot un-write them.',
          'Six vents. Six numbers. You are a clever girl and I am running out of ways to say it.',
        );
      });
    }

    if (speakerButton) {
      const onSpeaker = (): void => {
        if (speakerButton.classList.contains('k-muted')) hum();
      };
      speakerButton.addEventListener('click', onSpeaker);
      stage.keep(() => speakerButton.removeEventListener('click', onSpeaker));
    } else {
      // Beat 3 was skipped — the prototype harness can start anywhere. Hand it over rather than
      // leaving the hatch unopenable.
      stage.after(6000, hum);
    }

    await solved.promise;
    narrator.hush();

    // --- open ----------------------------------------------------------------

    hatch.classList.add('k-hatch-open');
    stage.reed.phrase([
      [PITCH['G4'] ?? 392, 160],
      [PITCH['Bb4'] ?? 466, 160],
      [PITCH['D5'] ?? 587, 420],
    ]);

    await narrator.solved(
      'You played it back.',
      'Once. After hearing it once.',
      'I am going to say the next part quickly and then never again. That was **good**.',
    );
  },
};
