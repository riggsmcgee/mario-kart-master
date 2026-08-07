# WORKLOG.md

Running log of work done on this project by Claude Code sessions. Companion to [build-plan.md](build-plan.md) (the plan) and `TUNING.md` (feel/physics values, created in step 1a4).

**How this file works:**

- Newest entries at the top of the Log.
- One entry per working session. Each entry: date, model, step IDs touched, what actually changed, and anything left open.
- Step IDs are law (`{phase}{letter}{number}`), same as the plan. If work doesn't map to a step ID, say so and note whether it needs a new ID in build-plan.md.
- Checkboxes get checked in build-plan.md, not here. This file records *how* it went, not *whether* it's done.
- Gates are hard stops: when a session ends at a **GATE**, the entry ends with a "Ready for review" block listing exactly what Riggs needs to look at and what question to answer.
- Open questions accumulate in the Open questions section at the bottom until they're answered; answered ones move to the plan's Decision log and get struck here.

---

## Status at a glance

| | |
|---|---|
| Current phase | Phase 1: The Testing Ground |
| Current step | **1a2** — keyboard input layer + live readout widget |
| Last gate passed | none yet |
| Next gate | **1b6** (drive the kart prototype for 5 minutes) |
| Repo state | scaffold up, `npm run dev` serves the testbed index |
| Deferred | **1f** Supabase (no project yet) · **1a5** GitHub Pages deploy |

---

## Log

### 2026-08-06 — Session 2 (Opus 5)

**Steps touched:** **1a1** (done) · 1a5 (new, deferred) · 1f (marked deferred)

**Did:**

- Riggs answered the four open questions; all four are now decision-log entries in `build-plan.md`.
- **1a1 complete.** Vite 7 + TypeScript 5.9 strict, ESLint 9 flat config + Prettier, folder layout
  (`src/engine`, `src/proto`, `src/ui`, `src/data`), bare testbed index page.
- Testbed is a multi-page app: `vite.config.ts` scans `src/proto/*/index.html` and adds each as a
  build input, so a new prototype needs no config edit. The index page renders its list from
  `src/data/protos.ts` — every Phase 1 piece is listed with its step ID, gate ID, and status
  (`planned` / `built` / `signed-off`), so the lab doubles as a progress readout.
- Vite `base`: `/` in dev, `/mario-kart-master/` on build. Verified a production build serves at the
  Pages subpath (200, assets resolve) even though Pages itself is off.
- Plan edits: 1a1 checked, its Pages-deploy clause split into new step **1a5** (deferred), 1a
  acceptance criterion changed from "deployed URL" to `npm run dev`, section **1f** headed with a
  DEFERRED note naming the knock-on effect (2a1's sync dependency).
- `.prettierignore` excludes `build-plan.md`, `WORKLOG.md`, `TUNING.md`, `README.md` — Prettier
  reflows markdown tables, and those are hand-edited files.

**Verified:** `npm run build` (tsc project references + Vite) clean · `npm run lint` clean ·
`npm run format:check` clean · `vite preview` returns 200 at `/mario-kart-master/`.

**Notes / decisions made while building:**

- Two tsconfigs (`tsconfig.app.json` for `src` with DOM types, `tsconfig.node.json` for
  `vite.config.ts` with Node types), referenced from the root. Keeps Node globals out of browser
  code so a stray `process.env` in engine code fails at typecheck instead of at runtime in Jodi's
  browser. `npm run typecheck` is `tsc -b`.
- Strict flags on beyond the default: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`. Worth it for hand-rolled physics; say the word if it gets tedious.
- npm 11 prints an `allow-scripts` warning about esbuild's postinstall. Harmless here — the
  platform binary arrives via optional dependencies and the build works. Not approving it.
- Nothing committed yet. Say the word and I'll commit as `chore: 1a1 scaffold vite + ts testbed`.

**Next:** 1a2 (input layer), 1a3 (game loop), 1a4 (tuning panel) — the rest of the foundation,
none of which touch the deferred items.

---

### 2026-08-06 — Session 1 (Opus 5)

**Steps touched:** none (planning/orientation only)

**Did:**

- Read `build-plan.md` end to end.
- Surveyed the repo: `README.md`, `build-plan.md`, git history of two commits (`Initial commit`, `Test of git`). No source, no tooling, no CI. Phase 1 starts from zero.
- Created this file.

**Did not do:** no code written; 1a1 not started (waiting on the go-ahead and on the open questions below).

**Notes:**

- `build-plan.md` is untracked in git as of this session.
- The plan's working agreement says commits reference step IDs (`feat: 1b2 chase camera`). No commits have been made by Claude yet.

**Open at end of session:** the questions in Open questions below.

---

## Open questions

Numbered for easy answering ("Q5: yes, Q7: skip it"). Answered ones move to the Decision log in
`build-plan.md` and get struck here.

These four are gaps or contradictions in the plan itself, raised in Session 1. None of them block
1a2–1a4, so work continues; Q6 wants an answer before 1b5.

5. **The IP rule contradicts the content.** Design principle 5 says "No Nintendo assets, names, or
   characters," but 2b8 recommends "Yoshi + Teddy Buggy + Roller," 4c names four tracks, and 4e2
   wants a checked-in JSON of every kart part. A kart recommender can't work without naming parts.
   Proposed rewording: no Nintendo *artwork, audio, logos, or fonts*; names used as plain factual
   references are fine. Needs Riggs's call so a later session doesn't "fix" it the wrong way.
6. **No track authoring format in Phase 1, but Phase 2 assumes one.** 1b5 builds one test track.
   2b4 (ramps), 2b5 (pads + decoys) and 2b6 (racing line + coins) each need their own layout, and
   2b6 needs a fading ideal-line path. If tracks are hardcoded, every Phase 2 chapter becomes engine
   work — which breaks the Lego rule exactly where it matters. Proposal: a data-driven track format
   (JSON: segments, pads, ramps, decoys, coin lines, ideal-line polyline) as part of 1b5 or a new
   1b7, so Phase 2 chapters are content, not code.
7. **Scoring is stored but never defined.** 1f3 syncs `stars` and `best_score`; 2b6 says "1 to 3
   stars"; no step says what earns a star in any drill. Suggest defining it in the 1g1 gate write-up,
   once the drills have real feel to measure.
8. **GitHub Pages deep links (parked with 1a5).** Static Pages has no SPA fallback, so a refresh on
   a chapter URL 404s unless we use hash routing or the `404.html` copy trick. Cheap now, annoying
   to retrofit at 2a1. Also for whenever 1f lands: Supabase's redirect allowlist needs both
   `localhost` and the Pages URL, and magic-link mail has a habit of landing in Promotions — a
   plausible candidate for one of the three confusion points at gate 4f2.

---

## Decisions made in-session

(Anything decided here also gets appended to the Decision log in `build-plan.md` with a date. This section is the working copy.)

- **2026-08-06** (Riggs, answering Q1–Q4): Supabase deferred, 1f is a hard pause · local dev only,
  Pages split to 1a5 · Node 24 LTS + npm · default key bindings + rebind widget now, final choice at
  1g1. All four are in the plan's Decision log.
- **2026-08-06** (Claude): tsconfig split into app/node projects so Node globals stay out of browser
  code. Rationale in the Session 2 entry.
