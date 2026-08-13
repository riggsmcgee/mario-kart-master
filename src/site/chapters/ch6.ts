/**
 * Chapter 6: the drift, explained once. (2b7)
 *
 * **This chapter used to have no drill, and used to argue she barely needed the skill. Both were
 * wrong.** (Riggs, 2026-08-12.)
 *
 * The original reasoning was that drifting is analogue — a held button plus a stick angle plus a
 * feel for how long a corner lasts — and that a keyboard drill would teach the *button* while
 * quietly lying about the skill. That is a real risk and it is not what happened. What happened
 * is that the chapter talked her out of a core mechanic: Bayesic's intro video, which is now the
 * anchor of the whole course, files drifting under **essential mechanics** and has a
 * thirteen-minute video of its own about it. Telling her it is the thing she needs least, while
 * sending her to a man who plainly thinks otherwise, is the course disagreeing with itself in
 * front of her.
 *
 * So drifting is implemented (`engine/drift.ts`), the chapter has a drill, and the argument has
 * changed shape rather than volume. It is no longer "you do not need this". It is **"here is what
 * it actually is, and here is the one condition under which it pays"** — long corners, where
 * there is room to reach orange. That condition is the genuinely useful thing nobody says out
 * loud, and it survives from the original chapter intact.
 *
 * What the keyboard can honestly teach turns out to be exactly the sequence: hop, hold, watch the
 * colour, release. The timing of a real stick is not in here and the chapter does not pretend it
 * is — the drill is a rehearsal of the shape, and the programme sends her to Sweet Sweet Canyon
 * for the feel.
 *
 * **Why a diagram and not a video alone.** The thing that has to land is a *sequence over time*:
 * hold, blue, orange, release. A single picture of a sliding kart says none of that, and the video
 * (Bayesic's, embedded by the template) says it at tutorial speed. Four stations round one corner,
 * numbered, with the charge changing colour along the road, is the sequence made spatial — and it
 * is legible frozen, which matters because everything animated here switches off under
 * `prefers-reduced-motion` (theme.css kills animations globally). Nothing in the drawing is
 * carried by the motion: the sweep is a highlight, the sparks flicker between fully visible and
 * slightly less so, and the boost pulses around its resting size. Freeze any of it and the picture
 * still reads.
 *
 * Original art, drawn in code, per design principle 5 and the same argument as `quiz-diagram.ts`:
 * no asset can enter the repo if there is no asset.
 */

import { createKartDrill } from '../../ui/kart-drill';
import { el, frag, prose, rich } from '../dom';
import type { ChapterContent, ChapterContext, Mounted } from '../types';
import './ch6.css';

/** Six chances across two laps of the test circuit's three corners. */
const TARGET = 6;
const LAPS = 2;

// --- the drawing -----------------------------------------------------------

const NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

interface Point {
  x: number;
  y: number;
}

/** One cubic: start, two controls, end. */
type Cubic = readonly [Point, Point, Point, Point];

/**
 * The corner: one long left-hander that arrives as a straight and keeps turning.
 *
 * Two cubics rather than one, because the shape has to do two jobs — arrive along a straight, so
 * "turn in" has somewhere to happen, then bend for long enough that four stations fit round it
 * without touching. The control points are set so the segments meet with the same tangent (both
 * leave and enter the join at 60 across, 52 up), which is the whole trick to a curve that does not
 * kink where it is stitched.
 *
 * Both ends deliberately sit outside the 540 × 300 frame. A road that stops inside the picture
 * reads as a car park; a road that runs off both edges reads as part of a lap.
 */
const CORNER: readonly [Cubic, Cubic] = [
  [
    { x: -24, y: 252 },
    { x: 140, y: 252 },
    { x: 258, y: 248 },
    { x: 318, y: 196 },
  ],
  [
    { x: 318, y: 196 },
    { x: 378, y: 144 },
    { x: 410, y: 66 },
    { x: 560, y: 20 },
  ],
];

