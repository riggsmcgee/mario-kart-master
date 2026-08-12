/**
 * Which module belongs to which chapter. (2a1)
 *
 * Every chapter is loaded lazily, and that is the whole reason this file exists rather than a
 * pile of static imports at the top of the app. Three.js is roughly 132KB gzipped and three
 * chapters need it; the other six do not. A static import graph would hand that to her on the
 * intro page, before she has seen a single word, on whatever wifi she has. `import.meta.glob`
 * without `eager` gives Vite one dynamic import per matched file, so each chapter still becomes
 * its own chunk and the concept-only chapters stay small.
 *
 * **Why a glob rather than nine literal `import()` calls.** The literal version was written
 * first and it was wrong in a way worth recording: Vite's import-analysis resolves the *path* of
 * a dynamic import at transform time, even though the fetch is deferred. So a single missing
 * chapter file is not a missing chapter — it is a dev server that will not serve any page at
 * all, with an overlay about `./chapters/ch6` covering the site. The glob only ever matches
 * files that exist, so a chapter that is absent costs exactly that chapter.
 *
 * That matters beyond the day the chapters were being written. It means someone can start
 * chapter 9 by adding a row to `CHAPTERS` and get a working "not built yet" page instead of a
 * blank site, and it means a botched merge deletes one chapter rather than all of them.
 */

import type { ChapterContent } from './types';

type Loader = () => Promise<unknown>;

// Keyed by path, e.g. './chapters/ch3.ts'. Lazy: each value is a function returning a promise.
const MODULES = import.meta.glob('./chapters/*.ts') as Record<string, Loader>;

function loaderFor(id: string): Loader | undefined {
  return MODULES[`./chapters/${id}.ts`];
}

/** Whether a chapter module has actually been written yet. */
export function hasChapter(id: string): boolean {
  return loaderFor(id) !== undefined;
}

export async function loadChapter(id: string): Promise<ChapterContent | null> {
  const loader = loaderFor(id);
  if (!loader) return null;

  const module = (await loader()) as { default?: ChapterContent };
  // A module that exists but exports the wrong shape is a bug worth seeing rather than a blank
  // section: the caller renders its "nothing here" page, which says so plainly.
  return module.default ?? null;
}
