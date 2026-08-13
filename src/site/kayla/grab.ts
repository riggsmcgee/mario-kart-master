/**
 * Picking things up. (4e4)
 *
 * Kayla's half of the site is built on one verb: *take the website apart*. A full stop comes off the
 * end of a sentence, a progress bar can be filled by hand, the word "no" can be dragged out of a
 * refusal. All of that is one interaction wearing different hats, so it is one file.
 *
 * **Why not the HTML drag-and-drop API.** It is the obvious answer and it is the wrong one here.
 * `dragstart`/`drop` is designed to move *data* between documents: it insists on a drag image the
 * browser draws for you, it will not let an element follow the pointer smoothly, it behaves
 * differently on every platform, and on touch it does not fire at all. This needs the opposite —
 * the actual element, under the actual finger, at 60fps, with the page underneath reacting. Pointer
 * events give that in about forty lines and behave the same for mouse, trackpad and touch.
 *
 * **The keyboard is not an afterthought and not a token gesture.** Everything grabbable here is
 * focusable, and Enter or Space picks it up, arrows move it, Enter drops it, Escape puts it back.
 * That is a real second way to play, not a shortcut that skips the puzzle — she still has to work
 * out *what* to move and *where*, which is the actual game. The site's readability pass (3e1) is not
 * something to abandon on the one page that happens to be a toy.
 *
 * **Nothing here knows what anything means.** This file moves a node and reports where it was
 * dropped. Whether that counts as solving anything is entirely the beat's business, which is what
 * lets the same twenty lines serve a punctuation mark, a padlock and a stolen letter.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface Grabbed {
  /** Viewport coordinates of the pointer, or of the node's centre when moved by keyboard. */
  x: number;
  y: number;
  /** The topmost registered drop target under the release point, if any. */
  target: Element | null;
}

export interface GrabOptions {
  /**
   * Candidate drop targets, asked for at the moment of release rather than held as a list.
   *
   * A function rather than an array because half the targets in this experience do not exist yet
   * when the draggable is created — the keyhole appears three beats after the full stop does.
   */
  targets?: () => Iterable<Element>;
  /** Screen-reader description of what is being carried. Announced on pick-up. */
  label?: string;
  /**
   * Put it somewhere other than where it is, on the way in.
   *
   * Used once, for the most important gesture in the whole experience: the full stop does not simply
   * fall off the sentence, it travels across the page and comes to rest against the "Change user"
   * button. `ms` is the flight, and it is long — this is a thing arriving, not a value being set.
   */
  start?: { x: number; y: number; ms?: number };
  onGrab?: () => void;
  onMove?: (x: number, y: number) => void;
  /** Return `true` to keep the node where it was dropped; `false` sends it home. */
  onDrop?: (where: Grabbed) => boolean | void;
  /** Keyboard nudge, px. Shift multiplies it by five. */
  step?: number;
}

export interface Grabbable {
  /** Put it back where it started, with a transition if motion is allowed. */
  home(): void;
  /** Freeze it in place — used once a beat is solved and the object has become scenery. */
  settle(): void;
  dispose(): void;
}

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Make one element pick-up-able.
 *
 * The node is moved with a CSS transform and never with layout, so a full stop lifted out of a
 * paragraph leaves the paragraph exactly as it was — the sentence does not reflow and close the gap
 * behind it. That gap is the joke. If the text healed itself the moment she took the punctuation,
 * there would be nothing to see.
 */
