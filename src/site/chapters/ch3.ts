/**
 * Chapter 3: ramp tricks. (2b4)
 *
 * The easiest win in the whole course, and the reason it sits third: it is one button, it is
 * free, and there is no way to lose by trying. Everything in this chapter is arranged around
 * that last fact, because the belief that stops beginners pressing the button is not "I can't
 * time it" — it is a vague fear that a wrong press does something bad. It does not. A missed
 * trick is a normal jump, the exact jump she would have had by doing nothing. Say that plainly,
 * early, and the rest is practice.
 *
 * **Why the concept carries a drawing.** "Press at the lip, not the landing" is a statement about
 * a place, and prose is a poor tool for places — she would have to build the picture herself and
 * she has never seen a ramp from the side. One small side-on schematic does it in a glance and
 * costs nothing at runtime. It is built out of SVG nodes rather than markup, like everything else
 * here, and drawn from primitives so no art asset ever enters the repo (principle 5).
 *
 * **Why the drill counts only clean tricks and never subtracts.** The engine already knows how to
 * say "early" and "late" — see `TrackRun` in `engine/track.ts`, which was built to report the
 * *direction* of a miss precisely so a miss could teach something. This chapter therefore does no
 * judging of its own: it echoes the engine's verdict and adds one to the score for `got-it`. A
 * penalty for a bad press would contradict, inside thirty seconds, the one thing the concept
 * section just spent four paragraphs establishing.
 *
 * **Why six ramps and why there.** Six is the target, so a single flawless lap could finish it —
 * but three laps are allowed, which turns eighteen chances into a target of six and makes the
 * plan's "ends on a win" rule arithmetic rather than luck. The positions are hand-placed against
 * the circuit's actual geometry: three down the main straight, one on the U-turn's exit, two on
 * the run out of the chicane. Nothing sits in the hairpin (t 0.84–1) or the middle of the U-turn,
 * where a landing arrives mid-corner and the lesson becomes "recover from a bad landing" instead
 * of "press at the lip". The tightest gap between ramps is about thirty units of road, roughly
 * two and a half seconds at drill speed: long enough to land, settle, and see the next one coming.
 */

import type { FurnitureSpec } from '../../engine/track';
import { createKartDrill } from '../../ui/kart-drill';
import { el, frag, prose, rich } from '../dom';
import type { ChapterContent, ChapterContext, Mounted } from '../types';

/**
 * The ramps, and the coins that fill the gaps between them.
 *
 * `t` runs 0..1 by distance around the lap: 0–0.28 main straight, 0.28–0.58 the wide U-turn,
 * 0.58–0.84 back straight and chicane, 0.84–1 the tight hairpin. Coins deliberately live in the
 * two long ramp-free stretches, so the parts of the lap with nothing to press on still have
 * something to aim at, and so the coins never compete with a lip for her attention.
 */
const RAMP_LAYOUT: FurnitureSpec[] = [
  // Main straight. Three in a row, dead straight road, nothing else happening: the first one is
  // where she works out what "the lip" feels like, and the next two are where she checks.
  { kind: 'ramp', t: 0.04 },
  { kind: 'ramp', t: 0.13, offset: -3 },
  { kind: 'ramp', t: 0.23, offset: 3 },

  // Coins strung round the inside of the U-turn, which is the longest stretch with no ramp on it.
  { kind: 'coin', t: 0.34, offset: -5 },
  { kind: 'coin', t: 0.38, offset: -5 },
  { kind: 'coin', t: 0.42, offset: -5 },
  { kind: 'coin', t: 0.46, offset: -5 },

  // U-turn exit, once the road has straightened and before the back straight's chicane.
  { kind: 'ramp', t: 0.54, offset: -2 },

  // Out of the chicane and down the run to the hairpin — the last two, with the road open again.
  { kind: 'ramp', t: 0.73, offset: -4 },
  { kind: 'ramp', t: 0.81, offset: 2 },

  // Coins on the inside of the hairpin, the other long ramp-free stretch.
  { kind: 'coin', t: 0.9, offset: -5 },
  { kind: 'coin', t: 0.93, offset: -5 },
  { kind: 'coin', t: 0.96, offset: -5 },
];

// --- the diagram -----------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * SVG nodes, built the same way the rest of the site builds HTML ones.
 *
 * Colours go through `style` rather than presentation attributes because they are theme tokens:
 * `var(--kerb)` resolves reliably in the style cascade and only patchily as a bare attribute, and
 * a diagram that silently loses its colours in one browser is worse than one drawn in flat grey.
 */
function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
  style?: Record<string, string>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (style) for (const [key, value] of Object.entries(style)) node.style.setProperty(key, value);
  return node;
}

function label(x: number, y: number, text: string, color: string, weight = '600'): SVGTextElement {
  const node = svgEl(
    'text',
    { x: String(x), y: String(y), 'text-anchor': 'middle' },
    { fill: color, 'font-family': 'var(--body)', 'font-size': '12px', 'font-weight': weight },
  );
  node.textContent = text;
  return node;
}

