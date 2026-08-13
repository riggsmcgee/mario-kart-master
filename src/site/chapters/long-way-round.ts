/**
 * The long way round: Chapter 4's idea, drawn as one corner. (3b1, moved 2026-08-13.)
 *
 * **What it draws.** A U-turn seen from above, which is deliberately the shape she already meets
 * in every drill (`test-track.ts`) and on the home page's lap map. {rival} takes the tight inside
 * line, because that is what the short way looks like and it is genuinely shorter. The other kart
 * swings out to the wide lane, over a boost pad, and comes back to the line in front. That is
 * Mario Kart Stadium's actual outer-lane lesson (2b5) and it is Chapter 4's rule in one picture:
 * a boost pad is worth going out of your way for.
 *
 * It concedes before it turns. For the first three seconds the red kart is plainly winning. A
 * picture that had her ahead from the start would be making a different and less true claim.
 *
 * **Why it is no longer in Chapter 0.** (Riggs, 2026-08-13: "I like this, but why is it in the
 * opening chapter?") It was built as the site's one big animated moment and put on the page most
 * likely to be closed early, on the argument that an argument you can watch beats one you have to
 * read. Fair — except that what it is actually arguing is not Chapter 0's claim. It is a specific,
 * teachable fact about boost pads and racing lines, illustrated in full, four chapters before
 * either subject comes up. In Chapter 0 it was a lovely picture of something nobody had mentioned
 * yet; in Chapter 4 it is the paragraph above it, made watchable.
 *
 * **There is nothing to do here.** It asks for no input, awards nothing, and gates nothing. It
 * sits inside a `concept()` section and can be scrolled straight past.
 *
 * **Why it is CSS rather than a loop.** `concept()` returns a node and has no teardown hook (see
 * `types.ts`), so anything started here with `requestAnimationFrame` or `setInterval` would
 * outlive the page it was drawn on. Every moving part below is a CSS animation on an element,
 * which the browser stops the moment the node is dropped.
 *
 * **The resting state is the finished frame.** Same rule `ch6.css` follows: every keyframe track
 * ends on the value the element already has in the stylesheet, and none of them use a fill mode.
 * Switch the animations off — for reduced motion, or because a browser has no motion path — and
 * what is left is both lines drawn, the pad lit, all three captions readable, and the green kart
 * over the line with the red one still short of it. The frozen picture makes the whole argument.
 * That is the version some readers will only ever see, so it is the version that has to work.
 */

import { el } from '../dom';
import './long-way-round.css';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * The two lines, and the road under them.
 *
 * One string each, used twice: as the `d` of a drawn path, and as the `offset-path` the kart
 * rides. Writing them once and handing the same value to both is what keeps a kart on its own
 * line — two copies would drift apart the first time either was nudged.
 *
 * Both lines start level at x = 60. Neither ends level, and that is the point: the outer line
 * runs past the finish at x = 36, the inner one stops short at x = 150. So the last frame — which
 * is also the resting frame — has already said who won.
 */
const ROAD = 'M 30 78 L 380 78 C 500 78 545 114 545 150 C 545 186 500 222 380 222 L 30 222';

/**
 * The wide way. Longer, and the boost pad is on it.
 *
 * Its widest point is 558, which is 35 units inside the asphalt's edge at 593 rather than the 20
 * an earlier version used. That version measured as "on the road" and looked as though it was
 * hanging off it, because the pad is 26 units across and the verge behind it is green: the numbers
 * were fine and the picture was not.
 */
const OUTER = 'M 60 50 L 380 50 C 530 50 558 100 558 150 C 558 200 530 250 380 250 L 36 250';

/** The tight way. Shorter, and there is nothing on it. */
const INNER = 'M 60 106 L 380 106 C 470 106 517 128 517 150 C 517 172 470 194 380 194 L 150 194';

/** The pad, on the outer line at its widest. */
const PAD = { x: 558, y: 150 };

/** Where each kart sits when there is no motion path to ride: the end of its own line. */
const OUTER_END = { x: 36, y: 250 };
const INNER_END = { x: 150, y: 194 };

/**
 * Does this browser have motion paths?
 *
 * Chrome has since 2016 and Safari since 16, so on Jodi's Mac this is a yes. It is asked anyway
 * because the honest fallback is free: without it the karts simply sit at the ends of their lines
 * and the lines still draw themselves, which is the same picture the reduced-motion reader gets.
 * The delight degrades; the argument does not.
 */
