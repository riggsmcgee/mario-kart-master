import './ui/testbed.css';
import { PROTOS, type Proto } from './data/protos';

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
    // Vite resolves this against `base`, so it works on localhost and on Pages later.
    link.href = new URL(`src/proto/${proto.id}/index.html`, import.meta.env.BASE_URL).pathname;
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
