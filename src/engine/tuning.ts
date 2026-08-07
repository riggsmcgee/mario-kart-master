/**
 * Tuning panel framework. (1a4)
 *
 * Binds live controls to any plain config object, mutating it in place so the sim reads the
 * new value on its very next tick. This is the tool every feel decision in section 1b gets
 * made with — how fast the kart turns, how wide the trick window is, how hard the steer-assist
 * guardrail pushes — so it also has to answer "what did we change, and what was it before?"
 *
 * That is why the baseline is captured at construction and never touched. The panel can emit a
 * ready-to-paste TUNING.md entry showing before → after for exactly the fields that moved,
 * which is the log the plan asks for, minus the part where someone has to remember to write it.
 */

export type TuningValue = number | boolean | string;
export type TuningConfig = Record<string, TuningValue>;

export type FieldSpec =
  | {
      kind: 'number';
      label: string;
      min: number;
      max: number;
      step: number;
      unit?: string;
      help?: string;
      group?: string;
    }
  | { kind: 'boolean'; label: string; help?: string; group?: string }
  | { kind: 'select'; label: string; options: readonly string[]; help?: string; group?: string };

export type TuningSchema<T> = { [K in keyof T]?: FieldSpec };

export interface TuningChange {
  key: string;
  from: TuningValue;
  to: TuningValue;
}

export interface TuningPanelOptions<T extends TuningConfig> {
  /** Mutated in place. Hold a reference in the sim and read it every tick. */
  config: T;
  schema: TuningSchema<T>;
  // `| undefined` on each: with exactOptionalPropertyTypes, an omitted property and one
  // explicitly set to undefined are different types, and callers routinely pass the result
  // of a querySelector straight through.
  /** Where to render. Defaults to document.body. */
  mount?: HTMLElement | undefined;
  title?: string | undefined;
  /** Name used in the copied TypeScript snippet, e.g. `KART_CONFIG`. */
  exportName?: string | undefined;
  /** Persist the in-progress tuning session under this key. Omit to skip persistence. */
  storageKey?: string | undefined;
  onChange?: ((key: string, value: TuningValue) => void) | undefined;
}

export class TuningPanel<T extends TuningConfig> {
  private readonly config: TuningConfig;
  private readonly schema: TuningSchema<T>;
  private readonly baseline: TuningConfig;
  private readonly exportName: string;
  private readonly storageKey: string | undefined;
  private readonly onChange: ((key: string, value: TuningValue) => void) | undefined;
  private readonly root: HTMLElement;
  /** Re-sync a control after a programmatic change (reset, restore). */
  private readonly syncers = new Map<string, () => void>();

  constructor(options: TuningPanelOptions<T>) {
    this.config = options.config;
    this.schema = options.schema;
    this.exportName = options.exportName ?? 'CONFIG';
    this.storageKey = options.storageKey;
    this.onChange = options.onChange;

    // Snapshot before restoring anything: the baseline is what the code shipped with,
    // not what a previous tuning session left behind.
    this.baseline = { ...options.config };
    if (this.storageKey) this.restore();

    this.root = document.createElement('div');
    this.root.className = 'tuning';
    this.build(options.title ?? 'Tuning');
    (options.mount ?? document.body).append(this.root);
  }

  get element(): HTMLElement {
    return this.root;
  }

  // --- values --------------------------------------------------------------

  /** Fields that differ from the shipped baseline. */
  diff(): TuningChange[] {
    const changes: TuningChange[] = [];
    for (const key of Object.keys(this.schema)) {
      const from = this.baseline[key];
      const to = this.config[key];
      if (from === undefined || to === undefined) continue;
      if (from !== to) changes.push({ key, from, to });
    }
    return changes;
  }

  reset(): void {
    for (const key of Object.keys(this.schema)) {
      const value = this.baseline[key];
      if (value === undefined) continue;
      this.config[key] = value;
      this.onChange?.(key, value);
    }
    this.save();
    this.syncAll();
  }

  private set(key: string, value: TuningValue): void {
    this.config[key] = value;
    this.onChange?.(key, value);
    this.save();
  }

  private syncAll(): void {
    for (const sync of this.syncers.values()) sync();
  }

  // --- persistence ---------------------------------------------------------

  private save(): void {
    if (!this.storageKey) return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch {
      // Full quota or private mode. The session simply will not survive a reload.
    }
  }

