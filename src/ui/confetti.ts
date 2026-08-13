/**
 * Confetti, for three stars only. (3b1)
 *
 * The plan lists this next to the done-stamp thunk as a micro-animation, and the restriction is
 * the whole design: three stars is the best thing that can happen in a chapter, and it is the only
 * thing that gets this. Confetti on every completion would say "well done" so often it stopped
 * meaning it — the stamp already covers *finished*, and finished is the common case.
 *
 * **It bursts from wherever the stars are**, not from the top of the window, so the celebration
 * points at the thing being celebrated. The caller passes the element it should come out of.
 *
 * **Nothing here carries information.** Every piece is `aria-hidden`, the stars and the score are
 * already on the page in text, and the whole run can be switched off — for reduced motion, or by a
 * browser without the Web Animations API — with nothing lost but the flourish. Same rule as the
 * rest of the site's motion.
 *
 * The pieces clean themselves up. Each one removes its own node when its animation finishes, and
 * the container goes with the last of them, so a chapter replayed twenty times leaves twenty
 * nothings behind rather than six hundred divs.
 */

/** Theme colours, and only theme colours. A confetti palette of its own would look imported. */
const COLOURS = [
  'var(--trim)',
  'var(--boost)',
  'var(--kerb)',
  'var(--box)',
  'var(--turf)',
] as const;

const PIECES = 30;

/** Roughly a second. Long enough to read as a burst, short enough not to be in the way. */
const MS = 1100;

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Fire a burst centred on `origin`.
 *
 * Safe to call when nothing can happen: no Web Animations API, reduced motion, or an origin that
 * is not on screen all return quietly. Callers do not have to check first, because a celebration
 * that throws is worse than one that does not arrive.
 */
export function celebrate(origin: Element): void {
  if (reducedMotion()) return;
  if (typeof Element.prototype.animate !== 'function') return;

  const box = origin.getBoundingClientRect();
  if (box.width === 0 && box.height === 0) return;

  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;

  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);

  let alive = PIECES;
  const retire = (): void => {
    alive -= 1;
    if (alive <= 0) layer.remove();
  };

  for (let i = 0; i < PIECES; i++) {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.background = COLOURS[i % COLOURS.length] ?? 'var(--trim)';

    // Fan upward and outward: a full circle would send half the pieces straight into the floor,
    // which reads as a leak rather than a burst. Angles run from about 200° to 340°, so the spray
    // is up and to both sides.
    const angle = (200 + Math.random() * 140) * (Math.PI / 180);
    const distance = 90 + Math.random() * 150;
    const driftX = Math.cos(angle) * distance;
    const liftY = Math.sin(angle) * distance;
    // Every piece ends up below where it started. Gravity is the thing that makes it confetti
    // rather than fireworks.
    const fallY = liftY + 190 + Math.random() * 120;
    const spin = (Math.random() * 2 - 1) * 540;

    const animation = piece.animate(
      [
        { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${driftX.toFixed(1)}px), calc(-50% + ${liftY.toFixed(1)}px)) rotate(${(spin / 2).toFixed(0)}deg)`,
          opacity: 1,
          offset: 0.35,
        },
        {
          transform: `translate(calc(-50% + ${(driftX * 1.25).toFixed(1)}px), calc(-50% + ${fallY.toFixed(1)}px)) rotate(${spin.toFixed(0)}deg)`,
          opacity: 0,
        },
      ],
      {
        duration: MS + Math.random() * 500,
        easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)',
        fill: 'forwards',
      },
    );

    animation.addEventListener('finish', retire);
    // A tab hidden mid-burst can leave `finish` unfired. `cancel` fires instead, so the layer
    // still goes.
    animation.addEventListener('cancel', retire);

    layer.append(piece);
  }
}
