/**
 * The prototype registry for the Phase 1 testbed. (1a1)
 *
 * One entry per Lego piece. `id` matches the folder at `src/proto/<id>/index.html`;
 * Vite discovers those pages automatically, this list is what the index page shows.
 * Add the entry when the step starts, flip `status` to 'built' when it runs,
 * and to 'signed-off' only when its GATE is checked in build-plan.md.
 *
 * All eight are signed off as of 2026-08-12: Riggs playtested the pieces and cleared them in one
 * go rather than gate by gate, which is why 1b6/1c2/1d2/1e2 never got individual write-ups. The
 * lab is kept rather than deleted because the tuning panels live here and nowhere else — the
 * course imports the components, not these pages, so this is still where feel values get changed.
 */

export type ProtoStatus = 'planned' | 'built' | 'signed-off';

export interface Proto {
  /** Folder name under src/proto, and the URL segment. */
  id: string;
  title: string;
  /** Step ID from build-plan.md that creates it. */
  step: string;
  /** Step ID of the gate that signs it off, if it has one. */
  gate?: string;
  blurb: string;
  status: ProtoStatus;
}

export const PROTOS: Proto[] = [
  {
    id: 'input',
    title: 'Input readout',
    step: '1a2',
    blurb:
      'Action map (steer, hop, item, accelerate, uiConfirm), rebindable, with a live key readout.',
    status: 'signed-off',
  },
  {
    id: 'loop',
    title: 'Game loop',
    step: '1a3',
    blurb: 'Fixed 120Hz sim, interpolated render, pause on tab blur, FPS readout.',
    status: 'signed-off',
  },
  {
    id: 'tuning',
    title: 'Tuning panel',
    step: '1a4',
    blurb:
      'Live sliders bound to any config object, copy-config-to-clipboard, copy-TUNING.md-entry.',
    status: 'signed-off',
  },
  {
    id: 'kart',
    title: 'Kart piece (chase view)',
    step: '1b1–1b5',
    gate: '1b6',
    blurb:
      'Hand-rolled 2D physics under a Three.js chase camera. Pads, ramps with trick timing, ' +
      'coins, smart-steering guardrail, and a real circuit.',
    status: 'signed-off',
  },
  {
    id: 'timing',
    title: 'Timing piece',
    step: '1c1',
    gate: '1c2',
    blurb:
      'Countdown-and-hold component for the Ch1 start boost. Shows where you pressed against ' +
      'the window, not just how far off you were.',
    status: 'signed-off',
  },
  {
    id: 'quiz',
    title: 'Quiz piece',
    step: '1d1',
    gate: '1d2',
    blurb:
      'Situation diagram + big answer buttons + a warm reply to every option, right or wrong. ' +
      "Loaded with Chapter 2's ten item-decision cards. Questions and pictures both plain JSON.",
    status: 'signed-off',
  },
  {
    id: 'shield',
    title: 'Shield Up piece',
    step: '1e1',
    gate: '1e2',
    blurb:
      'The kart piece with something chasing it. Bananas from item boxes, hold to keep one ' +
      'behind your bumper, and a locked-on shell that never misses if you do not.',
    status: 'signed-off',
  },
  {
    id: 'auth',
    title: 'Backend piece (Supabase)',
    step: '1f1–1f3',
    gate: '1f4',
    blurb:
      'Magic-link sign in, session persistence, and the profile row — which is the real test: ' +
      'it proves the signup trigger and row-level security both work.',
    status: 'signed-off',
  },
];
