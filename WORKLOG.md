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
| Current step | **1a1** — scaffold Vite + TS, deploy action, bare testbed index |
| Last gate passed | none yet |
| Next gate | **1b6** (drive the kart prototype for 5 minutes) |
| Repo state | plan + README + this log only; no code yet |

---

## Log

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

Numbered for easy answering ("Q1: yes, Q3: use X").

1. **Supabase timing.** Step 1f1 needs Riggs to create the Supabase project and supply URL + anon key before any backend work. That's a human prerequisite sitting in the middle of Phase 1. Do you want to do it now (so 1f isn't a stall later), or should I build 1a–1e first and treat 1f as a hard pause point?
2. **Repo scope of this session's next move.** Ready to start 1a1 (scaffold) on the next go. Confirm: Node version to target, and whether you want `npm` (default assumption) or something else.
3. **Deploy timing.** 1a1 includes the GitHub Pages Actions workflow. Turning that on means the bare, unstyled testbed is publicly visible at the Pages URL from day one. Fine, or do you want Pages left off until Phase 2?
4. **1a2 rebindable input.** The plan wants rebinding in the input layer but final key bindings aren't picked until gate 1g1. I'll build the action map with defaults (arrows/A-D steer, Space hop, Shift item) and a rebind UI on the testbed, leaving the final choice to 1g1 — say if you'd rather lock keys sooner.

---

## Decisions made in-session

(Anything decided here also gets appended to the Decision log in `build-plan.md` with a date. This section is the working copy.)

- *(none yet)*
