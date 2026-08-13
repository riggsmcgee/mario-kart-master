/**
 * The situation diagram on a quiz card. (1d1)
 *
 * A quiz question about item decisions is unanswerable without knowing where everyone is, and a
 * paragraph describing it is a reading comprehension test rather than a racing one. So each card
 * gets a small top-down picture: a stretch of road, you on it, whoever else matters, and the
 * item in play.
 *
 * Drawn as SVG from the same plain JSON that authors the question, for three reasons. It is
 * **original art** by construction — design principle 5, and no asset ever enters the repo. It
 * scales to any screen without a second file. And an author writes `{"kind": "rival", "at":
 * 0.15}` instead of opening a drawing program, which is what keeps eight to twelve Chapter 2
 * situations from becoming eight to twelve illustration jobs.
 *
 * Colours are fixed rather than themed: this is a picture of a place, and a road that turns pale
 * grey in light mode and charcoal in dark mode stops reading as tarmac.
 *
 * **What is in your hands is drawn, not only described. (Riggs, 2026-08-13: "show the items that
 * you have visually in the corner as well as in the text. Apply to all relevant questions.")**
 *
 * Every card in the Chapter 2 deck turns on one thing — what you are holding — and that one thing
 * was the only part of the situation the picture did not show. Two cards tried: they put the held
 * item on the tarmac behind the kart, which is a picture of a banana *dropped*, and the caption
 * underneath had to say "the banana is still in your hands" to argue with it.
 *
 * So the diagram grew an item slot, in the top-left, where the game puts it. It is a HUD and it is
 * drawn like one: over the top of the world, last, so nothing about the road can hide it. A card
 * with `holding` no longer needs a marker on the road for the item it is asking about, and the
 * three cards that had one lost it.
 */

const NS = 'http://www.w3.org/2000/svg';

const WIDTH = 340;
const HEIGHT = 220;
const ROAD_WIDTH = 118;

const COLOUR = {
  grass: '#5cc24e',
  grassDark: '#46a83c',
  road: '#6e7480',
  roadEdge: '#f4f6f8',
  centreLine: '#f7f7f7',
  you: '#e8453c',
  youTrim: '#ffd23f',
  rival: '#3b7de0',
  rivalTrim: '#bcd7ff',
  pack: '#8a93a3',
  tyre: '#23262d',
  glass: '#cfe6ff',
  banana: '#ffd23f',
  bananaDark: '#c99b0f',
  shell: '#e8453c',
  shellGreen: '#3fbf4a',
  shellBand: '#fdfdfd',
  bomb: '#2b2f38',
  bombFuse: '#ff8a1f',
  coin: '#ffcf33',
  coinCore: '#e0a800',
  pad: '#ff8a1f',
  padChevron: '#fff6de',
  box: '#2fc4b2',
  boxTrim: '#ffffff',
  mushroom: '#e8453c',
  mushroomSpot: '#fdf3e3',
  mushroomStalk: '#f6efe0',
  label: '#ffffff',
  labelHalo: '#1f3b22',
  /**
   * A *light* window with a dark frame, not the dark chip the first version used.
   *
   * Found by looking at all ten Chapter 2 cards rather than at the two that were designed against.
   * A dark slot flatters a banana and a red shell and swallows the bob-omb whole — it is a
   * near-black sphere, and on `rgba(18,22,30,…)` the only part of it left was the lit fuse. Every
   * holdable item is either bright or dark, so the background has to be one or the other, and
   * light is the one that keeps all six.
   */
  slot: '#f0f3f7',
  slotEdge: '#1f2530',
};

export type RoadShape = 'straight' | 'bend-left' | 'bend-right';

export type MarkerKind =
  | 'you'
  | 'rival'
  | 'pack'
  | 'banana'
  | 'shell'
  | 'shell-green'
  | 'bomb'
  | 'coin'
  | 'mushroom'
  | 'pad'
  | 'box';

/**
 * What can sit in the item slot.
 *
 * Narrower than {@link MarkerKind} because the slot is a picture of your hands: a rival, the pack
 * and a stretch of painted road are not things anybody is holding, and letting a deck ask for one
 * would draw a kart the size of a postage stamp in the corner rather than fail.
 */
export type HeldKind = 'banana' | 'shell' | 'shell-green' | 'bomb' | 'coin' | 'mushroom';

export const HELD_KINDS: ReadonlySet<string> = new Set<HeldKind>([
  'banana',
  'shell',
  'shell-green',
  'bomb',
  'coin',
  'mushroom',
]);

