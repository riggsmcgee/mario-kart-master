import '../../ui/testbed.css';
import '../../ui/proto.css';
import { installErrorBanner } from '../../ui/error-banner';
import { Input, SLOTS, SLOT_LABELS, keyLabel, type Slot } from '../../engine/input';

installErrorBanner();

/**
 * Input readout harness. (1a2)
 *
 * Drives the input layer from requestAnimationFrame for now; step 1a3 replaces this with the
 * fixed-timestep loop. `sample()` is called once per tick either way, which is the contract
 * that matters.
 */

const input = new Input({ recordHistory: true, historyLimit: 14 });

/** How long a press or release stays highlighted, in ms. Purely so the eye can catch it. */
const EDGE_FLASH_MS = 220;

interface Row {
  tr: HTMLTableRowElement;
  keys: HTMLTableCellElement;
  led: HTMLSpanElement;
  stateText: HTMLSpanElement;
  held: HTMLTableCellElement;
  edges: HTMLTableCellElement;
  presses: number;
  releases: number;
  lastEdgeAt: number;
}

const rows = new Map<Slot, Row>();

function buildRows(): void {
  const body = document.querySelector<HTMLTableSectionElement>('#slots');
  if (!body) return;

  for (const slot of SLOTS) {
    const tr = document.createElement('tr');

    const name = document.createElement('td');
    name.textContent = SLOT_LABELS[slot];

    const keys = document.createElement('td');

    const state = document.createElement('td');
    const led = document.createElement('span');
    led.className = 'led';
    const stateText = document.createElement('span');
    stateText.className = 'num';
    stateText.textContent = 'up';
    state.append(led, stateText);

    const held = document.createElement('td');
    held.className = 'num';
    held.textContent = '—';

    const edges = document.createElement('td');
    edges.className = 'num';
    edges.textContent = '0 / 0';

    tr.append(name, keys, state, held, edges);
    body.append(tr);

    rows.set(slot, {
      tr,
      keys,
      led,
      stateText,
      held,
      edges,
      presses: 0,
      releases: 0,
      lastEdgeAt: 0,
    });
    renderKeys(slot);
  }
}

/** Rebuild one slot's key chips. Called on load and after every rebind. */
function renderKeys(slot: Slot): void {
  const row = rows.get(slot);
  if (!row) return;

  const wrap = document.createElement('div');
  wrap.className = 'keys';
  const codes = input.getKeys(slot);

  codes.forEach((code, index) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.type = 'button';
    chip.textContent = keyLabel(code);
    chip.title = `${code} — click to rebind${codes.length > 1 ? ', shift-click to remove' : ''}`;
    chip.addEventListener('click', (event) => {
      if (event.shiftKey && codes.length > 1) {
        input.removeKey(slot, index);
        renderKeys(slot);
        renderConflicts();
        return;
      }
      void rebind(slot, index, chip);
    });
    wrap.append(chip);
  });

  const add = document.createElement('button');
  add.className = 'chip ghost';
  add.type = 'button';
  add.textContent = '+';
  add.title = 'Add another key for this action';
  add.addEventListener('click', () => void rebind(slot, codes.length, add));
  wrap.append(add);

  row.keys.replaceChildren(wrap);
}

async function rebind(slot: Slot, index: number, chip: HTMLButtonElement): Promise<void> {
  const previous = chip.textContent;
  chip.dataset.capturing = 'true';
  chip.textContent = 'press a key…';

  const code = await input.captureNextKey();

  chip.dataset.capturing = 'false';
  chip.textContent = previous;

  if (code === null) return; // Escape, or another capture took over.
  input.setKey(slot, index, code);
  renderKeys(slot);
  renderConflicts();
}

function renderConflicts(): void {
  const el = document.querySelector<HTMLParagraphElement>('#conflicts');
  if (!el) return;

  const conflicts = input.findConflicts();
  if (conflicts.length === 0) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = conflicts
    .map(
      (c) => `${keyLabel(c.code)} is bound to ${c.slots.map((s) => SLOT_LABELS[s]).join(' and ')}`,
    )
    .join(' · ');
}

let loggedCount = 0;
let loggedNewest = -1;

function renderLog(): void {
  const el = document.querySelector<HTMLOListElement>('#log');
  if (!el) return;

  // The log only changes on a key event; rebuilding it 60 times a second is pure churn.
  const newest = input.history[0]?.at ?? -1;
  if (newest === loggedNewest && input.history.length === loggedCount) return;
  loggedNewest = newest;
  loggedCount = input.history.length;

  el.replaceChildren(
    ...input.history.map((event) => {
      const li = document.createElement('li');
      li.className = event.type;
      const arrow = event.type === 'down' ? '▼' : '▲';
      li.textContent = `${event.at.toFixed(1).padStart(10)}  ${arrow} ${SLOT_LABELS[event.slot]} (${keyLabel(event.code)})`;
      return li;
    }),
  );
}

function renderAxis(): void {
  const fill = document.querySelector<HTMLDivElement>('#axis-fill');
  const value = document.querySelector<HTMLDivElement>('#axis-value');
  const steer = input.steer();

  if (value) value.textContent = steer > 0 ? `+${steer}` : `${steer}`;
  if (fill) {
    // Grow from the centre line toward whichever side is being held.
    fill.style.left = steer < 0 ? '0' : '50%';
    fill.style.width = steer === 0 ? '0' : '50%';
  }
}

function frame(): void {
  input.sample();
  const now = performance.now();

  for (const slot of SLOTS) {
    const row = rows.get(slot);
    if (!row) continue;

    if (input.justPressed(slot)) {
      row.presses++;
      row.lastEdgeAt = now;
    }
    if (input.justReleased(slot)) {
      row.releases++;
      row.lastEdgeAt = now;
    }

    const down = input.isDown(slot);
    row.led.dataset.on = String(down);
    row.stateText.textContent = down ? 'down' : 'up';
    row.held.textContent = down ? `${input.heldMs(slot, now).toFixed(0)} ms` : '—';
    row.edges.textContent = `${row.presses} / ${row.releases}`;
    row.tr.classList.toggle('live', down || now - row.lastEdgeAt < EDGE_FLASH_MS);
  }

  renderAxis();
  renderLog();
  requestAnimationFrame(frame);
}

buildRows();
renderConflicts();

document.querySelector<HTMLButtonElement>('#reset')?.addEventListener('click', () => {
  input.resetBindings();
  for (const slot of SLOTS) renderKeys(slot);
  renderConflicts();
});

requestAnimationFrame(frame);