const [FIRST, SECOND] = CORNER;

const CORNER_PATH = [
  `M ${FIRST[0].x} ${FIRST[0].y}`,
  `C ${FIRST[1].x} ${FIRST[1].y} ${FIRST[2].x} ${FIRST[2].y} ${FIRST[3].x} ${FIRST[3].y}`,
  `C ${SECOND[1].x} ${SECOND[1].y} ${SECOND[2].x} ${SECOND[2].y} ${SECOND[3].x} ${SECOND[3].y}`,
].join(' ');

interface Frame {
  x: number;
  y: number;
  /** Degrees for an SVG rotate(), where 0 leaves a nose-up glyph pointing up the screen. */
  angle: number;
  /** Unit vector toward the inside of the corner. Where the numbered badges live. */
  ix: number;
  iy: number;
}

/**
 * Where the road is, and which way it points, at fraction `t` of the corner.
 *
 * Each cubic owns half the parameter range. That is not arc-length accurate — the first segment
 * is the longer one, so t = 0.5 sits slightly past halfway by distance — and it does not need to
 * be, because the four stations are placed by eye against the drawing rather than by measurement.
 */
function frameAt(t: number): Frame {
  const clamped = Math.min(1, Math.max(0, t));
  const seg = clamped < 0.5 ? FIRST : SECOND;
  const u = clamped < 0.5 ? clamped * 2 : (clamped - 0.5) * 2;
  const [p0, c1, c2, p3] = seg;
  const v = 1 - u;

  const x = v * v * v * p0.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * p3.x;
  const y = v * v * v * p0.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * p3.y;

  const dx = 3 * v * v * (c1.x - p0.x) + 6 * v * u * (c2.x - c1.x) + 3 * u * u * (p3.x - c2.x);
  const dy = 3 * v * v * (c1.y - p0.y) + 6 * v * u * (c2.y - c1.y) + 3 * u * u * (p3.y - c2.y);
  const length = Math.hypot(dx, dy) || 1;

  // The inside of a corner is 90° to the left of travel in screen coordinates, which is where
  // the numbers go: outside the tarmac, inside the bend, never on top of the karts.
  return {
    x,
    y,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI + 90,
    ix: dy / length,
    iy: -dx / length,
  };
}

const COLOUR = {
  verge: '#e2f5e2',
  road: '#c3ccdb',
  markings: '#ffffff',
  waiting: '#7b8494',
  blue: '#2f9bff',
  orange: '#ff8a1f',
  kart: '#e8453c',
  kartTrim: '#ffd23f',
  tyre: '#23262d',
  glass: '#cfe6ff',
  ink: '#2b3040',
};

/** A kart from above, nose pointing up the screen. Wheels are most of what makes it read. */
function kart(): SVGGElement {
  const group = svg('g');
  for (const [x, y] of [
    [-12, -9],
    [6, -9],
    [-12, 2],
    [6, 2],
  ] as const) {
    group.append(svg('rect', { x, y, width: 6, height: 8, rx: 2, fill: COLOUR.tyre }));
  }
  group.append(svg('rect', { x: -8, y: -13, width: 16, height: 26, rx: 6, fill: COLOUR.kart }));
  group.append(svg('rect', { x: -5, y: -9, width: 10, height: 6, rx: 3, fill: COLOUR.glass }));
  group.append(svg('rect', { x: -6, y: 7, width: 12, height: 4, rx: 2, fill: COLOUR.kartTrim }));
  return group;
}

/**
 * A four-point twinkle. Three of them at the back wheels is a spark shower, at this size.
 *
 * Outlined in white, which is not decoration: the orange sparks sit on the orange stretch of the
 * charge trail, and without the outline they dissolve into it exactly where they matter most.
 */
