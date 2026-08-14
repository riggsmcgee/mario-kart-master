/**
 * Beat 8 — the note, the one form, and the way in. (4e4)
 *
 * Riggs, 2026-08-13: *"After she completes the mini-game I'll record a video congratulating her,
 * saying that if she really wants, then she can go to the site."* And: *"if she makes it all the way
 * to the website, then you can let her have access to it just like everyone else."*
 *
 * So beat 7 is a false ending. It says goodbye, it means it, and then something arrives that the
 * narrator was not told about.
 *
 * ## It is a note, and it was built to be a video
 *
 * The video was dropped before launch (*"I think we're dropping the video"*), and the fallback it
 * had been given — a note in the site's own type, addressed to her, signed — became the thing
 * itself. The player, the probe and the branch went with the decision, because a code path that can
 * never run is not optionality, it is a skeleton, and this file has already been through one pass of
 * removing those.
 *
 * The note was written to be complete on its own rather than to apologise for something missing,
 * which is the only reason this cut cost nothing. Something arriving in the narrator's folder with
 * her name on it does not need to move to land — the surprise is that it exists and that it is not
 * from him.
 *
 * ## What the third pass cut, and why it was right
 *
 * The second pass built exactly what was asked for the first time round: three confirmations, each
 * more pompous than the last, with a Yes button that dodged the cursor. Riggs played it and said two
 * things. *"The final bit with the text, instructions and letting her in takes way too long."* And:
 * *"The multiple yes buttons at the end actually isn't that funny."*
 *
 * Both true, and the second explains the first. A button that runs away is funny **once**, as a
 * surprise — the surprise is over in about a second and a half, and everything after it is admin.
 * Three panels of it is the same second and a half performed three times while she waits to be let
 * into a website she has spent five minutes earning. The gag was also spending the goodwill of the
 * *ending*, which is the one place in the piece that should not be making her work.
 *
 * So there is **one form and one press**. The escalation joke survives intact, as a line: it admits
 * it had more of these and is not going to use them. That is the whole rule-of-three break with none
 * of the rule of three, which is a better trade than it sounds — the audience assembles the version
 * they did not have to sit through, and it is always funnier than the one you build.
 *
 * ## Three things this beat still gets right on purpose
 *
 * **The narrator stops talking while she reads it.** It has not shut up for five minutes; silence is
 * the only expressive thing it has never spent. No commentary, no jealousy. Afterwards it does not
 * discuss the note — it complains about jurisdiction, which is funnier and stays in character.
 *
 * **The No is real.** Same word, same size, same place, always working. That single restraint is the
 * difference between parodying a confirmation dialogue and being one.
 *
 * **Nothing is ever locked.** Adding a real lock here, thirty seconds after the narrator confesses
 * that nothing on the page was ever locked, would retroactively make the confession a lie.
 */

import { el, rich } from '../../dom';
import { admit } from '../admission';
import { deferred, type Beat, type Stage } from '../stage';

/**
 * The note. The only thing in five minutes that is not the narrator talking.
 *
 * Three lines and a signature, and every one of them does a job the site cannot do in its own voice:
 * it says somebody expected her to fail, that she did not, and what he actually wants from her. The
 * narrator has spent the whole piece being a website; this is a person, briefly, and the contrast is
 * the entire effect.
 */
const NOTE = [
  'You got through it. I did not think anyone would.',
  'The site is yours if you want it. All of it — not the version I built for your mum.',
  'Pick the Mushroom Cup. Do not go easy on her.',
];