  private restore(): void {
    if (!this.storageKey) return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return;
      const stored = parsed as Record<string, unknown>;

      // Only accept keys the schema still declares, at the type the baseline still uses.
      // A saved session from an older build must not smuggle in stale or renamed fields.
      for (const key of Object.keys(this.schema)) {
        const value = stored[key];
        const expected = typeof this.baseline[key];
        if (value !== undefined && typeof value === expected) {
          this.config[key] = value as TuningValue;
        }
      }
    } catch {
      // Corrupt entry; the baseline stands.
    }
  }

  clearSaved(): void {
    if (this.storageKey) localStorage.removeItem(this.storageKey);
    this.reset();
  }

  // --- exports -------------------------------------------------------------

  /** The whole config as a paste-ready TypeScript literal. */
  toTypeScript(): string {
    const lines = Object.keys(this.schema).map((key) => {
      const value = this.config[key];
      return `  ${key}: ${typeof value === 'string' ? JSON.stringify(value) : String(value)},`;
    });
    return `export const ${this.exportName} = {\n${lines.join('\n')}\n};\n`;
  }

  /** A TUNING.md entry for the fields that moved, with the "why" left for a human. */
  toMarkdown(): string {
    const changes = this.diff();
    const date = new Date().toISOString().slice(0, 10);
    if (changes.length === 0) {
      return `### ${date} — ${this.exportName}\n\nNo changes from baseline.\n`;
    }
    const rows = changes
      .map((c) => `| \`${c.key}\` | ${String(c.from)} | ${String(c.to)} |`)
      .join('\n');
    return [
      `### ${date} — ${this.exportName}`,
      '',
      '**Why:** _(fill this in — what did it feel like before, what does it feel like now)_',
      '',
      '| Field | Before | After |',
      '|---|---|---|',
      rows,
      '',
    ].join('\n');
  }

  // --- DOM -----------------------------------------------------------------

  private build(title: string): void {
    const heading = document.createElement('h2');
    heading.textContent = title;
    this.root.append(heading);

    // Group fields in declaration order; ungrouped fields sit in an unnamed leading group.
    const groups = new Map<string, string[]>();
    for (const [key, spec] of Object.entries(this.schema) as Array<[string, FieldSpec]>) {
      const name = spec.group ?? '';
      const bucket = groups.get(name);
      if (bucket) bucket.push(key);
      else groups.set(name, [key]);
    }

    for (const [groupName, keys] of groups) {
      const section = document.createElement('div');
      section.className = 'tuning-group';
      if (groupName) {
        const legend = document.createElement('h3');
        legend.textContent = groupName;
        section.append(legend);
      }
      for (const key of keys) {
        const spec = this.schema[key as keyof T];
        if (spec) section.append(this.buildField(key, spec));
      }
      this.root.append(section);
    }

    this.root.append(this.buildActions());
  }

  private buildField(key: string, spec: FieldSpec): HTMLElement {
    const field = document.createElement('div');
    field.className = 'tuning-field';

    const label = document.createElement('label');
    label.className = 'tuning-label';
    label.htmlFor = `tune-${key}`;
    label.textContent = spec.label;

    switch (spec.kind) {
      case 'number':
        field.append(label, this.buildNumber(key, spec));
        break;
      case 'boolean':
        field.append(label, this.buildBoolean(key));
        break;
      case 'select':
        field.append(label, this.buildSelect(key, spec.options));
        break;
    }

    if (spec.help) {
      const help = document.createElement('p');
      help.className = 'hint';
      help.textContent = spec.help;
      field.append(help);
    }
    return field;
  }

  private buildNumber(key: string, spec: Extract<FieldSpec, { kind: 'number' }>): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'tuning-number';

    const range = document.createElement('input');
    range.type = 'range';
    range.id = `tune-${key}`;
    range.min = String(spec.min);
    range.max = String(spec.max);
    range.step = String(spec.step);

    // A slider alone cannot hit 0.62 reliably; the number box is how a tuned value gets
    // typed back in from TUNING.md.
    const box = document.createElement('input');
    box.type = 'number';
    box.className = 'num';
    box.min = String(spec.min);
    box.max = String(spec.max);
    box.step = String(spec.step);

    const unit = document.createElement('span');
    unit.className = 'tuning-unit';
    unit.textContent = spec.unit ?? '';

    const current = (): number => {
      const value = this.config[key];
      return typeof value === 'number' ? value : spec.min;
    };

    const sync = (): void => {
      const value = current();
      range.value = String(value);
      box.value = String(value);
    };

    range.addEventListener('input', () => {
      const value = Number(range.value);
      box.value = String(value);
      this.set(key, value);
    });

    box.addEventListener('change', () => {
      const raw = Number(box.value);
      if (Number.isNaN(raw)) {
        sync();
        return;
      }
      // Typed values may exceed the slider's range; clamp so the two controls agree.
      const value = Math.min(spec.max, Math.max(spec.min, raw));
      this.set(key, value);
      sync();
    });

    this.syncers.set(key, sync);
    sync();

    wrap.append(range, box, unit);
    return wrap;
  }

  private buildBoolean(key: string): HTMLElement {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `tune-${key}`;

    const sync = (): void => {
      input.checked = this.config[key] === true;
    };
    input.addEventListener('change', () => this.set(key, input.checked));

    this.syncers.set(key, sync);
    sync();
    return input;
  }

  private buildSelect(key: string, options: readonly string[]): HTMLElement {
    const select = document.createElement('select');
    select.id = `tune-${key}`;
    for (const option of options) {
      const el = document.createElement('option');
      el.value = option;
      el.textContent = option;
      select.append(el);
    }

    const sync = (): void => {
      select.value = String(this.config[key]);
    };
    select.addEventListener('change', () => this.set(key, select.value));

    this.syncers.set(key, sync);
    sync();
    return select;
  }

  private buildActions(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'tuning-actions';

    row.append(
      this.buildCopyButton('Copy config', () => this.toTypeScript()),
      this.buildCopyButton('Copy TUNING.md entry', () => this.toMarkdown()),
    );

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'action';
    reset.textContent = 'Reset';
    reset.title = 'Back to the values in the code';
    reset.addEventListener('click', () => this.reset());
    row.append(reset);

    if (this.storageKey) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'action';
      clear.textContent = 'Clear saved';
      clear.title = 'Forget this browser’s saved tuning session';
      clear.addEventListener('click', () => this.clearSaved());
      row.append(clear);
    }

    return row;
  }

  private buildCopyButton(label: string, text: () => string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action';
    button.textContent = label;

    button.addEventListener('click', () => {
      const payload = text();
      void copyToClipboard(payload).then((ok) => {
        button.textContent = ok ? 'Copied' : 'Copy failed — see console';
        if (!ok) console.log(payload);
        setTimeout(() => (button.textContent = label), 1400);
      });
    });
    return button;
  }
}

/** Clipboard write with a fallback, since the API needs a secure context and permission. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
