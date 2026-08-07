# TUNING.md

Every change to a physics or feel constant gets a line here: what changed, why, before → after.
Required by the working agreement in [build-plan.md](build-plan.md).

**How entries get written:** the tuning panel (1a4) writes them for you. Tune until it feels right,
click **Copy TUNING.md entry**, paste it at the top of the Log below, and fill in the **Why**. The
panel snapshots the values the code shipped with and diffs against that, so the before/after column
is the real before/after, not whatever a previous session left in localStorage.

**The Why is the part that matters.** The numbers are recoverable from git; the reason a number is
12.5 and not 14 is not. Write what it felt like before and what it feels like now — "twitchy on the
hairpin, kart caught the wall every lap" beats "tuned steering."

**Signed-off values.** When a gate passes (1b6, 1c2, 1e2), record the config that was signed off,
not just the diff that got there. Those are the numbers the real site ships with.

---

## Log

_(newest first)_

### 2026-08-07 — baseline

No feel constants exist yet. Section 1a built the tools: the input layer (1a2), the fixed-timestep
loop (1a3), and the tuning panel itself (1a4). The first real entries arrive with the kart physics
in 1b1, where every constant is exposed to the panel by design.

For reference, the loop constants chosen at 1a3, none of them yet challenged by hands-on feel:

| Field | Value | Reasoning |
|---|---|---|
| `hz` | 120 | Sim rate. Twice the common display refresh, so trick-window timing stays sub-frame accurate. |
| `maxFrameMs` | 250 | Longest frame the sim catches up on. Beyond it, time is discarded rather than queued, to avoid the spiral of death. |
| `timeScale` | 1 | Slow-motion multiplier for feel work. Not a shipping value. |
