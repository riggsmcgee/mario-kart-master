/**
 * The prototype registry for the Phase 1 testbed. (1a1)
 *
 * One entry per Lego piece. `id` matches the folder at `src/proto/<id>/index.html`;
 * Vite discovers those pages automatically, this list is what the index page shows.
 * Add the entry when the step starts, flip `status` to 'built' when it runs,
 * and to 'signed-off' only when its GATE is checked in build-plan.md.
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
    blurb: 'Action map (steer, hop, item, uiConfirm), rebindable, with a live key readout.',
    status: 'planned',
  },
  {
    id: 'loop',
    title: 'Game loop',
    step: '1a3',
    blurb: 'Fixed 120Hz sim, interpolated render, pause on tab blur, FPS readout.',
    status: 'planned',
  },
  {
    id: 'tuning',
    title: 'Tuning panel',
    step: '1a4',
    blurb: 'Live sliders bound to any config object, copy-config-to-clipboard.',
    status: 'planned',
  },
  {
    id: 'kart',
    title: 'Kart piece (chase view)',
    step: '1b1–1b5',
    gate: '1b6',
    blurb: 'Hand-rolled 2D physics under a Three.js chase camera. Pads, ramps, decoys, coins.',
    status: 'planned',
  },
  {
    id: 'timing',
    title: 'Timing piece',
    step: '1c1',
    gate: '1c2',
    blurb: 'Countdown-and-hold component for the Ch1 start boost. Result in milliseconds.',
    status: 'planned',
  },
  {
    id: 'quiz',
    title: 'Quiz piece',
    step: '1d1',
    gate: '1d2',
    blurb: 'Diagram + big answer buttons + a warm explanation either way. JSON authored.',
    status: 'planned',
  },
  {
    id: 'shield',
    title: 'Shield Up piece',
    step: '1e1',
    gate: '1e2',
    blurb: 'Red shell warning, hold to shield, fake-outs that punish holding early.',
    status: 'planned',
  },
  {
    id: 'auth',
    title: 'Backend piece (Supabase)',
    step: '1f1–1f3',
    gate: '1f4',
    blurb: 'Deferred by Riggs (2026-08-06): local-only for now, no Supabase project yet.',
    status: 'planned',
  },
];