function supportsMotionPath(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('offset-path', "path('M 0 0 L 10 10')");
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  style: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  for (const [key, value] of Object.entries(style)) node.style.setProperty(key, value);
  return node;
}

/**
 * One kart, seen from above, nose to the right, drawn around its own origin.
 *
 * Centred on (0, 0) on purpose: a motion path puts the element's transform origin on the line, so
 * a kart drawn around the origin rides with its middle on its line rather than dangling off it by
 * whatever its top-left corner happened to be.
 */
function kart(body: string, driver: string): SVGGElement {
  const group = svgEl('g');

  for (const [x, y] of [
    [-9, -11],
    [-9, 6],
    [5, -11],
    [5, 6],
  ] as const) {
    group.append(
      svgEl(
        'rect',
        { x: String(x), y: String(y), width: '8', height: '5', rx: '2' },
        { fill: '#23262d' },
      ),
    );
  }

  group.append(
    svgEl(
      'path',
      { d: 'M -13 -7 Q -13 -9 -11 -9 L 8 -9 Q 15 -6 16 0 Q 15 6 8 9 L -11 9 Q -13 9 -13 7 Z' },
      { fill: body },
    ),
  );
  group.append(svgEl('circle', { cx: '-2', cy: '0', r: '4.5' }, { fill: driver }));

  return group;
}

/**
 * The boost pad, at the widest point of the outer line. Chevrons pointing the way round.
 *
 * Two nested groups, and the nesting is load-bearing. The outer one carries the `transform`
 * *attribute* that puts the pad on the track; the inner one is what the flash animation scales.
 * They cannot be the same element: a CSS `transform` replaces an SVG `transform` attribute rather
 * than composing with it, so a single group would have its position thrown away the instant the
 * animation touched it and the pad would fly to the corner of the diagram. Caught by measuring
 * where the pad actually was mid-animation, which is the only way this kind of thing gets caught.
 */
function boostPad(): SVGGElement {
  const anchor = svgEl('g', { transform: `translate(${PAD.x} ${PAD.y}) rotate(90)` });
  const group = svgEl('g', { class: 'lwr-pad' });
  anchor.append(group);

  group.append(
    svgEl(
      'rect',
      { x: '-17', y: '-13', width: '34', height: '26', rx: '5' },
      { fill: 'var(--boost)' },
    ),
  );
  for (const dx of [-8, 2]) {
    group.append(
      svgEl(
        'path',
        { d: `M ${dx} -7 L ${dx + 7} 0 L ${dx} 7`, 'stroke-linecap': 'round' },
        { fill: 'none', stroke: '#ffffff', 'stroke-width': '3', opacity: '0.9' },
      ),
    );
  }

  return anchor;
}

/** The chequered line, spanning the bottom straight's full width. Alternating squares. */
function finishLine(): SVGGElement {
  const group = svgEl('g');
  const square = 12;

  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 2; column++) {
      group.append(
        svgEl(
          'rect',
          {
            x: String(54 + column * square),
            y: String(174 + row * square),
            width: String(square),
            height: String(square),
          },
          { fill: (row + column) % 2 === 0 ? '#ffffff' : '#23262d' },
        ),
      );
    }
  }

  return group;
}

export interface LongWayRoundOptions {
  /**
   * The chapter's filler, so the captions can name the rival without hardcoding her.
   *
   * Declared as a property rather than a method so it arrives already bound — `ChapterContext.t`
   * is a method on the context and reads `this`, so it has to be wrapped at the call site.
   */
  t: (text: string) => string;
}

/**
 * The figure, ready to drop into a section.
 *
 * Returns plain nodes with no handles to hold: everything animated is CSS on an element inside
 * the returned tree, so dropping the tree stops it.
 */
