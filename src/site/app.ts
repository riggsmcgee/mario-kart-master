/**
 * The shell. (2a1)
 *
 * Header, routing, and the one place that knows how a page is swapped for another one. Every
 * route render returns a {@link Mounted}, and this is what guarantees the previous one gets
 * disposed — which matters more than it sounds, because three chapters hold a WebGL context and
 * a requestAnimationFrame loop each. The single most likely way this site breaks after an hour
 * of use is a drill that was never torn down.
 *
 * The doorman sits in front of everything (4e2). It is asked once per machine, and the Kayla
 * lockout is enforced here rather than inside each page: a locked role simply never gets routed
 * to a chapter, so the lockout cannot be walked around by typing a URL.
 */

import { getAuthState, onAuthChange, cleanAuthFragmentFromUrl } from '../backend/auth';
import { getProgressStore } from '../backend/progress';
import { CHAPTERS, getChapter } from '../data/chapters';
import { getSfx } from '../ui/sfx';
import { turboJodi } from '../ui/mascot';
import { renderChapter } from './chapter-page';
import { loadChapter } from './chapter-registry';
import { renderDoorman, doormanAnswered, forgetDoorman } from './doorman';
import { el } from './dom';
import { renderHome } from './home';
import { playerFor, fill } from './player';
import { Router, go, type Route } from './router';
import { renderSettings } from './settings';
import type { Mounted, Player } from './types';

