/**
 * The props. (4e4)
 *
 * Everything Kayla can pick up, drawn in code. Same rule the mascot follows (`mascot.ts`): no file
 * enters the repo, nothing needs licensing, and every prop inherits `currentColor` so it works on
 * the warm paper of beat 1 and the cold grid of beat 3 without a second version.
 *
 * They are drawn deliberately plain — the flat, sexless iconography of a settings panel — because
 * the fiction is that these are parts of a website rather than illustrations in a game. A speaker
 * icon with personality would give the joke away before it has been made.
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

function frame(viewBox: string, className: string, size: number): SVGSVGElement {
  const svg = node('svg', {
    viewBox,
    class: className,
    width: String(size),
    height: String(size),
    'aria-hidden': 'true',
    fill: 'none',
  });
  return svg;
}

/**
 * The speaker, with the two waves that come off it.
 *
 * The waves are separate nodes with their own class so the mute state is a CSS change rather than a
 * redraw — which matters because the icon gets muted and unmuted five or six times in ninety seconds
 * and a redraw would lose the element identity the drag code is holding onto.
 */
export function speaker(size = 64): SVGSVGElement {
  const svg = frame('0 0 64 64', 'k-speaker', size);
  svg.append(
    node('path', {
      d: 'M 10 25 L 20 25 L 32 14 L 32 50 L 20 39 L 10 39 Z',
      fill: 'currentColor',
    }),
  );
  for (const [i, d] of ['M 40 24 Q 45 32 40 40', 'M 47 19 Q 55 32 47 45'].entries()) {
    svg.append(
      node('path', {
        d,
        class: `k-wave k-wave-${i + 1}`,
        stroke: 'currentColor',
        'stroke-width': '4',
        'stroke-linecap': 'round',
      }),
    );
  }
  // The bar that appears when it is off. Drawn always, hidden by CSS, so muting is one class.
  svg.append(
    node('path', {
      d: 'M 40 20 L 56 44',
      class: 'k-mute-bar',
      stroke: 'currentColor',
      'stroke-width': '5',
      'stroke-linecap': 'round',
    }),
  );
  return svg;
}

/**
 * A mouse pointer.
 *
 * The narrator sends one of these after the mute button when it has been silenced, and catching it
 * is the puzzle. It is drawn as the plain system arrow on purpose — the moment a *second* cursor
 * appears on screen, before anything is said about it, is the moment the page stops being a page.
 */
export function pointer(size = 34): SVGSVGElement {
  const svg = frame('0 0 24 32', 'k-pointer', size);
  svg.append(
    node('path', {
      d: 'M 3 2 L 3 24 L 9 18.5 L 13 27 L 17 25 L 13 17 L 20.5 16.5 Z',
      fill: 'currentColor',
      stroke: '#ffffff',
      'stroke-width': '1.4',
      'stroke-linejoin': 'round',
    }),
  );
  return svg;
}

/** A padlock. Shackle is its own node so it can spring open. */
export function padlock(size = 40): SVGSVGElement {
  const svg = frame('0 0 48 48', 'k-padlock', size);
  svg.append(
    node('path', {
      d: 'M 15 22 L 15 15 A 9 9 0 0 1 33 15 L 33 22',
      class: 'k-shackle',
      stroke: 'currentColor',
      'stroke-width': '5',
      'stroke-linecap': 'round',
    }),
  );
  svg.append(
    node('rect', {
      x: '10',
      y: '21',
      width: '28',
      height: '20',
      rx: '4',
      fill: 'currentColor',
    }),
  );
  return svg;
}

/**
 * The bin. (Riggs, 2026-08-13: "it's not clear why the mouse disappears when you steal it. Maybe a
 * trash can appears and the device says don't put it in there".)
 *
 * He is right, and the fix is better than the thing it replaces. A caught object that slides into an
 * abstract tray in the corner has *happened to* her; an object she deliberately drops into a bin the
 * narrator has just begged her not to use is something she **did**. It is also the genre's own
 * central device — the prohibition is the tutorial — and it means nothing ever disappears: the
 * pointer sits in the bin, visible, for the next seven minutes, until the last beat fishes it out
 * again.
 *
 * Drawn with the lid as its own node so it can tip when something goes in.
 */
export function bin(size = 46): SVGSVGElement {
  const svg = frame('0 0 48 52', 'k-bin', size);
  // Lid, hinged at the left. Its own group so one class tips it.
  const lid = document.createElementNS(SVG_NS, 'g');
  lid.setAttribute('class', 'k-bin-lid');
  lid.append(
    node('rect', { x: '6', y: '10', width: '36', height: '5', rx: '2.5', fill: 'currentColor' }),
    node('rect', { x: '19', y: '5', width: '10', height: '5', rx: '2', fill: 'currentColor' }),
  );
  svg.append(
    node('path', {
      d: 'M 10 17 L 12 46 Q 12 49 15 49 L 33 49 Q 36 49 36 46 L 38 17 Z',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '3',
      'stroke-linejoin': 'round',
    }),
  );
  for (const x of [18, 24, 30]) {
    svg.append(
      node('path', {
        d: `M ${x} 23 L ${x} 43`,
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        opacity: '0.45',
      }),
    );
  }
  svg.append(lid);
  return svg;
}

/** A vent, which is also a tone hole. Six of these are a clarinet if you squint, and she will. */
export function vent(size = 54): SVGSVGElement {
  const svg = frame('0 0 60 60', 'k-vent', size);
  svg.append(
    node('circle', {
      cx: '30',
      cy: '30',
      r: '22',
      stroke: 'currentColor',
      'stroke-width': '3',
      opacity: '0.55',
    }),
  );
  svg.append(
    node('circle', { cx: '30', cy: '30', r: '13', class: 'k-vent-hole', fill: '#11141b' }),
  );
  svg.append(
    node('circle', {
      cx: '30',
      cy: '30',
      r: '13',
      class: 'k-vent-pad',
      fill: 'currentColor',
      opacity: '0',
    }),
  );
  return svg;
}