export function createLongWayRound(options: LongWayRoundOptions): HTMLElement {
  const { t } = options;
  const reduced = prefersReducedMotion();
  const ride = supportsMotionPath() && !reduced;

  const svg = svgEl('svg', {
    viewBox: '0 0 620 300',
    class: 'lwr-svg',
    role: 'img',
    focusable: 'false',
  });
  svg.setAttribute(
    'aria-label',
    t(
      'A U-turn seen from above. {rival} takes the tight line around the inside. You take the wide lane on the outside, which is longer but has a boost pad on it — and you cross the finish line in front of her.',
    ),
  );

  // Verge, then asphalt. Two strokes on the same path, so the kerb cannot drift off the road.
  svg.append(svgEl('path', { d: ROAD, class: 'lwr-verge' }));
  svg.append(svgEl('path', { d: ROAD, class: 'lwr-road' }));

  // The start: both karts genuinely level, because the concession has to be true.
  svg.append(
    svgEl(
      'line',
      { x1: '60', y1: '30', x2: '60', y2: '126' },
      { stroke: '#ffffff', 'stroke-width': '4', opacity: '0.75', 'stroke-dasharray': '9 7' },
    ),
  );

  svg.append(finishLine());

  // The lines she is choosing between, each drawing itself as its kart covers it. `pathLength`
  // normalises both to 100 units, which is what lets one dash offset and one motion path share a
  // set of keyframe percentages and stay in step without anyone measuring anything.
  const outerLine = svgEl('path', {
    d: OUTER,
    class: 'lwr-line lwr-line-outer',
    pathLength: '100',
  });
  const innerLine = svgEl('path', {
    d: INNER,
    class: 'lwr-line lwr-line-inner',
    pathLength: '100',
  });
  svg.append(innerLine, outerLine);

  // The pad goes on *after* the lines, not before.
  //
  // Painted underneath, the outer line ran straight across it — the pad sits at exactly the line's
  // widest point, so the line bisected it and it read as two orange smudges rather than one object
  // on the road. Over the top it is a thing lying on the track that the line disappears under,
  // which is what it is. Chapter 4's drill had to learn the same lesson about depth the hard way
  // (session 13: the road was drawing over every distant pad).
  svg.append(boostPad());

  const rival = kart('var(--kerb)', '#ffd9d6');
  const hers = kart('var(--turf)', '#e6f7e2');

  const rivalRider = svgEl('g', { class: 'lwr-kart lwr-kart-inner' });
  const herRider = svgEl('g', { class: 'lwr-kart lwr-kart-outer' });
  rivalRider.append(rival);
  herRider.append(hers);

  if (ride) {
    rivalRider.style.setProperty('offset-path', `path('${INNER}')`);
    herRider.style.setProperty('offset-path', `path('${OUTER}')`);
  } else {
    // No motion path, or she asked for no motion. Park each kart where its line ends — which is
    // the finished frame, green over the line and red still short of it.
    rivalRider.setAttribute('transform', `translate(${INNER_END.x} ${INNER_END.y})`);
    herRider.setAttribute('transform', `translate(${OUTER_END.x} ${OUTER_END.y})`);
  }

  svg.append(rivalRider, herRider);

  // The captions say in words exactly what the drawing says in shapes, which is the rule the lap
  // map follows too (3e1): nothing here is carried by the picture alone.
  const captions = el(
    'ol',
    { class: 'lwr-captions' },
    el('li', { class: 'lwr-cap', data: { who: 'rival' } }, t('{rival} takes the short way round.')),
    el(
      'li',
      { class: 'lwr-cap', data: { who: 'you' } },
      'You go the long way, over the boost pad.',
    ),
    el('li', { class: 'lwr-cap', data: { who: 'win' } }, 'Longer. And you still get there first.'),
  );

  const figure = el(
    'figure',
    { class: 'lwr-figure', data: { motion: ride ? 'path' : 'static' } },
    el('p', { class: 'eyebrow' }, 'The whole idea, in one corner'),
    svg,
    captions,
  );

  // A replay only exists where there is something to replay. Under reduced motion the figure is
  // already showing its last frame, and a button that visibly does nothing is worse than no
  // button at all.
  if (!reduced) {
    const again = el('button', { class: 'btn btn-quiet lwr-again', type: 'button' }, 'Watch again');
    again.addEventListener('click', () => {
      figure.classList.remove('lwr-playing');
      // Reading `offsetWidth` forces the style change to land before the class goes back on.
      // Without it the browser coalesces both edits and the animations never restart.
      void figure.offsetWidth;
      figure.classList.add('lwr-playing');
    });
    figure.append(again);
  }

  figure.classList.add('lwr-playing');

  return figure;
}
