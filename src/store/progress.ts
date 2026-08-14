/**
 * Progress. (1f3; the sync half removed 2026-08-14.)
 *
 * Everything the site remembers about a person: how far through the course they are, how many
 * stars each drill gave them, which boxes they have ticked in the Chapter 8 programme, and what
 * to call them.
 *
 * **localStorage is the database.** Every read is synchronous, every write lands immediately, and
 * nothing here can fail because of a network. That was always the design — this is a present, and
 * a present that shows a spinner because a server is down is a broken present — but it used to be
 * half of it. Supabase held a copy, magic-link auth decided whose copy, and signing in bought the
 * same progress on a second device.
 *
 * That half is gone (Riggs, 2026-08-14: *"pull that link system so it doesn't cause confusion
 * later. Practice setting it up was plenty."*). It was built as an exercise, it was never used by
 * anyone but its own test, and leaving it in meant a free-tier project that pauses after a week of
 * quiet — so the first thing Jodi would ever have seen from it is a sign-in that silently fails.
 * A course that keeps working on one machine forever is worth more than a sync nobody asked for.
 *
 * What survives from that work is the merge rule below, because it is still what makes replaying a
 * drill safe.
 */

/** The three states a chapter can be in. Was a database check constraint; now just this. */
export type ChapterStatus = 'not_started' | 'in_progress' | 'done';

/** Who is at the keyboard. Was a Postgres enum; now just this. */
export type PlayerRole = 'jodi' | 'bill' | 'kayla' | 'other';

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

/** One box in the Chapter 8 programme. */
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
 * Deliberately not last-write-wins. This was written for two devices reconciling, and it still
 * earns its place with one: `setChapter` merges every write onto what is already there, so a
 * chapter cannot lose stars by being replayed badly — which matters, because the course invites
 * her to come back and try a drill again.
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

export class ProgressStore {
  private snapshot: ProgressSnapshot;

  private readonly listeners = new Set<(snapshot: ProgressSnapshot) => void>();

  constructor() {
    this.snapshot = readLocal();
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
    this.commit();
  }

  setRole(role: PlayerRole): void {
    this.snapshot.role = role;
    this.snapshot.profileUpdatedAt = new Date().toISOString();
    this.commit();
  }

  /**
   * Wipe local progress. Used by "change user" on a shared browser — Kayla poking at the
   * doorman must not be able to see, or clear, Jodi's course.
   */
  clearLocal(): void {
    this.snapshot = emptySnapshot();
    writeLocal(this.snapshot);
    this.emit();
  }

  // --- subscriptions --------------------------------------------------------

  subscribe(listener: (snapshot: ProgressSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  // --- internals ------------------------------------------------------------

  private commit(): void {
    writeLocal(this.snapshot);
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.snapshot);
  }
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
