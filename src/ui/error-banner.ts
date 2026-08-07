/**
 * Visible error reporting for the testbed. (1a1, added after the 1a2 "Loading…" bug)
 *
 * A thrown error in a module leaves the page sitting on whatever placeholder markup was
 * there, looking like a slow load. On a lab page that is the worst failure mode: it wastes
 * the tester's time before the test even starts. This puts the error on screen.
 *
 * Import it first in every page entry, so the handlers are installed before anything else
 * runs and a throw during module evaluation is still caught.
 */

let container: HTMLDivElement | null = null;

function ensureContainer(): HTMLDivElement {
  if (container) return container;
  container = document.createElement('div');
  container.className = 'error-banner';
  container.setAttribute('role', 'alert');
  document.body.prepend(container);
  return container;
}

function show(kind: string, message: string, detail?: string): void {
  const el = ensureContainer();
  const item = document.createElement('div');

  const heading = document.createElement('strong');
  heading.textContent = kind;

  const text = document.createElement('span');
  text.textContent = ` ${message}`;

  item.append(heading, text);

  if (detail) {
    const pre = document.createElement('pre');
    pre.textContent = detail;
    item.append(pre);
  }

  el.append(item);
}

export function installErrorBanner(): void {
  window.addEventListener('error', (event) => {
    const where = event.filename ? ` (${event.filename}:${event.lineno}:${event.colno})` : '';
    show(
      'Script error:',
      `${event.message}${where}`,
      event.error instanceof Error ? event.error.stack : undefined,
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason;
    show(
      'Unhandled promise rejection:',
      reason instanceof Error ? reason.message : String(reason),
      reason instanceof Error ? reason.stack : undefined,
    );
  });
}

/** Report a caught error without rethrowing, for code that wants to keep going. */
export function reportError(context: string, error: unknown): void {
  show(
    `${context}:`,
    error instanceof Error ? error.message : String(error),
    error instanceof Error ? error.stack : undefined,
  );
}
