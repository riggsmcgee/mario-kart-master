/**
 * The runner. (4e4)
 *
 * Kayla's experience is a straight line of beats, each one a small act of vandalism against the
 * website, and this is the machine that plays them in order. It owns four things and deliberately
 * knows nothing else:
 *
 *  - **Sequencing.** A beat is an async function that resolves when it has been solved. That is the
 *    whole contract, and it is what lets a beat be written as prose — say a line, wait for her to do
 *    the thing, say the next line — rather than as a state machine.
 *  - **Teardown.** Every timer, listener and node any beat creates is registered here, so leaving
 *    halfway through leaves nothing running. This matters more than it usually would: the exit is
 *    live at every moment by design, so "she left in the middle" is not an edge case, it is an
 *    expected way to finish.
 *  - **The exit.** "Change user" is drawn by this file, not by any beat, precisely so that no beat
 *    is able to take it away. The lockout's original design note is emphatic about it — a joke you
 *    cannot leave stops being a joke — and hoisting it up here turns that promise into something the
 *    structure enforces rather than something each beat has to remember.
 *  - **The pocket.** Things she takes off the site stay taken. A stolen full stop is still in the
 *    corner of the screen four beats later, which is what makes this feel like one place rather than
 *    eight sketches in a row.
 *
 * **Nothing is ever saved.** Not a beat number, not a flag, nothing — the original lockout's promise
 * that no row anywhere records that Kayla was here is kept exactly. Closing the tab means starting
 * again, which for a five-minute toy is the right trade and is also the honest one.
 */

import { el } from '../dom';
import type { Sfx } from '../../ui/sfx';
import type { Mounted } from '../types';
import { bin } from './art';
import { Narrator } from './narrator';
import { Reed } from './reed';

export type Disposer = { dispose(): void } | (() => void);

/**
 * The bin.
 *
 * Not an inventory. Things do not go in here because she is collecting them — they go in here
 * because the website wants them gone, and the joke is that it is the website asking and her doing
 * it. It arrives on screen the first time a beat needs it, announced, rather than fading in as
 * furniture.
 *
 * Nothing in it is ever destroyed. Every object she puts in stays visible for the rest of the run,
 * which is what makes the last beat able to reach in and hand one back.
 */
export interface Pocket {
  /** Slide it into view. Called by a beat at the moment it wants her looking at it. */
  reveal(): void;
  /** Drop something in. It stays visible. */
  add(node: HTMLElement, label: string): void;
  has(label: string): boolean;
  take(label: string): HTMLElement | null;
  /** The hit area, for `grabbable`'s drop targets. */
  readonly root: HTMLElement;
}

export interface Stage {
  /** The play area. Beats build in here, and it is not cleared between them. */
  scene: HTMLElement;
  narrator: Narrator;
  reed: Reed;
  sfx: Sfx;
  pocket: Pocket;
  /** Register anything that has to be torn down when she leaves. */
  keep(disposer: Disposer): void;
  /** A timeout that cannot outlive the stage. */
  after(ms: number, run: () => void): () => void;
  /** Resolves after `ms`, or immediately if the stage is being torn down. */
  wait(ms: number): Promise<void>;
  /**
   * Add something to the scene and make sure she can see it.
   *
   * Chapter K appends three cards one after another as the narrator talks, and on a laptop the
   * second one lands below the fold. New content she has not been shown is the same as no content,
   * so anything that arrives mid-beat gets scrolled to — gently, and instantly under reduced motion,
   * where a page that slides on its own is the thing the setting is there to prevent.
   */
  reveal(node: HTMLElement): void;
  /** The way out, so a beat can point at it without owning it. */
  exit: HTMLElement;
  /** She got through it and said yes three times. Hand her the real site. */
  onAdmitted(): void;
  /**
   * Somebody who is not Kayla is looking at this.
   *
   * The only thing it changes is that nothing is persisted — see `KaylaDeps.preview`. Beats should
   * play exactly the same either way; a demo that behaves differently is a demo of a different thing.
   */
  readonly preview: boolean;
  /** True once teardown has started. Long beats should check it before carrying on. */
  readonly gone: boolean;
}

