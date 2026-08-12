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
| Current phase | Phase 4, most of the way through — the whole course exists end to end |
| Current step | **4f1** final QA, blocked on a Mac; **2b9** video tone-watching; **3c2** recording |
| Last gate passed | Riggs playtested the Phase 1 pieces and cleared them in one go (2026-08-12), rather than gate by gate |
| Next gate | **2c1** full run-through · **3f1** cold click-through · **4f2** Jodi, watched silently |
| Repo state | All of Phase 1 built; Phase 2 assembled; Phase 3 done except the intro animation and the recording; Phase 4 done except launch QA |
| Deferred | nothing — 1a5 landed 2026-08-12 |
| Needs an answer | **Q9** accelerate slot (cosmetic now); ~~Q5~~ ~~Q7~~ ~~Q6~~ ~~Q8~~ answered |
| Not pushed | resolved 2026-08-12 — see the session entry below |

---

## Log

### 2026-08-12 — Session 9 (Opus 5)

**Steps touched:** **1f3** · **1a5** · **2a1** · **2a2** · **2b1–2b8** · **3a1** · **3b2** (ticked) ·
**3c1** · **3c3** · **3d1** · **4b1** · **4c1** · **4c2** · **4d1** · **4e1** · **4e2**

Riggs's instruction was to ignore gating and get the whole thing standing up in one sitting, having
playtested the Phase 1 pieces himself and found them good. So this session is the assembly.

**Four decisions he made at the start**, all of which unblocked something that had been sitting:

