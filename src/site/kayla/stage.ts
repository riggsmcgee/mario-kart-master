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
 * again, which for a ten-minute toy is the right trade and is also the honest one.
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
      pocketRoot.classList.add('k-pocket-took');
      setTimeout(() => pocketRoot.classList.remove('k-pocket-took'), 600);
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
  exit.addEventListener('click', () => deps.onLeave());

  const stage: Stage = {
    scene,
    narrator,
    reed,
    sfx: deps.sfx,
    pocket,
    exit,
    preview: deps.preview === true,
    onAdmitted: () => {
      // Fired at most once — the last beat offers a button and also opens the site on a timer, and
      // she may well press the button on the way.
      if (admitted) return;
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