export interface Beat {
  id: string;
  /** Only ever seen in the prototype harness. */
  title: string;
  run(stage: Stage): Promise<void>;
}

/** A promise plus the button that resolves it. Most beats are one of these and some scenery. */
export function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

export interface StageDeps {
  sfx: Sfx;
  /** What "Change user" does. Supplied by the doorman, because only it knows how to reopen. */
  onLeave: () => void;
  /** Called once she has been admitted. The caller decides what "the real site" means. */
  onAdmitted: () => void;
  /** A look round rather than the real thing. Nothing is written down. */
  preview?: boolean;
  /** Beats to play. The prototype harness passes a subset. */
  beats: Beat[];
  /** Index to open on. Prototype harness only; the real thing always starts at zero. */
  from?: number;
}

export function runStage(mount: HTMLElement, deps: StageDeps): Mounted {
  const reed = new Reed(deps.sfx);
  const narrator = new Narrator({ sfx: deps.sfx, reed });

  const disposers: Disposer[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let gone = false;
  let admitted = false;

  const scene = el('div', { class: 'k-scene' });

  // --- the pocket ------------------------------------------------------------

  const pocketItems = el('div', { class: 'k-pocket-items' });
  const pocketRoot = el(
    'div',
    { class: 'k-pocket', attrs: { role: 'group', 'aria-label': 'Bin' } },
    bin(44),
    el('div', { class: 'k-pocket-body' }, el('p', { class: 'k-pocket-title' }, 'Bin'), pocketItems),
  );
  pocketRoot.hidden = true;

  const held = new Map<string, HTMLElement>();

  const pocket: Pocket = {
    root: pocketRoot,
    reveal() {
      if (!pocketRoot.hidden) return;
      pocketRoot.hidden = false;
      pocketRoot.classList.add('k-pocket-arriving');
    },
    add(node, label) {
      pocket.reveal();
      const slot = el('div', { class: 'k-pocket-slot', attrs: { 'data-item': label } }, node);
      slot.title = label;
      pocketItems.append(slot);
      held.set(label, node);
      // The lid tips. One class, removed when the animation is done, so it can tip again later.
      //
      // Registered in `timers` like everything else. `stage.after` is not available this far up the
      // file, and a bare `setTimeout` is exactly the hole this stage exists to close: leaving in
      // the middle of the drop left a callback in flight that woke up 600ms later and set a class
      // on a node that had been removed from the document.
      pocketRoot.classList.add('k-pocket-took');
      const lid = setTimeout(() => {
        timers.delete(lid);
        pocketRoot.classList.remove('k-pocket-took');
      }, 600);
      timers.add(lid);
    },
    has(label) {
      return held.has(label);
    },
    take(label) {
      const node = held.get(label) ?? null;
      if (node) {
        held.delete(label);
        node.closest('.k-pocket-slot')?.remove();
      }
      return node;
    },
  };

  // --- the exit --------------------------------------------------------------

  /**
   * Live from the first frame to the last, and it looks live.
   *
   * It is deliberately styled as a real control rather than folded into the fiction. The narrator is
   * allowed to be rude about her clicking it; the button is not allowed to be coy about working.
   */
  const exit = el('button', { class: 'btn k-exit', type: 'button' }, 'Change user');

  /**
   * **It asks once.** (Riggs, third pass: *"when you click Change user from Kayla's game view, it
   * should give a warning that she is about to leave a super cool experience, and give an option to
   * not do it."*)
   *
   * The best joke available to this button, because it inverts the entire premise in one click. The
   * site has spent five minutes insisting there is nothing here and asking her to go — and the moment
   * she does, it panics. Everything it has been claiming falls over at once, and it falls over
   * because she took its advice.
   *
   * **Three rules make it a joke rather than the thing it is parodying**, and they are not
   * negotiable — the original lockout's design note is emphatic that a joke you cannot leave stops
   * being a joke, and a confirmation dialogue is exactly how that promise gets broken by accident.
   *
   *  1. **Leave anyway is right there, plainly worded, and works.** It is not hidden, not greyed, not
   *     smaller, and not phrased as an admission of anything. It is also what keyboard focus lands
   *     on, because she has already said what she wants and the dialogue should not make her say it
   *     twice.
   *  2. **It asks once per sitting.** The second press goes straight through with no panel and no
   *     comment. A confirmation that appears every time is not a gag, it is an obstacle wearing one,
   *     and by the second press she has read it.
   *  3. **Escape closes it**, which means the panel itself can never be the thing that traps her.
   *
   * Under `preview` it behaves identically. Somebody being shown this should be shown this.
   */
  let warned = false;
  let leaving: HTMLElement | null = null;

  function closeWarning(): void {
    leaving?.remove();
    leaving = null;
    document.removeEventListener('keydown', onWarningKey, true);
    scene.removeAttribute('inert');
    pocketRoot.removeAttribute('inert');
    exit.focus();
  }

  /**
   * Capture phase, and it stops the event dead.
   *
   * The narrator also listens on `document` for "any key skips the current line", and it
   * registered first, so in the bubble phase it saw Escape before this did and threw away whatever
   * was being said — the panel closed *and* the sentence she was in the middle of vanished. Taking
   * the key in the capture phase and calling `stopPropagation` means Escape belongs to the dialogue
   * while the dialogue is open, and to nothing else the rest of the time.
   */
  function onWarningKey(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    closeWarning();
  }

  function warn(): void {
    warned = true;

    const stay = el('button', { class: 'btn btn-go k-leaving-stay', type: 'button' }, 'Stay');
    // A full `btn`, not `btn-quiet`. The quiet variant renders as a small underlined link on this
    // site, and next to the orange pill it read as a footnote — which is the precise shape of the
    // pattern this is supposed to be joking about rather than performing.
    const go = el('button', { class: 'btn k-leaving-go', type: 'button' }, 'Leave anyway');
    const title = el('h2', { attrs: { id: 'k-leaving-title' } }, 'You are leaving.');
    // Described as well as labelled: the label is four words of alarm and the description is the
    // joke, so a screen reader that only announced the heading would get the panic and miss the
    // point of it.
    const body = el(
      'div',
      { attrs: { id: 'k-leaving-body' } },
      el('p', { class: 'k-lede' }, 'That is fine. That is what I asked you to do.'),
      el('p', null, 'It is only that there is quite a lot more of it.'),
    );

    stay.addEventListener('click', () => {
      closeWarning();
      narrator.mood(null);
      void narrator.cut('Good.', 'Nothing has changed. There is still nothing here.');
    });
    go.addEventListener('click', () => deps.onLeave());

    leaving = el(
      'div',
      {
        class: 'k-leaving',
        attrs: {
          role: 'alertdialog',
          'aria-modal': 'true',
          'aria-labelledby': 'k-leaving-title',
          'aria-describedby': 'k-leaving-body',
        },
      },
      el(
        'div',
        { class: 'k-panel k-leaving-card' },
        el('p', { class: 'k-stencil' }, 'Please read this carefully'),
        title,
        body,
        el('div', { class: 'k-leaving-buttons' }, stay, go),
      ),
    );
    root.append(leaving);
    // The scrim already stops the mouse reaching the scene behind it; `inert` makes that true for
    // the keyboard as well, so Tab cannot wander off into a page she is in the middle of leaving.
    // The exit button itself is deliberately left out of this — it is outside `scene`, it stays
    // reachable, and pressing it again is the second press that goes straight through.
    scene.setAttribute('inert', '');
    pocketRoot.setAttribute('inert', '');
    document.addEventListener('keydown', onWarningKey, true);
    // The action she asked for takes focus. She pressed a button that says "Change user"; making her
    // hunt for the one that honours it would be the exact pattern this is a joke about.
    go.focus();

    narrator.mood('rattled');
    void narrator.cut('Wait.', 'Wait wait wait.');
  }

  exit.addEventListener('click', () => {
    if (warned || gone) {
      deps.onLeave();
      return;
    }
    warn();
  });

  const stage: Stage = {
    scene,
    narrator,
    reed,
    sfx: deps.sfx,
    pocket,
    exit,
    preview: deps.preview === true,
    onAdmitted: () => {
      /**
       * Fired at most once — the last beat offers a button and also opens the site on a timer, and
       * she may well press the button on the way.
       *
       * **And never after teardown.** `gone` belongs in this guard for the same reason it is in
       * `after`, `wait` and `reveal`: `dispose()` deliberately unblocks every awaiting beat so
       * nothing is left hanging, which means beat 8's `await narrator.say(...)` resolves, the
       * `stage.wait(3000)` after it returns instantly, and the next line admits her — three
       * seconds after she pressed **Leave anyway** and went back to the door. Being thrown into a
       * site you have just left is a bad enough moment on its own; doing it to the one person the
       * whole piece has promised an exit to is worse.
       */
      if (admitted || gone) return;
      admitted = true;
      deps.onAdmitted();
    },
    get gone() {
      return gone;
    },
    keep(disposer) {
      disposers.push(disposer);
    },
    after(ms, run) {
      const id = setTimeout(() => {
        timers.delete(id);
        if (!gone) run();
      }, ms);
      timers.add(id);
      return () => {
        clearTimeout(id);
        timers.delete(id);
      };
    },
    wait(ms) {
      return new Promise((resolve) => {
        if (gone) {
          resolve();
          return;
        }
        stage.after(ms, resolve);
      });
    },
    reveal(node) {
      scene.append(node);
      const still =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // Next frame, so the node has been laid out and there is something to scroll to.
      requestAnimationFrame(() => {
        if (gone) return;
        node.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'nearest' });
      });
    },
  };

  // `exit` is in this list and it is the most important thing in it. It was missing once, briefly,
  // during 4e4 — created, wired, styled, and never appended — which is a reminder that the promise
  // "the way out is always visible" is only worth what the DOM says it is.
  const root = el('div', { class: 'k-stage' }, exit, scene, pocketRoot, narrator.root);
  mount.replaceChildren(root);

  // --- play ------------------------------------------------------------------

  /**
   * Beats run one after another and a beat that throws does not take the rest down with it.
   *
   * That is not defensive habit, it is the design principle again: if beat five has a bug, the
   * honest failure is that she gets beats six through nine and a slightly odd moment in the middle,
   * not a dead page with the exit button on it. Anything that goes wrong here goes to the console,
   * where it belongs, and the experience carries on.
   */
  async function play(): Promise<void> {
    for (const beat of deps.beats.slice(deps.from ?? 0)) {
      if (gone) return;
      try {
        await beat.run(stage);
      } catch (error) {
        console.error(`[kayla] beat "${beat.id}" fell over`, error);
      }
      narrator.hush();
    }
  }

  void play();

  return {
    dispose() {
      gone = true;
      // The warning's Escape handler is on the document, so it outlives the node it belongs to
      // unless it is taken off by hand. This is also the path that cleans up after "Leave anyway",
      // which does not close the panel — it leaves, and leaving disposes the stage.
      document.removeEventListener('keydown', onWarningKey, true);
      for (const id of timers) clearTimeout(id);
      timers.clear();
      for (const disposer of disposers) {
        try {
          if (typeof disposer === 'function') disposer();
          else disposer.dispose();
        } catch (error) {
          console.error('[kayla] teardown', error);
        }
      }
      disposers.length = 0;
      narrator.dispose();
      reed.dispose();
      root.remove();
    },
  };
}
