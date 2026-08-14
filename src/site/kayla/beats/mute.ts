/**
 * Beat 3 — the mute war. (4e4)
 *
 * The best-loved mechanic in the game this is imitating, and the cheapest to build: you silence the
 * voice, the voice objects, the voice un-silences itself, and the third time it fights dirty. It is
 * beloved because it is the moment the software stops being a set of rules and becomes somebody with
 * something to lose.
 *
 * **Since the third pass there is an actual voice to take.** The narrator speaks out loud from the
 * first line of beat 1, so pressing this button stops a sentence mid-word and leaves the thing typing
 * at her in a dead strip — and everything it types for the next few minutes is typed rather than
 * said. That is the version of this joke that was always intended and the second pass could not have,
 * because the speech was behind a toggle nobody was going to find. It is also the setup for beat 4:
 * the silence she is about to spend two minutes in is the thing she has to undo to hear the phrase.
 *
 * **Three escalations, and the third one is the puzzle.**
 *
 *  1. *She mutes it.* The blips stop. It comes back with the best line it has: subtitles exist, she
 *     has achieved nothing, and it is plainly furious about achieving nothing.
 *  2. *She mutes it again.* This time it sends **its own mouse pointer** across the screen to press
 *     the button back. A second cursor appearing on a web page, unannounced, is the single most
 *     alarming thing this whole experience does, and it costs about forty lines.
 *  3. *She catches the pointer mid-flight and drags it away.* That is the solve, and it is the one
 *     moment in the whole piece that asks for hands rather than thinking.
 *
 * **Which is the point of it.** This entire website exists because Kayla wins on reaction speed and
 * her mum cannot out-react her. Every chapter of Jodi's course is an argument for preparation over
 * reflexes. So the one thing Kayla's half of the site asks her to do is *be fast* — the thing she is
 * best at, the thing the rest of the site is organised around neutralising — and it tells her she is
 * good at it. That is the closest this gets to saying something out loud, and it says it as a verb.
 *
 * **It cannot be failed.** The pointer slows by a fifth on every attempt and there is no limit on
 * attempts. Rubber-banding, which is both the correct accessibility answer and a joke about the game
 * this site is about. She will not notice; someone slower will, and will still catch it.
 */

import { el } from '../../dom';
import { pointer, speaker } from '../art';
import { grabbable } from '../grab';
import { deferred, type Beat, type Stage } from '../stage';

/** Seconds for the narrator's pointer to cross the screen on the first attempt. */
const FLIGHT_MS = 2300;

/** Each failed attempt makes the next one this much slower. */
const MERCY = 1.22;

