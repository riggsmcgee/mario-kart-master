/**
 * Turbo Jodi. (3a1)
 *
 * A tortoise in a kart, going faster than a tortoise has any business going. The plan suggested
 * her and she earns her place: the whole thesis of this site is that the slow, prepared one beats
 * the fast, unprepared one, and a tortoise winning a race says that without a paragraph.
 *
 * Drawn in code rather than shipped as a file. Original by construction — there is no asset to
 * accidentally source from Nintendo — she inherits `currentColor` so she works on any background,
 * and she scales to any size without a second export.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function node<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
}

export interface MascotOptions {
  /** Pixel size. The drawing is square. */
  size?: number;
  /** Speed lines behind her. Off in the header, on when she is being celebratory. */
  motion?: boolean;
  title?: string;
}

export function turboJodi(options: MascotOptions = {}): SVGSVGElement {
  const size = options.size ?? 40;

  const svg = node('svg', {
    viewBox: '0 0 64 64',
    width: String(size),
    height: String(size),
    class: 'mascot',
  });

  if (options.title) {
    const title = node('title', {});
    title.textContent = options.title;
    svg.append(title);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }

  if (options.motion) {
    // Three speed lines, unevenly spaced. Evenly spaced ones read as a barcode.
    for (const [y, length] of [
      [22, 14],
      [32, 20],
      [43, 11],
    ] as const) {
      svg.append(
        node('rect', {
          x: String(2),
          y: String(y),
          width: String(length),
          height: '3',
          rx: '1.5',
          fill: '#ff8a1f',
          opacity: '0.55',
        }),
      );
    }
  }

  // Wheels first, so the body sits over them.
  for (const cx of [22, 47]) {
    svg.append(node('circle', { cx: String(cx), cy: '49', r: '8', fill: '#23262d' }));
    svg.append(node('circle', { cx: String(cx), cy: '49', r: '3.2', fill: '#f2f3f5' }));
  }

  // Kart body: a wedge, nose to the right.
  svg.append(
    node('path', {
      d: 'M 12 46 L 15 33 Q 17 29 22 29 L 46 29 Q 54 30 57 38 L 58 46 Q 58 49 55 49 L 15 49 Q 12 49 12 46 Z',
      fill: '#e8453c',
    }),
  );

  // Shell: the reason she is a tortoise and not a generic animal.
  svg.append(node('ellipse', { cx: '31', cy: '25', rx: '13', ry: '11', fill: '#3fa346' }));
  svg.append(
    node('ellipse', {
      cx: '31',
      cy: '25',
      rx: '13',
      ry: '11',
      fill: 'none',
      stroke: '#2f8438',
      'stroke-width': '2',
    }),
  );
  for (const [cx, cy] of [
    [26, 21],
    [36, 21],
    [31, 29],
  ] as const) {
    svg.append(node('circle', { cx: String(cx), cy: String(cy), r: '3.1', fill: '#74cf63' }));
  }

  // Head, over the nose of the kart, leaning forward because she is trying.
  svg.append(node('ellipse', { cx: '49', cy: '22', rx: '8', ry: '7', fill: '#8fd67f' }));
  svg.append(node('circle', { cx: '52.5', cy: '20.5', r: '1.7', fill: '#23262d' }));

  // Goggles pushed up on her forehead. One detail, doing the work of a personality.
  svg.append(
    node('path', {
      d: 'M 42 16 Q 49 12 56 16',
      fill: 'none',
      stroke: '#ffd23f',
      'stroke-width': '3',
      'stroke-linecap': 'round',
    }),
  );

  return svg;
}
