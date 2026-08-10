/**
 * Domain names for the database types. (1f1)
 *
 * The types themselves are **generated** into `database.types.ts` — do not edit that file, and
 * regenerate it whenever a migration lands:
 *
 * ```
 * npx supabase gen types typescript --linked > src/backend/database.types.ts
 * ```
 *
 * This started out hand-written, which was a mistake worth recording. postgrest-js checks the
 * whole schema against an exact shape, and a hand-made one that is subtly wrong does not fail
 * loudly: `.select()` keeps working while `.update()` silently takes `never`. Generating them
 * removes an entire class of confusing error, and costs one command per migration.
 *
 * This file exists so the rest of the code says `ProfileRow` rather than reaching four levels
 * into a generated type, and so regenerating never clobbers anything hand-written.
 */

import type { Database } from './database.types';

export type { Database };

type Public = Database['public'];

export type PlayerRole = Public['Enums']['player_role'];

/**
 * `status` is a text column with a check constraint rather than a Postgres enum, so it
 * generates as plain `string`. This union is the constraint restated for the compiler — keep
 * the two in step by hand.
 */
export type ChapterStatus = 'not_started' | 'in_progress' | 'done';

export type ProfileRow = Public['Tables']['profiles']['Row'];
export type ChapterProgressRow = Public['Tables']['chapter_progress']['Row'];
export type PlanCheckRow = Public['Tables']['plan_checks']['Row'];
