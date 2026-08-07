# PLAN.md: Beat Kayla

**Repo:** https://github.com/riggsmcgee/mario-kart-master.git (default branch `main`, GitHub Pages deploys from it)

A linear, one-sitting website that teaches Aunt Jodi the concepts she needs to beat her daughter Kayla at Mario Kart 8 Deluxe, then hands her a practice program for the real game. Browser time is deliberately minimal: the site explains concepts she may not know (like boosts off ramps), lets her feel each one once in a small interactive moment, and pushes all real training onto the Switch.

This file is the working plan for Claude Code in VS Code.

**How to use this file (read this first, every session):**

1. Find the earliest incomplete phase and its first unchecked step. That is the current work. Steps have IDs of the form `{phase}{letter}{number}` (1a1, 1b2, 2a1, ...); work them in order and check them off here as they complete.
2. Steps marked **GATE** or *(human)* belong to a person, Riggs unless another name is given. When you reach one, stop, summarize what is ready for review, and wait. Never check a gate yourself, and never start a phase before the previous phase's gate is checked.
3. Model tags like *(Opus)* or *(Sonnet)* are recommendations for which Claude model best fits that step. If you are a different model, proceed anyway; the tag is guidance, not a blocker.
4. Read the Decision log at the bottom before proposing changes. Most "why is it like this?" questions are answered there. New decisions get appended there, dated.

**The core build rule (the Lego rule):** Phase 1 builds and validates every interactive component in isolation, on a bare testbed, before anything is integrated. Phases 2 through 4 assemble the real site out of those proven components. Like a Lego sculpture: make the individual pieces first, and no assembling until every piece feels right in the hand.

---

## The player

| Setting | Value |
|---|---|
| Player | Aunt Jodi (named throughout the site) |
| Rival | Kayla, her daughter |
| Game | Mario Kart 8 Deluxe (Switch) |
| Steer assist (smart steering) | ON |
| Auto-accelerate | ON |
| Tilt controls | OFF (stick steering) |
| Controller | Single sideways Joy-Con (shoulder button reachable) |
| Typical races | 100cc or lower, items on, vs Kayla |
| Her computer | Mac, Chrome, keyboard only |

The site simulates HER Mario Kart, not tournament Mario Kart. And above winning: the whole thing should make her smile, even if she never beats Kayla.

**The family cast** (copy references these people by name):

| Person | Role |
|---|---|
| Jodi | The student. The site is hers. |
| Kayla | The rival. Younger daughter, wins on reaction speed. |
| Bill | Jodi's husband. Potential secondary student (see 4e, the doorman). |
| Kendahl | Older daughter, Kayla's sister. The living proof: no item defense, no drifting, zero risks, excellent lines, and she often outperforms Kayla. Guest star of Ch5. |
| Riggs | The project owner, coach, and narrator (voiceovers). The human behind every gate. |

**The strategic thesis:** Kayla wins on reaction speed. Jodi cannot out-react her, but she can out-know her. Every choice in this plan (skills taught, cup chosen, depth of track guides) tilts the contest away from reactions and toward preparation and memorization. Kendahl is the existence proof that this works inside this exact family: clean lines and no risks already beat Kayla regularly, without a single flashy technique.

---

## What we know (facts and assumptions)

**Confirmed by Riggs in-game:**

- Holding A during the countdown WITH auto-accelerate ON still grants a start boost. Start timing is a real, trainable skill (Chapter 1).

