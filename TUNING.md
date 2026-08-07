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

### 2026-08-07 — KART_CONFIG (1b1), after the first outside playtest

**Why:** Riggs's girlfriend drove it — the first person who is not the author to touch this
project. It came back substantially slower.

| Field | Before | After |
|---|---|---|
| `maxSpeed` | 20 | 11.5 |
| `acceleration` | 16 | 10 |
| `maxYawRate` | 2.4 | 2 |

**This is the most useful data point the project has produced, and it is worth stating plainly:
it moved the number in the opposite direction from the author's own instinct.**

The history is the argument. My blind guess was 16. Riggs drove it and went up to 20. The first
person who had not been staring at the code went down to 11.5 — below even the starting value.
Speed that reads as "responsive" to someone who has driven the same oval two hundred times reads
as "out of control" to someone seeing it for the first time.

Jodi is a first-time driver. She is closer to this playtester than to Riggs, and every drill she
meets is one she has never seen before. **Prefer the outside number.** When these two instincts
disagree again — and they will, on the trick window, on the guardrail, on how punishing grass is
— the newcomer is the one describing Jodi's experience.

Worth repeating before gate 1b6: get someone who has never seen it to drive it.

### 2026-08-07 — TRACK_CONFIG (1b3), too-early / too-late calls

Added `trickAttemptMs` (750ms). A hop this far either side of the lip is treated as an *attempt*
and told which way it was wrong, instead of being silently ignored. A miss that says nothing
teaches nothing; a miss that says "120 ms early" is a lesson, and it is the same lesson she will
need on the Switch.

### 2026-08-07 — TRACK_CONFIG (1b3), tuned by Riggs

**Why:** "It's hard to tell when [boosts and tricks] hit."

| Field | Before | After |
|---|---|---|
| `trickWindowMs` | 150 | 500 |
| `padBoost` | 0.9 | 1 |
| `decoySpeedKeep` | 0.62 | *(removed — see below)* |

**Resolved same day: back to 150.** The 500 was measuring "I couldn't tell it worked", not a
genuinely tight window — exactly as suspected above. Once the trick confirmed itself visibly
(barrel roll starting at the lip, flames and edge glow on the boost), Riggs put it straight back
to 150 and it reads fine. Worth remembering as a pattern: **a timing complaint is a feedback
complaint until proven otherwise.** The instinct to widen the window would have made Chapter 3
teach nothing, and the fix was never in the number.

`decoySpeedKeep` was set to 1, zeroing the penalty entirely — consistent with Riggs's correction
that decoy pads are not a real Mario Kart mechanic. Replaced by `halfPipePush` (7 u/s), which
throws the kart outward off its line instead of slowing it down. The boost is real; the cost is
the corner.

### 2026-08-07 — CHASE_CAMERA_CONFIG (1b2), tuned by Riggs

**Why:** Riggs drove the stadium oval and pulled the camera much further back and higher, dropped
the lean to zero, and narrowed the FOV slightly. Verdict: "looks good."

_Reason recorded by Claude from the numbers, not stated by Riggs — correct this if it is wrong._
The change is from a close, low, over-the-shoulder camera to a high, far one. The close version
frames the kart; this one frames the **road ahead**. That fits what the site is for: every drill
from Chapter 3 on is about seeing a ramp, a boost pad, or a line early enough to do something about
it. A camera tucked in behind the kart looks more dramatic and shows you less.

| Field | Before | After |
|---|---|---|
| `distance` | 9 | 17.5 |
| `height` | 3.6 | 7.5 |
| `lean` | 0.09 | 0 |
| `fovBase` | 62 | 56 |

Lean going to zero is a deliberate rejection, not a default left alone — noted in the source so a
later session does not helpfully put it back. The narrower FOV also partly offsets the extra
distance, keeping the kart from shrinking too far into the frame.

Unchanged and still doing the heavy lifting: `headingLag` 5 and `fovSpeedGain` 12.

### 2026-08-07 — KART_CONFIG (1b1), tuned by Riggs

**Why:** Faster and punchier. Top speed up 25%, acceleration up ~45%, everything else untouched.

_Reason recorded by Claude from the numbers._ Acceleration moved proportionally more than top
speed, which means the change is mostly about **how quickly the kart recovers**, not how fast it
ultimately goes. That is the right instinct for this project: Jodi gets knocked around by items and
by Kayla, and the whole Chapter 7 kart recommendation rests on acceleration and handling beating
top speed at 100cc. The drill now rewards the same thing the real game will.

| Field | Before | After |
|---|---|---|
| `maxSpeed` | 16 | 20 |
| `acceleration` | 11 | 16 |

Notably untouched: every steering and grip constant. `steerRate` 5.5 survived first contact, which
is the "responsive, not twitchy" number I expected to move most.

**Not signed off yet.** Gate 1b6 is the real test, once ramps, boost pads and a proper test track
exist to drive. These are good working values, not final ones.

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
