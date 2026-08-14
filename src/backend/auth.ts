/**
 * Magic-link auth. (1f2)
 *
 * Passwordless on purpose. Jodi types her email once, clicks a link, and is signed in for
 * good — no password to invent, forget, or reset, which is the single most likely place a
 * present like this gets abandoned before Chapter 0.
 *
 * Every function here degrades rather than throws. The backend is a nice-to-have that syncs
 * progress across her devices; the site works without it, and code that assumed otherwise
 * would turn a Supabase outage into a broken gift.
 */

import { getSupabase, isConfigured, authRedirectUrl } from './supabase';
import type { ProfileRow } from './schema';

export type AuthStatus = 'unconfigured' | 'signed-out' | 'signed-in';

export interface AuthState {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
}

export const SIGNED_OUT: AuthState = { status: 'signed-out', userId: null, email: null };
const UNCONFIGURED: AuthState = { status: 'unconfigured', userId: null, email: null };

export interface Outcome {
  ok: boolean;
  message: string;
}

/**
 * Send the sign-in link.
 *
 * `emailRedirectTo` must be on the dashboard's allow-list or Supabase accepts the request and
 * the link quietly fails — the most common first-run snag, and invisible from the client.
 */
export async function sendMagicLink(email: string): Promise<Outcome> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'No Supabase credentials configured.' };

  const trimmed = email.trim();
  if (!trimmed.includes('@')) return { ok: false, message: 'That does not look like an email.' };

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: { emailRedirectTo: authRedirectUrl() },
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Link sent to ${trimmed}. Check your email — including spam.` };
}

export async function getAuthState(): Promise<AuthState> {
  const supabase = getSupabase();
  if (!supabase) return UNCONFIGURED;

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return SIGNED_OUT;

  return {
    status: 'signed-in',
    userId: data.session.user.id,
    email: data.session.user.email ?? null,
  };
}

/** Subscribe to sign-in and sign-out. Returns an unsubscribe function. */
export function onAuthChange(listener: (state: AuthState) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) {
    listener(UNCONFIGURED);
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(
      session
        ? { status: 'signed-in', userId: session.user.id, email: session.user.email ?? null }
        : SIGNED_OUT,
    );
  });

  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<Outcome> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'No Supabase credentials configured.' };

  const { error } = await supabase.auth.signOut();
  return error ? { ok: false, message: error.message } : { ok: true, message: 'Signed out.' };
}

/**
 * The signed-in user's profile row.
 *
 * Created by the signup trigger, so it should always exist — but `maybeSingle` rather than
 * `single`, because a missing row is a thing to report, not an exception to throw at Jodi.
 */
export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function setDisplayName(userId: string, displayName: string): Promise<Outcome> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'No Supabase credentials configured.' };

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId);

  return error ? { ok: false, message: error.message } : { ok: true, message: 'Saved.' };
}

/**
 * Take the tokens out of the URL fragment the magic link came back on, and sign her in with them.
 *
 * **This used to be `cleanAuthFragmentFromUrl`, and it was quietly throwing the sign-in away.**
 * Its doc comment claimed "the client has already consumed them by this point", which was never
 * true: `getSupabase()` builds the client lazily, `app.ts` called this *first* thing at boot, and
 * the first thing to ask for a client was `getAuthState()` on the line after. So the fragment was
 * stripped, then the client was constructed, then its `detectSessionInUrl` looked at an address
 * bar with nothing in it and found no session. Every magic link would have landed signed-out.
 *
 * Nobody caught it because nobody could: gate 1f4 records that a real link has never arrived in a
 * real inbox, and the failure is silent — the site works perfectly well signed out, which is the
 * whole design. It only costs the one thing sign-in buys, which is her progress on a second
 * device.
 *
 * **Why not simply move the stripping later.** Because this is a hash-routed site, and the router
 * reads `window.location.hash` during boot. Leaving `#access_token=…` in place until an async
 * session check resolves means the router parses it as a wrong turn and paints "There is no
 * chapter here" over the top of her arrival. So the fragment still has to go *synchronously*, and
 * the tokens have to be handed to the client by hand instead of left in the URL for it to find.
 * `setSession` is the documented way to do exactly that.
 *
 * The stripping matters for its own sake too: a fragment left in the address bar ends up in
 * history and in anything Jodi copies and pastes, and it is a live credential.
 *
 * PKCE links (`?code=…` in the query string) are untouched by any of this — nothing here rewrites
 * the query, so `detectSessionInUrl` still handles that flow the ordinary way.
 */
export async function consumeAuthFragment(): Promise<boolean> {
  const hash = window.location.hash;
  if (!hash.includes('access_token')) return false;

  const params = new URLSearchParams(hash.replace(/^#\/?/, ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  // Out of the address bar before anything else looks at it, whatever happens next.
  history.replaceState(null, '', window.location.pathname + window.location.search);

  const supabase = getSupabase();
  if (!supabase || !accessToken || !refreshToken) return false;

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return !error;
}

export { isConfigured };
