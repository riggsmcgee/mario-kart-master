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
import { fill } from './player';
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
    progress.clearLocal();
    reset.textContent = 'Cleared.';
    armed = false;
    go({ name: 'home' });
  });

  page.append(
    el(
      'section',
      { class: 'card stack' },
      el('h2', null, "Who's using this?"),
      el('p', null, t('Currently set up for **{name}**.')),
      el('div', { style: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' } }, changeUser, reset),
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
    },
  };
}
