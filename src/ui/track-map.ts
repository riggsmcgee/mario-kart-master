/**
 * Track schematics. (4c1)
 *
 * Four track guides need four pictures, and there are exactly two honest ways to get them:
 * commission four illustrations, or draw four diagrams from data. Illustrations are out on both
 * counts — design principle 5 says original art only (so nothing can be traced from the game),
 * and four bespoke pictures is four jobs that have to be redone the moment a callout moves.
 *
 * So a track is a **subway map**, not a map. Chunky rounded corners, no attempt at true
 * proportion, everything that matters called out with a numbered pin. That style is the right
 * one here for a reason beyond cost: she is not navigating with this, she is memorising with it.
 * A faithful satellite view of Thwomp Ruins would carry a hundred details and hide the four that
 * win races. Six corners and four pins carry only the four.
 *
 * **Nothing is placed by hand.** The lap is one SVG path and every pin is a fraction along it,
 * resolved with `getPointAtLength()` — the same trick the lap map uses. Nudge the shape and the
 * labels follow it, which is what keeps a track down to a few lines of data instead of a
 * coordinate list that rots the first time anyone edits it. {@link loop} takes that further: a
 * track's silhouette is a handful of corner points and a corner radius.
 *
 * **The picture is never the only copy of the information.** Every pin is numbered, and Chapter 8
 * prints the same numbers in a list beside the map (3e1: nothing carried by colour, or by a
 * picture, alone). The SVG is `aria-hidden` for that reason — a screen reader gets the list,
 * which is the better version anyway.
 */

const NS = 'http://www.w3.org/2000/svg';

/** The drawing box. Everything below is authored in these units and scales with the card. */
const WIDTH = 1000;
const HEIGHT = 560;
const CENTRE_X = WIDTH / 2;
const CENTRE_Y = HEIGHT / 2;

/**
 * The visible frame is deliberately bigger than the drawing box.
 *
 * Labels sit *outside* the lap, and a track drawn to the edges of its own viewBox leaves them
 * nowhere to go — every long one either runs off the card or has to be flipped back over the
 * road it is annotating. Padding the view instead of shrinking every shape keeps the four track
 * silhouettes authored in one honest coordinate space.
 */
const VIEW = { x: -120, y: -60, width: 1260, height: 680 };

/** How far off the road a pin's label sits. Big enough to clear the verge stroke. */
const LABEL_GAP = 40;

export type Point = readonly [number, number];

/**
 * What a pin is about. Five of these are things on the road; `line` is the odd one out — a note
 * about *how to drive* a stretch, which two of the four tracks genuinely need and which would
 * otherwise have to masquerade as a hazard.
 */
export type PinKind = 'pad' | 'coins' | 'trick' | 'hazard' | 'split' | 'line';

/**
 * What each kind is called in the list beside the map.
 *
 * Kept next to the type rather than in the chapter, because these words are the legend for the
 * colours — if a new kind is ever added, the thing that must not be forgotten is its name.
 */
export const PIN_KIND_LABEL: Record<PinKind, string> = {
  pad: 'Boost pads',
  coins: 'Coins',
  trick: 'Trick here',
  hazard: 'Hazard',
  split: 'Path choice',
  line: 'How to drive it',
};

export interface MapPin {
  kind: PinKind;
  /** Where it sits, 0..1 around the lap, measured from the start of the path string. */
  at: number;
  /** Two or three words. A `\n` breaks it over two lines. */
  label: string;
  /** Which way the label leans: out of the infield (default) or into it. */
  side?: 'in' | 'out' | undefined;
}

/**
 * An alternate route: the path choices this cup is picked for.
 *
 * Drawn as a dashed line leaving and rejoining the lap, because that is exactly what she sees on
 * the track — the road opening into two, then closing again.
 */
export interface MapBranch {
  path: string;
  label: string;
  /** `take` is the one she should learn. `either` is a genuine coin-flip. */
  tone: 'take' | 'either';
  /** Where the label sits along the branch, 0..1. Defaults to the middle. */
  labelAt?: number | undefined;
  /**
   * Which way the label leans. Branches that bulge outwards want `out` (the default); a branch
   * that cuts *across* the infield — a glider hop — has to lean the other way or it lands on the
   * road it is describing.
   */
  side?: 'in' | 'out' | undefined;
}

export interface TrackSchematic {
  /** The lap: one closed path in the 1000×560 box. Build it with {@link loop}. */
  path: string;
  /** Where the start/finish line goes, 0..1 along the path. Defaults to the path's start. */
  start?: number | undefined;
  branches?: readonly MapBranch[] | undefined;
}