export interface DiagramMarker {
  kind: MarkerKind;
  /** How far up the road, 0 at the bottom of the frame (behind you) to 1 at the top (ahead). */
  at: number;
  /** Across the road: -1 is the left kerb, +1 the right, 0 the centreline. */
  lane?: number;
  /** Optional caption drawn beside the marker. Keep it to a word or two. */
  label?: string;
}

export interface DiagramSpec {
  road: RoadShape;
  markers: DiagramMarker[];
  /**
   * What is in your item slots, drawn in the corner. One or two — two is what the game gives you,
   * and a third would be a picture of something that cannot happen.
   */
  holding?: HeldKind[];
  /** One line under the picture, for anything the picture cannot say. */
  caption?: string;
}

function svg<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

/** The three road shapes, as one quadratic curve each: start, control, end. */
function curve(shape: RoadShape): [number, number][] {
  const cx = WIDTH / 2;
  switch (shape) {
    case 'bend-right':
      return [
        [cx - 55, HEIGHT + 25],
        [cx - 55, HEIGHT * 0.32],
        [WIDTH + 25, HEIGHT * 0.26],
      ];
    case 'bend-left':
      return [
        [cx + 55, HEIGHT + 25],
        [cx + 55, HEIGHT * 0.32],
        [-25, HEIGHT * 0.26],
      ];
    case 'straight':
      return [
        [cx, HEIGHT + 25],
        [cx, HEIGHT / 2],
        [cx, -25],
      ];
  }
}

interface Frame {
  x: number;
  y: number;
  /** Degrees, for an SVG rotate(). 0 means the marker's nose points up the screen. */
  angle: number;
  /** Unit normal, pointing to the right-hand side of the road. */
  nx: number;
  ny: number;
}

/** Position, heading and sideways direction at a point along the road. */
function frameAt(shape: RoadShape, at: number): Frame {
  const [p0, p1, p2] = curve(shape);
  // Non-null: curve() always returns exactly three points.
  const [x0, y0] = p0 as [number, number];
  const [x1, y1] = p1 as [number, number];
  const [x2, y2] = p2 as [number, number];

  const t = Math.min(1, Math.max(0, at));
  const u = 1 - t;

  const x = u * u * x0 + 2 * u * t * x1 + t * t * x2;
  const y = u * u * y0 + 2 * u * t * y1 + t * t * y2;

  // Derivative of the same curve: the direction of travel at t.
  const dx = 2 * u * (x1 - x0) + 2 * t * (x2 - x1);
  const dy = 2 * u * (y1 - y0) + 2 * t * (y2 - y1);
  const length = Math.hypot(dx, dy) || 1;

  return {
    x,
    y,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI + 90,
    nx: -dy / length,
    ny: dx / length,
  };
}

function roadPath(shape: RoadShape): string {
  const [p0, p1, p2] = curve(shape);
  const [x0, y0] = p0 as [number, number];
  const [x1, y1] = p1 as [number, number];
  const [x2, y2] = p2 as [number, number];
  return `M ${x0} ${y0} Q ${x1} ${y1} ${x2} ${y2}`;
}

// --- markers ---------------------------------------------------------------

/** A kart, nose up. Wheels and a windscreen are most of what makes it read as a vehicle. */
function kart(body: string, trim: string): SVGGElement {
  const group = svg('g');
  const wheels: Array<[number, number]> = [
    [-13, -10],
    [7, -10],
    [-13, 3],
    [7, 3],
  ];
  for (const [x, y] of wheels) {
    group.append(svg('rect', { x, y, width: 6, height: 8, rx: 2, fill: COLOUR.tyre }));
  }
  group.append(svg('rect', { x: -9, y: -14, width: 18, height: 28, rx: 6, fill: body }));
  group.append(svg('rect', { x: -6, y: -10, width: 12, height: 7, rx: 3, fill: COLOUR.glass }));
  group.append(svg('rect', { x: -7, y: 8, width: 14, height: 4, rx: 2, fill: trim }));
  return group;
}

/**
 * One marker.
 *
 * `still` drops anything that is drawing *motion* — a shell's speed streaks, in practice. On the
 * road those streaks are what separate "a shell is coming" from "a shell is lying there"; in the
 * item slot they would be a picture of a shell already on its way, which is the opposite of what
 * holding one means.
 */