/**
 * One ramp, seen from the side, with the three moments marked.
 *
 * Side-on rather than the chase view she will actually be looking at, on purpose: from behind the
 * kart the lip is the moment the road stops, which is exactly the thing that is hard to see
 * coming. From the side it is obviously the top corner of a wedge, and once she has that shape in
 * her head she can find it from any angle.
 */
function rampDiagram(): SVGSVGElement {
  const svg = svgEl(
    'svg',
    { viewBox: '0 0 340 150', role: 'img' },
    { width: '100%', height: 'auto', display: 'block', 'max-width': '520px', margin: '0 auto' },
  );
  svg.setAttribute(
    'aria-label',
    'A ramp seen from the side. Pressing part-way up the ramp is too early, pressing on landing is too late, and pressing at the top corner of the ramp is right.',
  );

  // The window, drawn first so everything else sits on top of it. A stripe rather than a point:
  // the whole argument of this chapter is that the right moment has width.
  svg.append(
    svgEl(
      'rect',
      { x: '131', y: '56', width: '22', height: '56', rx: '8' },
      { fill: 'var(--turf)', opacity: '0.2' },
    ),
  );

  // Road.
  svg.append(
    svgEl(
      'rect',
      { x: '14', y: '104', width: '312', height: '6', rx: '3' },
      { fill: 'var(--track)' },
    ),
  );

  // The ramp itself: a wedge rising to the lip at x = 142.
  svg.append(svgEl('polygon', { points: '92,104 142,70 142,104' }, { fill: 'var(--boost)' }));

  // The flight. Dashed, because it is the bit she does not steer.
  svg.append(
    svgEl(
      'path',
      { d: 'M142 70 Q196 -20 250 104', 'stroke-dasharray': '6 6', 'stroke-linecap': 'round' },
      { fill: 'none', stroke: 'var(--ink-faint)', 'stroke-width': '2.5' },
    ),
  );

  // The kart at the top of its arc, upside down. The flip is the receipt, so the diagram shows it.
  svg.append(
    svgEl(
      'rect',
      {
        x: '-11',
        y: '-6',
        width: '22',
        height: '12',
        rx: '4',
        transform: 'translate(187 32) rotate(-160)',
      },
      { fill: 'var(--kerb)' },
    ),
  );
  svg.append(label(187, 12, 'the flip', 'var(--ink-soft)'));

  // Too early: part-way up the ramp face.
  svg.append(svgEl('circle', { cx: '110', cy: '92', r: '6' }, { fill: 'var(--kerb)' }));
  svg.append(
    svgEl(
      'line',
      { x1: '110', y1: '99', x2: '110', y2: '120' },
      { stroke: 'var(--rule)', 'stroke-width': '2' },
    ),
  );
  svg.append(label(110, 134, 'too early', 'var(--kerb)'));

  // The lip.
  svg.append(
    svgEl(
      'circle',
      { cx: '142', cy: '70', r: '8' },
      { fill: 'var(--turf)', stroke: '#ffffff', 'stroke-width': '3' },
    ),
  );
  svg.append(label(142, 46, 'press here', 'var(--turf)', '700'));

  // Too late: the landing.
  svg.append(svgEl('circle', { cx: '250', cy: '104', r: '6' }, { fill: 'var(--kerb)' }));
  svg.append(
    svgEl(
      'line',
      { x1: '250', y1: '111', x2: '250', y2: '120' },
      { stroke: 'var(--rule)', 'stroke-width': '2' },
    ),
  );
  svg.append(label(250, 134, 'too late', 'var(--kerb)'));

  return svg;
}

/** A number in the mono voice. Milliseconds turn up constantly in this course; they get a font. */
function ms(text: string): HTMLElement {
  return el('span', { class: 'ms' }, text);
}

