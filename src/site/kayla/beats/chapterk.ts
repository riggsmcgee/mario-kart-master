/**
 * Beat 7 — Chapter K. (4e4)
 *
 * The last ninety seconds, which the other eight and a half minutes exist to pay for.
 *
 * **The fake ending first.** It announces that there is nothing else, thanks her, and points at the
 * exit — and then cannot leave it alone, because a tenth chapter has been sitting there the whole
 * time. Stolen wholesale from the best structural gag in the genre: end the thing early, let the
 * player believe it, then carry on. It costs twenty seconds and it makes what follows feel found
 * rather than delivered.
 *
 * **What she actually gets, and why it is this.** Every instinct says the payoff should be a nice
 * message about her mum. That is the version a fifteen-year-old closes the tab on. So the gift is a
 * *dossier*: the complete list of everything Jodi has been taught, chapter by chapter, handed over
 * as intelligence on an opponent. Two months' warning. It treats Kayla as the rival she is, it is
 * genuinely useful to a competitive kid, and it is funny — and underneath it does the warm thing
 * anyway, because a list of everything somebody has quietly been practising in order to have a
 * chance against you is not really a scouting report, and she will work that out on her own.
 *
 * **The ask is not "let her win".** It is one line, and it is the only thing this website ever asks
 * of Kayla: when your mum asks you to play, pick the Mushroom Cup, because it is the one she has
 * been learning. It costs Kayla nothing, it is not charity, and it explicitly rules out losing on
 * purpose — she would spot it in a second and be insulted, and rightly.
 *
 * **The keepsake is a verb.** She has the narrator's mouse pointer in her pocket from beat 3. The
 * last interaction on the page is a slot to give it back, and if she does, it refuses to take it.
 * That is the whole emotional turn of the genre — adversary to something else — done as an object
 * changing hands rather than as a paragraph about feelings.
 *
 * **And the exit gets the last word**, because it has been live for ten minutes and nobody clicked
 * it, which turns out to be the nicest thing anyone can say about her.
 */

import { el, rich } from '../../dom';
import { grabbable } from '../grab';
import { deferred, type Beat, type Stage } from '../stage';

/**
 * The dossier. Every line is something the course actually teaches, in the order it teaches it,
 * written as intelligence rather than as curriculum.
 */
const DOSSIER: Array<[string, string]> = [
  [
    'Chapter 1',
    'She starts before the lights. Second flash, not the first. She gets it maybe half the time and half is plenty.',
  ],
  [
    'Chapter 2',
    'She has stopped throwing her shells. She holds them behind her now, as a shield. You will notice this.',
  ],
  ['Chapter 3', 'She hops at the top of every ramp. All of them. Every lap.'],
  [
    'Chapter 4',
    'She takes the wide lane on Mario Kart Stadium because the boost pads are on it. She knows it is longer. She has been told why it is faster.',
  ],
  [
    'Chapter 5',
    'Wide in, tight through, wide out — and she is holding ten coins at the end of the lap.',
  ],
  ['Chapter 6', 'She is drifting. Badly. Give her a month.'],
  [
    'Chapter 7',
    'She has picked one kart and stopped changing it. It is lighter than the one you told her to use.',
  ],
  ['Chapter 8', 'Forty sessions. One a day. She is doing them.'],
];

