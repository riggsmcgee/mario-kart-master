/**
 * The course entry point. (2a1)
 *
 * The site's front door is now the course; the Phase 1 lab moved to `/testbed/`. That swap is
 * the moment Phase 2 actually happened — everything before it was a page of links to
 * prototypes, and this is the thing that gets sent to Jodi.
 */

import '../ui/site.css';
import { installErrorBanner } from '../ui/error-banner';
import { startApp } from './app';

// First import on the page, deliberately. A silent blank page is the worst failure mode there
// is — it burns the tester's time before the test starts — and this paints any error or
// unhandled rejection across the top in red with its stack. Learned the hard way in session 3.
installErrorBanner();

const root = document.querySelector<HTMLElement>('#app');
if (root) {
  startApp(root);
} else {
  throw new Error('No #app element on the page.');
}
