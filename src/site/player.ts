/**
 * Who is being taught, and what to call them. (4e1)
 *
 * The doorman (4e2) asks "who's training?" and stores a role. Everything downstream reads the
 * name from here and nothing anywhere hardcodes "Jodi" — which is the whole of step 4e1, done
 * as a constraint rather than as an audit at the end.
 *
 * The rival is always Kayla and is deliberately not templated. She is not a variable; she is the
 * reason the site exists.
 */

import type { PlayerRole } from '../store/progress';
import type { Player } from './types';

export const RIVAL = 'Kayla';

const DEFAULT_NAMES: Record<PlayerRole, string> = {
  jodi: 'Jodi',
  bill: 'Bill',
  kayla: 'Kayla',
  other: 'friend',
};

export function playerFor(role: PlayerRole | null, displayName: string | null): Player {
  const resolved: PlayerRole = role ?? 'jodi';
  return {
    name: displayName?.trim() || DEFAULT_NAMES[resolved],
    rival: RIVAL,
    role: resolved,
  };
}

/**
 * Fill `{name}` and `{rival}` into a string.
 *
 * Unknown placeholders are left exactly as written rather than blanked. A chapter that says
 * `{nmae}` should show the typo loudly in the copy, not quietly delete the word.
 */
export function fill(text: string, player: Player): string {
  return text.replace(/\{(name|rival)\}/g, (whole, key: string) =>
    key === 'name' ? player.name : key === 'rival' ? player.rival : whole,
  );
}
