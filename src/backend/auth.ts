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
 * Strip the auth tokens the magic link leaves in the URL fragment.
 *
 * The client has already consumed them by this point. Leaving them in the address bar means
 * they end up in history and in anything Jodi copies and pastes.
 */
export function cleanAuthFragmentFromUrl(): void {
  if (!window.location.hash.includes('access_token')) return;
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

export { isConfigured };