export const mute: Beat = {
  id: 'mute',
  title: '3 — The mute war',

  async run(stage: Stage): Promise<void> {
    const { narrator, scene } = stage;

    const icon = speaker(72);
    const button = el(
      'button',
      {
        class: 'k-speaker-btn',
        type: 'button',
        attrs: { 'aria-label': 'Audio. Do not adjust.', 'aria-pressed': 'false' },
      },
      icon,
    );

    const panel = el(
      'div',
      { class: 'k-panel' },
      el('p', { class: 'k-stencil' }, 'Audio'),
      button,
      el('p', { class: 'k-fine' }, 'Do not adjust'),
    );

    scene.append(panel);

    const solved = deferred();
    let muted = false;
    /** How many times she has silenced it. Drives the escalation. */
    let presses = 0;
    /** How many times it has sent the pointer. Drives only the mercy curve. */
    let round = 0;
    let flight: number | null = null;
    /** She has her hands on it. Permanent — the flight never resumes after this. */
    let caught = false;
    /** It is in the bin. */
    let binned = false;

    function setMuted(next: boolean): void {
      muted = next;
      button.setAttribute('aria-pressed', String(next));
      button.classList.toggle('k-muted', next);
      narrator.voice(!next);
    }

    // --- the narrator's own pointer ------------------------------------------

    const ghost = el('div', { class: 'k-ghost-cursor' }, pointer(36));
    ghost.hidden = true;
    scene.append(ghost);

    function stopFlight(): void {
      if (flight !== null) cancelAnimationFrame(flight);
      flight = null;
    }

    stage.keep(stopFlight);

    /**
     * Send it in from off the left, on a straight line to the button.
     *
     * Positioned in page coordinates against the scene rather than the viewport, so a scrolled or
     * short window does not launch it somewhere she cannot reach.
     */
    function launch(): void {
      const bounds = scene.getBoundingClientRect();
      const target = button.getBoundingClientRect();
      const toX = target.left + target.width / 2 - bounds.left - 8;
      const toY = target.top + target.height / 2 - bounds.top - 8;
      const fromX = -60;
      const fromY = toY + 120;

      const duration = FLIGHT_MS * Math.pow(MERCY, round);
      round += 1;

      ghost.hidden = false;
      ghost.style.left = `${fromX}px`;
      ghost.style.top = `${fromY}px`;

      const start = performance.now();
      const step = (now: number): void => {
        if (stage.gone || caught) return;
        const t = Math.min((now - start) / duration, 1);
        // Slight ease so it reads as something steering rather than something fired.
        const eased = t * t * (3 - 2 * t);
        ghost.style.left = `${(fromX + (toX - fromX) * eased).toFixed(1)}px`;
        ghost.style.top = `${(fromY + (toY - fromY) * eased).toFixed(1)}px`;
        if (t < 1) {
          flight = requestAnimationFrame(step);
          return;
        }
        // It got there. Button pressed, voice back, and it is unbearable about it.
        flight = null;
        ghost.hidden = true;
        setMuted(false);
        stage.reed.note(523.25, { ms: 140 });
        void narrator.cut('Thank you.', 'Now. Where were we.');
        narrator.nudge(
          'You may of course try again. I would not.',
          'It is only going to happen again.',
          'You could take the pointer off me. Catch it. That is what I would do.',
        );
      };
      flight = requestAnimationFrame(step);
    }

    // --- catching it ---------------------------------------------------------

    /**
     * **Two steps, not one.**
     *
     * The first is catching it, which is a reflex and is over in half a second. The second is putting
     * it in the bin, which is deliberate and can be taken at whatever pace she likes.
     *
     * An earlier version made those the same step — catch it *and* carry it more than 170px from the
     * button, or it escapes and flies again. That punished the wrong thing. Catching a moving cursor
     * out of the air is the hard part and the good part, so it now succeeds permanently the instant
     * her finger lands on it. Whatever happens next cannot take it away from her.
     */
    const grab = grabbable(ghost, {
      label: "The narrator's mouse pointer",
      targets: () => [stage.pocket.root],
      onGrab() {
        stopFlight();
        narrator.poke();
        if (caught) return;
        caught = true;
        narrator.mood('rattled');
        narrator.hush();
        void narrator.cut('No.', 'That is mine.', 'Give it back. Give it — ');

        // The bin arrives the instant she has hold of it, so there is always somewhere to put it —
        // an earlier version waited 1.2s for the line to land first, which meant a quick drag had no
        // target at all and dropped the pointer on bare floor. The *prohibition* still lands on its
        // own beat, a moment later, which is the half that matters: it is the only instruction in ten
        // minutes she is guaranteed to disobey, and that is why it is the only one worth giving.
        stage.pocket.reveal();
        stage.after(900, () => {
          if (binned) return;
          void narrator.say('Do not put that in there.');
          narrator.nudge(
            'Anywhere but there.',
            'That is a bin. Things in bins are in bins.',
            'You are going to put it in the bin, are you not.',
          );
        });
      },
      onDrop({ target }) {
        if (!target) return true;
        // In the bin. Nothing is destroyed — it sits there, visible, for the next seven minutes,
        // which is the whole reason the last beat can reach in and hand it back.
        binned = true;
        solved.resolve();
        return true;
      },
    });
    stage.keep(grab);

    // --- the button ----------------------------------------------------------

    function onClick(): void {
      narrator.poke();
      if (caught) return;

      if (!muted) {
        setMuted(true);
        presses += 1;
        stage.reed.note(174.61, { ms: 200, chalumeau: true });

        // Counted on presses, not on launches. An earlier version branched on the launch counter,
        // which never moved on the first round — so the second silencing replayed the first one's
        // speech and the pointer was never sent at all.
        if (presses === 1) {
          narrator.hush();
          void narrator
            .cut(
              '…',
              'Subtitles.',
              'I have subtitles. You have achieved nothing. Nothing at all.',
              'Do not do that again.',
            )
            .then(() => {
              if (stage.gone || caught) return;
              // It presses its own button back, by hand, with no ceremony. The ceremony is next time.
              setMuted(false);
              stage.reed.note(523.25, { ms: 140 });
              void narrator.say('There.');
              narrator.nudge(
                'I would leave that alone now.',
                'You are going to do it again, are you not.',
                'Press it again then. See what happens.',
              );
            });
          return;
        }

        // Second time and after: it does not argue, it sends something.
        narrator.hush();
        void narrator.cut('Right.').then(() => {
          if (stage.gone || caught) return;
          launch();
        });
        return;
      }

      // She un-muted it herself, which is allowed and gets no reaction beyond mild suspicion.
      setMuted(false);
      void narrator.cut('…Thank you?');
    }

    button.addEventListener('click', onClick);
    stage.keep(() => button.removeEventListener('click', onClick));

    /**
     * Only now does it start talking, and it is not awaited.
     *
     * The order matters and it is the same order every beat here uses. The most repeated complaint
     * about the game this borrows from is being locked out of a scene while the narrator finishes a
     * sentence about it — "I could never properly get stuck into the gameplay" — so nothing in this
     * file waits for a line before wiring up the thing the line is about. She can click the speaker
     * on the word "not", which is funnier anyway.
     */
    void narrator.say('Do not touch that.', 'I mean it. That one is not for you.');

    narrator.nudge(
      'You are looking at the thing I told you not to touch.',
      'I could have said nothing about it. I see that now.',
      'Yes. Fine. Click it. Get it over with.',
    );

    await solved.promise;

    // --- she has it ----------------------------------------------------------

    narrator.hush();
    narrator.mood(null);
    setMuted(true);
    ghost.classList.add('k-ghost-caught');
    grab.settle();
    // Strip the drag offset before it goes in the bin. `settle()` stops the thing moving; it does
    // not undo where she moved it to, and a 300px `translate` inside a 2rem slot puts the pointer
    // somewhere off in the grid with an empty box where it should be.
    ghost.style.translate = '';
    ghost.style.left = '';
    ghost.style.top = '';
    stage.pocket.add(ghost, 'A mouse pointer');
    stage.reed.note(110, { ms: 320, gain: 0.06, chalumeau: true });

    // Everything from here is typed in silence, because she has just taken the voice off it — which
    // is the right register for the only thing it says all day that it did not mean to say.
    await narrator.solved(
      'You caught it out of the air, on the way past, and then you put it in the bin.',
      'Of course you did. That is the whole problem with you.',
    );

    // The first plant of the lull that pays off in beat 7. It lets slip that there is a *she*, that
    // she is being taught something, and that it is the opposite of what Kayla just did — and then
    // hears itself and reaches for the reassurance, which is the tell.
    await narrator.say(
      'She could not have done that, you know. Your mother. Not at that speed.',
      'She is upstairs learning the other way round.',
      'Which is nothing for you to worry about.',
      '…I have no voice and I am still saying too much.',
    );
  },
};