const content: ChapterContent = {
  concept(ctx: ChapterContext): Node {
    return frag(
      prose([
        ctx.t(
          'Here is something the game never bothers to mention. Every ramp, every bump, every little jump on every track has a **free boost** sitting on top of it. It has been there the whole time. Most people drive over thousands of them and pick up nothing at all.',
        ),
        ctx.t(
          'Collecting it takes one button — the hop button, the shoulder button under your finger — pressed at the moment the kart reaches the **top** of the ramp. Not on the way up. Not when you land. At the lip: the last scrap of ramp before there is nothing underneath you.',
        ),
        ctx.t(
          'You will know instantly whether you got it, because **the kart does a flip.** A spin, a barrel roll, a bit of showing off in mid-air. That flourish is not decoration, it is the receipt. Flip means boost. No flip, no boost. You never have to wonder, and you never have to check a menu. And that is the whole of what the game means by a *trick* — this one press, landed. The kart does the acrobatics; you press a button.',
        ),
      ]),

      el(
        'div',
        { class: 'card', style: { marginTop: 'var(--gap-lg)', marginBottom: 'var(--gap-lg)' } },
        el('p', { class: 'eyebrow' }, ctx.t('Where the lip is')),
        rampDiagram(),
        el(
          'p',
          { style: { marginTop: '1rem', color: 'var(--ink-soft)', fontSize: 'var(--t-small)' } },
          rich(
            ctx.t(
              'Press on the way up and nothing happens. Press as you land and nothing happens. Press on that top corner and you land going faster than you took off.',
            ),
          ),
        ),
      ),

      el(
        'div',
        { class: 'prose' },
        el(
          'p',
          null,
          ctx.t('The green stripe is the window, and it is about '),
          ms('150 milliseconds'),
          ctx.t(' either side of the lip — so a little under '),
          ms('a third of a second'),
          ctx.t(
            ' wide in total. Written down like that it sounds impossible, and if you had to spot the ramp and then react to it, it would be.',
          ),
        ),
        el(
          'p',
          null,
          rich(
            ctx.t(
              'But you are not reacting to anything. The ramp does not leap out at you. It is in the same place on lap one, lap two and lap three, it was there last week and it will be there next Tuesday. **You are not reacting, you are arriving** — and being somewhere on time is a thing you have been doing since long before {rival} was born.',
            ),
          ),
        ),
        el(
          'p',
          null,
          rich(
            ctx.t(
              'And here is the part that should settle it. Getting the timing wrong costs you **nothing**. Not a wobble, not a slowdown, not a penalty. Press too early, press too late, press four times in a panic on the way over — the worst thing that can happen is an ordinary jump, exactly the jump you would have had by sitting on your hands. So there is no such thing as a ramp not worth trying on. Press the button every single time.',
            ),
          ),
        ),
      ),
    );
  },

  interactive(mount: HTMLElement, ctx: ChapterContext): Mounted {
    return createKartDrill({
      mount,
      sfx: ctx.sfx,
      layout: RAMP_LAYOUT,
      goal: ctx.t('Hop at the lip of every ramp.'),
      unit: 'tricks',
      target: 6,
      laps: 3,
      keys: ctx.t('Arrow keys to steer · Space to hop at the lip'),

      onTick(tick, api) {
        // The engine has already decided; this only reports it. Three outcomes, three words, one
        // of which is worth a point — and none of which costs one.
        //
        // A miss is reported in the neutral tone, not the red one. The concept section has just
        // promised her that a mistimed press costs nothing, and a red flash is the visual
        // language of a penalty: it would take the promise back before she had finished reading
        // it. The word already carries the direction, which is all she needs.
        switch (tick.events.trickCall) {
          case 'got-it':
            api.say(ctx.t('Nailed it'), 'good');
            ctx.sfx.play('right');
            api.add();
            break;
          case 'early':
            api.say(ctx.t('A touch early'));
            break;
          case 'late':
            api.say(ctx.t('A touch late'));
            break;
          default:
            break;
        }
      },

      onFinish(score) {
        ctx.finish({ score });
      },

      /**
       * Warm at every score, and the low end is the one that matters. A first-timer who lands one
       * has still learned the thing this chapter teaches — that the boost is there and it is hers
       * to take — and the honest coaching note is that keyboard timing is not the real skill
       * anyway. The Switch is where hands get trained. The browser only had to tell her it exists.
       */
      verdict(score) {
        if (score >= 6) {
          return {
            title: ctx.t('Six out of six.'),
            detail: ctx.t(
              'That is the whole chapter, cleared. You now know something about this game that people who have played it for years still do not: there is a boost on top of every ramp, and it belongs to whoever presses the button. Go and take every one of them off {rival}.',
            ),
          };
        }
        if (score >= 4) {
          return {
            title: ctx.t('That is the feel of it.'),
            detail: ctx.t(
              `You landed ${score}. The timing is in your hands now, and the rest is just repetition somewhere it counts — which is the Switch, not here. Take one track, press the button on every ramp for a few laps, and it stops being a decision.`,
            ),
          };
        }
        if (score >= 1) {
          return {
            title: ctx.t('Right, you have got one.'),
            detail: ctx.t(
              `${score} landed, and one landed is proof the window is real. Have another go if you fancy it — but honestly, this is the skill that gets learned on the Switch, with a controller in your hands and the same ramp coming round every lap. Nothing here can be lost by trying.`,
            ),
          };
        }
        return {
          title: ctx.t('The ramp is not going anywhere.'),
          detail: ctx.t(
            'Nothing lost — a missed trick is only a normal jump, which is what you would have had anyway. Give it another run, or take it straight to the Switch, which is where this one actually sinks in: same ramp, every single lap, until pressing the button stops being something you decide to do.',
          ),
        };
      },
    });
  },
};

export default content;