function spark(x: number, y: number, size: number, colour: string): SVGPathElement {
  const s = size;
  return svg('path', {
    d: `M ${x} ${y - s} Q ${x + s * 0.28} ${y - s * 0.28} ${x + s} ${y} Q ${x + s * 0.28} ${y + s * 0.28} ${x} ${y + s} Q ${x - s * 0.28} ${y + s * 0.28} ${x - s} ${y} Q ${x - s * 0.28} ${y - s * 0.28} ${x} ${y - s} Z`,
    fill: colour,
    stroke: COLOUR.markings,
    'stroke-width': 1.2,
    'stroke-linejoin': 'round',
  });
}

function sparkShower(colour: string, stage: 'blue' | 'orange'): SVGGElement {
  const group = svg('g', { class: 'drift-spark' });
  group.dataset['stage'] = stage;
  group.append(spark(-13, 9, 7, colour));
  group.append(spark(12, 8, 5.5, colour));
  group.append(spark(-6, 15, 4, colour));
  return group;
}

/**
 * Three chevrons stacked behind the kart: the visual language boost pads already use.
 *
 * White rather than boost-orange, because they land on top of the orange stretch of the trail.
 * The colour that means "boost" everywhere else on the site is the one colour that cannot say it
 * here.
 */
function boostBurst(): SVGGElement {
  const group = svg('g', { class: 'drift-boost' });
  for (const [index, y] of [10, 17, 24].entries()) {
    group.append(
      svg('path', {
        d: `M -9 ${y + 6} L 0 ${y} L 9 ${y + 6}`,
        fill: 'none',
        stroke: COLOUR.markings,
        'stroke-width': 4,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        opacity: 1 - index * 0.22,
      }),
    );
  }
  return group;
}

function badge(n: number, colour: string): SVGGElement {
  const group = svg('g');
  group.append(
    svg('circle', { cx: 0, cy: 0, r: 14, fill: '#ffffff', stroke: colour, 'stroke-width': 4 }),
  );
  const text = svg('text', {
    x: 0,
    y: 6,
    'text-anchor': 'middle',
    'font-size': 17,
    'font-weight': 700,
    'font-family': 'Fredoka, sans-serif',
    fill: COLOUR.ink,
  });
  text.textContent = String(n);
  group.append(text);
  return group;
}

interface Station {
  t: number;
  /** Extra rotation on top of the road angle: a drifting kart points into the corner. */
  slide: number;
  colour: string;
  sparks?: 'blue' | 'orange' | undefined;
  boost?: boolean | undefined;
}

/**
 * Where the four karts stand. Placed so each one sits inside the phase of the charge it belongs
 * to, and far enough apart that no two spark showers touch. `BADGE_REACH` is the distance from
 * the middle of the road out to a number, and 44 is the largest value that keeps the last badge
 * inside the frame — worth knowing before anyone nudges the corner.
 */
const STATIONS: readonly Station[] = [
  { t: 0.3, slide: 0, colour: COLOUR.waiting },
  { t: 0.55, slide: -20, colour: COLOUR.blue, sparks: 'blue' },
  { t: 0.75, slide: -22, colour: COLOUR.orange, sparks: 'orange' },
  { t: 0.86, slide: -8, colour: COLOUR.kart, boost: true },
];

/** Distance from the middle of the road out to a numbered badge. See the note above. */
const BADGE_REACH = 44;

/**
 * The corner, drawn once.
 *
 * `pathLength` is set to 100 on every stroked copy of the road, which turns dash maths into
 * percentages: the charge that has not lit yet is units 0–42, blue is 42–70, orange is 70–100,
 * and the travelling highlight is a six-unit dash walking the whole hundred. Without it, every
 * one of those numbers would have to be recalculated by hand the moment the corner moved.
 *
 * Those boundaries are measured in *distance* along the road, while the stations are placed by
 * curve parameter, so the two are not the same number — station one at t = 0.3 lands at 37% of
 * the way round. They were checked against each other once, on paper, and the margins are wide
 * enough that a small nudge to either will not put a kart in the wrong colour.
 */
