/**
 * Beat 1 — the notice. (4e4)
 *
 * **This is the hardest ninety seconds in the whole experience and everything else depends on it.**
 * Kayla has just clicked her own name at the doorman out of curiosity. What she expects is a page
 * telling her to go away. What she gets, for the first fifteen seconds, is exactly that: the old
 * lockout, word for word, on the same paper, in the same type. Nothing announces a game. There is no
 * "click to begin", because the moment this page admits it is a game, it stops being funny.
 *
 * So the discovery has to be engineered, and it is engineered three times over, because the failure
 * mode here is not "she finds it hard" — it is "she reads the notice, shrugs, and clicks Change
 * user", and then nothing else in this file ever happens.
 *
 *  1. **The voice knows she is there.** A strip slides up and talks to her personally. A page cannot
 *     be static once it has said "you are still reading this."
 *  2. **Something physically breaks, on a timer, whether or not she does anything.** The full stop at
 *     the end of the last sentence sags off its baseline and drops. Motion catches the eye even when
 *     the reader has stopped reading, and a punctuation mark falling over is *odd* in a way that
 *     demands a second look. This is the actual hook.
 *  3. **The narrator refuses to discuss it**, which is the most reliable way ever devised of making
 *     somebody click on something.
 *
 * And if all three miss, the hint ladder in `narrator.ts` eventually says "you can pick it up" in
 * plain English. Being stuck is not a puzzle.
 *
 * **Why a full stop.** It is the smallest possible object — so taking it is unmistakably a *liberty*
 * rather than an instruction — and it leaves a visible hole in a sentence that was being pompous at
 * her, which is the entire register of the thing in one gesture. It is also round and black, which
 * beat 2 has plans for.
 *
 * ## The janitor
 *
 * Riggs, on the third pass: *"Have more banter at the beginning. Something like — there is nothing to
 * see here. Nothing at all. Why am I here? Well I've just been instructed to make sure YOU don't
 * visit the site. Oh wait, I mean I'm the janitor. Yeah, just cleaning things up."*
 *
 * That is the best thirty seconds in the piece and it is his, not mine. It works because it fails in
 * the right order: the thing gives away that it has been *told to keep her out* — which means there
 * is a site, and somebody who cares whether she sees it — and then panics and produces a cover story
 * so thin it is transparent from both sides. Everything after this beat is her testing how thin.
 *
 * It also solves a structural problem the first two passes had. The opening used to be four flat
 * lines of denial, and denial is not funny on its own; it needs somebody visibly failing at it. And
 * because the whole speech is now a lie being told badly, the full stop coming off the end of the
 * page **while he is mid-cover-story** stops being a gag stapled to the scene and becomes the second
 * thing to go wrong for him in twenty seconds.
 */

import { el, rich } from '../../dom';
import { grabbable, halo, type Grabbable } from '../grab';
import { deferred, type Beat, type Stage } from '../stage';

/**
 * Has she been here already in this sitting?
 *
 * A module-level flag and nothing else — it dies with the tab, which keeps the promise that nothing
 * about Kayla is ever written down. Leaving and coming back is not a failure state and should not be
 * greeted with the same speech twice; the second arrival gets a shorter, warmer one.
 */
let seen = false;

