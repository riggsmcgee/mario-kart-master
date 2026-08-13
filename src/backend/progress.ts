/**
 * Progress sync. (1f3)
 *
 * Everything the site remembers about a person: how far through the course they are, how many
 * stars each drill gave them, which boxes they have ticked in the Chapter 8 programme, and what
 * to call them.
 *
 * **localStorage is the database; Supabase is a copy.** Every read is synchronous and local,
 * every write lands locally first and is pushed afterwards. That ordering is the whole design,
 * and it comes straight from the plan: this is a present, and a present that shows a spinner
 * because a server is down is a broken present. Wifi off, Supabase down, signed out entirely —
 * the course works identically, and syncs when it can.
 *
 * **Merging is best-of, not last-write-wins.** Two devices, no coordination, and one of them
 * possibly holding a week-old snapshot from a session that never got pushed. Under
 * last-write-wins, opening the site on the old laptop would quietly delete stars she earned on
 * the new one. So chapter progress merges field by field: the better status, the higher star
 * count, the better score. That is order-independent and idempotent, which means a sync can run
 * twice, out of order, or against a stale peer and still not lose anything.
 *
 * Ticks in the programme are the exception and are genuinely last-write-wins by timestamp:
 * unticking a box is a deliberate act, and "best of" would make it impossible to ever untick
 * one. The row's existence is the tick (see the migration), so a local untick has to be carried
 * as an explicit `checked: false` with a time on it, or an offline untick would be undone by
 * the next pull.
 */

import { getSupabase, isConfigured } from './supabase';
import type { ChapterStatus, PlayerRole } from './schema';

const STORAGE_KEY = 'mkm.progress.v1';

// --- the shape of what we remember ------------------------------------------

export interface ChapterProgress {
  chapterId: string;
  status: ChapterStatus;
  /** 0 to 3. Drills that are not scored leave this at 0. */
  stars: number;
  /** Whatever the chapter's drill counts. Null when it has never been played. */
  bestScore: number | null;
  updatedAt: string;
}

/**
 * One box in the Chapter 8 programme. Carries `checked: false` rather than being deleted, so an
 * untick survives long enough to be pushed.
 */
export interface PlanCheck {
  itemId: string;
  checked: boolean;
  at: string;
}

export interface ProgressSnapshot {
  chapters: Record<string, ChapterProgress>;
  checks: Record<string, PlanCheck>;
  displayName: string | null;
  role: PlayerRole | null;
  profileUpdatedAt: string;
}

export type SyncStatus =
  /** No credentials in the build. Local only, and that is a fine way to run. */
  | 'local-only'
  /** Signed out. Nothing to sync to yet. */
  | 'signed-out'
  /** Browser reports no network. */
  | 'offline'
  | 'syncing'
  | 'synced'
  /** A push or pull failed. Retried on the next write, reconnect, or tab focus. */
  | 'error';

export interface SyncState {
  status: SyncStatus;
  /** When the last successful sync finished, or null if there has not been one. */
  lastSyncedAt: number | null;
  /** Message from the last failure, for the testbed readout. */
  message: string | null;
  /** Writes made locally that have not reached the server. */
  pending: number;
}

const STATUS_RANK: Record<ChapterStatus, number> = {
  not_started: 0,
  in_progress: 1,
  done: 2,
};

function emptySnapshot(): ProgressSnapshot {
  return {
    chapters: {},
    checks: {},
    displayName: null,
    role: null,
    profileUpdatedAt: new Date(0).toISOString(),
  };
}

export function blankChapter(chapterId: string): ChapterProgress {
  return {
    chapterId,
    status: 'not_started',
    stars: 0,
    bestScore: null,
    updatedAt: new Date(0).toISOString(),
  };
}

// --- merging ----------------------------------------------------------------

/**
 * Best of two records of the same chapter.
 *
 * Deliberately not last-write-wins. See the file header: a stale device must never be able to
 * take a star back off her.
 */