function driftDiagram(): SVGSVGElement {
  const root = svg('svg', {
    viewBox: '0 0 540 300',
    class: 'drift-svg',
    role: 'img',
    'aria-label':
      'A long corner with four numbered stations: hold the button at turn-in, blue sparks a moment later, orange sparks further round, and a boost as you let go on the way out.',
  });

  const stroke = (attrs: Record<string, string | number>): void => {
    root.append(svg('path', { d: CORNER_PATH, fill: 'none', pathLength: 100, ...attrs }));
  };

  stroke({ stroke: COLOUR.verge, 'stroke-width': 78, 'stroke-linecap': 'round' });
  stroke({ stroke: COLOUR.road, 'stroke-width': 58, 'stroke-linecap': 'round' });
  stroke({ stroke: COLOUR.markings, 'stroke-width': 2.5, 'stroke-dasharray': '3 4' });

  // The charge, laid along the road: grey while it is winding up, then blue, then orange.
  stroke({
    stroke: COLOUR.waiting,
    'stroke-width': 13,
    'stroke-linecap': 'round',
    'stroke-dasharray': '42 100',
    opacity: 0.75,
  });
  stroke({
    stroke: COLOUR.blue,
    'stroke-width': 13,
    'stroke-linecap': 'round',
    'stroke-dasharray': '28 100',
    'stroke-dashoffset': -42,
  });
  stroke({
    stroke: COLOUR.orange,
    'stroke-width': 13,
    'stroke-linecap': 'round',
    'stroke-dasharray': '30 100',
    'stroke-dashoffset': -70,
  });

  // The travelling highlight: one short dash walking the corner, on a loop. Decoration only.
  stroke({
    class: 'drift-pulse',
    stroke: COLOUR.kartTrim,
    'stroke-width': 13,
    'stroke-linecap': 'round',
    'stroke-dasharray': '6 94',
  });

  STATIONS.forEach((station, index) => {
    const frame = frameAt(station.t);

    const holder = svg('g', {
      transform: `translate(${frame.x.toFixed(1)} ${frame.y.toFixed(1)})`,
    });
    // Karts are drawn at 1.3×: at 1× they are technically to scale against a 58-wide road and
    // read as ladybirds. A diagram is allowed to be wrong about scale to be right about legibility.
    const body = svg('g', {
      transform: `rotate(${(frame.angle + station.slide).toFixed(1)}) scale(1.3)`,
    });
    body.append(kart());
    if (station.sparks) {
      body.append(
        sparkShower(station.sparks === 'blue' ? COLOUR.blue : COLOUR.orange, station.sparks),
      );
    }
    if (station.boost) body.append(boostBurst());
    holder.append(body);
    root.append(holder);

    const mark = badge(index + 1, station.colour);
    const mx = frame.x + frame.ix * BADGE_REACH;
    const my = frame.y + frame.iy * BADGE_REACH;
    mark.setAttribute('transform', `translate(${mx.toFixed(1)} ${my.toFixed(1)})`);
    root.append(mark);
  });

  return root;
}

/**
 * The drafting aside's picture: you tucked in behind someone on a straight, with the air doing
 * the work. Small on purpose — it is a thirty-second aside and should not look like a lesson.
 */