**Assumed defaults from published sources (treat as true unless the site's claims ever conflict with what she sees in-game):**

- Smart steering blocks the purple ultra mini-turbo; blue and orange mini-turbos still work. Reference boost durations from Nintendo's tutorial: mini-turbo 0.621s, super 1.674s, ultra 2.633s (ultra listed for context only).
- Smart steering prevents falling off the track and resists driving off the main route, so off-road shortcuts are out of scope.
- Trick boosts trigger by pressing the hop/shoulder button right at a ramp lip.

**Keyboard reality check:** keys are digital, a stick is analog, so the browser cannot train smooth steering or precise stick control. That is fine. The browser teaches concepts and timing; the Switch trains hands.

---

## The product: one linear course

No hub world. A straight line with a progress bar. Target: completable in a single sitting, 30 to 45 minutes total. Chapter order set by Riggs (2026-08-06), highest-impact skills first:

| Chapter | Skill (Riggs's ordering) | Interactive element |
|---|---|---|
| Ch0 | "So you want to beat Kayla at Mario Kart? Here's how." | Animated intro, voiceover, the promise |
| Ch1 | Start boost | Countdown timing mini-game |
| Ch2 | Item smarts | Shield Up defense drill + item decision quiz + mushroom concept |
| Ch3 | Ramp tricks | Trick-timing kart drill (hop at the lip) |
| Ch4 | Boost pads (and what look like boost pads but aren't, like half-pipe ramps) | Kart drill with real pads AND decoys; spot-the-difference quiz cards |
| Ch5 | Racing lines and coins (include paths between boosts here) | Kart drill: painted line linking pad-to-pad routes and coin clusters, line fades as she improves |
| Ch6 | The drift, explained (concept only) | Animated diagram + video, no drill; includes a 30-second drafting/slipstream aside |
| Ch7 | One-time setup: pick your character and kart | Recommender presenting 2 or 3 named combos; framed as the bridge: "you're ready, go set up your Switch" |
| Ch8 | The Kayla Plan: practice program + cup choice + map-by-map guide | Program with checkboxes, two-stage track guides, printable |

Chapter template (every chapter uses it): hook → concept explained with animation/voiceover → short video clip (YouTube embed) → interactive moment → "On the Switch" card (exactly what to practice in the real game) → done stamp.

**Design principles, in priority order:**

1. Make her smile. Warm, funny, personal. Jodi and Kayla are named throughout.
2. Mirror her real settings. In every driving drill, auto-forward is always on and no accelerate input exists. One deliberate exception: the Ch1 start-boost game simulates holding the accelerate button during the countdown, because that is the one moment the real game rewards it even with auto-accelerate on.
3. Concepts, not grinding. Each interactive moment is 2 to 5 minutes, generous difficulty, ends on a win.
4. Big and readable. Large type, high contrast, one obvious "next" button.
5. Original art only. No Nintendo assets, names, or characters. Track diagrams are original simplified schematics. Tutorials via standard YouTube embeds. Never monetize.

---

## Tech decisions

- **Stack: Vite + TypeScript.** No game framework for logic.
- **Kart view mimics the real game: behind-the-kart chase camera.** Rendering via **Three.js** (flat stylized track, simple shapes, chase cam); kart physics stay hand-rolled on a 2D plane underneath the 3D presentation. If the 1b prototype fails the feel gate, fallback is a Mode 7 style canvas projection (decision logged then).
- **Input: keyboard only.** Arrow keys / A-D steer, one key for hop/trick, one key for item. Joy-Con and gamepad support is cut to backlog.
- **Widgets (timing game, quiz) are plain DOM/CSS**, not canvas.
- **Backend: Supabase, multi-user from day one** (decision 2026-08-06: Riggs wants backend practice, and the site should be ready for more than one user).
  - `@supabase/supabase-js` client from the static site; GitHub Pages hosting still works, no server to run.
  - **Auth: email magic link** (passwordless). Jodi types her email once, clicks a link, done. A "keep me signed in" long session so she realistically logs in once ever.
  - **Schema sketch:** `profiles` (id, display_name, role: `jodi` | `bill` | `kayla` | `other`), `chapter_progress` (user_id, chapter_id, status, stars, best_score, updated_at), `plan_checks` (user_id, item_id, checked_at). Row Level Security on everything: users read/write only their own rows. The `role` field powers the doorman (4e).
  - **Offline resilience:** localStorage acts as a write-through cache; the site never blocks on the network, and syncs when it can.
  - Supabase anon key ships in the client via Vite env vars (safe by design with RLS; never ship the service key).
- **Audio: static mp3 voiceover files** per chapter + a few WebAudio SFX. Mute toggle, persistent.
- **Deploy: GitHub Pages** via Actions on push to `main`. Primary test target: Chrome on macOS.

---

## Phase 1: The Testing Ground (making the Lego pieces)

The first version of the site is a bare lab, deliberately nothing like the final product: an unstyled index page linking to isolated prototypes, each with visible tuning sliders and readouts. Its only job is to answer, with measurements and hands-on feel: what does controlling a kart feel like, what does a timing game feel like, what does a quiz feel like, what does logging in feel like. No complexity lands until these gates pass.

### 1a. Foundation

- [x] **1a1** Scaffold Vite + TS, ESLint/Prettier, folder layout (`src/engine`, `src/proto`, `src/ui`, `src/data`), bare testbed index page. Vite `base` is `/mario-kart-master/` on build and `/` in dev, so switching Pages on later is one step. *(Sonnet)* — done 2026-08-06. GitHub Pages deploy action split out to 1a5 (deferred by Riggs, local dev for now).
- [ ] **1a2** Keyboard input layer: action map (`steer`, `hop`, `item`, `uiConfirm`), rebindable, with a live input readout widget for the testbed. *(Opus)*
- [ ] **1a3** Game loop: fixed-timestep sim (120Hz), interpolated render, pause on tab blur, FPS readout. *(Opus)*
- [ ] **1a4** Tuning panel framework: live sliders bound to any config object, copy-config-to-clipboard, and a `TUNING.md` log (what changed, why, before/after). *(Sonnet)*
- [ ] **1a5** GitHub Pages deploy action (Actions workflow on push to `main`). **Deferred by Riggs 2026-08-06** — testbed runs on localhost for now. Pick this up whenever a live URL is wanted; `base` is already configured. *(Sonnet)*

**Acceptance:** `npm run dev` loads on Mac Chrome; input readout responds; loop holds 60fps idle. (Deployed-URL check moves to 1a5.)

### 1b. Kart piece (chase view)

- [ ] **1b1** Kart physics core on a 2D plane: auto-forward always on, speed-sensitive steering, slight slide, off-road slowdown, wall bounce. All constants on the tuning panel. *(Opus)*
- [ ] **1b2** Three.js presentation: stylized flat track, placeholder kart, behind-the-kart chase camera with slight lag and lean. This is the step that makes the view mimic the real game. *(Opus)*
- [ ] **1b3** Track furniture: real boost pads, ramps with height and a trick-timing window at the lip (hop key at the right moment = landing boost), decoy elements that resemble pads but behave differently (half-pipe style ramps), collectible coins with counter to 10. *(Opus)*
- [ ] **1b4** Steer-assist guardrail: soft force near track edges mimicking smart steering, toggleable. *(Opus)*
- [ ] **1b5** Test track: loop with a hairpin, a U-turn, a chicane, two ramps, real pad strips, one decoy, a coin line. *(Sonnet)*
- [ ] **1b6 GATE (Riggs):** drive 5 minutes. Checklist: the view reads as "Mario Kart-ish" instantly; steering responsive not twitchy; tricks feel snappy; the decoy fools you once; guardrail feels like the real assist; 60fps on a normal Mac. Log measurements and the signed-off config in `TUNING.md`.

### 1c. Timing piece

- [ ] **1c1** DOM-based countdown-and-tap component: 3-2-1 sequence, press and hold at the right moment (mimicking holding A as the "2" finishes its descent in the real game), result shown in milliseconds with generous/medium/tight window settings. Reusable for Ch1. *(Opus)*
- [ ] **1c2 GATE (Riggs):** does nailing the window feel satisfying? Is the feedback readable at a glance? Tune window sizes.

### 1d. Quiz piece

- [ ] **1d1** DOM quiz component: situation image/diagram + 2 to 4 big answer buttons + a warm explanation on answer, right or wrong. Authoring format: plain JSON. Three sample questions. *(Sonnet)*
- [ ] **1d2 GATE (Riggs):** does it feel like a fun quiz moment, not a test? Adjust tone and pacing.

### 1e. Shield Up piece (item defense toy)

- [ ] **1e1** On the kart piece's straightaway: a red shell warning appears (icon + siren pip), shell approaches from behind, holding the item key raises a shield that blocks it; includes fake-out warnings that resolve harmlessly, so holding early/late has visible consequences. *(Opus)*
- [ ] **1e2 GATE (Riggs):** is the threat legible? Is the hold-to-shield habit forming after 2 minutes of play?

### 1f. Backend piece (Supabase)

**DEFERRED (Riggs, 2026-08-06).** No Supabase project exists yet. Build 1a through 1e first; this section is a hard pause point until Riggs creates the project. Until then the testbed persists nothing beyond localStorage, and 2a1's sync dependency stays unmet.

- [ ] **1f1** Supabase setup. Human prerequisite first: Riggs creates the Supabase project (free tier) and puts the project URL + anon key in `.env.local` (gitignored) and in the repo's Actions secrets for the Pages build. Then: schema from Tech decisions as SQL migrations checked into `supabase/migrations`, RLS policies, seed a test user. *(Opus)*
- [ ] **1f2** Auth prototype on the testbed: magic-link sign-in page, session persistence, signed-in state readout, sign-out. *(Opus)*
- [ ] **1f3** Progress sync module: typed read/write API for chapter progress and plan checks, write-through localStorage cache, retry on reconnect, "last synced" readout on the testbed. *(Opus)*
- [ ] **1f4 GATE (Riggs):** sign in from a fresh incognito window using only an email. Checks: the flow would not confuse Jodi; progress written on one browser appears on another; the site still works with wifi off (and syncs after). Log any friction.

### 1g. Phase gate

- [ ] **1g1 GATE (Riggs):** all piece gates passed; pick final key bindings; write a decision-log entry on what the feel work taught us. Only now does assembly begin.

---

## Phase 2: The Course (assembling the sculpture)

Build the real linear site out of the proven pieces. Content quality is the point of this phase; visuals stay plain (the delight pass is Phase 3).

### 2a. Course shell

- [ ] **2a1** Linear navigation: chapter list, progress bar, done stamps, "continue where you left off," all persisted via the 1f3 sync module (works across her devices). Settings page: display name, mute, sign-out. *(Opus)*
- [ ] **2a2** Chapter page template implementing the standard flow (hook → concept → video → interactive → On-the-Switch card → done stamp). *(Sonnet)*

### 2b. Chapters

Each chapter step includes drafting its copy (plain, warm, funny; Jodi and Kayla named), wiring its interactive element from the Phase 1 pieces, embedding its verified video, and writing its On-the-Switch card.

- [ ] **2b1** Ch0 intro: "So you want to beat Kayla at Mario Kart? Here's how." Sets the promise and the tone. Placeholder animation slot for Phase 3. *(Opus)*
- [ ] **2b2** Ch1 start boost: concept + timing mini-game (1c piece). Confirmed to work with her auto-accelerate setting. *(Opus)*
- [ ] **2b3** Ch2 item smarts: Shield Up drill (1e piece) + item decision quiz (1d piece, 8 to 12 situations: what to use, when, from 1st vs from 8th, why holding a banana behind you wins races) + a short "mushrooms are for straightaways" concept bit. *(Opus)*
- [ ] **2b4** Ch3 ramp tricks: concept + drill: trick off every ramp on the loop, score = clean tricks, feedback in milliseconds. *(Opus)*
- [ ] **2b5** Ch4 boost pads real and fake: concept + drill: hit every real pad, correctly handle decoys (half-pipe style ramps that punish blind commitment) + spot-the-difference quiz cards using schematic images. *(Opus)*
- [ ] **2b6** Ch5 racing lines and coins: concept + drill: painted ideal line that routes pad-to-pad and through coin clusters (the "paths between boosts"), line fades as she improves, goal is 10 coins held at lap end. Scored generously, 1 to 3 stars. The concept section leads with the Kendahl case study: she doesn't drift, doesn't defend with items, never takes risks, just holds very good lines, and she often beats Kayla. Lines are the highest-floor skill in this family, and Jodi's role model is her own daughter. *(Opus)*
- [ ] **2b7** Ch6 the drift, explained: concept only. Animated diagram of when a drift helps (long corners), what blue and orange sparks mean, why her assist setup still allows them, plus a 30-second drafting/slipstream aside. Video embed. On-the-Switch card sends the practice to the real game. No browser drill. *(Opus)*
- [ ] **2b8** Ch7 pick your weapon: character + kart recommender, decided by research (2026-08-06). At 100cc with items on, acceleration and handling beat top speed (she gets knocked around and needs to recover fast), and Roller-class tires carry every build. Present as three named personalities, not a stats table:
  - **The Comfy Speedster (headline pick): Yoshi + Teddy Buggy + Roller (or Azure Roller) tires + Cloud Glider.** The widely recommended forgiving build: quick recovery, easy handling, strong mini-turbo.
  - **The Zippy One: Toad (or any baby character) + Biddybuggy + Roller.** Maximum acceleration; tradeoff is being light enough for Kayla to bump around.
  - **The Steady One: Waluigi + Wild Wiggler + Roller.** Heavier and harder to shove, slightly slower to recover.
  Chapter ends as the bridge: "That's the classroom done. Go set these on your Switch right now." *(Opus)*
- [ ] **2b9** Video curation: links are already verified (see shortlist below); watch each for tone (encouraging, not sweaty), trim to one short embed per chapter via start-time parameters where useful. *(Sonnet)*

### 2c. Phase gate

- [ ] **2c1 GATE (Riggs):** full run-through start to finish, signed in. Checks: total time lands in 30 to 45 minutes; every interactive ends on a win; copy makes YOU smile; progress survives sign-out/sign-in; nothing assumes knowledge Jodi does not have. Fix before Phase 3.

---

## Phase 3: The Delight Pass

Theme, motion, voice, sound. This is the "make her smile" phase.

- [ ] **3a1** Style guide: bright arcade palette, chunky rounded type and buttons, original mascot (suggestion: "Turbo Jodi," a grandma-fast tortoise in a kart), zero Nintendo IP. One page, then applied site-wide. *(Opus)*
- [ ] **3b1** Intro animation for Ch0 (the site's one big animated moment) + light micro-animations per chapter: concept diagrams that move, done-stamp thunk, confetti on 3 stars. Respect `prefers-reduced-motion`. *(Opus)*
- [ ] **3b2** Kart drill facelift: themed track, kart, and sky replacing placeholder shapes. *(Sonnet)*
- [ ] **3c1** Voiceover scripts: 60 to 90 seconds per chapter, written to be read aloud by Riggs, conversational, teasing, personal. *(Opus)*
- [ ] **3c2** Record voiceovers *(human: Riggs, QuickTime or Voice Memos, quiet room, phone mic is fine)*. Fallback if recording stalls: a warm TTS voice, but Riggs's actual voice is the gift here.
- [ ] **3c3** Audio integration: per-chapter player with a big play button, auto-pause when a drill starts, full transcript visible beneath (accessibility + skimmers). *(Sonnet)*
- [ ] **3d1** SFX: engine hum, coin ping, star fanfare, shield thunk. Original, subtle, mutable. *(Sonnet)*
- [ ] **3e1** Readability pass: large type everywhere, contrast check, focus states, no information carried by color alone. *(Sonnet)*
- [ ] **3f1 GATE (Riggs):** click through the whole site cold. Question: would you be proud to send her this link as a present? Lighthouse performance stays 90+.

---

## Phase 4: The Kayla Plan and launch

Content first, page second. Ch8 is coaching material for the real game.

### 4a. Cup selection (Jodi's home turf): DECIDED, Mushroom Cup

The cup is chosen for Jodi's maximum advantage, not Kayla's preference. Selection criteria:

- Beginner friendly: wide roads, forgiving layouts.
- Rewards knowing the track over reacting fast: fixed hazards on fixed timing are fine; randomized moving obstacles that differ every race are disqualifying (they reward reaction speed, which is Kayla's game).
- No RNG gimmicks (randomized ramp layouts, shifting course elements).
- Generous boost pads and coin lines (so her trained skills pay off).
- Longer tracks preferred over chaos tracks (dilutes item luck).

**Decision (2026-08-06, research-based): the Mushroom Cup.** Mario Kart Stadium, Water Park, Sweet Sweet Canyon, Thwomp Ruins.

Why it wins the criteria: it is the game's gentlest cup overall (Mario Kart Stadium is routinely cited among the easiest tracks in the game); every hazard in all four tracks is fixed-position or fixed-cycle (Thwomp Ruins' thwomps pound on a learnable rhythm, which converts Kayla's reaction edge into a Jodi memorization edge); three of the four tracks have genuine path-choice knowledge (Stadium's dash-panel outer path, Sweet Sweet Canyon's blue/pink split, Thwomp Ruins' wall-vs-floor and glider choices) that reward preparation invisibly; coins and boost pads are generous; and it ships with every copy of the game, no Booster Course Pass dependency.

Runner-up: Flower Cup (Toad Harbor's trams add a mild moving-obstacle element). Disqualified examples that validate the criteria: Toad's Turnpike (random-feeling traffic, almost certainly the track Riggs remembered), Excitebike Arena (randomized ramp layouts), Baby Park (pure item chaos, maximizes luck and reactions).

- [ ] **4a1 GATE (Riggs):** confirm Mushroom Cup, or veto with a reason (e.g. "they always play with the BCP tracks") and re-run selection against the same criteria.

### 4b. The program

- [ ] **4b1** Author the program. *(Opus)* Contents:
  - **Weekly rhythm:** 3 to 4 Switch sessions per week, 15 to 20 minutes each. The website is revisited only as a refresher.
  - **Per-skill Switch practice:** for every chapter, the exact real-game exercise. Examples: Ch1 → every race, hold A on the "2"; Ch5 → Time Trials vs her own ghost on Mario Kart Stadium and Water Park (the cup's two gentlest tracks), goal is beating her ghost, not lap records; one solo 100cc race where the only goal is finishing with 10 coins; Ch2 → one race using items defensively only.
  - **Own-the-cup training:** run the Mushroom Cup vs Hard CPU at 100cc until top-3 is routine, then until winning it is routine.
  - **Cup steering:** when it's Jodi's turn to pick, she picks her trained cup or its tracks, every time. No mercy picks.
  - **Milestone ladder:** beat your own ghost → top 3 vs Hard CPU → win the cup vs CPU → take a race off Kayla → win the full cup against her. Each milestone points back to the chapter to revisit if stuck.
  - **Race-day card:** the chosen character/kart combo, and the reminder that one banana held behind you beats ten mid-pack heroics.

### 4c. Map-by-map cup guide (two-stage depth)

Original schematic diagrams only (subway-map style, no Nintendo artwork). One guide per Mushroom Cup track. Research seeds for all four tracks are in the Appendix; these steps turn the seeds into finished guide content written in the site's warm coaching voice, addressed to Jodi.

- [ ] **4c1** Stage 1, overview cards: per track, the layout schematic with 3 or 4 callouts from the Appendix seeds: real boost pads, coin clusters, the one hazard that matters, where ramp tricks live. Visible from day one of the program. *(Opus)*
- [ ] **4c2** Stage 2, deep dives: per track, the memorization payload from the Appendix seeds: path choices with reasons, full recommended line per section, hazard timing notes, what to do in Time Trial on this track, and the verified track video embed. Labeled "come back to this in week 3": visible but explicitly scheduled for the midpoint of training, when she has the vocabulary and reps to absorb it. *(Opus)*

### 4d. Build

- [ ] **4d1** Build Ch8: program with checkboxes (synced via 1f3), cup guide with overview/deep-dive tabs, printable one-pager (weekly plan + milestone ladder, print stylesheet, for the fridge). *(Sonnet)*

### 4e. The doorman (deliberately one of the last things implemented)

On first visit after sign-in, before Ch0, the site asks: **"Who's training?"** Four options, role saved to the profile:

- **Jodi:** the default experience, exactly as built.
- **Bill:** the identical course with every name swap templated to Bill, and the Ch7 recommender reskinned more masculine (headline becomes The Steady One, Waluigi + Wild Wiggler + Roller, with a heavier "The Muscle" alternate like DK + Mach 8 + Roller; same stat philosophy underneath). Voiceovers stay as recorded, addressed to Jodi; that's part of the joke, unless Riggs feels like recording a second take.
- **Kayla:** the site asks her, deadpan, why she is here. Then it locks. Every chapter is visible but disabled behind a lock icon. The only working control on the entire site is "Change user." No data is stored for her.
- **Other:** asks for a name, runs the standard course with the name templated in, and Ch7 shows the full character/kart/tire/glider menu (checked-in JSON of all parts with simple stat bars) alongside the three archetypes, so any family member can find a valid combo.

Steps:

- [ ] **4e1** Copy templating pass: all chapter copy renders through a `{name}` template; audit every hardcoded "Jodi." *(Sonnet)*
- [ ] **4e2** Doorman screen + role behaviors, including the Kayla lockout and the Other combo browser (parts data JSON sourced from a stats reference, checked into `src/data`). *(Opus)*
- [ ] **4e3 GATE (family):** the gag lands as funny, not mean. Ideal test: show Riggs first, then let Kayla actually find the lockout organically after launch.

### 4f. Launch

- [ ] **4f1** Final QA: full pass on Mac Chrome (plus one quick Safari sanity check), video link checker script run, sync survives sign-out/reload/offline, all four doorman roles behave, printable prints. *(Sonnet)*
- [ ] **4f2 GATE (Jodi):** she uses the site cold for 10 minutes, no coaching, Riggs watches silently. Fix the first three points of confusion before anything else. *(human + Opus for fixes)*
- [ ] **4f3** Launch: send her the link. Ideally with the Ch0 voiceover as the teaser.

---

## Cut from scope (and why)

- Smooth-stick-steering drill: untrainable on a keyboard.
- Drift drills in the browser: taught as a concept only (Ch6); real drift practice happens on the Switch.
- Look-behind: she won't use it; too disorienting for too little advantage. Threat awareness is trained via warning cues in Shield Up instead.
- Blue shell / lightning response: too niche for match impact.
- Racecraft drills (defensive lines, lap 3 discipline): too specific for browser training; the useful parts live in the Ch8 program as Switch exercises.
- Settings audit page: not needed.
- Joy-Con / gamepad support: backlog. Keyboard only.
- Purple ultra mini-turbo, off-road shortcuts, soft drifting, bagging, 200cc tech, fire hopping: blocked by her settings or bad value for her.

## Backlog (revisit only after launch)

- Joy-Con over Bluetooth via the standard Gamepad API, with a button-calibration wizard ("press the button you use to drift") so any controller can map itself
- Browser ghost racing in the kart drills
- "Kayla mode": local 2-player split-keyboard race, for trash-talk-driven family testing
- Graduation module: what turning steer assist off would unlock (purple sparks, shortcuts)
- Multi-user niceties: family leaderboard, coach view for Riggs showing Jodi's progress

---

## Video shortlist (titles and channels VERIFIED 2026-08-06 via YouTube oEmbed)

Step 2b9 now only needs to watch for tone and pick start-time trims, not hunt for links.

| Video (verified title, channel, ID) | Chapter |
|---|---|
| "Mario Kart 8 Deluxe Complete Beginner's Guide 2023" (SwitchPlay Gaming, yRuAdvRxCQA) | Ch0/Ch5 |
| "How to Play Mario Kart 8 Deluxe - The video I WISH I had when I first started" (Bayesic, CpeyjM8dyuk) | Ch0 |
| "FULL Beginner Guide \| Tips to Help You WIN at Mario Kart 8 Deluxe!" (Shortcat, KADBlsfmIjQ) | Ch2/Ch5 |
| "Everything You Need to Know About Drifting in Mario Kart 8 Deluxe" (Bayesic, _21NuS0xjfc) | Ch6 |
| "Mario Kart 8 - The Fastest Path: Mario Kart Stadium" (IGN, TRywiShGKb4) | Ch8 deep dive |
| "Mario Kart 8 - The Fastest Path: Water Park" (IGN Guides, 6G1HY_7W3xg) | Ch8 deep dive |
| "Mario Kart 8 - The Fastest Path: Sweet Sweet Canyon" (IGN Guides, POAHr786Rzw) | Ch8 deep dive |
| "Mario Kart 8 - The Fastest Path: Thwomp Ruins" (IGN Guides, mY4KhGWlG9A) | Ch8 deep dive |

Embed format: `https://www.youtube.com/embed/<ID>` with optional `?start=<seconds>`.

Note: the IGN "Fastest Path" series was made for Wii U Mario Kart 8; these four track layouts are unchanged in Deluxe. They show sweaty mushroom lines Jodi won't copy; embed them for track familiarity, with a caption saying which parts apply to her.

Also: once she nails a skill on the Switch, record a 30-second phone clip of her own screen. Homemade before/after beats any tutorial for motivation.

---

## Appendix: Mushroom Cup playbook seeds (research, 2026-08-06)

Raw material for steps 4c1/4c2. Everything below is filtered for Jodi's settings: steer assist resists off-road driving, so classic mushroom shortcuts that leave the road are marked "not for Jodi." During Phase 4, rewrite these seeds into the site's warm coaching voice addressed to Jodi, and sanity-check each claim against the track's verified IGN video while writing.

### Track 1: Mario Kart Stadium

- **The knowledge edge:** after the first right turn the road splits into three painted lanes; the outer red lane carries dash panels AND coins. Kayla probably hugs the inside; Jodi taking the boosted outer lane is free speed plus coin income. Near the finish, the outer red path has three more dash panels and a ramp.
- **Tricks:** glider ramp before the final turn; ramp at the end of the finish-line dash panel path.
- **Hazards:** warp pipes before the path split, fixed positions. Memorize, never touched again.
- **Time Trial pick:** yes, one of her two ghost tracks (simplest track in the game to learn deeply).
- **Not for Jodi:** mushroom corner-cuts at turns 1 to 3, glide-cut on the final turn.

### Track 2: Water Park

- **The knowledge edge:** trick off the seesaw ramps in the underwater section; and the moving coaster car on the rail grants a small turbo when you bump it (fixed rail, learnable timing; the rare case where touching a moving thing is GOOD).
- **Tricks:** seesaw ramps, carousel edge.
- **Hazards:** essentially none that punish her. Gentlest track in the cup after Stadium.
- **Time Trial pick:** yes, her second ghost track.
- **Not for Jodi:** mushroom cut through the carousel center.

### Track 3: Sweet Sweet Canyon

- **The knowledge edge:** the course splits into blue and pink paths; pink is marginally faster but blue has less traffic, and in a 2-player race vs Kayla, taking the OTHER path from her means racing in peace (and dodging her items entirely).
- **Drift transfer:** the wide sweeping turns here are the best place in the cup for her blue/orange drift practice from Ch6's Switch homework.
- **Hazards:** stay off the frosting (off-road slowdown); fixed piranha plants.
- **Not for Jodi:** the donut-hole gap jump and frosting corner cuts.

### Track 4: Thwomp Ruins

- **The knowledge edge (biggest in the cup):** three path choices. First split: wall route beats floor route, but the real rule is take whichever is uncrowded. Second section: ALWAYS take the glider when it's available, it beats both walls. Final turn: trick off the tilted platform beside the road, described by guides as nearly mandatory; after the glide, the side platforms carry coins.
- **Hazards:** thwomps pound on fixed cycles. This is the memorization jackpot: learn the rhythm once and they stop being hazards; Kayla is dodging them reactively every lap.
- **Tricks:** tilted final platform, ramps throughout.
- **Not for Jodi:** the cave-exit gap jump, post-finish off-road ramp.

### Race strategy overlay (goes in the Stage 2 guides)

- Jodi always steers cup/track selection to Mushroom Cup tracks. No mercy picks.
- On split-path tracks, default to the path Kayla did not take when in range of her items.
- Coin targets: 10 by end of lap 1 on Stadium and Water Park (both coin-generous).

---

## Working agreement for Claude Code sessions

- Repo: https://github.com/riggsmcgee/mario-kart-master.git, branch `main`, deploys via GitHub Pages Actions.
- Step IDs are law: `{phase}{letter}{number}`. Commits reference them (`feat: 1b2 chase camera`). New work gets a new ID in this file first.
- Gates are hard stops. A phase does not start until the previous phase's gate step is checked.
- Every physics/feel change gets a `TUNING.md` line (what, why, before/after values).
- Supabase migrations live in the repo; never hand-edit the database. Never commit the service key.
- Keep this file updated: check boxes, append decisions to the log below.
- Models: Opus for physics, camera/feel work, drill design, backend, copy, and coaching content; Sonnet for scaffolding, CSS, quiz data entry, scripts, and QA passes (tagged per step).

## Decision log

- **2026-08-06** (Riggs): Start boost confirmed to work with auto-accelerate (tested in-game); remaining mechanics assumptions accepted as defaults from sources.
- **2026-08-06** (Riggs): Site is linear, single-sitting, minimal browser time; concepts over grinding. Hub-world design dropped.
- **2026-08-06** (Riggs): Kart view must mimic the real game: behind-the-kart chase camera (Three.js over 2D physics).
- **2026-08-06** (Riggs): Keyboard only; Joy-Con pairing dropped to backlog.
- **2026-08-06** (Riggs): Drift is concept-only; look-behind, blue-shell response, racecraft drills, settings audit cut. Shield drills merged into Shield Up.
- **2026-08-06** (Riggs): Development gated: testing-ground pieces with feel gates before assembly (the Lego rule).
- **2026-08-06** (Riggs): Voiceover + light animations in scope; tone target is "makes her smile even if she never beats Kayla."
- **2026-08-06** (Riggs): Chapter order set: start boost → item smarts → ramp tricks → boost pads (real vs fake) → lines and coins (with paths between boosts) → drift concept → setup as Switch bridge → practice plan with cup guide.
- **2026-08-06** (Riggs): Cup chosen for Jodi's advantage: beginner friendly, rewards track knowledge over reactions, no randomized obstacles. Selection criteria in 4a.
- **2026-08-06** (Riggs): Supabase backend, multi-user, from day one; Riggs wants the backend practice.
- **2026-08-06** (Riggs + Claude): Cup guide is two-stage: overview cards at day one, deep dives labeled for week 3 (training midpoint).
- **2026-08-06** (Claude, research-based, pending Riggs gate 4a1): Cup = Mushroom Cup. All-fixed hazards, easiest overall, path-choice knowledge on 3 of 4 tracks, no BCP dependency. Runner-up Flower Cup; Toad's Turnpike-style traffic tracks disqualified.
- **2026-08-06** (Claude, research-based): Kart combo headline pick = Yoshi + Teddy Buggy + Roller + Cloud Glider; light and heavy alternates named in 2b8.
- **2026-08-06** (Claude): All 8 shortlist videos verified live via YouTube oEmbed (titles + channels recorded); per-track IGN "Fastest Path" videos slotted for Ch8 deep dives.
- **2026-08-06** (Claude): Time Trial ghost tracks = Mario Kart Stadium + Water Park.
- **2026-08-06** (Riggs): The doorman added (4e): "Who's training?" role select. Jodi default, Bill name-swap + masculine kart reskin, Kayla deadpan lockout with change-user as the only way out, Other gets name input + full combo browser. Implemented among the last features.
- **2026-08-06** (Riggs): Kendahl (older sister) added as the Ch5 case study: no drifting, no item defense, no risks, great lines, often beats Kayla. She is the family's existence proof for the strategic thesis.
- **2026-08-06** (Riggs): Supabase deferred. Phase 1 builds 1a–1e first; 1f is a hard pause until the project exists. Consequence to watch: 2a1 ("persisted via the 1f3 sync module") cannot complete until 1f does.
- **2026-08-06** (Riggs): Local development only for now; GitHub Pages deploy split out to new step 1a5 and deferred. Vite `base` is already Pages-correct on build, so enabling it later is one workflow file.
- **2026-08-06** (Riggs): Toolchain = Node 24 LTS + npm, Vite 7 + TypeScript 5.9 (strict), ESLint 9 flat config + Prettier. Testbed is a Vite multi-page app: each prototype is `src/proto/<id>/index.html`, auto-discovered by `vite.config.ts`, listed on the index from `src/data/protos.ts`.
- **2026-08-06** (Riggs): Key bindings ship as defaults (arrows / A-D steer, Space hop, Shift item) plus a rebind widget in 1a2; the final binding choice still belongs to gate 1g1.