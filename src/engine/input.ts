/**
 * Keyboard input layer. (1a2)
 *
 * Three jobs:
 *  1. Map physical keys to named actions, rebindable and persisted.
 *  2. Survive a fixed-timestep sim. The browser fires key events whenever it likes; the sim
 *     asks for state on its own schedule. Events are queued and drained once per tick, so a
 *     tap that starts and ends between two ticks still registers.
 *  3. Never leave a key stuck down. Blur and tab-hide release everything.
 *
 * Bindings are on `KeyboardEvent.code` (physical position), not `.key` (the character
 * produced). "A" stays where A is regardless of layout, and modifiers do not change it.
 */

export type KeyCode = string;

/**
 * Input slots. `steer` is an axis, so it takes two slots — one per direction — which also
 * makes the rebinding UI a flat list.
 *
 * `accelerate` is not in the plan's action map (steer/hop/item/uiConfirm). Ch1's start-boost
 * drill needs a hold-the-accelerator input, so it exists here; see WORKLOG Q9. It shares Space
 * with `hop` on purpose: the countdown drill and the driving drills never run at the same time.
 */
export const SLOTS = ['steerLeft', 'steerRight', 'hop', 'item', 'accelerate', 'uiConfirm'] as const;

export type Slot = (typeof SLOTS)[number];

export type Bindings = Record<Slot, KeyCode[]>;

export const SLOT_LABELS: Record<Slot, string> = {
  steerLeft: 'Steer left',
  steerRight: 'Steer right',
  hop: 'Hop / trick',
  item: 'Item / shield',
  accelerate: 'Accelerate (Ch1 only)',
  uiConfirm: 'Confirm',
};

/** Defaults per the 2026-08-06 decision; the final choice belongs to gate 1g1. */
export const DEFAULT_BINDINGS: Bindings = {
  steerLeft: ['ArrowLeft', 'KeyA'],
  steerRight: ['ArrowRight', 'KeyD'],
  hop: ['Space'],
  item: ['ShiftLeft', 'ShiftRight'],
  accelerate: ['Space'],
  uiConfirm: ['Enter'],
};

/**
 * Overlaps that are fine because the two slots are never live on the same screen.
 * Anything else that collides is reported by {@link findConflicts}.
 */
const ALLOWED_OVERLAPS: ReadonlyArray<readonly [Slot, Slot]> = [['hop', 'accelerate']];

const STORAGE_KEY = 'mkm.bindings.v1';

interface SlotState {
  down: boolean;
  /** Timestamp of the current press, or null while up. Drives hold-duration reads. */
  pressedAt: number | null;
  /** Monotonic press counter. Higher means more recently pressed; resolves steer conflicts. */
  pressSeq: number;
  /** Edges seen since the last sample(), so fast taps between ticks are never dropped. */
  presses: number;
  releases: number;
}

interface QueuedEvent {
  slot: Slot;
  type: 'down' | 'up';
  at: number;
}

export interface InputEventRecord {
  slot: Slot;
  code: KeyCode;
  type: 'down' | 'up';
  at: number;
}

export interface InputOptions {
  /** Where to listen. Defaults to `window`. */
  target?: EventTarget;
  /** Skip localStorage; the testbed uses this to demo defaults without clobbering saved keys. */
  persist?: boolean;
  /** Keep a rolling log of raw events for the readout widget. Off by default. */
  recordHistory?: boolean;
  historyLimit?: number;
}

export class Input {
  private bindings: Bindings;
  private readonly state: Record<Slot, SlotState>;
  private readonly queue: QueuedEvent[] = [];
  private readonly target: EventTarget;
  private readonly persist: boolean;
  private readonly recordHistory: boolean;
  private readonly historyLimit: number;
  private seq = 0;
  private capturing: ((code: KeyCode | null) => void) | null = null;
  private disposed = false;

  /** Rolling raw-event log, newest first. Only populated when `recordHistory` is set. */
  readonly history: InputEventRecord[] = [];