function draftDiagram(): SVGSVGElement {
  const root = svg('svg', {
    viewBox: '0 0 260 110',
    class: 'draft-svg',
    role: 'img',
    'aria-label':
      'Two karts nose to tail on a straight, with the air streaming past the one in front.',
  });

  root.append(svg('rect', { x: 0, y: 22, width: 260, height: 66, rx: 6, fill: COLOUR.road }));
  root.append(
    svg('path', {
      d: 'M 0 55 H 260',
      stroke: COLOUR.markings,
      'stroke-width': 2.5,
      'stroke-dasharray': '10 12',
      fill: 'none',
    }),
  );

  // Streaming air between the two of them. The only thing here that moves.
  for (const y of [36, 55, 74]) {
    root.append(
      svg('path', {
        class: 'draft-stream',
        d: `M 92 ${y} H 168`,
        stroke: '#ffffff',
        'stroke-width': 3,
        'stroke-linecap': 'round',
        'stroke-dasharray': '10 14',
        opacity: 0.85,
        fill: 'none',
      }),
    );
  }

  for (const [x, label] of [
    [72, 'you'],
    [196, 'them'],
  ] as const) {
    const holder = svg('g', { transform: `translate(${x} 55) rotate(90)` });
    holder.append(kart());
    root.append(holder);

    const text = svg('text', {
      x,
      y: 102,
      'text-anchor': 'middle',
      'font-size': 13,
      'font-weight': 600,
      'font-family': 'Nunito Sans, sans-serif',
      fill: COLOUR.ink,
    });
    text.textContent = label;
    root.append(text);
  }

  return root;
}

// --- the chapter -----------------------------------------------------------

interface SparkRow {
  stage: string;
  name: string;
  seconds: string;
  line: string;
  /** Purple. Real, famous, and switched off by her steering assist. */
  off?: boolean | undefined;
}

const SPARK_ROWS: readonly SparkRow[] = [
  {
    stage: 'blue',
    name: 'Blue sparks',
    seconds: '0.621s',
    line: 'Arrives quickly. Any corner long enough to lean on will give you this one.',
  },
  {
    stage: 'orange',
    name: 'Orange sparks',
    seconds: '1.674s',
    line: 'Nearly three blues. This is the one worth waiting for, and the reason long corners matter.',
  },
  {
    stage: 'purple',
    name: 'Purple sparks',
    seconds: '2.633s',
    // Corrected 2026-08-12. This row used to claim her steering assist switches purple off, which
    // is not something anybody has verified and is probably not true — the assist makes a long
    // tight drift harder to hold, which is a different statement. What *is* checkable is where
    // Bayesic puts it: "Advanced Drifting Tech", from 7:45, well past the point this chapter tells
    // her to stop watching. So the row now says the thing we actually know.
    line: 'Two and a half seconds of unbroken drift, which is longer than any corner in your cup. This is competitive-player territory — the video files it under advanced tech, after the point where we tell you to stop watching. Ignore it entirely.',
    off: true,
  },
];

const STEPS: ReadonlyArray<{ stage: string; text: string }> = [
  {
    stage: 'hold',
    text: 'Turn in, and **hold** the shoulder button down. The kart hops once, then starts to slide.',
  },
  {
    stage: 'blue',
    text: 'Blue sparks appear at the back wheels. That is a boost, banked, whenever you want it.',
  },
  { stage: 'orange', text: 'Keep holding. The sparks go orange — nearly three times the boost.' },
  { stage: 'boost', text: 'Let go on the way out, and it fires you down the next straight.' },
];

/**
 * The three stick positions, drawn. (Riggs, 2026-08-12: "an explanation of the different stick
 * states in drift might help her".)
 *
 * This is the thing every drifting tutorial assumes you already know, and the reason drifting
 * feels uncontrollable to a beginner: once the drift has started, the stick stops steering and
 * starts *shaping*. Push into the corner and the arc tightens, let go and it holds, push away and
 * it opens out. All three keep the drift going — only the button ends it — which is the single
 * fact that turns a drift from something that happens to you into something you are doing.
 *
 * Drawn as three arrows rather than described, because "away from the corner" is a direction and
 * directions want a picture. The arrow is an SVG path so it inherits the text colour and needs no
 * asset (design principle 5).
 */
