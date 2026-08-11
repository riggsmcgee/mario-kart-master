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
  shellBand: '#fdfdfd',
  coin: '#ffcf33',
  coinCore: '#e0a800',
  pad: '#ff8a1f',
  padChevron: '#fff6de',
  box: '#2fc4b2',
  boxTrim: '#ffffff',
  label: '#ffffff',
  labelHalo: '#1f3b22',
};

export type RoadShape = 'straight' | 'bend-left' | 'bend-right';

export type MarkerKind = 'you' | 'rival' | 'pack' | 'banana' | 'shell' | 'coin' | 'pad' | 'box';

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

function marker(kind: MarkerKind): SVGGElement {
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
    case 'shell': {
      const group = svg('g');
      // Motion streaks first, so the orb sits on top of them.
      for (const x of [-6, 0, 6]) {
        group.append(
          svg('rect', {
            x: x - 1,
            y: 10,
            width: 2,
            height: 9,
            rx: 1,
            fill: COLOUR.shell,
            opacity: 0.5,
          }),
        );
      }
      group.append(svg('circle', { cx: 0, cy: 0, r: 9, fill: COLOUR.shell }));
      group.append(svg('rect', { x: -9, y: -2, width: 18, height: 4, fill: COLOUR.shellBand }));
      return group;
    }
    case 'coin': {
      const group = svg('g');
      group.append(svg('circle', { cx: 0, cy: 0, r: 8, fill: COLOUR.coin }));
      group.append(svg('circle', { cx: 0, cy: 0, r: 3.4, fill: COLOUR.coinCore }));
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
const UNROTATED: ReadonlySet<MarkerKind> = new Set(['banana', 'coin', 'box']);

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

  return root;
}
