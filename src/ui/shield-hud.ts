/**
 * Shield Up's on-screen furniture. (1e1)
 *
 * All of it sits **over the canvas**, not under it. The threat arrives from behind, where there
 * is nothing to see, so the warning is the only thing telling you it exists — and a warning
 * printed in a panel below the picture trains you to look away from the road to find out whether
 * you are about to be hit. Peripheral and over the driving view, or it teaches the wrong habit.
 *
 * Two readouts and a verdict:
 *
 *  - the **warning**, top centre, with a bar that drains toward impact so "how long have I got"
 *    is a length rather than a number;
 *  - the **item chip**, bottom left, because "do I even have anything to raise" decides whether
 *    holding the key does anything at all;
 *  - the **verdict**, centre, for the moment it resolves.
 */

export type ItemState = 'ready' | 'up' | 'empty';

export type VerdictTone = 'good' | 'bad' | 'neutral';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * The incoming-item icon, as the real game does it: the thing that is about to hit you, drawn,
 * rather than the word for it. A picture is read at a glance and from the corner of the eye;
 * a line of text has to be looked at, and looking at it means not looking at the road.
 *
 * Original art — a red orb with a white band, the same shape the quiz diagrams use for a shell.
 */
function shellIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '-14 -14 28 28');
  svg.setAttribute('class', 'shield-shell');
  svg.setAttribute('aria-hidden', 'true');

  const orb = document.createElementNS(SVG_NS, 'circle');
  orb.setAttribute('r', '11');
  orb.setAttribute('fill', '#ff3b30');
  svg.append(orb);

  const band = document.createElementNS(SVG_NS, 'rect');
  band.setAttribute('x', '-11');
  band.setAttribute('y', '-2.5');
  band.setAttribute('width', '22');
  band.setAttribute('height', '5');
  band.setAttribute('fill', '#fdfdfd');
  svg.append(band);

  return svg;
}

export class ShieldHud {
  private readonly root: HTMLDivElement;
  private readonly warning: HTMLDivElement;
  private readonly bar: HTMLDivElement;
  private readonly chip: HTMLDivElement;
  private readonly verdict: HTMLDivElement;
  private readonly verdictTitle: HTMLDivElement;
  private readonly verdictDetail: HTMLDivElement;

  private verdictUntil = 0;

  constructor(mount: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'shield-hud';

    this.warning = document.createElement('div');
    this.warning.className = 'shield-warning';
    this.warning.hidden = true;
    // Announced, not just drawn: this is the one thing on screen that is time-critical.
    this.warning.setAttribute('role', 'alert');

    const icon = shellIcon();

    const arrow = document.createElement('span');
    arrow.className = 'shield-arrow';
    arrow.textContent = '▼';
    arrow.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.textContent = 'INCOMING — BEHIND YOU';

    const track = document.createElement('div');
    track.className = 'shield-bar';
    this.bar = document.createElement('div');
    this.bar.className = 'shield-bar-fill';
    track.append(this.bar);

    const head = document.createElement('div');
    head.className = 'shield-warning-head';
    head.append(icon, text, arrow);
    this.warning.append(head, track);

    this.chip = document.createElement('div');
    this.chip.className = 'shield-chip';

    this.verdict = document.createElement('div');
    this.verdict.className = 'shield-verdict';
    this.verdict.hidden = true;
    this.verdictTitle = document.createElement('div');
    this.verdictTitle.className = 'shield-verdict-title';
    this.verdictDetail = document.createElement('div');
    this.verdictDetail.className = 'shield-verdict-detail';
    this.verdict.append(this.verdictTitle, this.verdictDetail);

    this.root.append(this.warning, this.chip, this.verdict);
    mount.append(this.root);
  }

  dispose(): void {
    this.root.remove();
  }

  /** `progress` runs 0 at the siren to 1 at impact. Null hides the warning. */
  setWarning(progress: number | null): void {
    this.warning.hidden = progress === null;
    if (progress === null) return;
    this.bar.style.width = `${Math.max(0, (1 - progress) * 100).toFixed(1)}%`;
    // Urgency by blink rate rather than by size: a banner that grows would cover the road at
    // exactly the moment you most need to see it.
    this.warning.dataset.urgent = String(progress > 0.55);
  }

  setItem(state: ItemState): void {
    this.chip.dataset.state = state;
    if (state === 'up') this.chip.textContent = '🍌 Banana out back';
    else if (state === 'ready') this.chip.textContent = '🍌 Banana ready — hold Shift';
    else this.chip.textContent = 'No item — drive through a box';
  }

  say(title: string, detail: string, tone: VerdictTone, ms = 1800): void {
    this.verdictTitle.textContent = title;
    this.verdictDetail.textContent = detail;
    this.verdict.dataset.tone = tone;
    this.verdict.hidden = false;
    this.verdictUntil = performance.now() + ms;
  }

  /** Call every frame; clears the verdict when its time is up. */
  update(now: number): void {
    if (!this.verdict.hidden && now > this.verdictUntil) this.verdict.hidden = true;
  }
}