function stickArrow(direction: 'left' | 'centre' | 'right'): SVGSVGElement {
  const box = svg('svg', {
    viewBox: '0 0 48 48',
    width: 48,
    height: 48,
    'aria-hidden': 'true',
    class: 'stick-arrow',
  });

  // The stick's gate: a circle it moves inside, so a centred stick reads as "resting" rather
  // than as "no picture here".
  box.append(svg('circle', { cx: 24, cy: 24, r: 17, fill: 'none', stroke: '#d7e0ec', 'stroke-width': 3 }));

  if (direction === 'centre') {
    box.append(svg('circle', { cx: 24, cy: 24, r: 6, fill: 'currentColor' }));
    return box;
  }

  const sign = direction === 'left' ? -1 : 1;
  box.append(
    svg('path', {
      d: `M 24 24 L ${24 + sign * 13} 24`,
      stroke: 'currentColor',
      'stroke-width': 5,
      'stroke-linecap': 'round',
    }),
  );
  box.append(
    svg('path', {
      d: `M ${24 + sign * 8} 17 L ${24 + sign * 16} 24 L ${24 + sign * 8} 31 Z`,
      fill: 'currentColor',
    }),
  );
  box.append(svg('circle', { cx: 24, cy: 24, r: 5, fill: 'currentColor' }));
  return box;
}

function stickCard(t: (text: string) => string): HTMLElement {
  const states: ReadonlyArray<{
    dir: 'left' | 'centre' | 'right';
    name: string;
    body: string;
  }> = [
    {
      dir: 'left',
      name: 'Into the corner',
      body: 'The drift **tightens**. For when the bend is sharper than the slide you are on.',
    },
    {
      dir: 'centre',
      name: 'Let it sit',
      body: 'The drift **holds its curve**. This is where your thumb should be most of the time.',
    },
    {
      dir: 'right',
      name: 'Away from the corner',
      body: 'The drift **opens out**. For when the bend straightens up before you are done.',
    },
  ];

  return el(
    'div',
    { class: 'stick-card' },
    ...states.map((state) =>
      el(
        'div',
        { class: 'stick-state' },
        stickArrow(state.dir),
        el('h4', null, t(state.name)),
        el('p', null, rich(t(state.body))),
      ),
    ),
    el(
      'p',
      { class: 'stick-note' },
      rich(
        t(
          'All three keep you drifting. **Only letting go of the button ends it** — and that is the moment you get your boost.',
        ),
      ),
    ),
  );
}