  constructor(options: InputOptions = {}) {
    this.target = options.target ?? window;
    this.persist = options.persist ?? true;
    this.recordHistory = options.recordHistory ?? false;
    this.historyLimit = options.historyLimit ?? 12;
    this.bindings = this.persist ? loadBindings() : cloneBindings(DEFAULT_BINDINGS);
    this.state = Object.fromEntries(SLOTS.map((slot) => [slot, freshSlotState()])) as Record<
      Slot,
      SlotState
    >;

    this.target.addEventListener('keydown', this.onKeyDown as EventListener);
    this.target.addEventListener('keyup', this.onKeyUp as EventListener);
    window.addEventListener('blur', this.releaseAll);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  // --- lifecycle -----------------------------------------------------------

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.target.removeEventListener('keydown', this.onKeyDown as EventListener);
    this.target.removeEventListener('keyup', this.onKeyUp as EventListener);
    window.removeEventListener('blur', this.releaseAll);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  /**
   * Drain queued events into slot state. Call exactly once per sim tick, before reading
   * anything. Edge reads (`justPressed`/`justReleased`) describe the window since the
   * previous call.
   */
  sample(): void {
    for (const slot of SLOTS) {
      const s = this.state[slot];
      s.presses = 0;
      s.releases = 0;
    }

    for (const event of this.queue) {
      const s = this.state[event.slot];
      if (event.type === 'down') {
        // A key already held cannot press again; browsers repeat, hardware does not.
        if (s.down) continue;
        s.down = true;
        s.pressedAt = event.at;
        s.pressSeq = ++this.seq;
        s.presses++;
      } else {
        if (!s.down) continue;
        s.down = false;
        s.pressedAt = null;
        s.releases++;
      }
    }
    this.queue.length = 0;
  }

  // --- reads ---------------------------------------------------------------

  isDown(slot: Slot): boolean {
    return this.state[slot].down;
  }

  justPressed(slot: Slot): boolean {
    return this.state[slot].presses > 0;
  }

  justReleased(slot: Slot): boolean {
    return this.state[slot].releases > 0;
  }

  /** Timestamp of the current press, or null if up. Used for trick and start-boost timing. */
  pressedAt(slot: Slot): number | null {
    return this.state[slot].pressedAt;
  }

  /** How long the key has been held, in ms. 0 if up. Drives hold-to-shield (1e). */
  heldMs(slot: Slot, now: number = performance.now()): number {
    const at = this.state[slot].pressedAt;
    return at === null ? 0 : Math.max(0, now - at);
  }

  /**
   * Steering axis: -1 left, +1 right, 0 neutral.
   *
   * Both directions held resolves to the most recently pressed rather than cancelling out.
   * Cancelling reads as the kart ignoring you mid-correction; last-press-wins is what
   * players expect and what every kart game does. Smoothing this digital value into an
   * analog-feeling turn is the physics layer's job (1b1), not this one's.
   */
  steer(): -1 | 0 | 1 {
    const left = this.state.steerLeft;
    const right = this.state.steerRight;
    if (left.down && right.down) return left.pressSeq > right.pressSeq ? -1 : 1;
    if (left.down) return -1;
    if (right.down) return 1;
    return 0;
  }

  // --- bindings ------------------------------------------------------------

  getBindings(): Bindings {
    return cloneBindings(this.bindings);
  }

  getKeys(slot: Slot): readonly KeyCode[] {
    return this.bindings[slot];
  }

  /** Replace the key at `index` for a slot (or append when index is past the end). */
  setKey(slot: Slot, index: number, code: KeyCode): void {
    const keys = [...this.bindings[slot]];
    if (index >= 0 && index < keys.length) keys[index] = code;
    else keys.push(code);
    this.bindings = { ...this.bindings, [slot]: dedupe(keys) };
    this.afterBindingChange(slot);
  }

  removeKey(slot: Slot, index: number): void {
    const keys = this.bindings[slot].filter((_, i) => i !== index);
    this.bindings = { ...this.bindings, [slot]: keys };
    this.afterBindingChange(slot);
  }

  resetBindings(): void {
    this.bindings = cloneBindings(DEFAULT_BINDINGS);
    this.releaseAll();
    if (this.persist) saveBindings(this.bindings);
  }

  /**
   * Wait for the next key press and return its code. Escape cancels and resolves null.
   * Normal input handling is suspended while capturing, so rebinding cannot also drive
   * the kart.
   */
  captureNextKey(): Promise<KeyCode | null> {
    this.cancelCapture();
    this.releaseAll();
    return new Promise((resolve) => {
      this.capturing = resolve;
    });
  }

  isCapturing(): boolean {
    return this.capturing !== null;
  }

  cancelCapture(): void {
    const pending = this.capturing;
    this.capturing = null;
    pending?.(null);
  }

  /** Same key on two slots that can be live together. Empty when the map is clean. */
  findConflicts(): Array<{ code: KeyCode; slots: Slot[] }> {
    const byCode = new Map<KeyCode, Slot[]>();
    for (const slot of SLOTS) {
      for (const code of this.bindings[slot]) {
        const slots = byCode.get(code);
        if (slots) slots.push(slot);
        else byCode.set(code, [slot]);
      }
    }

    const conflicts: Array<{ code: KeyCode; slots: Slot[] }> = [];
    for (const [code, slots] of byCode) {
      if (slots.length < 2) continue;
      const allowed =
        slots.length === 2 &&
        ALLOWED_OVERLAPS.some(
          ([a, b]) => (slots[0] === a && slots[1] === b) || (slots[0] === b && slots[1] === a),
        );
      if (!allowed) conflicts.push({ code, slots });
    }
    return conflicts;
  }

  // --- internals -----------------------------------------------------------

  private afterBindingChange(slot: Slot): void {
    // A rebound key may be physically down under its old meaning; clear it.
    const s = this.state[slot];
    s.down = false;
    s.pressedAt = null;
    if (this.persist) saveBindings(this.bindings);
  }

  private slotsFor(code: KeyCode): Slot[] {
    return SLOTS.filter((slot) => this.bindings[slot].includes(code));
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.capturing) {
      event.preventDefault();
      const resolve = this.capturing;
      this.capturing = null;
      resolve(event.code === 'Escape' ? null : event.code);
      return;
    }

    const slots = this.slotsFor(event.code);
    if (slots.length === 0) return;

    // Space scrolls, arrows scroll, Enter submits. Bound keys belong to the game.
    event.preventDefault();
    if (event.repeat) return;

    const at = performance.now();
    for (const slot of slots) this.queue.push({ slot, type: 'down', at });
    this.record(slots, event.code, 'down', at);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    const slots = this.slotsFor(event.code);
    if (slots.length === 0) return;
    event.preventDefault();

    const at = performance.now();
    for (const slot of slots) this.queue.push({ slot, type: 'up', at });
    this.record(slots, event.code, 'up', at);
  };

