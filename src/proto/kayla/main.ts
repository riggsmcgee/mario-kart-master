import '../../ui/testbed.css';
import '../../ui/proto.css';
import '../../ui/theme.css';
import { installErrorBanner } from '../../ui/error-banner';
import { getSfx } from '../../ui/sfx';
import { renderKayla, BEATS } from '../../site/kayla';
import type { Mounted } from '../../site/types';

installErrorBanner();

/**
 * There Is No Course, on a bench. (4e4)
 *
 * The real thing has no URL — it is only reachable by clicking Kayla at the doorman, on purpose,
 * because being found is half of what it is. That makes it almost impossible to work on: the last
 * beat is the far end of a five-minute run, and a one-word change to its copy would mean playing
 * the whole thing again to see it.
 *
 * So this is the only place any beat can be opened directly.
 *
 * **It opens full screen, and that is not a nicety.** The narrator strip and the exit are both
 * `position: fixed`, and the stage is a full viewport tall. Rendered into a panel partway down a
 * testbed page, everything lands in the wrong place and the first drag target sits below the fold —
 * which is a bug in the harness that reads exactly like a bug in the thing being harnessed. Asking
 * the wrong question is the expensive kind of mistake for a bench to make.
 */

const host = document.querySelector<HTMLElement>('#host');
const jumps = document.querySelector<HTMLElement>('#jumps');

let mounted: Mounted | null = null;

function close(): void {
  mounted?.dispose();
  mounted = null;
  if (!host) return;
  host.hidden = true;
  host.replaceChildren();
  document.body.classList.remove('k-harness-open');
}

function play(from: number): void {
  if (!host) return;
  mounted?.dispose();
  host.hidden = false;
  document.body.classList.add('k-harness-open');
  mounted = renderKayla(host, {
    sfx: getSfx(),
    onLeave: close,
    // The harness has no site to hand her to, so admission just says so and closes.
    onAdmitted: () => {
      console.log('[kayla] admitted — the real build would open the site here');
      close();
    },
    // A bench is never the real run. Without this, jumping to beat 8 to check one line of copy would
    // set the admission flag on this browser and quietly retire the experience for whoever opens the
    // site next — which, on the family laptop, is the person it was built for.
    preview: true,
    from,
  });
}

if (jumps) {
  BEATS.forEach((beat, index) => {
    const button = document.createElement('button');
    button.className = 'action';
    button.textContent = beat.title;
    button.addEventListener('click', () => play(index));
    jumps.append(button, document.createTextNode(' '));
  });
}

// Escape belongs to the harness, never to the experience. Kayla's only way out is the button in
// the corner, and giving her a second one here would test a page that is not the one she gets.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mounted) close();
});
