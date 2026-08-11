# src/engine

Shared, reusable machinery. Nothing in here knows about a chapter or a piece of copy.

Planned occupants (step IDs from [build-plan.md](../../build-plan.md)):

- `input.ts` — action map, rebinding (1a2)
- `loop.ts` — fixed 120Hz sim step, interpolated render, blur pause (1a3)
- `tuning.ts` — live-slider panel bound to a config object (1a4)
- `kart.ts` — 2D kart physics: auto-forward, speed-sensitive steering, slide, off-road, walls (1b1)
- `track.ts` — track data + furniture: pads, ramps, decoys, coins, steer-assist guardrail (1b3, 1b4)
- `shield.ts` — Shield Up: incoming threats, hold-to-block, fake-outs (1e1)

Rendering lives in `src/ui` rather than here: `kart-scene.ts` is the Three.js world shared by
every driving drill, and the DOM components (`countdown-drill.ts`, `quiz.ts`, `shield-hud.ts`)
sit beside it.

Rule: every constant that affects feel is exposed to the tuning panel and every change to one
gets a line in `TUNING.md`.
