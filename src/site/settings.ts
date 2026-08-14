/**
 * Settings. (2a1; the sign-in removed 2026-08-14.)
 *
 * This page reads as "extras" — a name, a mute, a way back to the door, and the one genuinely
 * destructive control, which asks first.
 *
 * There used to be an account in here: an email box, a magic link, and a line of plain words
 * saying whether her progress had reached the server. It bought exactly one thing, the same
 * progress on a second device, and it was never used by anyone but its own test. It has been
 * taken out rather than left switched off, because a sign-in form that silently fails is worse
 * than no sign-in form — and a paused free-tier project is what it would have become.
 */

import type { ProgressStore } from '../store/progress';
import type { Sfx } from '../ui/sfx';
import { CHAPTERS } from '../data/chapters';
import { forgetCombo } from '../data/parts';
import { el, rich } from './dom';
import { forgetDoorman } from './doorman';
import { fill, RIVAL } from './player';
import { go } from './router';
import type { Mounted, Player } from './types';

export interface SettingsDeps {
  player: Player;
  progress: ProgressStore;
  sfx: Sfx;
  onChangeUser: () => void;
}

export function renderSettings(mount: HTMLElement, deps: SettingsDeps): Mounted {
  const { player, progress, sfx, onChangeUser } = deps;
  const t = (text: string): string => fill(text, player);

  const page = el('div', { class: 'page wrap stack-lg' });

  /**
   * The way out. (Riggs, 2026-08-12: "it's a little confusing to get out of settings".)
   *
   * The site mark in the header does go home, but it reads as a logo rather than as a control, and
   * on a page reached by a deliberate click the way back should be as obvious as the way in. So
   * there are two: a back link above the title where the eye lands first, and a plain button at the
   * bottom for anyone who has read to the end and expects one there.
   *
   * "Back to the course" rather than "Back": she may have arrived here from a chapter, and this
   * says where she is going rather than merely that she is leaving.
   */
  const backLink = el('a', { class: 'back-link', href: '#/' }, '← Back to the course');
  backLink.addEventListener('click', () => sfx.play('page'));

  page.append(
    el(
      'header',
      { class: 'page-head' },
      el('p', { class: 'eyebrow' }, backLink),
      el('h1', null, 'Bits and pieces'),
    ),
  );

  // --- name -----------------------------------------------------------------

  const nameInput = el('input', {
    type: 'text',
    value: progress.getDisplayName() ?? player.name,
    class: 'settings-input',
    style: {
      font: 'inherit',
      padding: '0.6em 0.8em',
      borderRadius: '12px',
      border: '2px solid var(--rule)',
      minWidth: '14rem',
    },
  });
  nameInput.setAttribute('aria-label', 'What the site calls you');

  const saveName = el('button', { class: 'btn', type: 'button' }, 'Save');
  const nameNote = el('p', { class: 'eyebrow', style: { margin: '0.6rem 0 0' } }, '');

  saveName.addEventListener('click', () => {
    const value = nameInput.value.trim();
    if (!value) return;
    progress.setDisplayName(value);
    nameNote.textContent = 'Saved. Reload to see it everywhere.';
    sfx.play('right');
  });

  page.append(
    el(
      'section',
      { class: 'card stack' },
      el('h2', null, 'What should we call you?'),
      el('p', null, 'This is the name the chapters use. Change it whenever you like.'),
      el(
        'div',
        { style: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' } },
        nameInput,
        saveName,
      ),
      nameNote,
    ),
  );

  // --- sound ----------------------------------------------------------------

  const muteButton = el('button', { class: 'btn', type: 'button' }, '');
  const paintMute = (muted: boolean): void => {
    muteButton.textContent = muted ? 'Sound is off — turn it on' : 'Sound is on — turn it off';
  };
  const unMute = sfx.onChange(paintMute);
  muteButton.addEventListener('click', () => {
    const muted = sfx.toggle();
    if (!muted) sfx.play('coin');
  });

  page.append(
    el(
      'section',
      { class: 'card stack' },
      el('h2', null, 'Sound'),
      el(
        'p',
        null,
        'Small beeps and pings. The warning sound in Chapter 2 is the only one that actually tells you anything, so keep it on for that one if you can.',
      ),
      muteButton,
    ),
  );

  // --- progress -------------------------------------------------------------

  /**
   * Said plainly, and said here, because the next card down is the button that erases it.
   *
   * "This computer" is the whole truth now and worth stating rather than implying: there is no
   * copy anywhere else, so a new laptop starts at Chapter 0. That is a real limit, and a sentence
   * about it beats her discovering it.
   */
  page.append(
    el(
      'section',
      { class: 'card stack' },
      el('h2', null, 'Your progress'),
      el(
        'p',
        null,
        'Everything you do here is saved on this computer as you go — which chapters you have finished, the stars from the drills, and the boxes you tick in the plan. There is no account and nothing to sign in to.',
      ),
      el(
        'p',
        { class: 'eyebrow' },
        'It stays put until you clear it below. It does not follow you to a different computer.',
      ),
    ),
  );

  // --- who's training -------------------------------------------------------

  const changeUser = el('button', { class: 'btn', type: 'button' }, 'Change user');
  changeUser.addEventListener('click', onChangeUser);

  const reset = el(
    'button',
    { class: 'btn btn-quiet', type: 'button' },
    'Clear progress on this computer',
  );
  let armed = false;
  reset.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      reset.textContent = 'Really clear it? Click once more.';
      return;
    }
    /**
     * **"Everything on this computer" has to mean everything.** (Riggs, 2026-08-13: *"does the clear
     * progress button also reset the game for Kayla? Because the game for her doesn't seem to be
     * pulling up."*)
     *
     * It did not, and that is exactly why. This button used to clear `progress.ts` and nothing else,
     * while the site quietly writes **three** independent things to `localStorage`:
     *
     *  - the progress snapshot, which it did clear;
     *  - `mkm.kayla.admitted.v1`, set once at the end of Kayla's experience — so a machine that had
     *    been through it once was waved straight past it for good, which is the symptom he hit;
     *  - the doorman's own "somebody has answered this" flag, so the question is not asked twice.
     *
     * The first was missed in a way worth naming: `forgetAdmission` was written for this button, in
     * the same pass that created the flag, exported with a comment saying *"for the settings page's
     * clear progress"* — and then never called. A helper written for a caller that never arrives is
     * indistinguishable from a helper that works, because nothing fails.
     *
     * The general rule this now follows: a reset that knows about one storage key is a reset that
     * will be wrong the first time a second one is added. All **four** are cleared here, together,
     * and the site is handed back in the state it shipped in — at the door, asking who is training.
     *
     * **And a fourth key was already the thing this comment warned about.** `mkm.combo.v1` — the
     * kart build Chapter 7 saves — was added after the paragraph above was written, and was not
     * added here, so a cleared machine handed the next person the previous person's kart on the
     * race-day card and on the printed sheet. Exactly the failure the rule predicts, two days after
     * the rule was written down. `forgetCombo()` lives beside `saveCombo()` in `parts.ts` so the
     * next one at least has somewhere obvious to go.
     *
     * **Reopening the door is part of clearing, not a nicety.** `go({ name: 'home' })` only sets
     * the hash; `startApp` decides whether to ask "who's training?" once, at boot, and nothing
     * reboots on a hash change. So the promise in this comment — *handed back at the door* — was
     * only kept if she happened to reload afterwards, and until she did, the site carried on
     * addressing her by the name it had just erased. It asks now, immediately.
     */
    progress.clearLocal();
    forgetDoorman();
    forgetCombo();
    void import('./kayla/admission').then(({ forgetAdmission }) => forgetAdmission());
    reset.textContent = 'Cleared.';
    armed = false;
    onChangeUser();
  });

  page.append(
    el(
      'section',
      { class: 'card stack' },
      el('h2', null, "Who's using this?"),
      el('p', null, rich(t('Currently set up for **{name}**.'))),
      el('div', { style: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' } }, changeUser, reset),
    ),
  );

  // --- the other thing ------------------------------------------------------

  /**
   * A door into Kayla's half, for everyone else.
   *
   * Riggs, 2026-08-13: *"maybe a button for trying out Kay's game for everyone in the settings would
   * be nice."*
   *
   * **Why it lives here and not on the front page.** The experience is built to be *found* — Kayla
   * clicks her own name at the doorman out of nosiness and gets five minutes of a website insisting
   * there is nothing to see. Advertising it anywhere she will pass spends that discovery for her. The
   * settings page is the one screen in the site she has no reason to open and everybody else does,
   * which makes it the only place this button is safe.
   *
   * **It is a look round, not a run.** `preview: true`, so it plays identically and then writes
   * nothing: no admission flag, no role change, nothing touched. Somebody demonstrating it to the end
   * cannot accidentally spend Kayla's unlock on her behalf.
   *
   * **It opens over the whole window rather than being routed to.** Two reasons. A URL would put it
   * one address bar away from being stumbled on, and the whole thing is a joke about there being
   * nothing to visit. And the stage is a full-viewport column with a fixed subtitle strip and a fixed
   * exit — dropped into the middle of a settings page it would sit under the site header with its
   * furniture floating over the site's, which is the one thing it must never look like. `.k-over` in
   * `kayla.css` is the same overlay the prototype bench uses, for the same reason.
   */
  let visiting: Mounted | null = null;
  let over: HTMLElement | null = null;

  const visit = el('button', { class: 'btn btn-quiet', type: 'button' }, "Have a look at Kayla's");

  function leaveVisit(): void {
    visiting?.dispose();
    visiting = null;
    over?.remove();
    over = null;
    document.body.classList.remove('k-over-open');
    visit.disabled = false;
    visit.textContent = "Have a look at Kayla's";
    visit.focus();
  }

  visit.addEventListener('click', () => {
    visit.disabled = true;
    visit.textContent = 'Nothing to see here…';
    void import('./kayla')
      .then(({ renderKayla }) => {
        over = el('div', { class: 'k-over' });
        document.body.append(over);
        document.body.classList.add('k-over-open');
        visiting = renderKayla(over, {
          sfx,
          onLeave: leaveVisit,
          // Nothing to admit anybody to — whoever is looking is already in. It ends, and it puts
          // them back on the page they opened it from.
          onAdmitted: leaveVisit,
          preview: true,
        });
      })
      .catch((error: unknown) => {
        console.error('[settings] the Kayla build did not load', error);
        visit.disabled = false;
        visit.textContent = 'It would not load. Try again?';
      });
  });

  page.append(
    el(
      'section',
      { class: 'card stack' },
      el('h2', null, 'The other thing'),
      el(
        'p',
        null,
        rich(
          `There is a second version of this site behind ${RIVAL}'s name at the door. It takes about five minutes, it is not a course, and it insists throughout that it does not exist.`,
        ),
      ),
      el(
        'p',
        { class: 'eyebrow' },
        'Looking at it from here changes nothing and saves nothing. The way out is the button in the corner.',
      ),
      visit,
    ),
  );

  const backButton = el('button', { class: 'btn btn-go', type: 'button' }, 'Back to the course');
  backButton.addEventListener('click', () => {
    sfx.play('page');
    go({ name: 'home' });
  });

  page.append(
    el('div', { class: 'chapter-end' }, backButton),
    el(
      'p',
      { class: 'eyebrow' },
      `${CHAPTERS.length} chapters · built for Jodi · no adverts, ever, and nobody is selling anything`,
    ),
  );

  mount.replaceChildren(page);

  return {
    dispose() {
      unMute();
      // Leaving settings while the visit is open has to take the visit with it — it owns timers, a
      // speech queue and an audio context, it is parented to `body` rather than to this page, and
      // `app.ts` only ever calls this one method. The scroll lock goes with it or the site is left
      // unable to scroll on a page that no longer exists.
      visiting?.dispose();
      visiting = null;
      over?.remove();
      over = null;
      document.body.classList.remove('k-over-open');
    },
  };
}