export function mergeChapter(a: ChapterProgress, b: ChapterProgress): ChapterProgress {
  const bestScore =
    a.bestScore === null
      ? b.bestScore
      : b.bestScore === null
        ? a.bestScore
        : Math.max(a.bestScore, b.bestScore);

  return {
    chapterId: a.chapterId,
    status: STATUS_RANK[a.status] >= STATUS_RANK[b.status] ? a.status : b.status,
    stars: Math.max(a.stars, b.stars),
    bestScore,
    updatedAt: a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt,
  };
}

/** Ticks are last-write-wins, because unticking has to be possible. */
export function mergeCheck(a: PlanCheck, b: PlanCheck): PlanCheck {
  return a.at >= b.at ? a : b;
}

export function mergeSnapshots(
  local: ProgressSnapshot,
  remote: ProgressSnapshot,
): ProgressSnapshot {
  const chapters: Record<string, ChapterProgress> = { ...local.chapters };
  for (const [id, row] of Object.entries(remote.chapters)) {
    const mine = chapters[id];
    chapters[id] = mine ? mergeChapter(mine, row) : row;
  }

  const checks: Record<string, PlanCheck> = { ...local.checks };
  for (const [id, row] of Object.entries(remote.checks)) {
    const mine = checks[id];
    checks[id] = mine ? mergeCheck(mine, row) : row;
  }

  const remoteProfileNewer = remote.profileUpdatedAt > local.profileUpdatedAt;
  return {
    chapters,
    checks,
    displayName: remoteProfileNewer ? remote.displayName : local.displayName,
    role: remoteProfileNewer ? remote.role : local.role,
    profileUpdatedAt: remoteProfileNewer ? remote.profileUpdatedAt : local.profileUpdatedAt,
  };
}

// --- local storage ----------------------------------------------------------

function readLocal(): ProgressSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return emptySnapshot();

    // Merge onto a blank rather than trusting the file: a snapshot written by an older build
    // may be missing whole sections, and a course that crashes on load because of a stale
    // localStorage key is the worst possible first impression.
    const source = parsed as Partial<ProgressSnapshot>;
    const snapshot = emptySnapshot();
    if (source.chapters && typeof source.chapters === 'object') {
      for (const [id, row] of Object.entries(source.chapters)) {
        if (row && typeof row === 'object') snapshot.chapters[id] = { ...blankChapter(id), ...row };
      }
    }
    if (source.checks && typeof source.checks === 'object') {
      for (const [id, row] of Object.entries(source.checks)) {
        if (row && typeof row === 'object' && typeof row.at === 'string') {
          snapshot.checks[id] = { itemId: id, checked: row.checked === true, at: row.at };
        }
      }
    }
    if (typeof source.displayName === 'string') snapshot.displayName = source.displayName;
    if (typeof source.role === 'string') snapshot.role = source.role;
    if (typeof source.profileUpdatedAt === 'string') {
      snapshot.profileUpdatedAt = source.profileUpdatedAt;
    }
    return snapshot;
  } catch {
    return emptySnapshot();
  }
}

function writeLocal(snapshot: ProgressSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Private browsing, or a full quota. The session still works from memory; losing progress
    // on close is bad, but throwing here would lose the whole page.
  }
}

// --- the store --------------------------------------------------------------

export interface ProgressStoreOptions {
  /** Push debounce, ms. Ticking six boxes in a row should be one request, not six. */
  pushDelayMs?: number;
}

export class ProgressStore {
  private snapshot: ProgressSnapshot;
  private userId: string | null = null;
  private sync: SyncState = {
    status: isConfigured() ? 'signed-out' : 'local-only',
    lastSyncedAt: null,
    message: null,
    pending: 0,
  };

  private readonly listeners = new Set<(snapshot: ProgressSnapshot) => void>();
  private readonly syncListeners = new Set<(state: SyncState) => void>();
  private readonly pushDelayMs: number;

  /** Ids written locally and not yet accepted by the server. */
  private dirtyChapters = new Set<string>();
  private dirtyChecks = new Set<string>();
  private dirtyProfile = false;

  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;

  constructor(options: ProgressStoreOptions = {}) {
    this.pushDelayMs = options.pushDelayMs ?? 800;
    this.snapshot = readLocal();

    // Three ways back from a failed sync, all of them free: the network returning, the tab
    // coming back to the front, and any subsequent write.
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    document.addEventListener('visibilitychange', this.onVisible);
  }