const content: ChapterContent = {
  concept(ctx: ChapterContext): Node {
    const line = (text: string): string => ctx.t(text);

    const figure = el(
      'figure',
      { class: 'drift-figure' },
      driftDiagram(),
      el(
        'ol',
        { class: 'drift-steps' },
        ...STEPS.map((step, index) =>
          el(
            'li',
            { data: { stage: step.stage } },
            el('span', { class: 'drift-step-badge' }, String(index + 1)),
            el('span', null, rich(line(step.text))),
          ),
        ),
      ),
    );

    const sparkCard = el(
      'div',
      { class: 'card spark-values' },
      ...SPARK_ROWS.map((row) =>
        el(
          'div',
          { class: 'spark-row', data: { stage: row.stage, off: String(row.off ?? false) } },
          el('span', { class: 'spark-dot' }),
          el(
            'div',
            { class: 'spark-head' },
            el('span', { class: 'spark-name' }, row.name),
            el('span', { class: 'ms spark-seconds' }, row.seconds),
            el('span', { class: 'spark-of' }, 'of boost'),
          ),
          el('p', { class: 'spark-body' }, rich(line(row.line))),
        ),
      ),
    );

    const drafting = el(
      'aside',
      { class: 'card draft-card' },
      el('p', { class: 'eyebrow' }, 'Thirty seconds on drafting'),
      draftDiagram(),
      prose(
        [
          'Drafting — some people say slipstreaming — is free, and almost nobody tells you about it. On a long straight, tuck in directly behind the kart in front and stay there for about two seconds. Little wind lines appear around you, you get pulled along faster than you should be going, and then you steer out and go past.',
          'No buttons. No timing. No skill, honestly. And it works behind anybody, including {rival}. Being second on a straight is a lovely place to be.',
        ].map(line),
      ),
    );

    return frag(
      prose(
        [
          '**A drift is not a way of taking a corner. It is a way of making a boost out of a corner you had to take anyway.** That is the whole chapter.',
          'You hold the same shoulder button you tap for tricks — hold it, rather than tapping — and steer into the bend. The kart hops, the back end swings wide, and sparks start coming off the back wheels. Let go while they are lit and you fire forward.',
        ].map(line),
      ),
      figure,
      el('h3', { class: 'drift-h' }, 'What your thumb is doing'),
      stickCard(line),
      el('h3', { class: 'drift-h' }, 'What the sparks are worth'),
      sparkCard,
      el('h3', { class: 'drift-h' }, 'Long corners only'),
      prose(
        [
          'This is the bit people skip. Drifting through a quick flick of a corner spends the whole thing charging a spark that never arrives, and you come out slower than if you had just driven round it.',
          '**Long, sweeping corners only.** Sweet Sweet Canyon is full of them. The tight stuff at Thwomp Ruins is not — drive that normally and keep your line.',
        ].map(line),
      ),
      drafting,
      prose(
        [
          'Next page: six corners. A fluffed one costs you nothing and you can go round as many times as you like.',
        ].map(line),
      ),
    );
  },

  /**
   * Six corners, two laps, count the mini-turbos.
   *
   * The test circuit already has exactly the right furniture for this and it is not furniture at
   * all — a long U-turn, a chicane and a hairpin, which between them are one corner worth
   * drifting, one that is arguable and one that is not. That is the lesson the chapter just spent
   * four paragraphs on, and driving it is a better teacher than reading it.
   *
   * The track is deliberately **empty**: no coins, no pads, no ramps. Every other kart drill in
   * the course asks her to collect something, and putting anything collectable here would split
   * her attention at the exact moment the instruction is "watch the back wheels".
   */
  interactive(mount: HTMLElement, ctx: ChapterContext): Mounted {
    let oranges = 0;
    let lapSeen = 1;
    let saidFirst = false;
    let saidOrange = false;

    return createKartDrill({
      mount,
      sfx: ctx.sfx,
      layout: [],
      drift: true,
      goal: 'Drift the long corners',
      unit: 'mini-turbos',
      target: TARGET,
      laps: LAPS,
      keys: 'Arrow keys to steer · hold Space through the corner, let go on the way out',

      onTick(tick, api) {
        if (tick.lap < lapSeen) {
          oranges = 0;
          saidFirst = false;
          saidOrange = false;
        }
        lapSeen = tick.lap;

        const released = tick.drift?.released ?? 'none';
        if (released === 'none') return;

        if (released === 'orange') oranges++;
        api.add();

        if (!saidFirst) {
          saidFirst = true;
          api.say('That is a mini-turbo. Five more.', 'good');
          return;
        }
        if (released === 'orange' && !saidOrange) {
          saidOrange = true;
          api.say('Orange. Worth nearly three of the blue ones.', 'good');
        }
      },

      onFinish(score) {
        ctx.finish({ score });
      },

      verdict(score) {
        if (score === 0) {
          return {
            title: 'No mini-turbos yet.',
            detail:
              'The sequence is: steer into the corner first, then hold Space and keep holding it. If you let go before the sparks light up you get nothing — and if you straighten the wheel, the drift ends. Go round again; the long left-hander is the friendly one.',
          };
        }
        if (oranges > 0) {
          return {
            title: `${score} mini-turbos, ${oranges} of them orange.`,
            detail:
              'The orange ones are the whole game. Now do the other half of the skill: on the tight corners, do not bother — you spend the whole thing charging a spark that never arrives and you come out slower than if you had just driven round.',
          };
        }
        return {
          title: `${score} mini-turbos, all blue.`,
          detail:
            'Good — now hold on longer. Blue arrives fast and is worth very little; orange takes about a second and a half and is worth nearly three of them. The long sweeping left is the one corner here with room for it.',
        };
      },
    });
  },
};

export default content;
