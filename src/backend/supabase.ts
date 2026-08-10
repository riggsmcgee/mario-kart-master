/**
 * Supabase client. (1f1)
 *
 * The anon key ships to the browser on purpose. It is safe *because* row-level security is on
 * every table and every policy is scoped to `auth.uid()` — the key identifies the project, not
 * the person. If a table is ever added without RLS, that stops being true immediately.
 *
 * **The site must never block on this.** Jodi's progress lives in localStorage first and syncs
 * when it can (1f3), so a missing config, a dead network or a Supabase outage costs her the
 * cross-device sync and nothing else. That is why `getSupabase()` returns null rather than
 * throwing: callers are expected to carry on without it.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './schema';

export type Client = SupabaseClient<Database>;

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: Client | null = null;

/** True when credentials are present. False in a clone with no `.env.local`. */
export function isConfigured(): boolean {
  return Boolean(url && anonKey);
}

/**
 * The shared client, or null when unconfigured. Created lazily so that a page which never
 * touches the backend never opens a connection.
 */
export function getSupabase(): Client | null {
  if (!isConfigured()) return null;
  client ??= createClient<Database>(url ?? '', anonKey ?? '', {
    auth: {
      // Jodi should sign in once, ever. Persist the session and refresh it in the background.
      persistSession: true,
      autoRefreshToken: true,
      // The magic link comes back with tokens in the URL fragment; let the client consume it.
      detectSessionInUrl: true,
      storageKey: 'mkm.auth.v1',
    },
  });
  return client;
}

/**
 * Where the magic link should land.
 *
 * Must be an absolute URL, and must be listed in the Supabase dashboard's redirect allow-list
 * or the link silently fails. Built from the live origin plus Vite's base so it is correct on
 * localhost and on GitHub Pages without a second config value to keep in step.
 */
export function authRedirectUrl(path = ''): string {
  const base = import.meta.env.BASE_URL;
  return new URL(`${base}${path}`, window.location.origin).toString();
}