export function startApp(root: HTMLElement): void {
  const progress = getProgressStore();
  const sfx = getSfx();

  let player: Player = playerFor(progress.getRole(), progress.getDisplayName());
  let current: Mounted | null = null;
  let showingDoorman = false;

  // --- header ---------------------------------------------------------------

  /**
   * Orientation, not decoration.
   *
   * This was a miniature of the home page's lap map, and seeing it rendered settled the
   * argument: at header size the circuit is a grey squiggle with markers too small to read, so
   * it competed with the signature element instead of supporting it. The map earns its space at
   * full size on the home page and nowhere else. Here, a bar and a count answer the only
   * question a header has to answer — how far through am I.
   */
  const progressFill = el('span', { class: 'course-bar-fill' });
  const progressCount = el('span', { class: 'course-bar-count ms' }, '');
  const headerProgress = el(
    'div',
    { class: 'course-bar', attrs: { role: 'status' } },
    el('span', { class: 'course-bar-track' }, progressFill),
    progressCount,
  );

  const mark = el(
    'a',
    { class: 'site-mark', href: '#/' },
    turboJodi({ size: 30 }),
    el('span', null, 'Beat Kayla'),
  );

  const settingsLink = el('a', { class: 'icon-btn', href: '#/settings' }, 'Settings');

  const header = el(
    'header',
    { class: 'site-header' },
    el(
      'div',
      { class: 'wrap site-header-inner' },
      mark,
      headerProgress,
      el('div', { class: 'site-tools' }, settingsLink),
    ),
  );

  const main = el('main', { attrs: { id: 'main' } });

  const footer = el(
    'footer',
    { class: 'site-footer wrap', style: { padding: '3rem 0', color: 'var(--ink-faint)' } },
    el(
      'p',
      { class: 'eyebrow' },
      'Built by Riggs · original art and sound throughout · not affiliated with Nintendo',
    ),
  );

  root.replaceChildren(header, main, footer);

  function paintHeader(): void {
    const done = CHAPTERS.filter((c) => progress.getChapter(c.id).status === 'done').length;
    progressFill.style.width = `${((done / CHAPTERS.length) * 100).toFixed(1)}%`;
    progressCount.textContent = `${done} / ${CHAPTERS.length}`;
    headerProgress.setAttribute('aria-label', `${done} of ${CHAPTERS.length} chapters done`);
    header.hidden = showingDoorman;
    footer.hidden = showingDoorman;
  }

  progress.subscribe(() => paintHeader());

  // --- routing --------------------------------------------------------------

  function swap(next: Mounted | null): void {
    current?.dispose();
    current = next;
  }

  /** Kayla sees the course and cannot open any of it. Enforced here, not per page. */
  function locked(): boolean {
    return player.role === 'kayla';
  }

  function message(eyebrow: string, heading: string, detail: string): Mounted {
    const back = el('button', { class: 'btn btn-go', type: 'button' }, 'Back to the start');
    back.addEventListener('click', () => go({ name: 'home' }));
    main.replaceChildren(
      el(
        'div',
        { class: 'page wrap stack' },
        el('p', { class: 'eyebrow' }, eyebrow),
        el('h1', null, heading),
        el('p', null, detail),
        back,
      ),
    );
    return { dispose: () => undefined };
  }

  function notFound(): Mounted {
    return message(
      'Wrong turn',
      'There is no chapter here',
      'Nothing broken — that address just does not go anywhere.',
    );
  }

  /**
   * A chapter that is listed but whose module is missing. Distinct from a bad URL on purpose:
   * this one is our fault, not hers, and saying so is more useful than pretending the chapter
   * does not exist.
   */
  function notBuilt(title: string): Mounted {
    return message(
      'Not finished yet',
      title,
      'This chapter is listed but has not been written yet. Everything else still works — carry on and come back to it.',
    );
  }

  function loading(): void {
    main.replaceChildren(
      el('div', { class: 'page wrap' }, el('p', { class: 'eyebrow' }, 'Loading…')),
    );
  }

  async function renderRoute(route: Route): Promise<void> {
    if (showingDoorman) return;

    switch (route.name) {
      case 'home':
        swap(renderHome(main, { player, progress, locked: locked() }));
        break;

      case 'settings':
        swap(
          renderSettings(main, {
            player,
            progress,
            sfx,
            onChangeUser: () => {
              forgetDoorman();
              openDoorman();
            },
          }),
        );
        break;

      case 'chapter': {
        const meta = route.id ? getChapter(route.id) : undefined;
        if (!meta) {
          swap(notFound());
          break;
        }
        if (locked()) {
          go({ name: 'home' });
          break;
        }

        loading();
        const content = await loadChapter(meta.id);
        // She may have navigated on while the chunk was in the air. Only paint if this is still
        // the route she is looking at.
        if (window.location.hash !== `#/chapter/${meta.id}`) return;

        if (!content) {
          swap(notBuilt(fill(meta.title, player)));
          break;
        }
        swap(renderChapter(main, meta, content, { player, progress, sfx }));
        break;
      }

      default:
        swap(notFound());
    }

    paintHeader();
  }

  const router = new Router((route) => {
    void renderRoute(route);
  });

  // --- doorman --------------------------------------------------------------

  function openDoorman(): void {
    showingDoorman = true;
    swap(
      renderDoorman(main, {
        progress,
        sfx,
        onChosen: (choice) => {
          player = playerFor(choice.role, choice.name ?? progress.getDisplayName());
          showingDoorman = false;
          // Render whatever the address bar already says. That is home on a normal first visit,
          // and the chapter she was linked to if she arrived on a deep link — without this file
          // needing to know which case it is in.
          router.start();
        },
      }),
    );
    paintHeader();
  }

  // --- boot -----------------------------------------------------------------

  cleanAuthFragmentFromUrl();

  // The session decides who we sync as. Everything renders immediately regardless — the course
  // never waits on the network to draw itself.
  void getAuthState().then((auth) => {
    void progress.setUser(auth.userId);
  });

  onAuthChange((auth) => {
    void progress.setUser(auth.userId);
    player = playerFor(progress.getRole(), progress.getDisplayName());
    paintHeader();
  });

  // Someone arriving on a deep link with the doorman unanswered gets asked first, and the link
  // is honoured afterwards simply because nothing here touches the hash — `router.start()` in
  // `onChosen` reads whatever the address bar still says.
  //
  // An earlier version tried to be cleverer: it remembered the boot hash and restored it on the
  // first hashchange after the doorman closed. That hash is `#/` on a normal visit, so the first
  // time she opened any chapter it silently threw her back to the home page. Worth remembering
  // as a shape of bug — the restore fired on a navigation it was never meant to be about.
  if (!doormanAnswered()) openDoorman();
  else router.start();

  // Small courtesy: `fill` is exported for chapter modules, and the title should say her name
  // once she has one.
  document.title = fill('Beat {rival} at Mario Kart', player);
}
