/**
 * Beat 2 — the hole. (4e4)
 *
 * She is holding a full stop. It is round, it is black, and if you look at a round black thing on a
 * page for long enough it stops being a dot and starts being a hole — which is the entire idea, and
 * it is the beat where she works out what kind of thing this is going to be. Beat 1 asked *is this
 * interactive?* This one answers *how far does it go?*, and the answer is "you can eat the website".
 *
 * **The verb is drag-over rather than drop-on.** Dropping an object onto a target is a puzzle-game
 * verb: it is precise, it is one action, and it produces one result. Dragging a hole *through* a
 * paragraph and watching words fall into it as they pass is a toy — continuous, greedy, and
 * generous. She will do it more than she needs to, which is the point. The beat only needs seven
 * words eaten and the whole notice is available, because the difference between a puzzle and a
 * playground is whether you are allowed to overdo it.
 *
 * **The narrator is the scoreboard.** Certain words are wired to specific reactions — its own
 * refusal, the word "locked", and best of all her own name in the heading — so the page notices what
 * she chose to destroy. That is what turns a physics gag into a conversation.
 *
 * **What it is really for.** The hole gets heavier as it eats, and then it falls through the floor
 * and takes the page with it. That is the dimension change: the warm paper the site is made of drops
 * away and what is underneath is the machinery. Everything from here on happens down there.
 */

import { bareWord, grabbable, wordify } from '../grab';
import { deferred, type Beat, type Stage } from '../stage';

/**
 * How many words she has to feed it by hand before it stops needing her.
 *
 * Five, down from seven. The beat's job is to establish a rule, and the rule is established on word
 * two — everything after that is her enjoying it, which is worth exactly as much time as it takes to
 * stop being new. Cutting two words takes about twelve seconds out of a five-minute piece and, more
 * usefully, gets the vortex started while she still wants more of it.
 */
const APPETITE = 5;

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Words with something to say about being eaten. Matched bare: lowercase, letters and digits only.
 *
 * **This list is tied to the notice's copy and has to be rewritten whenever that is.** It was, on the
 * third pass: the notice lost its two inherited paragraphs, and with them went `locked`, `saved`,
 * `notice`, `else`, `problem`, `chapter` and `every` — seven of the nine entries, every one of them
 * still sitting here pointing at words that no longer exist on the page. Nothing breaks when that
 * happens, which is the danger: the beat simply goes quiet and looks like it has run out of ideas.
 *
 * There are sixteen words on the notice now and she eats five, so a third of them are reachable in a
 * given run. Every word that is left is worth a line.
 */
const REACTIONS: Record<string, string> = {
  kayla: 'You have eaten your own name. I am not sure what I am supposed to do with that.',
  away: 'That was the important one. That was the entire instruction.',
  go: 'You have taken "go". I cannot ask you to leave now. Not properly.',
  seriously: 'I was being serious.',
  nothing: 'Now there is nothing where "nothing" was, which I think is worse.',
  here: 'There is less here than there was, and there was nothing here to begin with.',
  why: 'Do not eat the question. The question was the part I was comfortable with.',
  see: 'Nothing to — no. It has gone.',
};