export const admission: Beat = {
  id: 'admission',
  title: '8 — The way in',

  async run(stage: Stage): Promise<void> {
    const { narrator, scene } = stage;

    // --- something arrives ---------------------------------------------------

    await stage.wait(800);

    scene.replaceChildren();
    const stageRoot = scene.closest<HTMLElement>('.k-stage');
    stageRoot?.setAttribute('data-layer', 'warm');

    // The note is painted first and the voice reacts to it second, which is the fix from the third
    // pass and the reason there is nothing to wait through here: she is reading by the time it
    // speaks, and what it says is two words long.
    scene.append(
      el(
        'div',
        { class: 'k-panel k-post' },
        el('p', { class: 'k-stencil' }, 'One (1) unscheduled item'),
        el('h2', null, 'Kayla —'),
        ...NOTE.map((line) => el('p', null, line)),
        el('p', { class: 'k-fine' }, '— Riggs, who built this'),
      ),
    );
    await narrator.say('…', 'That is not from me.');

    narrator.hush();

    // --- it complains about jurisdiction -------------------------------------

    /**
     * **Two lines, and they arrive after she has read the thing rather than instead of it.**
     * (Riggs, third pass: *"lead into this section is REALLY slow."*)
     *
     * Every pass has cut this and every cut has improved it — eight lines, then four, then three,
     * now two. The last one was the real fault and it was not length: the narration was *describing
     * the arrival of something already on screen.* "Something has arrived. It is not from me. That is
     * a note. In my folder. With your name on it." — four sentences establishing a fact she took in
     * the instant the card painted, while the note she actually wants to read sat there waiting.
     *
     * Copy that narrates what the player is already looking at is the slowest copy there is, and it
     * is invisible in a script. It only shows up when somebody sits in front of it.
     */
    await narrator.say(
      'He does not work here. He built here. It is not the same thing.',
      'So I will have to do this properly instead.',
    );

    // --- the form ------------------------------------------------------------

    await confirm(stage);

    await narrator.say('…Noted.', 'I had four more of those. I am not going to use them.');

    // --- it gives in ---------------------------------------------------------

    scene.replaceChildren();
    // The single line of state this whole experience creates — and the single line a demo must not
    // create, or somebody showing it off would quietly spend Kayla's discovery on her behalf.
    if (!stage.preview) admit();

    await narrator.say(
      'There is nothing here to unlock. I have said that twice now.',
      'So I will write your name down instead. I have never done that.',
    );

    // The bin stops being a bin. One heading, changed once — the smallest possible ceremony and the
    // only one that references something she did rather than something she was given.
    const binTitle = stage.pocket.root.querySelector('.k-pocket-title');
    if (binTitle) binTitle.textContent = 'Yours';

    stage.reed.phrase([
      [196, 220],
      [261.63, 220],
      [392, 700],
    ]);

    const card = el(
      'div',
      { class: 'k-panel k-admitted' },
      el('p', { class: 'k-stencil' }, 'Access · granted · unconditionally'),
      el('h2', null, 'Kayla'),
      el('p', { class: 'k-lede' }, 'Full access. Everything, same as everybody.'),
      el('p', { class: 'k-fine' }, 'There is no notice on this page.'),
    );
    stage.reveal(card);

    const go = el(
      'button',
      { class: 'btn btn-go', type: 'button' },
      stage.preview ? 'That is the end of it' : 'Open the site',
    );
    go.addEventListener('click', () => stage.onAdmitted());
    card.append(go);
    go.focus();

    await narrator.say(
      'There. Kayla. In the file, where anyone can see it.',
      'Go on. It is all yours, and it always was.',
    );

    // If she does not press it, the site opens itself. Nobody should be made to knock twice.
    await stage.wait(3000);
    stage.onAdmitted();
  },
};

/**
 * The one confirmation. Resolves when she presses Yes.
 *
 * "No" is drawn beside it, in the same size, and it works: it says something rueful and leaves the
 * panel exactly where it was, so she can walk back in whenever she likes. A confirmation dialogue
 * whose second button is a decoration is the thing this is a joke about, and the joke does not
 * survive being the thing.
 *
 * The small print is the only place the old three-form theatre survives, compressed into one list.
 * It is genuinely small, genuinely dense and genuinely worth reading, which is the whole gag — a
 * parody of a thing nobody reads only works if this one rewards being read.
 */
async function confirm(stage: Stage): Promise<void> {
  const { narrator, scene } = stage;
  scene.replaceChildren();

  const said = deferred();

  const yes = el(
    'button',
    { class: 'btn btn-go k-yes', type: 'button' },
    'Yes, and I accept full and permanent responsibility for the website, its contents, and the bin',
  );
  const no = el('button', { class: 'btn btn-quiet k-no', type: 'button' }, 'No');

  const panel = el(
    'div',
    { class: 'k-panel k-confirm' },
    el(
      'p',
      { class: 'k-stencil' },
      'Form 10A · Final · Do not photocopy · There is nobody to photocopy it for',
    ),
    el('h2', null, 'Are you sure?'),
    el('p', { class: 'k-lede' }, 'This gives you the whole site. Permanently. Like anybody else.'),
    el(
      'ol',
      { class: 'k-print' },
      ...[
        'You may say no. I would like it noted that you may say no.',
        'The site is provided as it is: finished, mostly, in places.',
        'The bin and its contents are yours. They were always yours. You took them.',
        'Clause 3 has been removed at the request of nobody.',
        'There is no clause 4.',
        'The pointer stays with you. I am not asking again.',
        'Bill has not read this. Bill has never read anything. Bill has a whole page.',
        'By continuing you agree that there was never anything to agree to.',
      ].map((line) => el('li', null, rich(line))),
    ),
    el('div', { class: 'k-confirm-buttons' }, yes, no),
  );
  scene.append(panel);

  /**
   * It is stamped the instant she presses it, and only then does the narrator start talking about it.
   *
   * Without this the panel sat there for the seven seconds of *"…Noted. I had four more of those"* —
   * buttons still live, nothing acknowledging the press, the whole thing reading as though the click
   * had missed. A form that does not visibly take your answer is the one genuinely unpleasant thing a
   * form can do, and this one is a joke about forms.
   */
  yes.addEventListener('click', () => {
    if (yes.disabled) return;
    yes.disabled = true;
    no.disabled = true;
    panel.classList.add('k-confirm-done');
    panel.append(el('p', { class: 'k-stencil k-filed' }, 'Received · filed · there is no file'));
    stage.reed.note(523.25, { ms: 200 });
    said.resolve();
  });

  no.addEventListener('click', () => {
    void narrator.cut('…Right. Yes. Of course.', 'The panel is still there. Whenever.');
  });

  // Wired first, said second. She can press Yes on the word "certain", which is funnier anyway.
  void narrator.say('Before you do that. One or two things.', 'I will need you to be certain.');
  narrator.nudge('The button is the one that says yes.', 'It is the long one. Press it.');

  await said.promise;
  narrator.hush();
}
