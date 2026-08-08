import '../../ui/testbed.css';
import '../../ui/proto.css';
import '../../ui/countdown.css';
import { installErrorBanner } from '../../ui/error-banner';
import { Input } from '../../engine/input';
import { TuningPanel, type TuningSchema } from '../../engine/tuning';
import {
  COUNTDOWN_CONFIG,
  COUNTDOWN_PRESETS,
  CountdownDrill,
  type CountdownResult,
} from '../../ui/countdown-drill';

installErrorBanner();

/** Start-boost harness. (1c1) */

const CONFIG = { ...COUNTDOWN_CONFIG };

const SCHEMA: TuningSchema<typeof CONFIG> = {
  windowMs: {
    kind: 'number',
    label: 'Boost window',
    min: 40,
    max: 600,
    step: 10,
    unit: 'ms',
    help: 'Either side of the moment. Generous by design — the drill teaches the instinct, the Switch trains the hands.',
  },
  perfectMs: {
    kind: 'number',
    label: 'Perfect window',
    min: 20,
    max: 300,
    step: 5,
    unit: 'ms',
  },
  stepMs: {
    kind: 'number',
    label: 'Countdown step',
    min: 400,
    max: 2000,
    step: 50,
    unit: 'ms',
    help: 'Gap between 3, 2, 1 and GO. The real game runs about a second a step.',
  },
  requireHold: {
    kind: 'boolean',
    label: 'Must hold through GO',
    help: 'Letting go early throws the boost away, as it does in the real game.',
  },
};

const input = new Input();
const mount = document.querySelector<HTMLElement>('#drill');

let attempts = 0;
let boosts = 0;
let best: number | null = null;

const drill = mount ? new CountdownDrill({ mount, input, config: CONFIG, onResult: record }) : null;

function record(result: CountdownResult): void {
  attempts++;
  const good = result.grade === 'perfect' || result.grade === 'boost';
  if (good) boosts++;
  if (good && result.errorMs !== null) {
    const distance = Math.abs(result.errorMs);
    if (best === null || distance < best) best = distance;
  }

  const streak = document.querySelector<HTMLElement>('#streak');
  if (streak) {
    streak.textContent = `${boosts} / ${attempts} boosted${best === null ? '' : ` · best ${best.toFixed(0)} ms off`}`;
  }

  const log = document.querySelector<HTMLOListElement>('#log');
  if (log) {
    const li = document.createElement('li');
    li.className = good ? 'down' : '';
    const error =
      result.errorMs === null
        ? 'no press'
        : `${result.errorMs > 0 ? '+' : ''}${result.errorMs.toFixed(0)} ms`;
    li.textContent = `${String(attempts).padStart(3)}  ${result.grade.padEnd(9)} ${error}`;
    log.prepend(li);
    while (log.children.length > 12) log.lastElementChild?.remove();
  }
}

document
  .querySelector<HTMLButtonElement>('#again')
  ?.addEventListener('click', () => drill?.start());

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) {
  button.addEventListener('click', () => {
    const preset = COUNTDOWN_PRESETS[button.dataset.preset as keyof typeof COUNTDOWN_PRESETS];
    if (!preset) return;
    CONFIG.windowMs = preset.windowMs;
    CONFIG.perfectMs = preset.perfectMs;
    drill?.layoutTimeline();
    drill?.start();
  });
}

// Enter restarts, so a run of attempts never needs the mouse. Space is taken — it is the
// accelerator, and reaching for the mouse between goes would break the rhythm being trained.
window.addEventListener('keydown', (event) => {
  if (event.code === 'Enter') drill?.start();
});

new TuningPanel({
  config: CONFIG,
  schema: SCHEMA,
  title: 'Start boost config',
  exportName: 'COUNTDOWN_CONFIG',
  storageKey: 'mkm.tuning.countdown.v1',
  mount: document.querySelector<HTMLElement>('#tuning-mount') ?? undefined,
  onChange: () => drill?.layoutTimeline(),
});

drill?.start();
