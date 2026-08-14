/**
 * The lap map. (2a1 — this is the progress bar, and the navigation, and the signature.)
 *
 * The course is nine chapters in a fixed order, which is exactly what a lap is. So it is drawn
 * as one: a circuit with nine markers, the road she has already covered filled in behind her,
 * and a kart sitting at wherever she got to. "Continue where you left off" stops being a button
 * and becomes a position on a track, which is the one thing this particular audience already
 * understands without being told.
 *
 * **The markers are not placed by hand.** The circuit is a single SVG path, and each chapter is
 * put at its own fraction of `getTotalLength()`. Redraw the track and every marker follows,
 * because the shape is the only source of truth for where anything sits. Hand-placed
 * coordinates would drift out of step with the path the first time it was edited.
 *
 * The circuit deliberately echoes the test track the drills actually use (`test-track.ts`):
 * two straights, a wide U-turn at one end, a chicane on the way back, a tight hairpin at the
 * other. She drives that shape all course; recognising it on the map is free.
 *
 * **Nothing here is the only way to reach a chapter.** The map is the delightful route; the
 * plain chapter list underneath it on the home page is the complete one. No information lives
 * in the picture alone (3e1).
 */

import type { ChapterMeta } from '../data/chapters';
import { CHAPTERS } from '../data/chapters';
import type { ChapterStatus } from '../store/progress';
import { el } from './dom';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * The circuit. One closed path, in a 1000×280 box.
 *
 * Read left to right: hairpin exit, top straight, wide U-turn on the right, back straight with
 * a chicane in it, then the tight hairpin closing the loop.
 */
const CIRCUIT =
  'M 150 70 L 720 70 C 860 70 930 90 930 140 C 930 190 860 210 720 210 ' +
  'L 520 210 C 460 210 450 170 390 170 L 210 170 C 120 170 90 150 90 120 ' +
  'C 90 90 110 70 150 70 Z';

/** Where the lap starts on the path, as a fraction. Nudged so chapter 0 sits on the straight. */
const START_OFFSET = 0.02;

export interface LapMapOptions {
  /** Called when a marker is chosen. Omit to render a non-interactive map. */
  onPick?: ((chapter: ChapterMeta) => void) | undefined;
}

export interface LapMap {
  root: HTMLElement;
  /**
   * Redraw against current progress. `currentId` is where the kart sits — usually the chapter
   * she is on, or the next unfinished one.
   */
  update(statuses: Record<string, ChapterStatus>, currentId: string | null): void;
  dispose(): void;
}

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

