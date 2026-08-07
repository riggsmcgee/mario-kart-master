# src/proto

One folder per prototype, each with its own `index.html` — Vite builds them as separate pages
automatically (see `vite.config.ts`), and the testbed index lists them from
[`src/data/protos.ts`](../data/protos.ts).

```
src/proto/<id>/index.html   ← the page
src/proto/<id>/main.ts      ← its entry script
```

These are throwaway harnesses on purpose: sliders visible, numbers on screen, no styling budget.
The real site (Phase 2) imports from `src/engine` and `src/ui`, never from here.