function marker(kind: MarkerKind, still = false): SVGGElement {
  switch (kind) {
    case 'you':
      return kart(COLOUR.you, COLOUR.youTrim);
    case 'rival':
      return kart(COLOUR.rival, COLOUR.rivalTrim);
    case 'pack': {
      const group = svg('g');
      const three: Array<[number, number, number]> = [
        [-16, 6, 0.7],
        [16, 6, 0.7],
        [0, -12, 0.75],
      ];
      for (const [x, y, scale] of three) {
        const one = kart(COLOUR.pack, COLOUR.pack);
        one.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`);
        group.append(one);
      }
      return group;
    }
    case 'banana': {
      const group = svg('g');
      group.append(
        svg('path', {
          d: 'M -9 7 Q 0 -11 9 7 Q 0 1 -9 7 Z',
          fill: COLOUR.banana,
          stroke: COLOUR.bananaDark,
          'stroke-width': 1.5,
          'stroke-linejoin': 'round',
        }),
      );
      return group;
    }
    case 'shell':
    case 'shell-green': {
      const colour = kind === 'shell' ? COLOUR.shell : COLOUR.shellGreen;
      const group = svg('g');
      // Motion streaks first, so the orb sits on top of them.
      if (!still) {
        for (const x of [-6, 0, 6]) {
          group.append(
            svg('rect', {
              x: x - 1,
              y: 10,
              width: 2,
              height: 9,
              rx: 1,
              fill: colour,
              opacity: 0.5,
            }),
          );
        }
      }
      group.append(svg('circle', { cx: 0, cy: 0, r: 9, fill: colour }));
      group.append(svg('rect', { x: -9, y: -2, width: 18, height: 4, fill: COLOUR.shellBand }));
      return group;
    }
    case 'bomb': {
      const group = svg('g');
      group.append(svg('circle', { cx: 0, cy: 1, r: 8.5, fill: COLOUR.bomb }));
      // A lit fuse, so it reads as counting down rather than as a wheel.
      group.append(
        svg('path', {
          d: 'M 3 -6 Q 8 -12 5 -15',
          fill: 'none',
          stroke: COLOUR.bombFuse,
          'stroke-width': 2,
          'stroke-linecap': 'round',
        }),
      );
      group.append(svg('circle', { cx: 5, cy: -16, r: 2.6, fill: COLOUR.bombFuse }));
      return group;
    }
    case 'coin': {
      const group = svg('g');
      // Rimmed in its own darker gold: a flat yellow disc has an edge against tarmac and almost
      // none against the pale item slot, and the rim costs nothing in either place.
      group.append(
        svg('circle', {
          cx: 0,
          cy: 0,
          r: 8,
          fill: COLOUR.coin,
          stroke: COLOUR.coinCore,
          'stroke-width': 1.5,
        }),
      );
      group.append(svg('circle', { cx: 0, cy: 0, r: 3.4, fill: COLOUR.coinCore }));
      return group;
    }
    case 'mushroom': {
      // Stalk first, cap over it, so the cap's flat underside is the join rather than a seam.
      const group = svg('g');
      group.append(
        svg('rect', { x: -5, y: -1, width: 10, height: 10, rx: 3.5, fill: COLOUR.mushroomStalk }),
      );
      group.append(
        svg('path', { d: 'M -12 0 Q -12 -12 0 -12 Q 12 -12 12 0 Z', fill: COLOUR.mushroom }),
      );
      group.append(svg('circle', { cx: -5, cy: -5, r: 2.6, fill: COLOUR.mushroomSpot }));
      group.append(svg('circle', { cx: 4, cy: -6.5, r: 2, fill: COLOUR.mushroomSpot }));
      return group;
    }
    case 'pad': {
      const group = svg('g');
      group.append(svg('rect', { x: -16, y: -12, width: 32, height: 24, rx: 4, fill: COLOUR.pad }));
      for (const y of [-6, 1]) {
        group.append(
          svg('path', {
            d: `M -9 ${y + 5} L 0 ${y - 3} L 9 ${y + 5}`,
            fill: 'none',
            stroke: COLOUR.padChevron,
            'stroke-width': 3,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
          }),
        );
      }
      return group;
    }
    case 'box': {
      const group = svg('g');
      group.append(
        svg('rect', {
          x: -9,
          y: -9,
          width: 18,
          height: 18,
          rx: 3,
          fill: COLOUR.box,
          stroke: COLOUR.boxTrim,
          'stroke-width': 2,
          transform: 'rotate(45)',
        }),
      );
      return group;
    }
  }
}

/** Markers that are objects rather than vehicles do not care which way the road runs. */
const UNROTATED: ReadonlySet<MarkerKind> = new Set(['banana', 'coin', 'box', 'bomb', 'mushroom']);

// --- the item slot ---------------------------------------------------------

/** One cell per slot, top-left, laid out the way the game lays them out. */
const SLOT = { x: 12, y: 12, size: 42, gap: 7 };

/**
 * What you are holding, drawn as the game draws it: a rounded window with the item inside.
 *
 * Captioned in words as well, because the picture is carrying real information and the rule
 * everywhere else on this site is that nothing is left to the picture alone (3e1). "In your hands"
 * rather than "items": the whole of Chapter 2 is the difference between an item you *have* and one
 * you are *holding*, and the caption may as well be teaching it too.
 */
function itemSlots(kinds: readonly HeldKind[]): SVGGElement {
  const group = svg('g');

  kinds.forEach((kind, index) => {
    const cell = svg('g', {
      transform: `translate(${SLOT.x + index * (SLOT.size + SLOT.gap)} ${SLOT.y})`,
    });
    cell.append(
      svg('rect', {
        x: 0,
        y: 0,
        width: SLOT.size,
        height: SLOT.size,
        rx: 10,
        fill: COLOUR.slot,
        stroke: COLOUR.slotEdge,
        'stroke-width': 2.5,
      }),
    );

    const icon = marker(kind, true);
    // Scaled down a touch: the road markers are drawn to about ±16 units, and a slot is 42 across
    // with a border to stay inside.
    icon.setAttribute('transform', `translate(${SLOT.size / 2} ${SLOT.size / 2}) scale(0.92)`);
    cell.append(icon);

    group.append(cell);
  });

  const caption = svg('text', {
    x: SLOT.x,
    y: SLOT.y + SLOT.size + 15,
    'font-size': 11,
    'font-weight': 700,
    'letter-spacing': 0.4,
    fill: COLOUR.label,
    stroke: COLOUR.labelHalo,
    'stroke-width': 3.5,
    'stroke-linejoin': 'round',
    style: 'paint-order: stroke',
  });
  caption.textContent = 'in your hands';
  group.append(caption);

  return group;
}

function label(text: string): SVGTextElement {
  const node = svg('text', {
    x: 0,
    y: 30,
    'text-anchor': 'middle',
    'font-size': 12,
    'font-weight': 600,
    fill: COLOUR.label,
    stroke: COLOUR.labelHalo,
    'stroke-width': 3.5,
    'stroke-linejoin': 'round',
    // Stroke first, fill over it: a halo, so a label stays readable on road or on grass.
    style: 'paint-order: stroke',
  });
  node.textContent = text;
  return node;
}

/**
 * Draw one situation. Returns a finished `<svg>` ready to drop into a card.
 *
 * `alt` becomes the accessible name — the picture carries real information, so it needs one.
 */
export function renderDiagram(spec: DiagramSpec, alt: string): SVGSVGElement {
  const root = svg('svg', {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    class: 'quiz-diagram',
    role: 'img',
    'aria-label': alt,
  });

  root.append(svg('rect', { x: 0, y: 0, width: WIDTH, height: HEIGHT, fill: COLOUR.grass }));

  const path = roadPath(spec.road);

  // The road is one curve stroked three times: a wide apron, the tarmac, then the markings.
  // Stroking rather than filling means the parallel edges come for free — offsetting a Bézier
  // by hand is a genuinely hard problem and buys nothing here.
  const stroke = (colour: string, width: number, dash?: string): void => {
    const attrs: Record<string, string | number> = {
      d: path,
      fill: 'none',
      stroke: colour,
      'stroke-width': width,
    };
    if (dash) attrs['stroke-dasharray'] = dash;
    root.append(svg('path', attrs));
  };

  stroke(COLOUR.grassDark, ROAD_WIDTH + 26);
  stroke(COLOUR.roadEdge, ROAD_WIDTH + 6);
  stroke(COLOUR.road, ROAD_WIDTH);
  stroke(COLOUR.centreLine, 2.5, '12 14');

  for (const item of spec.markers) {
    const frame = frameAt(spec.road, item.at);
    const across = (item.lane ?? 0) * (ROAD_WIDTH / 2 - 20);
    const x = frame.x + frame.nx * across;
    const y = frame.y + frame.ny * across;

    const holder = svg('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
    const shape = marker(item.kind);
    if (!UNROTATED.has(item.kind))
      shape.setAttribute('transform', `rotate(${frame.angle.toFixed(1)})`);
    holder.append(shape);
    if (item.label) holder.append(label(item.label));
    root.append(holder);
  }

  // Last, so it is over everything. It is a HUD: on a left-hand bend the road runs out through
  // this exact corner, and a slot that could be hidden by the scenery would be no use on the one
  // card that needed it most.
  if (spec.holding && spec.holding.length > 0) root.append(itemSlots(spec.holding));

  return root;
}
