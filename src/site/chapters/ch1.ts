/**
 * Chapter 1: the start boost. (2b2)
 *
 * First skill in the course because it is the only one that is *pure* preparation. It happens
 * before the lights go green, so there is nothing to react to and {rival}'s single advantage is
 * not in the room. If one chapter has to prove the whole thesis is real, it is this one, and it
 * gets three seconds per go to do it.
 *
 * **The auto-accelerate card is gone.** (Riggs, 2026-08-12.) It was a whole card explaining that
 * the boost still works with auto-accelerate switched on — written to answer an objection she was
 * assumed to be about to raise. She is not going to raise it: as Riggs put it, she probably does
 * not know the game *can* be played without auto-accelerate, so the card was teaching her that a
 * setting exists in order to reassure her about it. That is a net loss, and it happened more than
 * once across the course. The rule now is that auto-accelerate is simply never mentioned.
 *
 * **Five goes, then it stops on its own.** Fixed-length rather than "keep going until you get
 * three" — a drill that will not let you leave until you succeed is a test, and the plan is
 * explicit that nothing here marks her. Five is also what the star rule in `chapters.ts` counts
 * ("good starts out of 5"), so the number lives there and this file follows it.
 *
 * **She starts each go herself.** (Riggs, 2026-08-12, from Katharine's run: the instructions after
 * a failed attempt "went too quickly".) The five goes used to run back to back on a 1.7-second
 * timer, which meant the verdict — the one sentence saying whether she was early or late, and the
 * entire reason this drill exists rather than a paragraph — was replaced before it had been read.
 * Now the result stays up until she asks for the next one; see {@link CountdownDrill.arm}. It also
 * removes the last timer from this file, so the drill has no clock of its own at all beyond the
 * countdown itself.
 *
 * **The window is left exactly as the component ships it.** Tuning the countdown belongs to gate
 * 1c2 and to one config object; a chapter that quietly widened its own window would make the
 * signed-off numbers a lie everywhere else.
 *
 * **The keyboard is borrowed per run and handed straight back.** `Input` must preventDefault on
 * Space, or the page scrolls out from under her every countdown — but while it is alive that same
 * preventDefault stops Space activating a button, which for a keyboard-only reader would silently
 * make "Go again" unreachable. So the input layer exists for exactly the five countdowns and is
 * disposed the moment the run ends.
 *
 * **The countdown was built on the testbed (1c1)** and styles itself with the lab's variable
 * names, which do not exist in the site theme. Editing shared CSS mid-build to fix three names is
 * a worse trade than re-pointing them at theme tokens on the one card it mounts into.
 */

import { Input, keyLabel, loadBindings } from '../../engine/input';
import { COUNTDOWN_CONFIG, CountdownDrill } from '../../ui/countdown-drill';
import type { CountdownGrade, CountdownResult } from '../../ui/countdown-drill';
import { el, prose, rich } from '../dom';
import type { ChapterContent, ChapterContext, Mounted } from '../types';
import '../../ui/countdown.css';

/** Matches the star rule in `chapters.ts`: two stars at 3, three at 4. */
const ATTEMPTS = 5;

/** The lab's three variable names, pointed at theme tokens for the length of one card. */
const THEME_BRIDGE = '--line: var(--rule); --muted: var(--ink-soft); --fg: var(--ink);';

const GRADE_LABELS: Record<CountdownGrade, string> = {
  perfect: 'Perfect start',
  boost: 'Boost!',
  early: 'Too early',
  late: 'Too late',
  released: 'Let go too soon',
  none: 'Never pressed',
};

/** Whatever the accelerate slot is actually bound to, so the copy cannot go stale on a rebind. */
function acceleratorKey(): string {
  return keyLabel(loadBindings().accelerate[0] ?? 'Space');
}

function proseFor(ctx: ChapterContext, lines: string[]): HTMLDivElement {
  return prose(lines.map((line) => ctx.t(line)));
}

function verdictFor(good: number): string {
  if (good >= ATTEMPTS) {
    return 'Five out of five. There is nothing left for this chapter to tell you — go and do it in a real race, today, before it wears off.';
  }
  if (good === 4) return 'Four out of five. That is a habit forming, not a fluke.';
  if (good === 3) return 'Three out of five — which is three more boosts than {rival} is getting.';
  if (good === 2)
    return 'Two out of five, and both of those were free speed you did not have this morning.';
  if (good === 1) {
    return 'One. It usually clicks somewhere around the tenth go, and then it never leaves again.';
  }
  return 'None yet — and the moment is earlier than it feels. Hold as the **2** vanishes, not when GO appears.';
}

function formatError(errorMs: number): string {
  return `${errorMs > 0 ? '+' : ''}${errorMs.toFixed(0)} ms`;
}

