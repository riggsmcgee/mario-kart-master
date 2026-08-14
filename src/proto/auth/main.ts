import '../../ui/testbed.css';
import '../../ui/proto.css';
import { installErrorBanner } from '../../ui/error-banner';
import {
  SIGNED_OUT,
  consumeAuthFragment,
  getAuthState,
  getProfile,
  isConfigured,
  onAuthChange,
  sendMagicLink,
  setDisplayName,
  signOut,
  type AuthState,
} from '../../backend/auth';
import type { ProfileRow } from '../../backend/schema';

installErrorBanner();

/** Magic-link harness. (1f2) */

let state: AuthState = SIGNED_OUT;
let profile: ProfileRow | null = null;

function rows(target: string, entries: Array<[string, string]>): void {
  const body = document.querySelector<HTMLTableSectionElement>(`#${target}`);
  if (!body) return;

  body.replaceChildren(
    ...entries.map(([label, value]) => {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      name.textContent = label;
      name.style.width = '12rem';
      const cell = document.createElement('td');
      cell.className = 'num';
      cell.textContent = value;
      tr.append(name, cell);
      return tr;
    }),
  );
}

function say(message: string, ok = true): void {
  const el = document.querySelector<HTMLParagraphElement>('#message');
  if (!el) return;
  el.textContent = message;
  el.className = ok ? 'hint' : 'warn';
}

function renderStatus(): void {
  rows('status', [
    ['configured', isConfigured() ? 'yes' : 'NO'],
    ['status', state.status],
    ['user id', state.userId ?? '—'],
    ['email', state.email ?? '—'],
  ]);

  const warning = document.querySelector<HTMLParagraphElement>('#config-warning');
  if (warning) warning.hidden = isConfigured();

  const signout = document.querySelector<HTMLButtonElement>('#signout');
  if (signout) signout.disabled = state.status !== 'signed-in';
}

function renderProfile(): void {
  if (!profile) {
    rows('profile', [['row', state.status === 'signed-in' ? 'NOT FOUND' : '— (signed out)']]);
    return;
  }
  rows('profile', [
    ['display_name', profile.display_name ?? '—'],
    ['role', profile.role],
    ['created_at', profile.created_at],
    ['updated_at', profile.updated_at],
  ]);

  const input = document.querySelector<HTMLInputElement>('#display-name');
  if (input && !input.value) input.value = profile.display_name ?? '';
}

async function refreshProfile(): Promise<void> {
  profile = state.userId ? await getProfile(state.userId) : null;
  renderProfile();
}

async function applyState(next: AuthState): Promise<void> {
  state = next;
  renderStatus();
  await refreshProfile();
}

// --- wiring ----------------------------------------------------------------

document.querySelector<HTMLButtonElement>('#send')?.addEventListener('click', () => {
  const input = document.querySelector<HTMLInputElement>('#email');
  if (!input) return;
  say('Sending…');
  void sendMagicLink(input.value).then((outcome) => say(outcome.message, outcome.ok));
});

document.querySelector<HTMLButtonElement>('#signout')?.addEventListener('click', () => {
  void signOut().then((outcome) => say(outcome.message, outcome.ok));
});

document.querySelector<HTMLButtonElement>('#save-name')?.addEventListener('click', () => {
  const input = document.querySelector<HTMLInputElement>('#display-name');
  if (!input || !state.userId) return;
  void setDisplayName(state.userId, input.value).then(async (outcome) => {
    say(outcome.message, outcome.ok);
    await refreshProfile();
  });
});

// Enter in the email box sends the link, because that is what Enter in an email box does.
document.querySelector<HTMLInputElement>('#email')?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') document.querySelector<HTMLButtonElement>('#send')?.click();
});

// Take the magic link's tokens out of the address bar and sign in with them. The bench does this
// the same way the real site does, deliberately — this page is where the flow gets debugged, so a
// bench that consumed the fragment differently would be testing something the site does not do.
onAuthChange((next) => {
  void applyState(next);
});

void consumeAuthFragment().then(() => getAuthState().then(applyState));
