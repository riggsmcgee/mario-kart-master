/**
 * Beat 6 — the ledger. (4e4)
 *
 * She is in. Nine chapters, all locked, and the site's own progress bar on the wall above them
 * reading **0 / 9**. The bar has a handle. The handle can be dragged.
 *
 * This is the purest version of the grammar the whole experience runs on — take a readout, a thing
 * whose entire job is to *report*, and give it instructions instead. It is also the one gag here
 * that is about this specific website rather than about websites generally: that bar is real, it is
 * in the header of every page her mum will see, and it has spent two months honestly counting
 * something difficult. Kayla fills it in by hand in four seconds.
 *
 * **And then the beat turns, which is what it is really for.** Nine padlocks spring, she opens a
 * chapter, and what is inside is not a reward. It is a sentence written to somebody else. She opens
 * another one and it is the same. This is the hinge of the whole thing: up to here she has been
 * breaking into a website, and this is the moment she finds out what is inside it, which is her mum
 * being taught something, patiently, one chapter at a time, by somebody who wanted her to have a
 * chance.
 *
 * Nothing is said about that. The narrator names the fact and stops — three lines, no speech. The
 * single most likely way to lose a fifteen-year-old is to explain the feeling to her.
 */

import { CHAPTERS } from '../../../data/chapters';
import { el } from '../../dom';
import { padlock } from '../art';
import { deferred, type Beat, type Stage } from '../stage';

/**
 * How many she has to open before the beat moves on. Enough to see the pattern, not enough to drag.
 *
 * Two, down from three. The pattern *is* the second one — the first tile is a chapter, the second
 * tile is a rule — and a third only confirms something she already knows while the narrator runs out
 * of ways to say "hers".
 */
const ENOUGH = 2;

/** What the narrator says as she opens them, in order. It runs out of things to say on purpose. */
const ON_OPEN = [
  ['That one is hers.'],
  [
    'That one is also hers. They are all hers.',
    'Nine chapters, and every one of them is addressed to somebody who is not you.',
  ],
];

