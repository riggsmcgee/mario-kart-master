/**
 * The chapter contract. (2a2)
 *
 * Every chapter is a module that supplies two things — the concept section, and optionally an
 * interactive moment — and the template supplies everything around them. Keeping this narrow is
 * what makes the chapters content rather than code: a chapter cannot invent its own navigation,
 * its own done-stamp, or its own idea of what "finished" means, so all nine behave identically
 * without nine copies of the behaviour.
 *
 * Copy never contains a literal name. Everything routes through {@link ChapterContext.t}, which
 * fills in `{name}` and `{rival}` — that is step 4e1 satisfied by construction rather than by a
 * later audit, because a hardcoded "Jodi" simply has nowhere to live.
 */

import type { PlayerRole, ProgressStore } from '../store/progress';
import type { ChapterMeta } from '../data/chapters';
import type { Sfx } from '../ui/sfx';

export interface Player {
  /** What to call them. "Jodi" unless the doorman says otherwise. */
  name: string;
  /** The rival, named throughout. Always Kayla — she is the whole point. */
  rival: string;
  role: PlayerRole;
}

export interface ChapterResult {
  /** 0 to 3. Omit for chapters that are not scored. */
  stars?: number;
  /** Whatever this drill counts: coins, clean tricks, blocks. */
  score?: number;
}

export interface ChapterContext {
  player: Player;
  meta: ChapterMeta;
  progress: ProgressStore;
  sfx: Sfx;

  /** Fill `{name}` and `{rival}` into a string. */
  t(text: string): string;

  /**
   * Called by an interactive when the player has finished it. Awards stars, stamps the chapter
   * done, and reveals the next-chapter button.
   *
   * Safe to call more than once — progress merges best-of, so a worse replay never takes a star
   * back off her.
   */
  finish(result?: ChapterResult): void;
}

/** Anything mounted into a page that has to be torn down when she navigates away. */
export interface Mounted {
  dispose(): void;
}

export interface ChapterContent {
  /**
   * The concept: what this skill is and why it wins races. Returns a node rather than taking a
   * mount point, so a chapter that is only prose is one `return html(...)` call.
   */
  concept(ctx: ChapterContext): Node;

  /**
   * The interactive moment. Optional, though every teaching chapter currently has one — Chapter 6
   * gained a drill on 2026-08-12. Chapter 8 replaces the whole template instead; see `custom`.
   */
  interactive?: ((mount: HTMLElement, ctx: ChapterContext) => Mounted) | undefined;

  /**
   * Replaces the whole standard template. Chapter 8 uses this: the practice programme is not a
   * hook-concept-video-drill chapter and pretending otherwise would bend the template out of
   * shape for one page.
   */
  custom?: ((mount: HTMLElement, ctx: ChapterContext) => Mounted) | undefined;
}
