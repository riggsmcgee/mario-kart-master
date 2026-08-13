# mario-kart-master

A small teaching website that makes someone better at Mario Kart 8 Deluxe — built as a present,
for one specific person, who is a beginner and does not want to become a hobbyist.

It is nine short chapters and a training programme. Every chapter is a page of plain explanation
followed by a page where you do the thing: a browser drill, a quiz, or both. Nothing is timed,
nothing is marked, and no chapter can be failed.

## The argument

Most of Mario Kart is not reflexes.

That is the whole premise, and everything here follows from it. A start boost happens before the
lights go green. A boost pad is in the same place on every lap of every race, forever. An item held
behind you blocks things without being aimed. None of that needs fast hands — it needs someone to
have mentioned it to you once.

So the course never teaches a skill that has to be executed under pressure if a piece of knowledge
would do instead. Where the two compete, knowledge wins, because knowledge is the thing a beginner
can actually get good at this week.

## The chapters

| | | |
|---|---|---|
| 0 | The goal | Why preparation beats reaction |
| 1 | Start boost | Free speed before anyone has moved |
| 2 | Item smarts | Hold everything; fire only the red shells |
| 3 | Ramp tricks | A boost on top of every jump |
| 4 | Boost pads | Worth going out of your way for |
| 5 | Lines and coins | Wide in, tight through, wide out — and ten coins |
| 6 | The drift | The one hard skill, saved for last |
| 7 | Your kart | Pick a build once and stop thinking about it |
| 8 | The plan | Forty sessions, one job each |

Chapter 8 is the point of the other eight. The website is an hour; the training programme is two
months of short, specific sessions on the actual console, and that is where the learning happens.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run typecheck` | `tsc -b`, no emit |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, write |
| `npm run shoot` | **Render check** — drives Chromium over every route, fails on any console error |

`npm run shoot` is the one worth knowing about. Twice in this project "it builds and lints" turned
out not to mean "it renders", so this loads all 21 routes in a real browser, asserts a known string
on each page, reports any failed request, and writes a screenshot per route. A route returning
HTTP 200 says the server handed back HTML; it says nothing about whether the module threw on line
one.

## How it is built

TypeScript and Vite, no framework. Views are plain DOM built in code — the site is small enough that
a framework would be more machinery than page.

- **Drills** are Three.js over a hand-rolled 2D kart simulation (`src/engine`), fixed timestep, with
  the renderer strictly downstream of the physics.
- **Routing** is hash-based, because GitHub Pages has no SPA fallback and a deep link has to survive
  a cold load.
- **Progress** is local-first and merged best-of, so it works signed out. Signing in is optional and
  only syncs; Supabase provides magic-link auth and row-level security.
- **All art is original.** Every shape in the 3D scenes is built from primitives in code. No
  Nintendo assets, names, characters or geometry are used anywhere, and none are committed.

```
src/
  engine/    physics, input, track geometry, drift, racing line — no DOM
  ui/        reusable interactive pieces: drills, quiz, HUDs, stylesheets
  site/      the site itself — router, chapter pages, plan, settings
  data/      chapters, quiz decks (JSON), the training programme, parts, copy
  backend/   Supabase client, auth, progress sync
  proto/     throwaway prototypes from earlier phases
```

## The written record

This repo carries more prose than code, on purpose.

- **[build-plan.md](build-plan.md)** — the plan, its step IDs, and the decision log. Decisions are
  dated and attributed, including the ones that were later reversed.
- **[WORKLOG.md](WORKLOG.md)** — one entry per working session: what changed, what broke, what is
  still open.
- **[TUNING.md](TUNING.md)** — feel and physics values, and why each number is what it is.
- **[docs/playtest-notes.md](docs/playtest-notes.md)** — playtest feedback in the words it arrived
  in.
- **[docs/voiceover-scripts.md](docs/voiceover-scripts.md)** — generated from `src/data/voiceover.ts`
  by `scripts/voiceover-doc.mjs`.

Source files carry the reasoning too. Where a comment explains why something is the way it is, it is
usually because getting it wrong once cost a session.

## Status

The course exists end to end and works. Outstanding before it can be handed over: the voiceover
recordings, a pass on a Mac (the only machine it will actually be used on), and the deploy
configuration on the GitHub side.