const content: ChapterContent = {
  concept(ctx) {
    const key = acceleratorKey();

    return el(
      'div',
      { class: 'stack' },

      proseFor(ctx, [
        'Every race opens the same way: three, two, one, GO. Everybody watches the GO. By then it is already over.',
        'The moment that matters is the **2**. As it disappears — not before it, not after it — you hold the accelerator down and you keep holding it. The lights go green and your kart leaves the line with a boost nobody else on the grid has got.',
      ]),

      proseFor(ctx, [
        'Get it wrong and nothing happens. You start normally — the start you were getting anyway. No penalty, no spin. So there is no reason not to try it every single race.',
        'Which is why it is first. It happens before the race exists, so there is nothing to react to and nothing for {rival} to be quicker at. It is purely a thing you know and she does not.',
      ]),

      el('p', null, ctx.t('In here, hold '), el('kbd', null, key), ctx.t(' on the 2.')),
    );
  },

  interactive(mount, ctx): Mounted {
    const key = acceleratorKey();
    const config = { ...COUNTDOWN_CONFIG };

    let input: Input | null = null;
    let drill: CountdownDrill | null = null;
    let attempt = 0;
    let good = 0;

    const stage = el('div', { class: 'card', attrs: { style: THEME_BRIDGE } });
    const status = el(
      'p',
      { class: 'eyebrow', attrs: { 'aria-live': 'polite' }, style: { margin: '0' } },
      ctx.t('Five goes. Not started yet.'),
    );
    const list = el('ol', { style: { margin: '0', paddingLeft: '1.4em' } });
    const footer = el('div', { class: 'stack' });
    const root = el('div', { class: 'stack' }, stage, status, list, footer);

    const rows: HTMLLIElement[] = [];

    /** Stop the machinery without touching the DOM: the last verdict stays on screen to read. */
    function releaseRun(): void {
      drill?.dispose();
      drill = null;
      input?.dispose();
      input = null;
    }

    function buildRows(): void {
      rows.length = 0;
      for (let i = 0; i < ATTEMPTS; i++) {
        rows.push(el('li', { style: { color: 'var(--ink-faint)', marginBottom: '0.3em' } }, '—'));
      }
      list.replaceChildren(...rows);
    }

    function fillRow(index: number, result: CountdownResult, isGood: boolean): void {
      const row = rows[index];
      if (!row) return;
      row.style.color = isGood ? 'var(--turf)' : 'var(--ink-soft)';

      const parts: Array<Node | string> = [el('strong', null, GRADE_LABELS[result.grade])];
      if (result.errorMs !== null) {
        parts.push(
          ' ',
          el(
            'span',
            { class: 'ms', style: { color: 'var(--ink-faint)' } },
            formatError(result.errorMs),
          ),
        );
      }
      row.replaceChildren(...parts);
    }

    function record(result: CountdownResult): void {
      const index = attempt;
      attempt++;

      const isGood = result.grade === 'perfect' || result.grade === 'boost';
      if (isGood) {
        good++;
        ctx.sfx.play('right');
      }
      fillRow(index, result, isGood);

      if (attempt < ATTEMPTS) {
        status.textContent = ctx.t(`Attempt ${attempt + 1} of ${ATTEMPTS}`);
        drill?.arm(ctx.t(`Press ${key} when you are ready`));
        return;
      }

      status.textContent = ctx.t(`${good} good starts out of ${ATTEMPTS}`);
      // Out of the drill's own tick: `endRun` disposes the loop that is currently calling this.
      queueMicrotask(endRun);
    }

    function endRun(): void {
      releaseRun();

      const again = el('button', { class: 'btn', type: 'button' }, ctx.t('Go again'));
      again.addEventListener('click', startRun);
      footer.replaceChildren(
        el('p', { style: { margin: '0' } }, rich(ctx.t(verdictFor(good)))),
        again,
      );

      ctx.finish({ score: good });
    }

    function startRun(): void {
      releaseRun();

      attempt = 0;
      good = 0;
      footer.replaceChildren();
      buildRows();
      stage.replaceChildren();

      input = new Input();
      drill = new CountdownDrill({ mount: stage, input, config, onResult: record });
      status.textContent = ctx.t(`Attempt 1 of ${ATTEMPTS}`);
      drill.start();
    }

    function showIdle(): void {
      const start = el(
        'button',
        { class: 'btn btn-go', type: 'button' },
        ctx.t('Start the countdown'),
      );
      start.addEventListener('click', startRun);

      stage.replaceChildren(
        el(
          'div',
          {
            style: { display: 'grid', justifyItems: 'center', gap: '0.8rem', textAlign: 'center' },
          },
          el('h3', null, ctx.t('Five starts. That is the whole chapter.')),
          el(
            'p',
            { style: { color: 'var(--ink-soft)', maxWidth: '30ch', margin: '0' } },
            ctx.t('Hold '),
            el('kbd', null, key),
            ctx.t(
              ' as the 2 disappears, and keep holding it through GO. Let go afterwards — each start needs a fresh press.',
            ),
          ),
          start,
        ),
      );
    }

    buildRows();
    showIdle();
    mount.replaceChildren(root);

    return {
      dispose() {
        releaseRun();
        root.remove();
      },
    };
  },
};

export default content;