export const chapterk: Beat = {
  id: 'chapterk',
  title: '7 — Chapter K',

  async run(stage: Stage): Promise<void> {
    const { narrator, scene } = stage;

    // --- the fake ending -----------------------------------------------------

    scene.replaceChildren();
    narrator.mood(null);

    scene.append(
      el(
        'div',
        { class: 'k-panel k-outro' },
        el('p', { class: 'eyebrow' }, 'Nothing further'),
        el('h2', null, 'That is everything'),
        el('p', null, 'Nine chapters. All of them read. None of them yours.'),
        el('p', { class: 'k-fine' }, 'The button in the corner will put you back.'),
      ),
    );

    await narrator.say(
      'Well. That is the lot.',
      'You have been thorough. I will give you that, and then I will stop giving you things.',
      'Off you go.',
    );

    await stage.wait(1200);

    // It cannot leave it. Nobody in this story can leave anything.
    await narrator.say('…');
    await stage.wait(400);
    await narrator.say('There are ten.');

    // --- the tenth -----------------------------------------------------------

    const opened = deferred();
    const tenth = el(
      'button',
      { class: 'k-tile k-tile-open k-tenth', type: 'button', attrs: { 'aria-label': 'Chapter K' } },
      el('span', { class: 'k-tile-no' }, 'K'),
      el('p', { class: 'k-tile-hook' }, 'Not listed'),
    );
    tenth.addEventListener('click', () => opened.resolve(), { once: true });
    scene.append(tenth);

    narrator.nudge(
      'There were always ten. Nine is what it says on the box.',
      'The tenth one is not for her.',
      'Open it. It has your name on it. It has had your name on it the whole time.',
    );

    await opened.promise;
    narrator.hush();

    // --- Chapter K -----------------------------------------------------------

    const stageRoot = scene.closest<HTMLElement>('.k-stage');
    stageRoot?.setAttribute('data-layer', 'warm');
    stage.reed.phrase([
      [392, 150],
      [466.16, 150],
      [587.33, 150],
      [783.99, 460],
    ]);

    scene.replaceChildren();

    const sheet = el(
      'div',
      { class: 'k-panel k-chapterk' },
      el('p', { class: 'eyebrow' }, 'Chapter K · the only one that is yours'),
      el('h2', null, 'Everything she knows now'),
      el(
        'p',
        { class: 'k-lede' },
        rich(
          'She has been at this for two months. This is all of it. **You are getting two months of warning and she is getting none.**',
        ),
      ),
      el(
        'dl',
        { class: 'k-dossier' },
        ...DOSSIER.flatMap(([label, line]) => [el('dt', null, label), el('dd', null, line)]),
      ),
    );
    scene.append(sheet);

    await narrator.say(
      'That is everything she has been taught. Every chapter, in order.',
      'She does not know you have seen it.',
      'She still probably will not beat you. That was never really the point of it.',
    );

    // --- the one ask ---------------------------------------------------------

    const ask = el(
      'div',
      { class: 'k-panel k-ask-card' },
      el('p', { class: 'eyebrow' }, 'One thing, and then I will stop'),
      el(
        'p',
        { class: 'k-lede' },
        rich(
          'She has been practising the **Mushroom Cup**, at 100cc. It is the only one she knows.',
        ),
      ),
      el(
        'p',
        null,
        'When she asks you to play — and she is going to ask you, probably too often — pick that cup.',
      ),
      el(
        'p',
        null,
        rich(
          '**Do not let her win.** She would know, and she would be furious, and she would be right. Just pick the cup.',
        ),
      ),
    );
    stage.reveal(ask);

    await narrator.say(
      'That is the whole of it. That is the only thing this website has ever wanted from you.',
    );

    // One line for the fourth button at the door, which nobody has ever pressed. It costs nothing
    // and it is the only moment the family exists outside the two people this is about.
    await narrator.say(
      'There is a fourth name on that door, incidentally. Bill. He has never once clicked it.',
    );

    // --- the pointer ---------------------------------------------------------

    const pointerNode = stage.pocket.take('A mouse pointer');
    if (pointerNode) {
      /**
       * **The pointer and the slot go in the same card, on purpose.**
       *
       * The first version appended the pointer to the scene as a loose sibling *after* the card, and
       * measured in a browser that put it thirty pixels below the fold with the slot itself behind
       * the narrator strip — the one interaction in this beat, invisible and undroppable. Two
       * elements that have to be dragged between each other should never be free to drift apart in
       * the layout, and putting them in one flex column costs nothing and cannot come undone.
       */
      pointerNode.className = 'k-ghost-cursor k-ghost-loose';
      pointerNode.style.left = '';
      pointerNode.style.top = '';
      pointerNode.style.translate = '';

      const slot = el(
        'div',
        { class: 'k-return' },
        el('p', { class: 'k-stencil' }, 'Return to system'),
        pointerNode,
        el('div', { class: 'k-return-slot' }),
      );
      stage.reveal(slot);
      const hole = slot.querySelector<HTMLElement>('.k-return-slot');

      const returned = deferred();

      const grab = grabbable(pointerNode, {
        label: "The narrator's mouse pointer",
        targets: () => (hole ? [hole] : []),
        onDrop({ target }) {
          if (!target) return true;
          returned.resolve();
          return true;
        },
      });
      stage.keep(grab);

      await narrator.say('You still have my pointer.');

      // She may simply not do this, which is fine — the timeout says the same thing in the end. Eight
      // seconds, not twenty-two: a page waiting silently for an optional gesture she has decided not
      // to make is the single longest dead stretch in the piece, and nothing about the moment is
      // improved by her having a fifth of a minute to reconsider.
      const gaveUp = stage.wait(8000);
      await Promise.race([returned.promise, gaveUp]);

      grab.settle();
      slot.remove();
      // `settle()` stops it moving; it does not undo where she moved it to. A leftover 300px offset
      // inside a 2rem bin slot puts the pointer somewhere out in the grid with an empty box where it
      // should be — the same fix beat 3 needed, for the same reason.
      pointerNode.style.translate = '';
      stage.pocket.add(pointerNode, 'A mouse pointer');

      await narrator.say('…No.', 'Keep it. You caught it fairly.');
    }

    // --- the last word -------------------------------------------------------

    /**
     * And then it stops.
     *
     * The version before this one had four closing movements — the dossier, the ask, the pointer,
     * a confession, and a sign-off card that said goodbye twice. Sincerity is rationed, and an
     * ending that spends the ration four times lands none of them. What is left is one confession,
     * one use of her name, and silence.
     *
     * The confession is the right last note because it hands the ten minutes back to her: the site
     * did not let her in, and it did not defeat her either. She simply never took the way out that
     * was in front of her the entire time.
     */
    await narrator.say(
      'One more thing, and then I will stop talking.',
      'Nothing on this page was ever locked. Not one thing. I said it was.',
    );

    const out = el(
      'div',
      { class: 'k-panel k-signoff' },
      el('p', { class: 'k-stencil' }, 'Nothing to see here · concluded'),
      el('h2', null, 'The button in the corner always worked'),
      el('p', null, 'You just stopped clicking it.'),
      el('p', { class: 'k-fine' }, 'Nothing here was saved. Nothing here ever is.'),
    );
    stage.reveal(out);

    await narrator.say('Goodbye, Kayla.');
  },
};