export const ledger: Beat = {
  id: 'ledger',
  title: '6 — The ledger',

  async run(stage: Stage): Promise<void> {
    const { narrator, scene } = stage;

    scene.replaceChildren();
    narrator.mood(null);

    // --- the bar -------------------------------------------------------------

    const fill = el('span', { class: 'k-bar-fill' });
    const handle = el('span', {
      class: 'k-bar-handle',
      attrs: {
        role: 'slider',
        tabindex: '0',
        'aria-label': 'Chapters completed',
        'aria-valuemin': '0',
        'aria-valuemax': String(CHAPTERS.length),
        'aria-valuenow': '0',
      },
    });
    const track = el('span', { class: 'k-bar-track' }, fill, handle);
    const count = el('span', { class: 'k-bar-count' }, `0 / ${CHAPTERS.length}`);
    const bar = el('div', { class: 'k-bar' }, track, count);

    // --- the chapters --------------------------------------------------------

    /**
     * Resolved once she has read enough of them. Declared up here with the tiles, because the click
     * handler goes on at construction and not after the speech that introduces it.
     *
     * That ordering is the single most repeated mistake in this whole build — four separate beats
     * were written with their interactions wired after an `await narrator.say(...)`, and every one
     * of them produced the same symptom: an object that is plainly finished, plainly clickable, and
     * inert for the eight seconds she is most likely to try it. A tile that is unlocked is
     * clickable. The `disabled` flag is the only thing allowed to say otherwise.
     */
    const read = deferred();
    let opened = 0;

    const tiles = CHAPTERS.map((chapter, index) => {
      const lock = padlock(28);
      const body = el('p', { class: 'k-tile-hook' });
      const tile = el(
        'button',
        {
          class: 'k-tile',
          type: 'button',
          attrs: { 'aria-label': `Chapter ${index}, locked`, disabled: 'true' },
        },
        el('span', { class: 'k-tile-no' }, String(index)),
        el('span', { class: 'k-tile-lock' }, lock),
        body,
      );
      tile.disabled = true;

      const onOpen = (): void => {
        if (tile.classList.contains('k-tile-read')) return;
        tile.classList.add('k-tile-read');
        // The chapter's real hook, with her name in it exactly as her mum will read it.
        body.textContent = chapter.hook.replace(/\{rival\}/g, 'Kayla');
        stage.reed.note(349.23, { ms: 200, chalumeau: true });
        narrator.poke();

        const lines = ON_OPEN[Math.min(opened, ON_OPEN.length - 1)];
        opened += 1;
        if (lines) void narrator.cut(...lines);
        if (opened >= ENOUGH) {
          narrator.hush();
          stage.after(1800, read.resolve);
        }
      };
      tile.addEventListener('click', onOpen);
      stage.keep(() => tile.removeEventListener('click', onOpen));

      return { chapter, tile, lock, body };
    });

    const grid = el('div', { class: 'k-grid' }, ...tiles.map((t) => t.tile));
    scene.append(el('div', { class: 'k-panel k-ledger' }, bar, grid));

    void narrator.say(
      'Nine chapters. All locked.',
      'The bar above them is a readout. It reports how many are finished. It does not take requests.',
    );

    narrator.nudge(
      'It is a readout. It reads out. That is the whole of what it does.',
      'There is a handle on the end of it. I would not read anything into that.',
      'Drag the end of the bar. To the right. Yes, I know.',
    );

    // --- filling it in by hand ----------------------------------------------

    const filled = deferred();
    let done = 0;
    let dragging = false;
    let scolded = false;

    function setDone(next: number): void {
      const clamped = Math.max(0, Math.min(CHAPTERS.length, next));
      if (clamped === done) return;
      const rising = clamped > done;
      done = clamped;

      fill.style.width = `${((done / CHAPTERS.length) * 100).toFixed(1)}%`;
      count.textContent = `${done} / ${CHAPTERS.length}`;
      handle.style.left = `${((done / CHAPTERS.length) * 100).toFixed(1)}%`;
      handle.setAttribute('aria-valuenow', String(done));
      narrator.poke();

      // Each whole chapter that goes past pops its padlock. The reward is continuous, which is what
      // makes dragging it feel like doing something rather than setting a value.
      tiles.forEach((entry, index) => {
        const open = index < done;
        entry.tile.classList.toggle('k-tile-open', open);
        entry.tile.disabled = !open;
        entry.tile.setAttribute('aria-label', `Chapter ${index}, ${open ? 'unlocked' : 'locked'}`);
      });

      if (rising) stage.reed.note(261.63 + done * 26, { ms: 130, gain: 0.05 });

      if (done >= 3 && !scolded) {
        scolded = true;
        void narrator.cut('You have not done any of them.');
      }

      if (done >= CHAPTERS.length) filled.resolve();
    }

    function fromX(clientX: number): void {
      const box = track.getBoundingClientRect();
      const ratio = (clientX - box.left) / box.width;
      setDone(Math.round(ratio * CHAPTERS.length));
    }

    /**
     * **The whole track takes the press, not just the handle.**
     *
     * Two reasons, and the second is the one that mattered. It is how every slider on the web
     * behaves, so grabbing an inch to the left of the knob does the obvious thing rather than
     * nothing. And a press that lands on the track used to hit no handler at all, so nothing called
     * `preventDefault` and the browser started a text selection instead — which then dragged a blue
     * smear across the page, the narrator strip and the bin as she pulled the bar to the right. A
     * near-miss on a control should not look like the page breaking.
     */
    const onDown = (event: PointerEvent): void => {
      dragging = true;
      track.setPointerCapture(event.pointerId);
      fromX(event.clientX);
      event.preventDefault();
    };
    const onMove = (event: PointerEvent): void => {
      if (dragging) fromX(event.clientX);
    };
    const onUp = (): void => {
      dragging = false;
    };
    const onKey = (event: KeyboardEvent): void => {
      const delta =
        event.key === 'ArrowRight' || event.key === 'ArrowUp'
          ? 1
          : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
            ? -1
            : 0;
      if (delta === 0) return;
      event.preventDefault();
      setDone(done + delta);
    };

    track.addEventListener('pointerdown', onDown);
    track.addEventListener('pointermove', onMove);
    track.addEventListener('pointerup', onUp);
    track.addEventListener('pointercancel', onUp);
    // Keyboard stays on the handle, because the handle is the thing that takes focus.
    handle.addEventListener('keydown', onKey);
    stage.keep(() => {
      track.removeEventListener('pointerdown', onDown);
      track.removeEventListener('pointermove', onMove);
      track.removeEventListener('pointerup', onUp);
      track.removeEventListener('pointercancel', onUp);
      handle.removeEventListener('keydown', onKey);
    });

    await filled.promise;
    narrator.hush();

    stage.reed.phrase([
      [392, 130],
      [523.25, 130],
      [659.25, 300],
    ]);

    // Not awaited: the nine tiles are already live, and she should be allowed to open one over the
    // top of the sentence telling her she may.
    void narrator.solved(
      'You have completed the course.',
      'You have not done the course. Both of those are true now and I have nowhere to put it.',
      'Open one, then. They are unlocked. That was the arrangement.',
    );

    // --- what is inside ------------------------------------------------------

    narrator.nudge('Any of them. They are all open.', 'Click a chapter. Any chapter.');

    await read.promise;
  },
};
