/**
 * Settings, and the sign-in that lives inside it. (2a1)
 *
 * Signing in is deliberately *not* a gate in front of the course. She can work through every
 * chapter without an account and everything is remembered on the machine she is sitting at;
 * signing in only buys her the same progress on a second device. Putting an email form between
 * a present and the person it is for is the single most likely place this gets abandoned.
 *
 * So this page reads as "extras", the sync state is stated in plain words rather than as a
 * status icon, and the one genuinely destructive control asks first.
 */

import {
  getAuthState,
  sendMagicLink,
  signOut,
  isConfigured,
  type AuthState,
} from '../backend/auth';
import type { ProgressStore, SyncState } from '../backend/progress';
import type { Sfx } from '../ui/sfx';
import { CHAPTERS } from '../data/chapters';
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

const SYNC_WORDS: Record<SyncState['status'], string> = {
  'local-only': 'Saved on this computer. (No account is set up for this site.)',
  'signed-out': 'Saved on this computer. Sign in to see the same progress on another device.',
  offline: 'No internet right now — still saving everything here, and it will catch up later.',
  syncing: 'Saving…',
  synced: 'Saved here and to your account.',
  error: 'Saved here. Could not reach the account just now — it will try again.',
};

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
      el('p', null, 'This is the name the chapters use. It changes the writing, not your account.'),
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

  // --- account --------------------------------------------------------------

  const accountBody = el('div', { class: 'stack' });
  const syncLine = el('p', { class: 'sync' }, '');

  const unSync = progress.onSyncChange((state) => {
    syncLine.dataset['status'] = state.status;
    syncLine.textContent = SYNC_WORDS[state.status];
  });

  function paintAccount(auth: AuthState): void {
    if (!isConfigured()) {
      accountBody.replaceChildren(
        el(
          'p',
          null,
          'Accounts are switched off in this build. Everything is saved on this computer, which is plenty.',
        ),
      );
      return;
    }

    if (auth.status === 'signed-in') {
      const out = el('button', { class: 'btn', type: 'button' }, 'Sign out');
      out.addEventListener('click', () => {
        void signOut().then(() => {
          void progress.setUser(null);
          void getAuthState().then(paintAccount);
        });
      });
      accountBody.replaceChildren(
        el('p', null, rich(`Signed in as **${auth.email ?? 'your account'}**.`)),
        el(
          'p',
          null,
          'Your progress follows you to any computer you sign in on. Signing out leaves everything on this one exactly as it is.',
        ),
        out,
      );
      return;
    }

    const email = el('input', {
      type: 'email',
      placeholder: 'you@example.com',
      style: {
        font: 'inherit',
        padding: '0.6em 0.8em',
        borderRadius: '12px',
        border: '2px solid var(--rule)',
        minWidth: '16rem',
      },
    });
    email.setAttribute('aria-label', 'Your email address');

    const send = el('button', { class: 'btn', type: 'button' }, 'Send me a link');
    const outcome = el('p', { class: 'eyebrow', style: { margin: '0.6rem 0 0' } }, '');

    send.addEventListener('click', () => {
      send.disabled = true;
      outcome.textContent = 'Sending…';
      void sendMagicLink(email.value).then((result) => {
        send.disabled = false;
        outcome.textContent = result.message;
      });
    });

    accountBody.replaceChildren(
      el(
        'p',
        null,
        'There is no password. Put your email in, click the link it sends you, and that is it — you stay signed in.',
      ),
      el('div', { style: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' } }, email, send),
      outcome,
    );
  }

  void getAuthState().then(paintAccount);

  page.append(
    el('section', { class: 'card stack' }, el('h2', null, 'Your progress'), accountBody, syncLine),
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
     * will be wrong the first time a second one is added. All three are cleared here, together, and
     * the site is handed back in the state it shipped in — at the door, asking who is training.
     */
    progress.clearLocal();
    forgetDoorman();
    void import('./kayla/admission').then(({ forgetAdmission }) => forgetAdmission());
    reset.textContent = 'Cleared.';
    armed = false;
    go({ name: 'home' });
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
   * clicks her own name at the doorman out of nosiness and gets ten minutes of a website insisting
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
          `There is a second version of this site behind ${RIVAL}'s name at the door. It is about ten minutes long, it is not a course, and it insists throughout that it does not exist.`,
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
      unSync();
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