  dispose(): void {
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
    document.removeEventListener('visibilitychange', this.onVisible);
    if (this.pushTimer !== null) clearTimeout(this.pushTimer);
  }

  // --- reads (always synchronous, always local) -----------------------------

  getSnapshot(): Readonly<ProgressSnapshot> {
    return this.snapshot;
  }

  getChapter(chapterId: string): ChapterProgress {
    return this.snapshot.chapters[chapterId] ?? blankChapter(chapterId);
  }

  isChecked(itemId: string): boolean {
    return this.snapshot.checks[itemId]?.checked === true;
  }

  countChecked(itemIds: readonly string[]): number {
    return itemIds.filter((id) => this.isChecked(id)).length;
  }

  getDisplayName(): string | null {
    return this.snapshot.displayName;
  }

  getRole(): PlayerRole | null {
    return this.snapshot.role;
  }

  getSyncState(): Readonly<SyncState> {
    return this.sync;
  }

  // --- writes ---------------------------------------------------------------

  /**
   * Record chapter progress. Merged into what is already there rather than replacing it, so a
   * chapter cannot lose stars by being replayed badly — which matters, because the course
   * invites her to come back and try a drill again.
   */
  setChapter(
    chapterId: string,
    patch: { status?: ChapterStatus; stars?: number; bestScore?: number | null },
  ): ChapterProgress {
    const current = this.getChapter(chapterId);
    const proposed: ChapterProgress = {
      chapterId,
      status: patch.status ?? current.status,
      stars: patch.stars ?? current.stars,
      bestScore: patch.bestScore ?? current.bestScore,
      updatedAt: new Date().toISOString(),
    };
    const merged = mergeChapter(proposed, current);

    this.snapshot.chapters[chapterId] = merged;
    this.dirtyChapters.add(chapterId);
    this.commit();
    return merged;
  }

  /** Mark a chapter started. Cheap to call on every visit; it never downgrades a finished one. */
  startChapter(chapterId: string): void {
    if (this.getChapter(chapterId).status !== 'not_started') return;
    this.setChapter(chapterId, { status: 'in_progress' });
  }

  setCheck(itemId: string, checked: boolean): void {
    this.snapshot.checks[itemId] = { itemId, checked, at: new Date().toISOString() };
    this.dirtyChecks.add(itemId);
    this.commit();
  }

  toggleCheck(itemId: string): boolean {
    const next = !this.isChecked(itemId);
    this.setCheck(itemId, next);
    return next;
  }

  setDisplayName(name: string): void {
    this.snapshot.displayName = name;
    this.snapshot.profileUpdatedAt = new Date().toISOString();
    this.dirtyProfile = true;
    this.commit();
  }

  setRole(role: PlayerRole): void {
    this.snapshot.role = role;
    this.snapshot.profileUpdatedAt = new Date().toISOString();
    this.dirtyProfile = true;
    this.commit();
  }

  /**
   * Wipe local progress. Used by "change user" on a shared browser — Kayla poking at the
   * doorman must not be able to see, or clear, Jodi's course.
   */
  clearLocal(): void {
    this.snapshot = emptySnapshot();
    this.dirtyChapters.clear();
    this.dirtyChecks.clear();
    this.dirtyProfile = false;
    writeLocal(this.snapshot);
    this.emit();
  }

  // --- subscriptions --------------------------------------------------------

