/**
 * Hand-written types for the database. (1f1)
 *
 * Kept in step with `supabase/migrations` by hand rather than generated, because the schema is
 * three small tables that change rarely, and a generation step is a build dependency plus a
 * stale-artifact problem for very little gain here. If the schema starts moving, switch to
 * `supabase gen types typescript` — the shape below is deliberately what that would produce.
 */

export type PlayerRole = 'jodi' | 'bill' | 'kayla' | 'other';
export type ChapterStatus = 'not_started' | 'in_progress' | 'done';

export interface ProfileRow {
  id: string;
  display_name: string | null;
  role: PlayerRole;
  created_at: string;
  updated_at: string;
}

export interface ChapterProgressRow {
  user_id: string;
  chapter_id: string;
  status: ChapterStatus;
  stars: number;
  best_score: number | null;
  updated_at: string;
}

export interface PlanCheckRow {
  user_id: string;
  item_id: string;
  checked_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
      };
      chapter_progress: {
        Row: ChapterProgressRow;
        Insert: Partial<ChapterProgressRow> & { user_id: string; chapter_id: string };
        Update: Partial<ChapterProgressRow>;
      };
      plan_checks: {
        Row: PlanCheckRow;
        Insert: Partial<PlanCheckRow> & { user_id: string; item_id: string };
        Update: Partial<PlanCheckRow>;
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: { player_role: PlayerRole };
    CompositeTypes: Record<never, never>;
  };
}