  private onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') this.releaseAll();
  };

  /**
   * Queue a release for everything currently held. Called on blur and tab-hide: the browser
   * does not deliver keyup for a key released while the page is unfocused, so without this a
   * key stays down forever and the kart drives itself into a wall.
   */
  private releaseAll = (): void => {
    const at = performance.now();
    for (const slot of SLOTS) {
      if (this.state[slot].down) this.queue.push({ slot, type: 'up', at });
    }
    this.cancelCapture();
  };

  private record(slots: Slot[], code: KeyCode, type: 'down' | 'up', at: number): void {
    if (!this.recordHistory) return;
    for (const slot of slots) this.history.unshift({ slot, code, type, at });
    if (this.history.length > this.historyLimit) this.history.length = this.historyLimit;
  }
}

// --- helpers ---------------------------------------------------------------

function freshSlotState(): SlotState {
  return { down: false, pressedAt: null, pressSeq: 0, presses: 0, releases: 0 };
}

function cloneBindings(bindings: Bindings): Bindings {
  return Object.fromEntries(SLOTS.map((slot) => [slot, [...bindings[slot]]])) as Bindings;
}

function dedupe(codes: KeyCode[]): KeyCode[] {
  return [...new Set(codes)];
}

export function loadBindings(): Bindings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneBindings(DEFAULT_BINDINGS);
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return cloneBindings(DEFAULT_BINDINGS);

    // Merge rather than trust: a saved file from an older build may be missing slots.
    const stored = parsed as Partial<Record<Slot, unknown>>;
    const merged = cloneBindings(DEFAULT_BINDINGS);
    for (const slot of SLOTS) {
      const value = stored[slot];
      if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
        merged[slot] = dedupe(value);
      }
    }
    return merged;
  } catch {
    return cloneBindings(DEFAULT_BINDINGS);
  }
}

export function saveBindings(bindings: Bindings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Private browsing or a full quota. Bindings stay for this session only; not worth failing over.
  }
}

const KEY_LABELS: Record<string, string> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Space: 'Space',
  Enter: 'Enter',
  Escape: 'Esc',
  ShiftLeft: 'Left Shift',
  ShiftRight: 'Right Shift',
  ControlLeft: 'Left Ctrl',
  ControlRight: 'Right Ctrl',
  AltLeft: 'Left Alt',
  AltRight: 'Right Alt',
  MetaLeft: 'Left Cmd',
  MetaRight: 'Right Cmd',
  Backslash: '\\',
  Slash: '/',
  Comma: ',',
  Period: '.',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
  Tab: 'Tab',
};

/** Human-readable key name for the UI. Falls back to a tidied-up code. */
export function keyLabel(code: KeyCode): string {
  const known = KEY_LABELS[code];
  if (known) return known;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return code;
}
