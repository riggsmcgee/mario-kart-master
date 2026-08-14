/**
 * Beat 8 — the video, the one form, and the way in. (4e4, third pass)
 *
 * Riggs, 2026-08-13: *"After she completes the mini-game I'll record a video congratulating her,
 * saying that if she really wants, then she can go to the site."* And: *"if she makes it all the way
 * to the website, then you can let her have access to it just like everyone else."*
 *
 * So beat 7 is a false ending. It says goodbye, it means it, and then something arrives that the
 * narrator was not told about.
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
 * **The narrator shuts up during the video.** It has not stopped talking for five minutes; silence is
 * the only expressive thing it has never spent. No commentary, no jealousy. Afterwards it does not
 * review the video — it complains about jurisdiction, which is funnier and stays in character.
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

/** Where Riggs's recording goes when he makes it. Absent until then, and that is a designed state. */
const VIDEO_SRC = `${import.meta.env.BASE_URL}media/kayla.mp4`;

/**
 * What the note says when there is no video yet.
 *
 * Written to be complete on its own rather than to apologise for something missing. Same principle
 * as `intro-video.ts`: a control that is absent reads as deliberate, and one that is present and
 * broken reads as a bug. Riggs replaces this, records over it, or leaves it.
 */
const NOTE = [
  'You got through it. I did not think anyone would.',
  'The site is yours if you want it. All of it — not the version I built for your mum.',
  'Pick the Mushroom Cup. Do not go easy on her.',
];

/**
 * Is there actually a video there?
 *
 * **A 200 is not enough**, and finding that out cost a test run. Vite's dev server — and a great many
 * static hosts — answer an unknown path with the app shell and a cheerful 200, so a plain `ok` check
 * reports a video where there is a web page. The content type is the thing that actually
 * distinguishes them.
 *
 * Belt and braces: even a passing probe is only a promise about the bytes, so the player also falls
 * back to the written note if the file turns out not to decode.
 */
async function videoExists(): Promise<boolean> {
  try {
    const response = await fetch(VIDEO_SRC, { method: 'HEAD' });
    if (!response.ok) return false;
    return (response.headers.get('content-type') ?? '').toLowerCase().startsWith('video/');
  } catch {
    return false;
  }
}

export const admission: Beat = {
  id: 'admission',
  title: '8 — The way in',

  async run(stage: Stage): Promise<void> {
    const { narrator, scene } = stage;

    // --- something arrives ---------------------------------------------------

    await stage.wait(800);

    // Probed before anything is painted, so there is never a flash of broken player.
    const hasVideo = await videoExists();

    scene.replaceChildren();
    const stageRoot = scene.closest<HTMLElement>('.k-stage');
    stageRoot?.setAttribute('data-layer', 'warm');

    const watched = deferred();

    if (hasVideo) {
      const video = el('video', {
        class: 'k-video',
        controls: true,
        preload: 'metadata',
        playsInline: true,
      });
      video.src = VIDEO_SRC;
      video.addEventListener('ended', () => watched.resolve());
      // The probe said yes and the bytes said no. Do not sit on a dead player.
      video.addEventListener('error', () => watched.resolve());

      scene.append(
        el(
          'div',
          { class: 'k-panel k-post' },
          el('p', { class: 'k-stencil' }, 'One (1) unscheduled item'),
          video,
          el('p', { class: 'k-fine' }, 'From Riggs, who built this.'),
        ),
      );

      // She presses play herself. Autoplay would be blocked anyway, and it is better authorship:
      // the one thing in this experience that is a gift rather than an obstacle should be opened.
      void narrator.say('…', 'That is not from me.');
      narrator.nudge('It is a video. Of a person. Press it.', 'Press the play button.');

      // If she never plays it, or the file will not decode, the beat still moves on.
      await Promise.race([watched.promise, stage.wait(150_000)]);
    } else {
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
    }

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
