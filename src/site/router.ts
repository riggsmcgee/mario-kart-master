/**
 * Hash routing. (2a1, and it settles WORKLOG Q8.)
 *
 * Hashes rather than clean paths, on purpose. GitHub Pages serves static files with no SPA
 * fallback, so `/chapter/ch3` would 404 the moment she refreshed the page or opened a link from
 * her own bookmarks — and the usual workarounds (a `404.html` that re-enters the app, or a
 * redirect shim) both cost a page load and break the back button in small ways. A hash never
 * reaches the server at all.
 *
 * The trade is that URLs read `#/chapter/ch3`. Nobody in this story is ever going to type one.
 */

export interface Route {
  name: 'home' | 'chapter' | 'try' | 'plan' | 'settings' | 'not-found';
  /** Chapter id, on the chapter and try routes. */
  id?: string;
}

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  if (path === '') return { name: 'home' };
  if (path === 'settings') return { name: 'settings' };
  if (path === 'plan') return { name: 'plan' };

  // `/try` is the practice page for a chapter — the same chapter, second half. Matched before the
  // bare chapter pattern because `[\w-]+` would otherwise happily swallow neither, and keeping
  // them as two patterns means a typo'd suffix 404s instead of silently rendering the lesson.
  const practice = /^chapter\/([\w-]+)\/try$/.exec(path);
  if (practice?.[1]) return { name: 'try', id: practice[1] };

  const chapter = /^chapter\/([\w-]+)$/.exec(path);
  if (chapter?.[1]) return { name: 'chapter', id: chapter[1] };

  return { name: 'not-found' };
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'settings':
      return '#/settings';
    case 'plan':
      return '#/plan';
    case 'chapter':
      return `#/chapter/${route.id ?? ''}`;
    case 'try':
      return `#/chapter/${route.id ?? ''}/try`;
    default:
      return '#/';
  }
}

export function go(route: Route): void {
  const next = hrefFor(route);
  if (window.location.hash === next) return;
  window.location.hash = next;
}

export class Router {
  private readonly onChange: (route: Route) => void;

  constructor(onChange: (route: Route) => void) {
    this.onChange = onChange;
    window.addEventListener('hashchange', this.handle);
  }

  /** Fire once for the URL the page opened on. */
  start(): void {
    this.handle();
  }

  dispose(): void {
    window.removeEventListener('hashchange', this.handle);
  }

  private handle = (): void => {
    this.onChange(parseHash(window.location.hash));
    // Every route change is a new page as far as she is concerned, so it starts at the top.
    // Without this, arriving at chapter 4 from the bottom of chapter 3 lands mid-page.
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };
}