  subscribe(listener: (snapshot: ProgressSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  onSyncChange(listener: (state: SyncState) => void): () => void {
    this.syncListeners.add(listener);
    listener(this.sync);
    return () => this.syncListeners.delete(listener);
  }

  // --- session --------------------------------------------------------------

  /**
   * Tell the store who is signed in. Passing a user id pulls their rows and merges; passing
   * null just stops syncing and leaves local progress exactly where it is.
   *
   * Local progress is deliberately kept on sign-in rather than discarded. Someone who works
   * through three chapters and only then signs in should arrive with those three chapters
   * done — the alternative punishes exactly the behaviour the course encourages.
   */
  async setUser(userId: string | null): Promise<void> {
    if (this.userId === userId) return;
    this.userId = userId;

    if (userId === null) {
      this.setSync({ status: isConfigured() ? 'signed-out' : 'local-only', message: null });
      return;
    }

    // Everything held locally now belongs to this account and needs pushing.
    for (const id of Object.keys(this.snapshot.chapters)) this.dirtyChapters.add(id);
    for (const id of Object.keys(this.snapshot.checks)) this.dirtyChecks.add(id);
    if (this.snapshot.displayName !== null || this.snapshot.role !== null) this.dirtyProfile = true;

    await this.syncNow();
  }

  // --- syncing --------------------------------------------------------------

  /** Pull, merge, push. Safe to call at any time; concurrent calls share one run. */
  async syncNow(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    const run = this.runSync().finally(() => {
      this.inFlight = null;
    });
    this.inFlight = run;
    return run;
  }

  private async runSync(): Promise<void> {
    const supabase = getSupabase();
    const userId = this.userId;
    if (!supabase) {
      this.setSync({ status: 'local-only', message: null });
      return;
    }
    if (!userId) {
      this.setSync({ status: 'signed-out', message: null });
      return;
    }
    if (!navigator.onLine) {
      this.setSync({
        status: 'offline',
        message: 'No network. Everything is saved on this device.',
      });
      return;
    }

    this.setSync({ status: 'syncing', message: null });

    try {
      const remote = await this.pull(userId);
      // Merge before pushing so the outgoing write already contains the better of the two
      // sides. Pushing first would send a value we are about to improve on.
      this.snapshot = mergeSnapshots(this.snapshot, remote);
      writeLocal(this.snapshot);
      this.emit();

      await this.push(userId);

      this.setSync({ status: 'synced', message: null, lastSyncedAt: Date.now() });
    } catch (error) {
      this.setSync({
        status: 'error',
        message: error instanceof Error ? error.message : 'Sync failed.',
      });
    }
  }

  private async pull(userId: string): Promise<ProgressSnapshot> {
    const supabase = getSupabase();
    if (!supabase) return emptySnapshot();

    const [chapters, checks, profile] = await Promise.all([
      supabase.from('chapter_progress').select('*').eq('user_id', userId),
      supabase.from('plan_checks').select('*').eq('user_id', userId),
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    ]);

    if (chapters.error) throw new Error(chapters.error.message);
    if (checks.error) throw new Error(checks.error.message);
    if (profile.error) throw new Error(profile.error.message);

    const snapshot = emptySnapshot();

    for (const row of chapters.data ?? []) {
      snapshot.chapters[row.chapter_id] = {
        chapterId: row.chapter_id,
        status: row.status as ChapterStatus,
        stars: row.stars,
        bestScore: row.best_score,
        updatedAt: row.updated_at,
      };
    }

    for (const row of checks.data ?? []) {
      snapshot.checks[row.item_id] = {
        itemId: row.item_id,
        checked: true,
        at: row.checked_at,
      };
    }

    if (profile.data) {
      snapshot.displayName = profile.data.display_name;
      snapshot.role = profile.data.role;
      snapshot.profileUpdatedAt = profile.data.updated_at;
    }

    return snapshot;
  }

  /**
   * Send local writes.
   *
   * The dirty sets are cleared *before* awaiting, so a write made while the request is in the
   * air stays dirty and goes out on the next push rather than being marked clean by this one.
   * On failure they are put back.
   */
  private async push(userId: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    const chapterIds = [...this.dirtyChapters];
    const checkIds = [...this.dirtyChecks];
    const profileDirty = this.dirtyProfile;
    this.dirtyChapters.clear();
    this.dirtyChecks.clear();
    this.dirtyProfile = false;
    this.setSync({ pending: 0 });

    try {
      if (chapterIds.length > 0) {
        const rows = chapterIds.map((id) => {
          const row = this.getChapter(id);
          return {
            user_id: userId,
            chapter_id: id,
            status: row.status,
            stars: row.stars,
            best_score: row.bestScore,
          };
        });
        const { error } = await supabase
          .from('chapter_progress')
          .upsert(rows, { onConflict: 'user_id,chapter_id' });
        if (error) throw new Error(error.message);
      }

      // A tick is a row and an untick is the absence of one, so the two halves go different
      // ways: upsert the ticked ones, delete the unticked ones.
      const ticked = checkIds.filter((id) => this.isChecked(id));
      const unticked = checkIds.filter((id) => !this.isChecked(id));

      if (ticked.length > 0) {
        const { error } = await supabase.from('plan_checks').upsert(
          ticked.map((id) => ({ user_id: userId, item_id: id })),
          { onConflict: 'user_id,item_id' },
        );
        if (error) throw new Error(error.message);
      }

      if (unticked.length > 0) {
        const { error } = await supabase
          .from('plan_checks')
          .delete()
          .eq('user_id', userId)
          .in('item_id', unticked);
        if (error) throw new Error(error.message);
      }

      if (profileDirty) {
        const patch: { display_name?: string | null; role?: PlayerRole } = {};
        if (this.snapshot.displayName !== null) patch.display_name = this.snapshot.displayName;
        /**
         * **The `kayla` role is never written to the server.** (4f1.)
         *
         * The doorman's own doc says "her role never reaches the server, so there is no row
         * anywhere recording that Kayla was locked out". That was the intent and it was not what
         * the code did: `lockOut()` calls `setRole('kayla')` like any other choice, which marked
         * the profile dirty and pushed it.
         *
         * The consequence is not a stray row. The plan wants Kayla to find the lockout organically
         * after launch (4e3) — which means on Jodi's machine, where Jodi is signed in. Her poking
         * at the doorman would have written `role: 'kayla'` to *Jodi's* profile, and Jodi would
         * open her present on any device and be locked out of it. Recoverable only by someone
         * knowing to press "Change user", on a site whose entire promise is that nothing here can
         * be broken.
         *
         * Enforced at the one place that talks to the server rather than at the call site, so it
         * holds however the role is set — including the sign-in path above, which re-dirties the
         * profile from whatever happens to be in local storage at the time.
         */
        if (this.snapshot.role !== null && this.snapshot.role !== 'kayla') {
          patch.role = this.snapshot.role;
        }
        if (Object.keys(patch).length > 0) {
          const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
          if (error) throw new Error(error.message);
        }
      }
    } catch (error) {
      for (const id of chapterIds) this.dirtyChapters.add(id);
      for (const id of checkIds) this.dirtyChecks.add(id);
      this.dirtyProfile ||= profileDirty;
      this.setSync({ pending: this.pendingCount() });
      throw error;
    }
  }

  // --- internals ------------------------------------------------------------

  private commit(): void {
    writeLocal(this.snapshot);
    this.emit();
    this.setSync({ pending: this.pendingCount() });
    this.schedulePush();
  }

  private pendingCount(): number {
    return this.dirtyChapters.size + this.dirtyChecks.size + (this.dirtyProfile ? 1 : 0);
  }

  private schedulePush(): void {
    if (!this.userId || !getSupabase()) return;
    if (this.pushTimer !== null) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.syncNow();
    }, this.pushDelayMs);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.snapshot);
  }

  private setSync(patch: Partial<SyncState>): void {
    this.sync = { ...this.sync, ...patch };
    for (const listener of this.syncListeners) listener(this.sync);
  }

  private onOnline = (): void => {
    if (this.pendingCount() > 0 || this.sync.status !== 'synced') void this.syncNow();
  };

  private onOffline = (): void => {
    this.setSync({ status: 'offline', message: 'No network. Everything is saved on this device.' });
  };

  private onVisible = (): void => {
    if (document.visibilityState !== 'visible') return;
    if (this.userId && this.pendingCount() > 0) void this.syncNow();
  };
}

/**
 * The one store the site uses. A module-level singleton because progress is genuinely global —
 * the header's progress bar, a drill's star award and the Chapter 8 checkboxes are three views
 * of one thing, and passing it through every constructor would buy nothing.
 */
let shared: ProgressStore | null = null;

export function getProgressStore(): ProgressStore {
  shared ??= new ProgressStore();
  return shared;
}