export interface TrackMapOptions {
  schematic: TrackSchematic;
  pins: readonly MapPin[];
  /** Accessible name for the figure. The list beside it carries the detail. */
  alt: string;
}

export interface TrackMap {
  root: HTMLElement;
  /**
   * Place everything against the real path length. Call it once the map is in the document —
   * path measurement on a detached element is reliable in Chrome and is not reliable everywhere,
   * and this has to survive the Safari sanity check at 4f1.
   */
  layout(): void;
  dispose(): void;
}

function svg<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

/** Walk `r` from `from` towards `to`, never past the midpoint. */
function trim(from: Point, to: Point, r: number): Point {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const distance = Math.min(r, length / 2);
  return [from[0] + (dx / length) * distance, from[1] + (dy / length) * distance];
}

function fmt(point: Point): string {
  return `${point[0].toFixed(1)} ${point[1].toFixed(1)}`;
}

/**
 * A rounded polygon, as a path string.
 *
 * Every corner is cut back along both of its edges and rejoined with a quadratic through the
 * corner itself, which is the cheapest curve that always stays inside the shape. Straight edges
 * between soft corners is the whole subway-map look, and it means a track is authored as the
 * six or eight points anyone would sketch on a napkin.
 */
export function loop(points: readonly Point[], radius = 60): string {
  const n = points.length;
  if (n < 3) return '';

  const cut = points.map((corner, i) => {
    const previous = points[(i - 1 + n) % n] ?? corner;
    const next = points[(i + 1) % n] ?? corner;
    return { a: trim(corner, previous, radius), c: corner, b: trim(corner, next, radius) };
  });

  const first = cut[0];
  if (!first) return '';

  let d = `M ${fmt(first.b)}`;
  for (let i = 1; i < n; i++) {
    const corner = cut[i];
    if (!corner) continue;
    d += ` L ${fmt(corner.a)} Q ${fmt(corner.c)} ${fmt(corner.b)}`;
  }
  d += ` L ${fmt(first.a)} Q ${fmt(first.c)} ${fmt(first.b)} Z`;
  return d;
}

/** The same corners, left open at both ends. Branches use this. */
export function route(points: readonly Point[], radius = 60): string {
  const n = points.length;
  if (n < 2) return '';
  const first = points[0];
  const last = points[n - 1];
  if (!first || !last) return '';

  let d = `M ${fmt(first)}`;
  for (let i = 1; i < n - 1; i++) {
    const corner = points[i];
    const previous = points[i - 1];
    const next = points[i + 1];
    if (!corner || !previous || !next) continue;
    d += ` L ${fmt(trim(corner, previous, radius))} Q ${fmt(corner)} ${fmt(trim(corner, next, radius))}`;
  }
  d += ` L ${fmt(last)}`;
  return d;
}

/** Split a label on `\n` into stacked tspans, centred on the anchor line. */
function labelText(text: string, anchor: string): SVGTextElement {
  const lines = text.split('\n');
  const node = svg('text', { class: 'tm-label', 'text-anchor': anchor });
  lines.forEach((line, index) => {
    const span = svg('tspan', {
      x: 0,
      dy: index === 0 ? -((lines.length - 1) * 13) : 26,
    });
    span.textContent = line;
    node.append(span);
  });
  return node;
}