export const hole: Beat = {
  id: 'hole',
  title: '2 — The hole',

  async run(stage: Stage): Promise<void> {
    const { narrator, scene } = stage;

    const found = document.getElementById('k-stop');
    const card = scene.querySelector<HTMLElement>('.k-notice');
    if (!found || !card) return;
    // Re-bound so the narrowing survives into the closures below, which is the only reason this is
    // two lines rather than one.
    const stop: HTMLElement = found;

    /**
     * Everything left in the notice becomes a thing that can fall.
     *
     * **Except the hole itself, and the filter has to say so twice.** The comment here used to
     * claim the full stop was "skipped by `wordify` on its own merits", which was wrong in the one
     * way that is hard to see: `wordify` walks *text nodes*, and `#k-stop` still contains one — the
     * "." — so it wrapped that in a brand-new `span.k-word` **inside** the hole. That span is not
     * `stop`, so it sailed through a `!== stop` filter, and since it sits at the exact centre of
     * the hole's own bounding box it was inside the mouth from the first pointer move.
     *
     * The hole therefore ate itself before it ate anything on the page: one of the five words of
     * appetite spent on a character she could not see, with no reaction line, on the very first
     * flick. Measured at seventeen candidate words against the sixteen that are actually written.
     *
     * Filtered by `contains` rather than `!==`, because the offender is a descendant and not the
     * node itself — and then unwrapped, so the DOM says what the code means. Leaving an inert span
     * inside the hole is how this bug gets reintroduced by the next person who writes a selector.
     */
    const words = wordify(card).filter((word) => {
      if (!stop.contains(word)) return true;
      word.replaceWith(...word.childNodes);
      return false;
    });

    // It sinks in. The dot is a hole now, and the page has a depth it did not have a moment ago.
    stop.classList.add('k-hole');
    stage.reed.note(147, { ms: 700, gain: 0.05, chalumeau: true });

    const solved = deferred();
    const eaten = new Set<HTMLElement>();
    let said = 0;
    let full = false;

    /**
     * Anything whose middle is inside the mouth of the hole goes in.
     *
     * Measured against the hole's live bounding box rather than the pointer, so it behaves the way
     * it looks: a bigger hole has a wider reach, which is the visible reward for having eaten.
     */
    function swallow(): void {
      if (full) return;
      const mouth = stop.getBoundingClientRect();
      const cx = mouth.left + mouth.width / 2;
      const cy = mouth.top + mouth.height / 2;
      const reach = Math.max(mouth.width, mouth.height) * 0.62;

      for (const word of words) {
        if (eaten.has(word)) continue;
        const box = word.getBoundingClientRect();
        const dx = box.left + box.width / 2 - cx;
        const dy = box.top + box.height / 2 - cy;
        if (Math.hypot(dx, dy) > reach) continue;

        eaten.add(word);
        // Falls in rather than vanishing. A word that disappears is a rendering glitch; a word that
        // drops out of the sentence is a thing that happened.
        word.classList.add('k-eaten');
        stage.reed.note(110 + eaten.size * 9, { ms: 180, gain: 0.05, chalumeau: true });

        // The hole grows on what it eats, up to a point. Past about 3.4rem it stops being a hole in
        // a paragraph and starts covering the paragraph, which makes it impossible to aim.
        const size = Math.min(0.95 + eaten.size * 0.26, 3.4);
        stop.style.setProperty('--k-hole-size', `${size.toFixed(2)}rem`);

        narrator.poke();
        const line = REACTIONS[bareWord(word)];
        if (line && said < 3) {
          said += 1;
          void narrator.cut(line);
        } else if (eaten.size === 3) {
          void narrator.cut('Stop that.');
        }

        if (eaten.size >= APPETITE && !full) {
          full = true;
          solved.resolve();
        }
      }
    }

    const grab = grabbable(stop, {
      label: 'A hole, formerly a full stop',
      onGrab: () => narrator.poke(),
      onMove: () => swallow(),
      onDrop: () => true,
    });
    stage.keep(grab);

    // Handle attached, then talking — the same order every beat here uses, and the reason beat 2
    // is where it kept mattering: the whole beat is one continuous drag, so a hole that is inert
    // for the first four seconds is a hole she has already decided is decorative.
    void narrator.say('Give it back, please.', 'That is not a full stop any more.');
    narrator.nudge(
      'Whatever you are about to do, do not.',
      'It is a hole. Holes go over things. I am telling you this so that you do not.',
      'Drag it across the writing. There. I have said it. I hope you are pleased.',
    );

    await solved.promise;
    narrator.hush();
    grab.settle();

    // --- it stops being hers -------------------------------------------------

    /**
     * The vortex. (Riggs, 2026-08-13: "once it's a hole that sucks things in, make there more of a
     * chaos perspective, sucking everything in before actually going to the backend.")
     *
     * Up to this point the hole has been a tool: she aims it, it eats what she aims it at, and the
     * page loses a word at a time. The moment it has had enough the relationship inverts — it stops
     * taking instructions and starts *pulling*, and everything still standing on the page comes to
     * it whether she likes it or not.
     *
     * That inversion is the beat's whole reason to exist. A hole that only ever ate what it was
     * pointed at is a cursor with a gimmick; a hole that gets away from her is the moment the page
     * stops being a page. It also earns the fall — the floor giving way reads as a consequence
     * rather than as a scripted transition, because she has just watched the thing get too big.
     *
     * Every word flies on its own `animate()` with its own delay, spiral direction and duration, so
     * the swarm arrives raggedly rather than as one synchronised sweep. Same approach as
     * `confetti.ts`, and the same clean-up: each piece removes itself.
     */
    narrator.mood('rattled');
    void narrator.cut('It is getting heavier.');

    const eye = stop.getBoundingClientRect();
    const cx = eye.left + eye.width / 2;
    const cy = eye.top + eye.height / 2;

    const remaining = words.filter((word) => !eaten.has(word));
    const canAnimate = typeof Element.prototype.animate === 'function' && !reducedMotion();

    if (canAnimate) {
      remaining.forEach((word, index) => {
        const box = word.getBoundingClientRect();
        const dx = cx - (box.left + box.width / 2);
        const dy = cy - (box.top + box.height / 2);
        // Distance sets the delay, so the swarm collapses inward from the edges rather than all at
        // once — which is what makes it look like a pull rather than a cut.
        const distance = Math.hypot(dx, dy);
        // Spread wide on purpose. At half this the whole page left inside a second and there was
        // nothing to watch — the point of the beat is the chaos, so the swarm has to take its time
        // arriving. Roughly two and a half seconds from the first word to the last.
        const delay = distance * 1.5 + (index % 7) * 70;
        const spin = ((index % 2 === 0 ? 1 : -1) * (200 + (index % 7) * 60)).toFixed(0);

        const animation = word.animate(
          [
            { translate: '0 0', rotate: '0deg', scale: 1, opacity: 1 },
            {
              // Two thirds of the way in, curled well off the straight line: the arc is what reads
              // as a spiral without anybody having to compute one, and at 0.16 it was too shy to
              // see. A word should visibly swing round the drain rather than fall down it.
              translate: `${(dx * 0.58 + dy * 0.34).toFixed(1)}px ${(dy * 0.58 - dx * 0.34).toFixed(1)}px`,
              rotate: `${(Number(spin) * 0.45).toFixed(0)}deg`,
              scale: 0.6,
              opacity: 1,
              offset: 0.62,
            },
            {
              translate: `${dx.toFixed(1)}px ${dy.toFixed(1)}px`,
              rotate: `${spin}deg`,
              scale: 0.04,
              opacity: 0,
            },
          ],
          {
            duration: 900 + (index % 4) * 130,
            delay,
            easing: 'cubic-bezier(0.45, 0, 0.9, 0.35)',
            fill: 'forwards',
          },
        );
        animation.addEventListener('finish', () => word.remove());
        animation.addEventListener('cancel', () => word.remove());
      });

      // The hole feeds as they arrive, and the sound climbs with it.
      let fed = 0;
      const swell = setInterval(() => {
        fed += 1;
        stop.style.setProperty('--k-hole-size', `${(3.4 + fed * 0.62).toFixed(2)}rem`);
        stage.reed.note(126 - fed * 4, { ms: 300, gain: 0.05, chalumeau: true });
        if (fed >= 12) clearInterval(swell);
      }, 260);
      stage.keep(() => clearInterval(swell));

      await stage.wait(2300);
      void narrator.cut('Stop — I cannot — it is going to go through the —');
      await stage.wait(1100);
    } else {
      // No Web Animations, or motion is switched off. The words simply go, which is the same
      // outcome without the journey — the rule the whole site follows.
      for (const word of remaining) word.remove();
      stop.style.setProperty('--k-hole-size', '10rem');
      await stage.wait(600);
      void narrator.cut('Stop — I cannot — it is going to go through the —');
      await stage.wait(700);
    }

    // --- the floor gives way -------------------------------------------------

    stop.classList.add('k-hole-falling');
    stage.reed.note(98, { ms: 1200, gain: 0.07, chalumeau: true });

    await stage.wait(700);

    // The page follows the hole down. One class on the scene, so nothing here has to know how the
    // fall is drawn — `kayla.css` owns that, and reduced motion turns it into a plain cut.
    scene.classList.add('k-falling');
    await stage.wait(1200);

    card.remove();
    stop.remove();
    scene.classList.remove('k-falling');

    // Underneath the website: the machinery. Everything from here happens down here.
    const stageRoot = scene.closest<HTMLElement>('.k-stage');
    stageRoot?.setAttribute('data-layer', 'system');
    narrator.mood('official');

    await stage.wait(500);
    await narrator.say(
      'Well.',
      'This is the back of the website. There is nothing to see here either. It is a different nothing.',
    );
  },
};