export function createLapMap(options: LapMapOptions = {}): LapMap {
  const root = el('div', {
    class: 'lap-map',
  });

  const svg = svgEl('svg', {
    viewBox: '0 0 1000 280',
    class: 'lap-svg',
    // The map is decoration around a list that says the same thing; screen readers get the
    // list, not a pile of unlabelled circles.
    'aria-hidden': 'true',
    focusable: 'false',
  });

  // Three stacked strokes: the verge, the road, and the part of it she has driven. Drawing the
  // driven section as a *stroke on the same path* rather than a separate shape is what keeps it
  // exactly on the road however the circuit is redrawn.
  const verge = svgEl('path', { d: CIRCUIT, class: 'lap-verge' });
  const road = svgEl('path', { d: CIRCUIT, class: 'lap-road' });
  const dashes = svgEl('path', { d: CIRCUIT, class: 'lap-dashes' });
  const driven = svgEl('path', { d: CIRCUIT, class: 'lap-driven' });

  svg.append(verge, road, dashes, driven);

  const markerLayer = svgEl('g', { class: 'lap-markers' });
  const kart = svgEl('g', { class: 'lap-kart' });
  kart.append(
    svgEl('circle', { r: '15', class: 'lap-kart-halo' }),
    svgEl('path', { d: 'M -8 -7 L 11 0 L -8 7 Z', class: 'lap-kart-body' }),
  );
  svg.append(markerLayer, kart);

  root.append(svg);

  // The accessible, complete route to every chapter, saying in words what the drawing says in
  // shapes. The map is allowed to be the delightful way in because it is never the only way in.
  const list = el('ol', { class: 'lap-list' });
  root.append(list);

  interface MarkerParts {
    group: SVGGElement;
    ring: SVGCircleElement;
    label: SVGTextElement;
    link: HTMLAnchorElement;
  }

  const markers = new Map<string, MarkerParts>();
  let totalLength = 0;

  for (const [index, chapter] of CHAPTERS.entries()) {
    const group = svgEl('g', { class: 'lap-marker' });
    const ring = svgEl('circle', { r: '15' });
    const number = svgEl('text', {
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      class: 'lap-marker-number',
    });
    number.textContent = String(chapter.number);
    group.append(ring, number);

    const label = svgEl('text', { 'text-anchor': 'middle', class: 'lap-marker-label' });
    label.textContent = chapter.skill;
    group.append(label);
    markerLayer.append(group);

    const link = el(
      'a',
      { class: 'lap-list-link', href: `#/chapter/${chapter.id}` },
      `${chapter.number}. ${chapter.skill}`,
    );
    if (options.onPick) {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        options.onPick?.(chapter);
      });
    }
    list.append(el('li', { class: 'lap-list-item', data: { chapter: chapter.id } }, link));

    markers.set(chapter.id, { group, ring, label, link });

    // Position depends on path length, which needs layout. Done in `layout()` below.
    void index;
  }

  /** Fraction around the lap for chapter `index`. Evenly spaced, start line first. */
  function fractionFor(index: number): number {
    return (START_OFFSET + index / CHAPTERS.length) % 1;
  }

  function pointAt(fraction: number): { x: number; y: number; angle: number } {
    if (totalLength === 0) return { x: 0, y: 0, angle: 0 };
    const at = ((fraction % 1) + 1) % 1;
    const here = road.getPointAtLength(at * totalLength);
    // Tangent by sampling a little further along, so the kart points the way the lap runs.
    const ahead = road.getPointAtLength(((((at + 0.004) % 1) + 1) % 1) * totalLength);
    return {
      x: here.x,
      y: here.y,
      angle: (Math.atan2(ahead.y - here.y, ahead.x - here.x) * 180) / Math.PI,
    };
  }

  let laidOut = false;

  /**
   * Place everything against the real path length.
   *
   * Deferred until the element is in the document: `getTotalLength()` on a detached path is
   * reliable in Chrome and is not everywhere, and this has to survive a Safari sanity check
   * (4f1). Cheap enough to simply re-run whenever it might have changed.
   */
  function layout(): void {
    totalLength = road.getTotalLength();
    if (totalLength === 0) return;
    laidOut = true;

    for (const [index, chapter] of CHAPTERS.entries()) {
      const parts = markers.get(chapter.id);
      if (!parts) continue;
      const { x, y } = pointAt(fractionFor(index));
      parts.group.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      // Labels sit outside the loop: above on the top half, below on the bottom half.
      parts.label.setAttribute('y', y < 140 ? '-26' : '38');
    }

    driven.style.strokeDasharray = `${totalLength}`;
    driven.style.strokeDashoffset = `${totalLength}`;
  }

  function update(statuses: Record<string, ChapterStatus>, currentId: string | null): void {
    if (!laidOut) layout();

    for (const chapter of CHAPTERS) {
      const parts = markers.get(chapter.id);
      if (!parts) continue;
      const status = statuses[chapter.id] ?? 'not_started';
      const here = chapter.id === currentId;
      parts.group.dataset['status'] = status;
      parts.group.dataset['here'] = String(here);

      const li = list.querySelector<HTMLLIElement>(`[data-chapter="${chapter.id}"]`);
      if (li) {
        li.dataset['status'] = status;
        li.dataset['here'] = String(here);
      }
      parts.link.setAttribute('aria-current', here ? 'step' : 'false');
    }

    // How far round she has got. Counted by finished chapters rather than by where the kart is,
    // so the filled road means "done", not "visited".
    const doneCount = CHAPTERS.filter((c) => statuses[c.id] === 'done').length;
    const fraction = doneCount / CHAPTERS.length;
    if (totalLength > 0) {
      driven.style.strokeDashoffset = `${totalLength * (1 - fraction)}`;
    }

    const index = currentId ? CHAPTERS.findIndex((c) => c.id === currentId) : -1;
    if (index >= 0 && totalLength > 0) {
      const { x, y, angle } = pointAt(fractionFor(index));
      kart.setAttribute(
        'transform',
        `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})`,
      );
      kart.style.display = '';
    } else {
      kart.style.display = 'none';
    }
  }

  // The path length only changes if the circuit itself changes, but a font swap or a late
  // stylesheet can shift layout under it, so a resize is cheap insurance.
  const onResize = (): void => layout();
  window.addEventListener('resize', onResize);

  return {
    root,
    update,
    dispose() {
      window.removeEventListener('resize', onResize);
      root.remove();
    },
  };
}
