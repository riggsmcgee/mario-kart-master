import './ui/testbed.css';
import { installErrorBanner } from './ui/error-banner';
import { PROTOS, type Proto } from './data/protos';

installErrorBanner();

/** Testbed index. Lists every Lego piece and links to the ones that exist yet. (1a1) */

const STATUS_LABEL: Record<Proto['status'], string> = {
  planned: 'not built',
  built: 'built',
  'signed-off': 'signed off',
};

function render(proto: Proto): HTMLLIElement {
  const li = document.createElement('li');

  const step = document.createElement('span');
  step.className = 'step';
  step.textContent = proto.gate ? `${proto.step} → ${proto.gate}` : proto.step;

  const title = document.createElement('span');
  title.className = 'title';
  if (proto.status === 'planned') {
    title.textContent = proto.title;
  } else {
    const link = document.createElement('a');
    // BASE_URL is '/' in dev and '/mario-kart-master/' in a build, always with a trailing
    // slash. Concatenate it — do not feed it to `new URL()` as a base, which requires an
    // absolute URL and throws on both of those values.
    link.href = `${import.meta.env.BASE_URL}src/proto/${proto.id}/index.html`;
    link.textContent = proto.title;
    title.append(link);
  }

  const status = document.createElement('span');
  status.className = 'status';
  status.dataset.status = proto.status;
  status.textContent = STATUS_LABEL[proto.status];

  const blurb = document.createElement('span');
  blurb.className = 'blurb';
  blurb.textContent = proto.blurb;

  li.append(step, title, status, blurb);
  return li;
}

const list = document.querySelector<HTMLOListElement>('#proto-list');
if (list) {
  list.replaceChildren(...PROTOS.map(render));
}