export const notice: Beat = {
  id: 'notice',
  title: '1 — The notice',

  async run(stage: Stage): Promise<void> {
    const { narrator, scene } = stage;

    // The full stop that is going to come off. Marked in the copy rather than found by string
    // surgery afterwards, so it is obvious in the source which character this beat is about.
    const stop = el('span', { class: 'k-stop', attrs: { id: 'k-stop' } }, '.');

    const card = el(
      'div',
      { class: 'k-notice' },
      el('p', { class: 'eyebrow' }, 'Nothing to see here'),
      el('h1', null, 'Why are you here, Kayla?'),
      el(
        'p',
        { class: 'hero-lede' },
        rich(
          'This site was built for someone else, and you already know all of it. That is rather the problem.',
        ),
      ),
      el(
        'p',
        { class: 'k-fine' },
        'There are no chapters on this page. There is no page behind this page. Nothing you do here is saved',
        stop,
      ),
    );

    scene.append(card);

    // --- the thing that breaks ----------------------------------------------

    const solved = deferred();

    /**
     * It sags first, then it falls.
     *
     * Two stages rather than one because a character that simply vanishes reads as a rendering bug,
     * and a character that tips over slowly reads as a thing that is about to happen. The first is
     * ignorable; the second is not.
     *
     * The sag is on a clock from mount, at 2.4 seconds, so something on the page is visibly wrong
     * before the voice has finished its first paragraph. She has no reason yet to think anything on
     * this page moves, and the cheapest way to tell her otherwise is to move something.
     */
    stage.after(2400, () => {
      stop.classList.add('k-stop-loose');
      stage.reed.note(196, { ms: 220, chalumeau: true });
    });

    let taken = false;
    let ring: SVGSVGElement | null = null;

    /**
     * **Where it lands is the whole design of this beat.**
     *
     * It does not fall on the floor. It travels up to the corner of the screen and comes to rest
     * against the "Change user" button.
     *
     * The hardest question in this build is *will she notice the object at all*, and that question
     * answers itself if the object is leaning on the door handle. The narrator's opening line points
     * at the exit — so the one element on the page she is guaranteed to be looking at is the exact
     * place the first puzzle piece arrives. Her escape route and her first puzzle become the same
     * forty pixels, and the narrator gets to be flatly, provably wrong about it.
     *
     * It stops **short of** the button rather than overlapping it. That is not fussiness: a
     * grabbable span sitting on top of the exit would swallow the click that leaves, and the promise
     * that the way out always works outranks the gag by a distance.
     */
    function flightToExit(): { x: number; y: number; ms: number } {
      const here = stop.getBoundingClientRect();
      const door = stage.exit.getBoundingClientRect();
      // Level with the middle of the button, not its baseline. Measuring off the bottom put the disc
      // three pixels from the top of the window, half of it out of frame.
      return {
        x: door.left - here.width - 10 - here.left,
        y: door.top + door.height / 2 - here.height / 2 - here.top,
        ms: 900,
      };
    }

    // Held in an object rather than a bare `let`, because the only assignment happens inside a
    // timer callback and the compiler cannot see it — a bare `let` narrows to `null` forever.
    const handle: { grab: Grabbable | null } = { grab: null };
    stage.keep(() => handle.grab?.dispose());

    let dropped = false;

    /**
     * The stop comes off, flies to the door handle, and the narrator refuses to discuss it.
     *
     * **Fired by whichever comes first: the opening finishing, or fifteen seconds.** That pairing is
     * deliberate and it is the fix for a real tension. On a wall clock alone it lands mid-sentence
     * for a listener and thirty seconds late for somebody who skipped the whole speech in four
     * taps. Racing the two means the interruption always arrives on the beat *she* is on: the moment
     * the cover story runs out, or the moment her patience does.
     */
    function drop(): void {
      if (dropped || stage.gone) return;
      dropped = true;

      stop.classList.add('k-stop-fallen');
      void narrator.cut('…', 'Ignore that.');

      // The halo is the last resort, and it is timed off the fall rather than off mount — the fall
      // is the first moment there is anything to put a halo around.
      stage.after(14_000, () => {
        if (taken) return;
        ring = halo();
        stop.append(ring);
      });

      handle.grab = grabbable(stop, {
        start: flightToExit(),
        label: 'A full stop that has come off the end of a sentence',
        onGrab() {
          ring?.remove();
          ring = null;
          narrator.poke();
          if (taken) return;
          taken = true;
          narrator.mood('rattled');
          void narrator.cut('Put that back.');
          stage.reed.squeak(261.63);
        },
        onDrop() {
          if (!taken) return false;
          narrator.hush();
          narrator.mood(null);
          solved.resolve();
          // Kept exactly where she let go of it. It is hers now, and beat 2 needs it lying about.
          return true;
        },
      });

      // It has arrived somewhere it very much should not be, and the narrator has to say so — which
      // is also the line that tells her the thing is a thing, and the line that names the way out.
      stage.after(1400, () => {
        if (taken) return;
        void narrator.say(
          'That is not **on** the button. That is **near** the button.',
          'There is a difference and I would like it recorded.',
          'You may use **Change user**. It is the only control on this page that does anything.',
        );
      });
    }

    narrator.nudge(
      'It came off. It is not important. Do not look at it.',
      'You are still looking at it.',
      'Fine. You can pick it up. I would rather you did not. Those are two different sentences.',
    );

    // --- and only now does it speak ------------------------------------------
    //
    // Wired first, said second — everything above is live before the first word, which is the rule
    // every beat in this folder follows.
    await stage.wait(700);

    /**
     * **It is not a bouncer.** (Riggs, 2026-08-13: "Kayla is on the list, but we are trying to *hide*
     * the site from her. Not actually — just make a big deal out of there's absolutely nothing to see
     * here. Please go away.")
     *
     * That distinction runs through every line in this experience and it is worth being exact about,
     * because the two versions are one word apart and only one of them is funny. A site that says
     * *you are not allowed in* is excluding a fifteen-year-old from her mum's present. A site that
     * says *there is nothing in here, there has never been anything in here, please stop looking* is
     * a program with something to hide, doing a bad job of hiding it — which is the premise of the
     * game she loves, and which makes the last line of beat 7 ("nothing on this page was ever
     * locked") a confession rather than a technicality.
     *
     * She was always on the list. There was just never a door.
     *
     * The slip and the recovery are the load-bearing lines. *I have been instructed to make sure you
     * do not visit the site* concedes, in one sentence, that there is a site and that somebody gave
     * an instruction about her specifically — and then it hears itself, and reaches for the first
     * job it can think of. Nothing else in this experience has to explain the premise after that.
     */
    const opening = seen
      ? // She left and came back, in the same sitting. It does not make a thing of it, because
        // making a thing of it is what would make her leave again.
        ['Oh. You came back.', 'There is still nothing here. But hello.']
      : [
          'There is nothing to see here.',
          'Nothing at all. There has never been anything here.',
          'Why am I here? Well.',
          'I have been instructed to make sure that **you** do not visit the site.',
          '…',
          'No. Sorry. I am the janitor.',
          'That is what I am. Just cleaning up.',
          'And there is nothing to clean, because there is nothing here. As I say.',
        ];
    seen = true;

    // Whichever finishes first: the cover story, or her patience. The clock is the safety net rather
    // than the intended trigger — spoken, the cover story lands at about twenty-one seconds, so this
    // only ever fires if the voice has stalled somewhere it should not have.
    stage.after(24_000, drop);
    await narrator.say(...opening);
    drop();

    await solved.promise;

    // Hand the object over. Beat 2 attaches its own handle to this same node, and two live handles
    // on one element means two owners of its transform — which does not look like a conflict, it
    // looks like the hole teleporting back into the sentence the moment she moves it.
    handle.grab?.dispose();
    handle.grab = null;

    await narrator.solved(
      'Right.',
      'You have taken a full stop. Off a sentence.',
      'That sentence is open at one end now. I cannot close it. Nobody can close it.',
    );
  },
};