export function grabbable(node: HTMLElement, options: GrabOptions = {}): Grabbable {
  const step = options.step ?? 12;

  let dx = 0;
  let dy = 0;
  let carrying = false;
  let settled = false;
  let pointer: number | null = null;
  let originX = 0;
  let originY = 0;

  node.classList.add('grabbable');
  node.tabIndex = 0;
  if (options.label) node.setAttribute('aria-label', `${options.label}. Press Enter to pick up.`);

  /**
   * Pick up where the node already is.
   *
   * Objects here outlive the beat that made them — the full stop is dragged in beat 1 and is still
   * the same element, in the same place, when beat 2 turns it into a hole and makes it grabbable
   * again. Starting a fresh handle at zero would teleport it back into the sentence on her first
   * move, which is exactly the bug this exists to prevent: hit-testing then runs against a shape
   * that is not where she can see it, and nothing works for reasons nothing explains.
   */
  const existing = /(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(node.style.translate);
  if (existing) {
    dx = Number(existing[1]);
    dy = Number(existing[2]);
  }

  if (options.start) {
    dx = options.start.x;
    dy = options.start.y;
    // Not `paint(true)` — that uses the short return-home easing, and this is a longer journey with
    // a different job. Reduced motion skips the flight and puts it there, which is the same picture.
    node.style.transition = reducedMotion()
      ? ''
      : `translate ${options.start.ms ?? 280}ms cubic-bezier(0.34, 0.9, 0.4, 1)`;
    node.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
  }

  function paint(animated = false): void {
    node.style.transition = animated && !reducedMotion() ? 'translate 0.28s ease' : '';
    node.style.translate = dx === 0 && dy === 0 ? '' : `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
  }

  function centre(): { x: number; y: number } {
    const box = node.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }

  /**
   * What is under this point, ignoring the thing being carried.
   *
   * `elementsFromPoint` returns the whole stack rather than only the top, which is what makes the
   * carried node's own presence a non-problem: it is in the list, and skipped. Hiding the node and
   * asking again would work too, and flickers.
   */
  function targetAt(x: number, y: number): Element | null {
    const wanted = options.targets ? [...options.targets()] : [];
    if (wanted.length === 0) return null;
    for (const hit of document.elementsFromPoint(x, y)) {
      if (node.contains(hit)) continue;
      const match = wanted.find((candidate) => candidate === hit || candidate.contains(hit));
      if (match) return match;
    }
    return null;
  }

  function release(x: number, y: number): void {
    carrying = false;
    node.classList.remove('carrying');
    const target = targetAt(x, y);
    const keep = options.onDrop?.({ x, y, target });
    if (keep === true) {
      paint();
      return;
    }
    dx = 0;
    dy = 0;
    paint(true);
  }

  // --- pointer ---------------------------------------------------------------

  function onPointerDown(event: PointerEvent): void {
    if (settled || event.button !== 0) return;
    // Left button only, and the default has to go: a mousedown on text starts a selection, and a
    // half-selected word dragged across the page looks like a bug rather than a puzzle.
    event.preventDefault();
    pointer = event.pointerId;
    node.setPointerCapture(event.pointerId);
    originX = event.clientX - dx;
    originY = event.clientY - dy;
    carrying = true;
    node.classList.add('carrying');
    node.style.transition = '';
    options.onGrab?.();
  }

  function onPointerMove(event: PointerEvent): void {
    if (!carrying || event.pointerId !== pointer) return;
    dx = event.clientX - originX;
    dy = event.clientY - originY;
    paint();
    options.onMove?.(event.clientX, event.clientY);
  }

  function onPointerUp(event: PointerEvent): void {
    if (!carrying || event.pointerId !== pointer) return;
    pointer = null;
    release(event.clientX, event.clientY);
  }

  // --- keyboard --------------------------------------------------------------

  const ARROWS: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };

  function onKeyDown(event: KeyboardEvent): void {
    if (settled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!carrying) {
        carrying = true;
        node.classList.add('carrying');
        node.style.transition = '';
        options.onGrab?.();
      } else {
        const spot = centre();
        release(spot.x, spot.y);
      }
      return;
    }

    if (event.key === 'Escape' && carrying) {
      event.preventDefault();
      carrying = false;
      node.classList.remove('carrying');
      dx = 0;
      dy = 0;
      paint(true);
      return;
    }

    const move = ARROWS[event.key];
    if (!move || !carrying) return;
    event.preventDefault();
    const distance = step * (event.shiftKey ? 5 : 1);
    dx += move[0] * distance;
    dy += move[1] * distance;
    paint();
    const spot = centre();
    options.onMove?.(spot.x, spot.y);
  }

  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('pointermove', onPointerMove);
  node.addEventListener('pointerup', onPointerUp);
  node.addEventListener('pointercancel', onPointerUp);
  node.addEventListener('keydown', onKeyDown);

  return {
    home() {
      dx = 0;
      dy = 0;
      paint(true);
    },
    settle() {
      settled = true;
      carrying = false;
      node.classList.remove('carrying', 'grabbable');
      node.removeAttribute('tabindex');
    },
    dispose() {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerUp);
      node.removeEventListener('keydown', onKeyDown);
    },
  };
}

/**
 * Split a string into one span per character, so individual letters can be stolen.
 *
 * Spaces stay as plain text nodes: a wrappable space inside a span stops being a line-break
 * opportunity in some browsers, and a heading that will not wrap is a heading that runs off the
 * side of a phone.
 */
export function letters(text: string, className = 'letter'): HTMLSpanElement[] {
  const out: HTMLSpanElement[] = [];
  for (const character of text) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = character;
    if (character === ' ') span.classList.add('letter-space');
    out.push(span);
  }
  return out;
}

/**
 * Rewrite every text node under `root` as one span per word, in place.
 *
 * Needed because a word cannot be picked up, knocked over or dropped through the floor while it is
 * an anonymous run of characters inside a paragraph — it has to be an element before it can be a
 * thing. Done as a mutation of the finished copy rather than by writing the copy as spans, so that
 * the prose in the beat files stays prose and stays editable by someone who is not thinking about
 * the DOM.
 *
 * Whitespace is preserved as its own text node, so the paragraph still wraps exactly where it did.
 */
export function wordify(root: HTMLElement, className = 'k-word'): HTMLSpanElement[] {
  const out: HTMLSpanElement[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    texts.push(node as Text);
  }

  for (const text of texts) {
    const parent = text.parentElement;
    if (!parent || parent.classList.contains(className)) continue;
    const pieces = (text.textContent ?? '').split(/(\s+)/);
    if (pieces.length <= 1 && pieces[0]?.trim() === '') continue;

    const replacement = document.createDocumentFragment();
    for (const piece of pieces) {
      if (piece === '') continue;
      if (/^\s+$/.test(piece)) {
        replacement.append(document.createTextNode(piece));
        continue;
      }
      const span = document.createElement('span');
      span.className = className;
      span.textContent = piece;
      replacement.append(span);
      out.push(span);
    }
    text.replaceWith(replacement);
  }

  return out;
}

/** The word inside a span, with punctuation and case thrown away. For matching against copy. */
export function bareWord(span: Element): string {
  return (span.textContent ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * A ring that says "this is a thing, and it is yours to move".
 *
 * The genre's one unsolvable problem is the affordance: a website has spent thirty years teaching
 * everybody that text is not furniture, so the first grabbable object has to announce itself or the
 * whole experience ends at the first beat with a shrug. The narrator's line does most of that work.
 * This does the rest — a soft pulsing halo, drawn rather than styled so it can sit over any shape,
 * and taken away for good the moment she touches the thing it is pointing at.
 */
export function halo(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'halo');
  svg.setAttribute('aria-hidden', 'true');
  const ring = document.createElementNS(SVG_NS, 'circle');
  ring.setAttribute('cx', '50');
  ring.setAttribute('cy', '50');
  ring.setAttribute('r', '34');
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', 'currentColor');
  ring.setAttribute('stroke-width', '5');
  ring.setAttribute('stroke-dasharray', '10 12');
  ring.setAttribute('stroke-linecap', 'round');
  svg.append(ring);
  return svg;
}