export function createTrackMap(options: TrackMapOptions): TrackMap {
  const { schematic, pins, alt } = options;

  const root = document.createElement('div');
  root.className = 'track-map';

  const frame = svg('svg', {
    viewBox: `${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`,
    class: 'tm-svg',
    role: 'img',
    'aria-label': alt,
  });

  // Three strokes of the same path: verge, tarmac, centre line. Stroking one path rather than
  // filling a shape is what makes the two road edges stay parallel round every corner for free.
  const verge = svg('path', { d: schematic.path, class: 'tm-verge' });
  const road = svg('path', { d: schematic.path, class: 'tm-road' });
  const dashes = svg('path', { d: schematic.path, class: 'tm-dash' });
  frame.append(verge, road, dashes);

  interface BranchParts {
    branch: MapBranch;
    path: SVGPathElement;
    label: SVGTextElement;
  }

  const branches: BranchParts[] = [];
  for (const branch of schematic.branches ?? []) {
    const path = svg('path', { d: branch.path, class: 'tm-branch', 'data-tone': branch.tone });
    const label = labelText(branch.label, 'middle');
    label.classList.add('tm-branch-label');
    label.dataset['tone'] = branch.tone;
    frame.append(path, label);
    branches.push({ branch, path, label });
  }

  // Start line and the arrow beside it. Between them they answer the two questions a schematic
  // always gets asked first: where does the lap begin, and which way round does it go?
  const startGroup = svg('g', { class: 'tm-start' });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 6; col++) {
      startGroup.append(
        svg('rect', {
          x: -6 + row * 6,
          y: -36 + col * 12,
          width: 6,
          height: 12,
          fill: (row + col) % 2 === 0 ? '#ffffff' : '#2b3040',
        }),
      );
    }
  }
  const arrow = svg('path', { d: 'M -11 -9 L 11 0 L -11 9 Z', class: 'tm-arrow' });
  frame.append(startGroup, arrow);

  interface PinParts {
    pin: MapPin;
    group: SVGGElement;
    label: SVGTextElement;
  }

  const pinParts: PinParts[] = [];
  pins.forEach((pin, index) => {
    const group = svg('g', { class: 'tm-pin', 'data-kind': pin.kind });
    group.append(svg('circle', { r: 19 }));
    const number = svg('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', y: 1 });
    number.textContent = String(index + 1);
    group.append(number);

    const label = labelText(pin.label, 'middle');
    frame.append(group, label);
    pinParts.push({ pin, group, label });
  });

  root.append(frame);

  let placed = false;
  let retries = 0;
  let frameRequest: number | null = null;

  function pointAt(path: SVGPathElement, total: number, fraction: number): DOMPoint {
    const at = ((fraction % 1) + 1) % 1;
    return path.getPointAtLength(at * total);
  }

  /** Push a label off the road, away from the middle of the box (or into it for `side: 'in'`). */
  function placeLabel(label: SVGTextElement, x: number, y: number, side: 'in' | 'out'): void {
    const dx = x - CENTRE_X;
    const dy = y - CENTRE_Y;
    const length = Math.hypot(dx, dy) || 1;
    const sign = side === 'in' ? -1 : 1;
    const ox = Math.round(sign * (dx / length) * LABEL_GAP);
    const oy = Math.round(sign * (dy / length) * LABEL_GAP);
    // A label pushed mostly sideways hangs off that side; one pushed mostly up or down sits
    // centred over its pin. Anchoring a bottom-of-the-lap label to its left edge is what sends
    // it sailing off the right of the frame.
    const anchor = Math.abs(ox) <= Math.abs(oy) ? 'middle' : ox > 0 ? 'start' : 'end';
    label.setAttribute('transform', `translate(${x + ox} ${y + oy + 6})`);
    label.setAttribute('text-anchor', anchor);
    for (const span of Array.from(label.children)) span.setAttribute('x', '0');
  }

  function layout(): void {
    const total = road.getTotalLength();
    if (total === 0) {
      // Not in the document yet, or laid out to nothing. Try again on the next few frames
      // rather than silently drawing a pile of pins in the top-left corner.
      if (retries < 10 && frameRequest === null) {
        retries += 1;
        frameRequest = requestAnimationFrame(() => {
          frameRequest = null;
          layout();
        });
      }
      return;
    }

    const startAt = schematic.start ?? 0;
    const here = pointAt(road, total, startAt);
    const ahead = pointAt(road, total, startAt + 0.01);
    const angle = (Math.atan2(ahead.y - here.y, ahead.x - here.x) * 180) / Math.PI;
    startGroup.setAttribute('transform', `translate(${here.x} ${here.y}) rotate(${angle})`);

    const arrowAt = pointAt(road, total, startAt + 0.05);
    const arrowAhead = pointAt(road, total, startAt + 0.06);
    const arrowAngle =
      (Math.atan2(arrowAhead.y - arrowAt.y, arrowAhead.x - arrowAt.x) * 180) / Math.PI;
    arrow.setAttribute('transform', `translate(${arrowAt.x} ${arrowAt.y}) rotate(${arrowAngle})`);

    for (const part of pinParts) {
      const point = pointAt(road, total, part.pin.at);
      part.group.setAttribute(
        'transform',
        `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`,
      );
      placeLabel(part.label, point.x, point.y, part.pin.side ?? 'out');
    }

    for (const part of branches) {
      const branchTotal = part.path.getTotalLength();
      if (branchTotal === 0) continue;
      const point = part.path.getPointAtLength((part.branch.labelAt ?? 0.5) * branchTotal);
      placeLabel(part.label, point.x, point.y, part.branch.side ?? 'out');
    }

    placed = true;
    root.dataset['placed'] = 'true';
  }

  // A font swapping in or a card resizing can move things under the SVG, and re-measuring is
  // cheap enough that guarding it would cost more than running it.
  const onResize = (): void => {
    if (placed) layout();
  };
  window.addEventListener('resize', onResize);

  return {
    root,
    layout,
    dispose() {
      window.removeEventListener('resize', onResize);
      if (frameRequest !== null) cancelAnimationFrame(frameRequest);
      root.remove();
    },
  };
}