- **Push and deploy.** 1a5 is built and Pages is on. (Two human steps remain: add the two Supabase
  secrets to the repo, and set Pages' source to "GitHub Actions".)
- **Q5, the IP rule, is answered:** names are fine, artwork is not. That unblocked the Chapter 7
  recommender and the whole Chapter 8 cup guide, neither of which can work without naming things.
- **The database is live** — confirmed by screenshot, so 1f3 was written against the real schema.
- **Voiceover: scripts and a silent player**, waiting for his voice rather than substituting one.

**The shape of the build.** The foundation was written by hand — the sync module, the theme, the
chapter contract, the shell, the template, the reusable kart drill — and then the nine chapters were
authored in parallel against that frozen contract, eight agents on disjoint files. That split was
deliberate: the contract is the thing that had to be coherent, and chapters are content.

**Q7 is answered, because it blocked every drill.** One star for finishing, two and three at
per-chapter thresholds in `data/chapters.ts`. Three stars is set at "clearly got it" rather than at
mastery — a third star she can never reach is a third star that tells her she failed.

**Two deviations from the plan's ordering, both stated up front:**

- **The style guide (3a1) was built before the chapters, not after.** Nine chapters built plain and
  then restyled is the same work twice, and the second pass is the one that gets rushed.
- **The root URL is now the course; the Phase 1 lab moved to `/testbed/`.** The lab is kept rather
  than deleted, because the tuning panels live there and nowhere else — the course imports the
  components, not those pages.

**What the screenshots caught that the compiler could not.**

This is the part worth reading. Three real defects, none of which a typecheck or a lint could ever
have seen, and one of them was hidden by a *bad test I had just written*:

1. **Every chapter was serving the home page.** The doorman remembered the hash it booted on and
   restored it on the first `hashchange` after it closed — and on a normal visit that hash is `#/`,
   so the first chapter she opened threw her straight back home. The fix is smaller than the bug:
   after the doorman closes, just render whatever the address bar already says.
2. **My own render check passed while that was broken**, because it only asserted the page was not
   blank. Something always renders. Every route now carries a string it must actually contain, and
   that column is the entire value of the file.
3. **Chapter 8 was rendering the standard template** — no programme, no checkboxes, no cup guide,
   with the copy still promising "tick the boxes" above nothing at all. `custom` was in the contract
   and nothing ever called it. Then wiring it in naively printed the title and hook twice, because
   the custom page had been built to own its whole layout, as the contract said it would.

A fourth was a self-inflicted false alarm worth recording: chapter 5 failed the check because the
drill chapters dynamically import Three.js, `networkidle` can fire during a gap in that module
waterfall, and a fixed sleep sampled the page mid-"Loading…". Waiting for the expected text instead
of for a number of milliseconds fixed a bug in the test, not in the site.

**One design decision reversed by seeing it.** The header carried a miniature of the lap map. On
screen it is a grey squiggle with markers too small to read — it competed with the signature element
instead of supporting it. Replaced with a bar and a count, which is the only question a header has
to answer. The map earns its space at full size on the home page and nowhere else.

**Verified, and the word is doing real work here:** typecheck, lint and production build are clean;
all twelve routes render the page they are supposed to under real Chromium, asserted by content;
all four doorman roles behave, and the Kayla lockout genuinely refuses `#/chapter/ch1`. Code
splitting works — the shell is 18.8KB gzipped and Three.js only arrives for the four chapters that
drive a kart.

**Not verified, and still carried:** nothing has ever run on macOS, which is Jodi's only platform,
and the 60fps check is still outstanding (4f1). No Safari pass. The print stylesheet has never met a
printer. Nobody has played the course end to end for time, so the 30-to-45-minute target is a
target. `npm run shoot` is the tool for the first of those the moment a Mac is available.

---

### 2026-08-11 — Session 8 (Opus 5)

**Steps touched:** **1d1**, **1e1** (both built, both awaiting their gates)

**Did:**

- **1d1 quiz card** (`src/ui/quiz.ts`, `src/ui/quiz-diagram.ts`, three sample questions in
  `src/data/quiz/item-smarts.json`). The decision worth recording is that the *picture* is authored
  in the same JSON as the question — a road shape plus a list of who is standing on it, rendered to
  SVG. Chapter 2 wants eight to twelve situations, and any format where a situation costs an
  illustration is a format where those situations never get written. It also satisfies design
  principle 5 by construction: the art is generated, so no asset can enter the repo.
- Every answer carries its own reply, not just the right one. "Wrong, the answer was B" teaches
  nothing to the person who picked C. It costs roughly three times the copy per card, which is a
  real cost, so 1d2 gets asked whether it was worth it.
- `parseQuiz` validates the file at load and throws naming the question index and the missing
  field. JSON has no compiler and this is the one file here someone might edit without being a
  programmer.
- **1e1 Shield Up** (`src/engine/shield.ts`, `src/ui/shield-hud.ts`, `src/ui/beeps.ts`). The kart
  piece with something chasing it. See below — the mechanic took more thought than the code did.
- **Moved the Three.js scene** from `src/proto/kart/scene.ts` to `src/ui/kart-scene.ts`. Shield Up
  is the second drill to drive the same world and every Phase 2 chapter will be the third; the
  proto README says prototypes are throwaway and the real site never imports from them, which the
  old location quietly broke. Also gave the scene a shield bubble, a held item, the seeker and a
  resolution burst.
- Added `index` to `PathPoint` and a `bendAhead()` helper to `track.ts`, so a drill can ask whether
  the road ahead is straight.

**The Shield Up mechanic, and why it is built this way:**

The obvious version of this drill punishes holding the key too early, and it would be wrong. The
habit Chapter 2 exists to build is *hold the item behind you as a matter of course* — the plan's
own words are "why holding a banana behind you wins races" — so a drill that charges for holding
early would train the opposite of the lesson, and a drill with no cost at all would train mashing.

The resolution is the real game's: **releasing throws the item.** So holding is free, letting go is
what costs you, and the fake-outs earn their place — they are not there to punish the hold, they
are there to bait the *relieved release* when the threat veers off, which leaves you empty-handed
with the next siren already starting. A fake gives itself away only in the last 10% of its
approach, late enough that acting on it is a mistake rather than a skill.

One softening: releasing only costs the item while a threat is live. Losing your armour for idly
tapping the key on an empty straight would be consistent and would feel like a trap.

**Notes:**

- Threats only start where the road ahead is straight (`straightsOnly`). Being asked to hold a key
  and survive a hairpin at once tests two things and teaches neither.
- **There is deliberately no top-down view on the Shield Up page**, unlike the kart harness. An
  instrument showing the shell closing in from above would answer the exact question gate 1e2 asks.
- The siren pips are **synthesised** with a few oscillators (`src/ui/beeps.ts`) — no audio file, no
  licence, and the pitch and length tune like any other feel constant. A warning has to be audible
  or it trains looking away from the road to find out whether you are about to be hit. There is a
  mute button, and any browser that refuses audio just stays quiet.
- **Windows Filter Keys**: holding *right* Shift for eight seconds pops a system prompt. The item
  key is Shift by default, and this drill asks you to hold it for a long time. Flagged on the page
  and worth remembering at 1g1, which picks the final bindings.
- Nothing on either page has been seen running. I cannot open a browser, so "built" here means it
  compiles, lints and builds — not that it looks right.

**Ready for review — two gates at once:**

- **1d2 (quiz):** does it feel like a fun quiz moment rather than a test? Nothing is red, there is
  no timer and no streak, on purpose — say if it still feels like being marked. Also: is a
  per-answer reply worth three times the copy? And the sample copy is a first draft in the intended
  voice; if the jokes are wrong, or Kayla would never do that, say so.
- **1e2 (Shield Up):** is the threat legible from the driving view alone? Is the hold-to-shield
  habit forming after two minutes — that is, do you start holding *before* the siren? The 30%
  fake-out rate and the 2000 ms warning lead are both guesses and both on the tuning panel.

**Next:** 1f3, the progress sync module — the last unbuilt piece in Phase 1, and the one 2a1
depends on.

---

### 2026-08-11 — Session 8, third pass (Opus 5)

**Steps touched:** **1d1**, **1e1** (both again, on Riggs's feedback)

- **Shield Up: no more near misses.** "If there's a red shell and you're not shielding, it will
  hit you." So the fake-outs are gone — including the clause in 1e1's own wording that asked for
  them — along with the whole question of whether a dropped banana catches the shell. The model is
  now one line: the banana is behind you, or the shell hits you. Anything softer teaches that not
  holding sometimes works out, which is the belief the drill exists to remove.
- A dropped banana is now only *shown* for about a second before vanishing, rather than lying in
  the road. It is feedback for what letting go just cost, not an object — a banana still sitting
  there when the shell drives over it would imply a rescue that no longer exists.
- **Ch2's thesis is now settled: entirely defensive.** Anything that can block gets held and never
  fired; the red shell is the one exception, because it steers itself and is therefore the only
  item that scores without aiming. Riggs's filter, and it is a good one: *low skill, high reward.*
  Jodi will not reliably land a green shell on a moving kart, so nothing in the deck asks her to.
- **The quiz is now ten researched cards**, which drafts 2b3. What the research changed, as
  opposed to confirmed:
  - **Two item slots, and a full pair means the next item box gives you nothing at all.** That is
    a whole card ("spend the junk on the way in") and it was not in my head before looking.
  - **Triple bananas and triple shells orbit you without holding anything.** The hold habit has an
    edge case, and teaching "always hold" without it would be teaching a wrong thing.
  - **A coin is worth spending**: two coins, a small speed top-up toward the ten-coin cap, and you
    lose three every time you are hit. Coins are about half of what first place is ever handed, so
    "coins are junk" would write off half her item boxes.
  - **Bob-ombs are thrown backwards, never held** — they go off on their own and do not care whose
    they were. The exception that makes the hold rule sharper.
  - Nintendo Life's own guide recommends leaving bananas **where item boxes spawn**. That is the
    purest low-skill/high-reward play in the game: everyone has to drive at the boxes.
- Three of those are worth Riggs double-checking against the real game, and the page says so.

---

### 2026-08-11 — Session 8, second pass (Opus 5)

**Steps touched:** **1d1**, **1e1** (both revised on Riggs's feedback, same day)

- **Quiz bug, and a good one to remember.** The previous card's answer stayed on screen behind the
  next question. `.quiz-reply` sets `display: grid`, which silently beats the browser's own
  `[hidden] { display: none }` — equal specificity, and an author stylesheet always wins over the
  user-agent one. Setting `hidden` in JavaScript therefore did nothing at all. Any element styled
  with a `display` rule needs its own `[hidden]` rule to go with it.
- **Shield Up is now a banana, not a shield** (Riggs). Picked up from item boxes, held behind the
  bumper, and when released it falls on the road and stays there. A dropped banana can still catch
  the shell — it is lying in the road — but only if the shell comes through where it landed, which
  is what makes letting go a gamble rather than a plan. Held, it cannot miss.
- Four rows of item boxes around the lap (`TEST_TRACK_ITEM_BOXES`, kept separate from the kart
  piece's layout). Blocking spends the banana, so a good block is followed by a hunt for a box.
- The warning is now the real game's indicator: a drawn shell icon rather than the words "red
  shell". A picture is read from the corner of the eye; a line of text has to be looked at, and
  looking at it means not looking at the road.
- **One number I cannot judge without playing it:** `catchRadius`, how near a dropped banana the
  shell has to pass to hit it. It decides whether dropping is a fair last-second defence or a
  gamble, and if it is too generous then letting go becomes as good as holding — which teaches the
  exact opposite of Chapter 2. Flagged on the page; watch how often `drop-blocked` appears.

---

### 2026-08-08 to 2026-08-10 — Sessions 5 to 7 (Opus 5, not logged at the time)

The log skipped three sessions. Recorded here as an index only; the reasoning for each decision is
in the commit messages, the build-plan annotations and `TUNING.md`, all of which were kept current.

- **1b3** track furniture, **1b4** steer-assist guardrail (Riggs: "similar to the real game"),
  **1b5** the test circuit. Settled **Q6**: tracks are a plain typed array positioned by `t` around
  the lap and a lateral `offset`.
- Boost and trick feedback; trick verdicts moved to the lip rather than the landing; too early /
  too late / got it calls (which took two goes — the first version read the live key state, and a
  hop is a tap).
- Half-pipes replaced the decoy pads, then were **cut** on Riggs's call; Chapter 4 became "pads sit
  off the natural racing line" instead.
- **3b2 art pass** run early, plus two fixes found by Riggs from screenshots: chequered-line seams,
  and crawling stripes on the road (z-fighting, fixed with polygon offset, explicit up normals and
  a far more sensible near plane).
- **1c1** the start-boost countdown drill.
- **1f1** and **1f2** Supabase: schema, RLS, magic-link sign-in, and generated database types.

### 2026-08-07 — Session 4 (Opus 5)

**Steps touched:** **1b1**, **1b2** (both done and confirmed by Riggs)

**Did:**

- **1b1 kart physics** (`src/engine/kart.ts`). Auto-forward always on, no throttle and no brake,
  because Jodi plays with auto-accelerate and steering is therefore the entire interface. The slide
  comes from tracking velocity as a vector independently of heading and letting `grip` pull them
  together — turn the nose and the kart keeps travelling the old way for a moment, and that gap is
  the drift. Yaw carries two speed terms pulling opposite ways: authority fades to zero at a
  standstill (a parked kart pirouetting breaks the illusion instantly) while the high-speed penalty
  widens the turn at top speed (which makes a fast lap feel committed rather than remote-controlled).
- **1b2 chase camera** (`src/engine/chase-camera.ts`, scene in `src/proto/kart/scene.ts`). Three.js
  over the same 2D physics. Almost the entire camera is lag — position, heading, lean, and speed
  FOV — because a rigidly-mounted camera looks correct and feels dead. The ideal camera position is
  computed along the *camera's* lagging heading, not the kart's; using the kart's would cancel the
  lag out entirely, which is the easy mistake here.
- Harness shows both views: chase view as the stage, top-down retained below as the instrument,
  both rendering from one interpolated pose per frame so they cannot disagree.
- **Riggs tuned and signed off both configs.** Applied as the new defaults; full before/after and
  reasoning in `TUNING.md`.

**What the tuning told us:**

- Camera went from close-and-low to **far-and-high** (distance 9 → 17.5, height 3.6 → 7.5). That is
  a shift from framing the kart to framing the road ahead — which suits a site where every drill
  from Ch3 on is about seeing a ramp or a pad early enough to react.
- **Lean rejected outright** (0.09 → 0). Recorded in the source as deliberate so a later session
  does not helpfully restore it.
- Kart got faster and much punchier (maxSpeed 16 → 20, acceleration 11 → 16). Acceleration moved
  proportionally more, so the real change is recovery speed — which happens to be exactly the trait
  Ch7's kart recommendation is built around.
- Every steering and grip constant survived untouched, including `steerRate`, the number I most
  expected to move.

**Notes:**

- Three.js adds ~132KB gzipped to the kart page. Fine for a driving drill; worth revisiting in
  Phase 2 so the concept-only chapters do not drag it in.
- Riggs pasted back the **Copy config** output rather than the **Copy TUNING.md entry** output. Both
  work — the second one just carries the before/after and a Why prompt, so it costs me less
  guessing. The Why lines in this round's TUNING.md entries are my reading of the numbers, labelled
  as such, and should be corrected if wrong.
- Eight commits ahead of `origin/main`; still nothing pushed.

**Next:** 1b3 track furniture — boost pads, ramps with a trick-timing window at the lip, decoys that
resemble pads but punish blind commitment, and coins. This is the first step where the answer is a
tuned number in milliseconds rather than a shape on screen.

---

### 2026-08-07 — Session 3 (Opus 5)

**Steps touched:** **1a2**, **1a3**, **1a4** (all done) — section 1a Foundation complete

**Did:**

- **1a2 input layer** (`src/engine/input.ts`, readout at `src/proto/input`). Bindings are on
  `KeyboardEvent.code`, so a key stays where it physically is regardless of layout or modifiers.
  Three problems it exists to solve: events are queued and drained by `sample()` once per sim tick
  so a tap between two ticks is never dropped (needed for 1b3 trick timing and 1c1); opposed steer
  keys resolve last-press-wins rather than cancelling to zero, because cancelling reads as the kart
  ignoring you mid-correction; and blur/tab-hide release everything, since the browser sends no
  keyup for a key released while unfocused and a stuck key drives the kart into a wall.
- **1a3 game loop** (`src/engine/loop.ts`, demo at `src/proto/loop`). Fixed 120Hz sim, interpolated
  render. Long frames are clamped at 250ms and the excess discarded rather than queued — otherwise
  one slow frame queues extra steps, slowing the next frame, queueing more (the spiral of death).
  Dropped time is shown in the readout rather than hidden. Resume after a pause discards elapsed
  wall-clock so the kart does not fast-forward through the time Jodi spent in another window.
- **1a4 tuning panel** (`src/engine/tuning.ts`, demo at `src/proto/tuning`) + created `TUNING.md`.
  Live controls bound to any plain config object, mutated in place so the sim sees changes on the
  next tick. It snapshots the values the code shipped with and never touches that baseline, so
  **Copy TUNING.md entry** emits a real before → after table for the fields that moved, with the
  Why left blank for a human. That was deliberate: the plan requires a tuning log, and a log that
  depends on someone remembering to write it is a log that stops getting written.
- **Fixed a bug Riggs found:** the testbed index sat on "Loading…" forever.

**Verified:** Riggs loaded all three prototypes — index list populates, 1a2 responds, 1a3 runs
clean. That is the section 1a acceptance criterion met, on Chrome/Windows.

**The "Loading…" bug, and what it cost:**

`new URL(path, base)` requires an absolute base. `import.meta.env.BASE_URL` is `/` in dev and
`/mario-kart-master/` in a build — both relative — so it threw on the first prototype row with a
link, `replaceChildren` never ran, and the placeholder stayed.

It survived my checks because I verified the routes returned HTTP 200 and treated that as
verification. A 200 proves the server hands back HTML; it says nothing about whether the script ran.
I have no browser automation in this environment, so **"does the page actually render" is something
I cannot confirm alone** — it needs Riggs's eyes, and I should ask rather than imply I checked.

Mitigation shipped: `src/ui/error-banner.ts`, imported first on every page, paints any error or
unhandled rejection across the top in red with its stack. A silent placeholder is the worst failure
mode on a lab page — it burns the tester's time before the test starts.

**Notes:**

- `exactOptionalPropertyTypes` makes an omitted property and an explicit `undefined` different
  types, so option interfaces that accept a `querySelector` result need `?: T | undefined`. Noting
  it because it will recur on every widget in 1b.
- Four commits now sit ahead of `origin/main`; nothing pushed yet, still awaiting that call.

**Next:** 1b1, kart physics on a 2D plane — auto-forward always on, speed-sensitive steering, slide,
off-road slowdown, wall bounce, every constant on the tuning panel. This is where the project's real
risk starts, and it ends at gate 1b6 with Riggs driving.

---

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
9. **The `accelerate` slot.** The plan's action map is steer/hop/item/uiConfirm, but Ch1's
   start-boost drill needs a hold-the-accelerator input, so 1a2 added a fifth slot. It defaults to
   Space, shared with `hop`, on the reasoning that the countdown drill and the driving drills are
   never on screen together. Confirm or rebind at gate 1g1.
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
