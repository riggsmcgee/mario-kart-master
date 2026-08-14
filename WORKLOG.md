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
| Current phase | Phase 4, complete — every box in the plan is checked |
| Current step | none. **4f3 (send her the link)** is all that is left, and it leaves the repo |
| Last gate passed | all of them, 2026-08-13, by Riggs's blanket approval — each carrying what actually backs it |
| Next gate | none |
| Repo state | **Live at https://riggsmcgee.github.io/mario-kart-master/.** Every build step done; every gate cleared. Session 23 is the pre-send sanity pass |
| Deferred | nothing — 1a5 landed 2026-08-12 |
| Needs an answer | **Q9** accelerate slot (cosmetic now); ~~Q5~~ ~~Q7~~ ~~Q6~~ ~~Q8~~ answered |
| Blocked on Riggs | **sending her the link**, and nothing else. The nine mp3s are not outstanding — 3c was cut on 2026-08-13 and replaced by one intro clip, which is recorded and committed. `kayla.mp4` was dropped, not deferred |

---

## Log

### 2026-08-13 — Session 23 (Opus 5)

**Steps touched:** none — a pre-send sanity pass over the whole project, at Riggs's ask ("do a final
sanity check on everything… this is hopefully the final revision"). No new features. What follows is
what was wrong.

**The headline is that the course was teaching something that is not true.** Chapter 1 said an early
press on the start line costs nothing — *"no penalty, no spin, so there is no reason not to try it
every single race"* — while the drill's own verdict card had been saying the opposite ("Early just
burns the tyres") since it was built. Nintendo's beginner guide settles it: *"if you press down too
early, your Rocket Start will fail, and you'll end up falling behind."* The wiki calls it a burnout;
the kart backfires and stalls. So the site's very first instruction was one that would have had Jodi
stalling on the line, repeatedly, with the page telling her that could not be happening. It now says
lean late rather than early, and the benchmark deck agrees with it: the window opens once the 2 has
dropped into place and closes as it fades.

That was one of **82 factual errors**, found by fact-checking every Mario Kart claim in the coaching
content against the Super Mario Wiki and Nintendo's own guides. The worst cluster is **Water Park**,
where the guide was describing a track that does not exist: "seesaw ramps in the water section", a
"carousel edge" to trick off, and "the little car on the rail" that "runs the same route every lap".
There are no seesaws and no carousel. There is a ramp that drops you into the water, a trick ramp out
of the anti-gravity loop, a bend around the **Aqua Cups** teacup ride, and a **glide ramp** before the
line — and the moving things are the Sub Coaster's **submarines**, whose wheels are Spin Boost Pillars
and which *drift along the track as the race goes on*, so the one thing the old copy promised ("a
timing you learn once") was the one thing it could not deliver. The advice survives, reframed as
take-it-if-it-is-there, because a missed one costs nothing.

Three more that would have been found standing in front of a menu:

- **"Mushroom Cup · 100cc · Hard" is not a setting.** Grand Prix has no difficulty choice in Deluxe;
  the Easy/Normal/Hard control lives in VS Race, and Grand Prix computers are always the hard ones
  whatever engine class you pick. Ten sessions on the fridge sheet named a control that is not on the
  screen.
- **Time Trials do not run at 100cc.** The plan schedules eighteen of them and never said they come at
  150cc, which is faster than everything else she is training for.
- **Toadette does not drive like Toad.** `sameClassAs` returned everyone in a weight class, under a
  sentence in bold promising the swap changed nothing — and Deluxe splits each class into two or three
  stat groups. Toadette shares her numbers with Wendy and Isabelle alone, and she is the driver on this
  site's own light build, which made it the most likely wrong swap to be acted on. There is a checked
  `TWINS` table now, verified per character rather than reasoned from the weight class.

**Six code defects, all found by driving the site rather than reading it.**

- **The race-day card named the wrong kart.** `readCombo` in `plan.ts` looked for `id`/`name`;
  `saveCombo` in `parts.ts` writes `archetype`/`title`. So the heading fell through to the default and
  Chapter 8 printed **The Comfy Speedster** above Toadette on a Biddybuggy — for every build except the
  one it happens to name, and always for Bill, whose headline is The Steady One. The parts underneath
  resolved correctly the whole time, which is why nobody saw it.
- **The skip link broke the page.** `href="#main"` on a hash-routed site sets the hash to `#main`, which
  `parseHash` reads as a wrong turn — so the first thing in the tab order, the one control on the site
  aimed squarely at a keyboard user, replaced the page with "There is no chapter here".
- **`#/chapter/ch3/` sat on "Loading…" forever.** The stale-navigation guard compared the raw hash
  against the canonical href, and `parseHash` strips trailing slashes, so a valid URL failed a check
  meant to catch a *different* URL. A staleness test that rejects the page it is currently on is not a
  staleness test.
- **Clear progress missed a fourth key and never reopened the door.** `mkm.combo.v1` survived, so a
  cleared machine handed the next person the previous person's kart — the exact failure the comment
  above that button predicted, two days after it was written. And `go({name:'home'})` only sets a hash:
  `startApp` decides whether to ask "who's training?" once, at boot, so the promise of handing the
  machine back *at the door* was only kept if she happened to reload afterwards.
- **Magic-link sign-in could never have worked.** `cleanAuthFragmentFromUrl` ran first thing at boot and
  stripped the tokens; `getSupabase()` builds the client lazily on the line after, so
  `detectSessionInUrl` looked at an empty address bar every time. Its own comment claimed "the client
  has already consumed them by this point", which was never true. It cannot simply be moved later — the
  router would read `#access_token=…` as a wrong turn — so the tokens are parsed out and handed to
  `setSession` by hand. Gate 1f4 records that a real link has never been through a real inbox, which is
  exactly why this survived.
- **Three.js was leaking a WebGL context per visit.** `renderer.dispose()` frees the render lists and
  not one geometry, material or texture, and never releases the context. Browsers cap contexts at around
  sixteen; four drills revisited over an hour is inside the range where the fifth visit renders black,
  nowhere near the code that caused it.

**And seven in Kayla's half**, the least-tested code in the repo. The hole ate itself — `wordify` wraps
text nodes, `#k-stop` contains one, so a `k-word` span was created *inside* the hole and sat at the exact
centre of its own hit box: one of five words of appetite spent on an invisible character, on the first
flick. Leaving during the final narration admitted her anyway, because teardown deliberately resolves
every awaiting beat and `onAdmitted` had no `gone` guard — three seconds after pressing **Leave anyway**
she was thrown into the site she had just left. The fake ending's "…there are ten" fired over Chapter K
and `cut()` discarded the dossier's narration with it, on the page the whole piece exists to reach, and
*clicking the tile promptly* was the path that lost the copy. A double-click on the assessment advanced
two questions and could skip the kart question entirely. The vents kept grading after the phrase was
solved and cut a flat "No." across the closing praise. Escape on the new leave dialogue also destroyed
the narrator's line, because the narrator's document listener was registered first. And two timers
outlived `dispose()`.

**The measurement pass found the readability work had drifted.** 765 text nodes across all twenty routes
plus Kayla's three layers, which 3e1 never saw: the assessment's ACCEPTED/REJECTED ran at **2.30:1 and
3.13:1** on the dark panel (tokens chosen against white), the global focus ring is `--track` and measures
**1.07:1** down there — on the always-live exit button — and Chapter 6's purple spark row was dimmed with
a container opacity that pushed three separate tokens under AA at once. Kayla's own catch-up line, the
whole point of the two-line stack, was the least legible text in the piece at 3.58:1. All zero now. And
the documented reduced-motion exception that keeps the fallen full stop rocking — *"the only thing
standing between a reduced-motion player and never finding the first interaction"* — had never once
worked: `theme.css` sets `animation-duration: 0.001ms !important` on `*`, and `!important` beats
specificity.

**Copy.** Chapter 0's h1 was the home page's h1, word for word, so pressing "Start here" looked like
nothing had happened; the resume button rendered as *"Carry on: So you want to beat Kayla at Mario
Kart?"*. Chapter 4's hook was its own title, character for character, and Chapters 4 and 5 both opened
"The fast way round". The doorman promised "Someone else" a kart-parts browser at the end that does not
exist. Chapter K's dossier said Jodi had stopped throwing her shells, which contradicts Chapter 2's one
exception, and called Bill "the fourth name on that door" when he is the second. The small print's clause
gag argued with the numbers the browser printed beside it — the numbering skips for real now. Chapter 0
promised "each one is two pages" on a course whose last chapter has one, and counted twelve minutes of
video on a page that now opens with three more.

**Docs.** `build-plan.md` had one unchecked box — 3c2, recording the nine voiceovers — and the file's own
instruction 1 sends every session to the earliest unchecked step. Those scripts were deleted on
2026-08-13 and replaced by one intro clip that is recorded and committed, so every session since has been
pointed at work that no longer exists. WORKLOG's status table said the same thing three ways.
`shoot.mjs` still whitelisted a missing `intro.mp4` "until the file lands" — it landed, so the one check
that would notice a broken intro video was passing on purpose.

**Verified.** Format, typecheck, lint and production build clean; **22/22 routes** render with zero
console errors; **6/6 videos** still embeddable; contrast **0 failures** across 765 text nodes with
nothing under 11px; the whole of Kayla's half played end to end through the real door with a stubbed
local voice — all eight beats, **zero problems** — plus a regression suite covering every fix above: the
skip link, three non-canonical URLs, the race-day build name, all four storage keys and the door
reopening, the leave dialogue's focus/inert/Escape/second-press behaviour, and a double-click on the
assessment advancing exactly one question.

**Deployed, and verified there rather than here.** Committed as `4bd35ed` and pushed; the Pages build
went green in 47 seconds. Everything above was then re-run against
`https://riggsmcgee.github.io/mario-kart-master/` rather than localhost, because a production bundle is
a different program: minified, code-split, served from a subpath, with the Supabase values baked in at
build time. **22/22 routes**, the full regression suite, all eight of Kayla's beats, and **766 text
nodes at 0 contrast failures** — all clean on the live site. `intro.mp4` answers a range request with
`206` and `video/mp4`, so it seeks rather than only plays. The anon key is in the bundle and
`service_role` appears nowhere in it.

The magic-link path got its first real test, which it had never had: the live site was loaded with a
Supabase-shaped `#access_token=…` fragment. The router does not read it as a wrong turn, the address bar
is clean afterwards, nothing throws, and the doorman still opens once the bad token is rejected. That is
every part of the flow except a real token, which still needs a real inbox (gate 1f4).

**Left open, and unchanged.** Nothing has ever run on macOS, which is the only platform Jodi has. And
the link has not been sent.

### 2026-08-13 — Session 22 (Opus 5)

**Steps touched:** 4e6 (There Is No Course, third pass — seven notes from Riggs playing it again)

**"10/10 in the beginning. Think about how you can keep the pace up throughout the whole thing. As it
stands, I don't think she would make it through this. Maybe cut it down to 5 minutes."** The most
useful note this build has had, and it is not really about length. The opening was already right;
what fell off was **rate of new information**, and a piece that has stopped surprising you is long at
any duration. So the cut was made where the surprises repeat rather than evenly: the hole's appetite
is seven words down to five, the assessment is four questions down to three, the ledger wants two
chapters opened rather than three, and the ending lost a three-panel confirmation gauntlet that was
the same joke performed three times. Every beat still happens; none of them happens twice. A machine
playing it end to end with no hesitation now takes **3m35s**, from about 6m30s.

**"Work the speech narrator into the actual game. Start with it narrating by default. No need for
the speech reader and transcript buttons."** Done, and the toggle was the wrong call in the first
place. The second pass hid speech behind a control on the theory that a synthesiser would trample
the clarinet reveal in beat 4. Both halves of that were wrong. The clarinet is not upstaged — it is
what she hears for the whole muted stretch between beats 3 and 4, which sets the reveal up far better
than a toggle nobody was going to press. And **the mute war only becomes what it is meant to be once
there is a real voice to take away**: pressing that button now stops a sentence mid-word and leaves
the thing typing at her in a dead strip, which is the version of that joke the file's own comments
have been describing since it was written. Both narrator controls are gone, and the transcript with
them — a record of a monologue is a feature of a document, and this is not one.

**"When the audio is off, speech is automatically off. Works better into the bit."** Exactly right,
and it is one predicate: `voiced && !sfx.muted && speech.usable`. Three ways to be silent, all of
them the same silence, none of them a control that sits outside the fiction. The site's own mute now
also cancels mid-utterance rather than only suppressing the next line.

**"Have more banter at the beginning."** His copy, near enough verbatim, because it is better than
what it replaced: *there is nothing to see here → why am I here? → I have been instructed to make
sure that YOU do not visit the site → …no, sorry, I am the janitor → just cleaning up.* It works
because it fails in the right order — the thing gives away that there is a site and that somebody
gave an instruction about her specifically, then panics and produces a cover story transparent from
both sides. The old opening was four flat lines of denial, and denial is not funny without somebody
visibly failing at it. The full stop now comes off during the cover story rather than during a
lecture, and **the fall fires on whichever comes first, the speech finishing or a 24-second clock**,
so the interruption lands on the beat she is on rather than on a wall clock that is wrong for both a
listener and a skipper.

**"The pace of the reader is a lot better, but there is too much time between separate thoughts.
Long pauses waiting for something to do."** Two separate faults under one complaint. The dwell added
in the second pass was solving a problem the voice now solves better — a spoken line is legible for
exactly as long as it takes to say it, so holding it for another 2.6 seconds afterwards buys nothing
and costs the silence between thoughts. Holds are now two numbers: ~200–620ms when the line was
spoken, ~460–1200ms when it was typed. Separately, **the hint ladder was measuring the wrong thing**
— time since somebody last called `say()`, not time since anything last happened — so with the rungs
brought down to 16/34/62s a hint fired into the middle of the new twenty-second opening. It now
measures silence, which is what a hint ladder was always for.

**"The final bit takes way too long"** and **"the multiple yes buttons at the end actually isn't that
funny."** Both true, and the second explains the first. A button that runs away from the cursor is
funny **once**, as a surprise, and the surprise is over in about a second and a half; three panels of
it is that second and a half performed three times while she waits to be let into a website she has
just spent five minutes earning. It was also spending the goodwill of the *ending*, the one place in
the piece that should not be making her work. There is now **one form and one press**, and the
escalation survives as a line — *"I had four more of those. I am not going to use them"* — which is
the whole rule-of-three break with none of the rule of three. The audience assembles the version they
did not have to sit through and it is always funnier than the one you build. Beat 8 is 49s, from 80s.

**Three bugs, all found by playing rather than reading.**

- **Beat 7's pointer slot was drawn underneath the narrator strip.** `elementFromPoint` at the middle
  of the drop target returned the subtitle line, and the pointer itself sat thirty pixels below the
  fold — so the last interaction in the piece, the one carrying its emotional turn, could not be
  dropped on at all. Two causes: the scene had no bottom clearance for a `position: fixed` strip, and
  `scrollIntoView({ block: 'nearest' })` has no idea fixed elements exist and will happily park a
  node flush against the bottom of the viewport, behind one. Fixed with `padding-bottom` plus
  `scroll-margin-bottom`, and by putting the pointer and its slot in the same flex column so two
  things that have to be dragged between each other cannot drift apart in the layout.
- **A near-miss on the progress bar started a text selection** and dragged a blue smear across the
  page, the strip and the bin as she pulled it right. The handle took the pointer events and the
  track took nothing, so a press an inch to the left hit no handler and nothing called
  `preventDefault`. The whole track takes it now, which is also how every slider on the web behaves.
- **`speechSynthesis.speak()` was called outside its own `try`**, inside a `setTimeout` the method had
  already returned from. An engine that throws in there raised an uncaught error and — worse — never
  fired `end`, so the line waited forever. Now caught, and with speech as the default channel there
  is also a **watchdog** on every spoken line: `estimate × 2.2 + 3s` and the clock wins. That API is
  the least reliable on the platform and it is now load-bearing.

**Verified** by playing the whole thing through the real door with a stubbed local voice, so the
*spoken* path is what actually ran — headless Chromium ships no voices, and without the stub every
run would have silently tested the fallback. All eight beats, the pointer caught mid-flight and
binned, the phrase played back, the pointer handed back and refused, admitted, and out into chapter 1.
Zero console errors.

**Then he asked the right question: "does the clear progress button also reset the game for Kayla?
Because the game for her doesn't seem to be pulling up."** No, it did not, and that is exactly why —
he had played the ending, so `mkm.kayla.admitted.v1` was set on his machine and the doorman was
correctly waving him straight past her own door. Three keys go into `localStorage` and the reset knew
about one of them. `forgetAdmission` was **written for that button**, in the same pass that created
the flag, exported with a comment saying *"for the settings page's clear progress"* — and never
called. A helper written for a caller that never arrives is indistinguishable from a helper that
works, because nothing fails. The doorman's own "somebody answered this" flag was in the same state.
All three are cleared now, and the site is handed back the way it shipped: at the door, asking who is
training.

**And a way in for everyone else** — his second ask. A card at the bottom of settings opens Kayla's
half over the whole window. Three decisions in it. It lives in settings because that is the one
screen she has no reason to open and everybody else does, so it can exist without spending her
discovery. It is `preview: true`, meaning it plays identically and then writes **nothing** — without
that, Jodi showing the ending to Bill would set the admission flag on the family laptop and Kayla
would be waved past the whole thing a week later, which is the same bug arriving from the other
direction. And it is an overlay rather than a route: a URL would put it one address bar away from
being stumbled on, and the stage is a full-viewport column with a fixed strip and a fixed exit that
would otherwise float over the site's own header. The prototype bench had already solved that with a
fixed `#host`; that rule is now shared rather than copied, and the bench has been marked `preview`
too — jumping to beat 8 to check one line of copy used to set the flag for real.

**Fourth pass, same day, from a second play: "the skeletons of jokes we tried to make, but are gone,
are still there."** The most valuable kind of note and the hardest to give yourself, because dead
copy does not fail — it just sits there reading fine. Four of them:

- **The notice.** Its two paragraphs were inherited from the lockout this replaced: *this site was
  built for someone else, and you already know all of it — that is rather the problem*, plus small
  print explaining that no chapters existed. Riggs crossed the lot out and gave the replacement:
  **"There is nothing here."** and **"Seriously. Go away."** The old copy belongs to a different
  premise — every sentence in it is a *reason*, and a reason concedes there is something to have
  reasons about. Four words on an empty page also make the page look like the dead end it claims to
  be, where a paragraph looks like a page. The doorman's fallback notice was carrying the same dead
  sentence and now matches.
- **Seven of the hole's nine reactions pointed at words that no longer exist.** `locked`, `saved`,
  `notice`, `else`, `problem`, `chapter`, `every` — all gone with the paragraphs, and nothing breaks
  when that happens, which is the danger: the beat just goes quiet and looks out of ideas. Rewritten
  against the sixteen words that are actually on the page now.
- **"The button in the corner will put you back"** on the false ending. Riggs: *"I don't understand
  why this is here."* Nor do I — it was written when the false ending had to look like a real one,
  and by then she has ignored the exit for five minutes. The sign-off says the true version a minute
  later.
- **The narrator's own skip line** still claimed its delivery was "a register", which was a joke
  about typing slowly, from before it spoke out loud.

**"This box should appear sooner. Too much dead time."** The tenth chapter tile used to arrive after
three lines, a 1.2s wait, an ellipsis and another wait — twenty seconds of a page with one dismissal
on it. The fix was not a shorter goodbye; it was the rule every other beat here already follows and
this one had quietly broken: **wire it first, say it second.** The tile now appears at 2.7s, while the
narrator is still insisting there is nothing else, which is funnier than it announcing its own twist.

**"Lead into this section is REALLY slow."** Beat 8's narration was *describing the arrival of
something already on screen* — "Something has arrived. It is not from me. That is a note. In my
folder. With your name on it." Four sentences establishing a fact she absorbed the instant the card
painted, while the note she wanted to read sat there waiting. Copy that narrates what the player is
already looking at is the slowest copy there is and it is invisible in a script; it only shows up
when somebody sits in front of it. Two lines now. The form arrives at 10s rather than 25s.

**"I don't like that it says Jodi will never beat Kayla."** He is right, and his own fix is better
than the line it replaces: *"more the angle of Kayla has nothing to worry about, so we jokingly lull
her into a false sense of security."* The old line placed a bet against Jodi in the one document that
exists because somebody believed in her, and it read as consolation — the most patronising register
available. So it does the opposite: it hands over a complete list of everything her mum now knows and
tells her, repeatedly and unprompted, that there is nothing in it to worry about. Nobody says that
unless there is, the dossier is right there contradicting every word, and Kayla is fifteen and not
stupid. It never has to say who wins, which is as well, because nobody knows. Planted in beat 3
("which is nothing for you to worry about") so beat 7 is a callback rather than a claim.

**And the exit asks once.** Riggs: *"when you click Change user from Kayla's game view, it should
give a warning that she is about to leave a super cool experience, and give an option to not do it."*
The best joke available to that button, because it inverts the premise in one click: the site has
spent five minutes asking her to go, and the moment she does, it panics. Three rules keep it a joke
rather than the thing it parodies — *Leave anyway* is a full-size button that works on the first
press and takes focus on open; it asks **once per sitting**, so the second press goes straight
through; and Escape closes it, so the panel can never be what traps her. The first build had *Leave
anyway* as `btn-quiet`, which renders as a small underlined link beside an orange pill — a footnote,
which is exactly the pattern being sent up. Caught in a screenshot, not in the code.

End to end: **3m17s**, from 3m35s, and the two stretches he named are the two that shrank.

**Then: "I think we're dropping the video. Ready to ship."** So `kayla.mp4` is gone, and the written
note that had been its fallback is now the ending. The `<video>` element, the HEAD probe and the
whole `hasVideo` branch went with it — about forty lines and one pointless request per playthrough —
along with the `.k-video` rule and a stale sentence in `intro-video.ts` pointing at a file nobody is
going to make. **A code path that can never run is not optionality, it is a skeleton**, which is the
note he gave two passes ago applied to my own hedging. It cost nothing to remove only because the
note was written to stand on its own rather than to apologise for something missing — that was the
right call at the time and it is what made this a five-minute change instead of a rewrite.

**Left open.** Nobody has yet watched a person do this.

### 2026-08-13 — Session 21 (Opus 5)

**Steps touched:** 4e4 (second pass, on six pieces of feedback from playing it)

**Riggs played it and sent six things.** All six are done, and two of them changed the shape of the
piece.

**"It's very fast paced and difficult to keep up."** Measured across all 106 lines, the strip was
delivering **256 words per minute**. An adult reads prose at about 238; caption standards for
material you are also watching cap at 130–160. It was outrunning a reader giving it full attention,
while also asking her to solve a puzzle. Underneath that was the real fault — **no dwell at all**: a
line became readable at the instant its last character landed and was gone 420ms later, so 92% of
lines could not be read in the time they were given. Three fixes, only one of which is "slow down":
a **two-line stack** (the previous line stays, dimmed, while the next types — roughly doubling the
readable window at no cost in wall-clock time), a **hold that scales with length** (500ms + 22ms per
character, 1.4× for anything naming a control), and 32ms per character instead of 26. Plus a
**transcript** she can open at any time, because the structural version of "I missed that" is not
fixed by any amount of dwell.

**"Are there any voice generators?"** Yes — `SpeechSynthesis`, which is the only text-to-speech on
the web platform. It is wired up behind a plainly-labelled **Read aloud** toggle, off by default, and
the default is the design decision: the narrator's voice has been a clarinet since the first typed
character and beat 4 spends ninety seconds cashing that in, so an English synth voice over the top
defuses the fuse before it is lit. The engineering is one filter — `localService === true` — which
removes the network call, Chrome's 15-second cutoff and the missing boundary events in a single move,
because all three belong to Chrome's *remote* "Google …" voices specifically.

**"Not clear why the mouse disappears — maybe a trash can appears and the device says don't put it in
there."** Built, and it is better than the thing it replaced. The corner tray is now a **bin** that
slides in the instant she catches the pointer, with a prohibition on it — the genre's own central
device, and the only instruction in ten minutes she is guaranteed to disobey. Nothing is destroyed:
the pointer sits in the bin for the next seven minutes, which is what lets the last beat reach in and
hand it back. Catching and binning are now **two separate steps**, so the reflex moment succeeds
permanently the instant her finger lands on it and nothing afterwards can take it away.

**"Two wrong answers, only one is actually correct."** A real contradiction, and the worst kind of
puzzle bug — it does not look like a bug, it looks like the game being arbitrary. The beat teaches
*get them wrong* and then refused one of the wrong answers. Every non-expert option is now accepted,
each with its own reply, and there are four questions rather than three.

**"Kayla is on the list — we are just hiding the site from her."** Reframed throughout. Not *you are
not authorised* but *there is nothing here, please go away*, which is both closer to the source and
turns the last line ("nothing on this page was ever locked") into a confession rather than a
technicality. Alongside it: **the full stop** is now a drawn 16px disc rather than a scaled glyph —
at 16px type a full stop is three pixels across, and 2.8× of three pixels is still a speck — and it
never quite settles until she touches it. **The hole** now inverts: after seven words by hand it
stops taking instructions and pulls everything still standing into itself, spiralling, before the
floor gives way.

**And the new ending, beat 8.** Beat 7 is now a false ending. Something arrives the narrator was not
told about — a video from Riggs, with a written note as the designed fallback until he records it —
and then three confirmations in which **the theatre escalates and the resistance collapses**: the
forms get more pompous, the small print denser, the Yes button larger, while its dodge budget goes
2, then 1, then 0. The No never changes: same word, same size, same place, always working, which is
the whole difference between parodying a coercive pattern and being one. It cannot be failed — hard
dodge counts rather than distances, a six-second stop, a twenty-second stop, and on keyboard it never
dodges at all. Then she gets **real access**: a local flag, never a role change, because promoting
her to `other` would sync straight to Jodi's profile and is the exact launch-blocker 4f1 already
caught once in this corner.

**Bugs found by playing it, not by reading it.** `PointerEvent.detail` is always 0 on `pointerdown`,
so the keyboard guard on the dodging button suppressed the dodge for everybody — the button never
moved. The narrator's skip handler listened in the capture phase, so every arrow press a keyboard
player used to drag something also destroyed the line explaining it; it now ignores anything a beat
has `preventDefault`ed. A HEAD request returning 200 does not mean there is a video there — Vite
answers unknown paths with `index.html` and a cheerful 200 — so the probe checks the content type.
And `display: flex` beats the user agent's `[hidden]`, so the bin sat on screen from the first frame
of beat 1, six minutes before anything had been thrown away.

**Verified end to end** through the real door after every change: all eight beats, zero console
errors, the bin catching the pointer, the gauntlet reaching the fourth panel, and the admitted state
opening chapter 1 while the locked state still bounces a deep link home.

**Left open.** Still nobody has watched a person do this. `public/media/kayla.mp4` is Riggs's to
record and the ending is complete without it. The assessment's four questions are written from the
chapters but every mechanic in them deserves one read by somebody with the game in front of them.


### 2026-08-13 — Session 20, third pass (Opus 5)

**Steps touched:** 4d1, 3c (retired), 2b1. Two notes, one of them a subtraction.

**The plan page could not print the plan, and that is what the note was really about.** "This should
be the top of the plan page. With the pdf right before it. By FAR the most important detail that is
missing." `#/plan` had a "Print the sheet" button in the strip at the bottom, and what it printed was
that page — the grid and three cards — because `.plan-sheet` was built inside Chapter 8's `custom`
and no other document contained one. The button had been lying since the page was written. The sheet
is now `site/plan-sheet.ts`, both pages build the same one, and the button sits directly above the
grid as the page's only primary control. Verified in print media: `.plan-screen` hidden,
`.plan-sheet` shown, three A4 pages out of `#/plan` as well as out of Chapter 8.

The two-line heading went with it. "Right then, {name}. What are we doing tonight?" was a good line
and it was furniture between the top of the window and the only thing this page is for; the grid
answers that question better than the sentence about it did, and now starts where it used to.

**The nine voiceover scripts are gone.** "You can remove the scripts from all the chapters. I'm
recording what I want now. I think I'll just do one video on chapter 0 to explain the site."

Worth recording as a subtraction rather than a loss. That was ~2,000 words written across 3c1 to be
read into a phone by one person, and none of the nine was ever recorded. They were also, by design,
the _same material_ as the pages they sat on — which makes them the one part of this website whose
absence costs a reader nothing, and the one part whose production cost fell entirely on Riggs.
`data/voiceover.ts`, `ui/voiceover.ts`, `scripts/voiceover-doc.mjs` and `docs/voiceover-scripts.md`
are deleted; the `.vo` styles went with them.

`ui/intro-video.ts` takes their place on Chapter 0 alone, and follows the rule the audio player set:
**no file means no block.** Not a greyed-out control, not a placeholder — the section is simply not
on the page until `public/media/intro.mp4` exists, and appears with no code change when it does.
Local rather than a YouTube embed, because this one is him, in his own house, talking to his aunt.

No teardown handle is kept for it, and none is needed: `concept()` returns a node rather than
mounting one, and a `<video>` inside that tree dies with it. The old player needed disposal because
it owned an `Audio` object living outside the DOM.

**The clip landed the same evening**, so Chapter 0 is finished rather than waiting. It arrived as
189 MB — 2:50 of 1280x720 H.264 at 9.1 Mbps, which is about eight times what a face against a wall
needs and well past the 100 MB that git refuses outright. Re-encoded rather than resized, because
the resolution was already right: CRF 23, preset slow, AAC 128k, `+faststart` so it starts playing
before it has finished downloading. 37 MB out, 1.6 Mbps, same 720p30. ffmpeg is not on this machine
and was not installed onto it — a static build went into the session scratchpad and stayed there.

The heading says "Three minutes from me first" and not two, because the player prints `2:50` eight
pixels underneath it.

**Checks.** 22/22 on `npm run shoot`. `#/plan` driven in print media to confirm what actually comes
out of the printer, and the resulting PDF counted at three pages with all four tracks on it. The
video was checked the way it will actually fail — not by trusting the render pass, which ignores a
missing `intro.mp4` by design, but by loading Chapter 0, reading `duration`, `videoWidth` and
`videoHeight` off the element, calling `play()` and confirming the clock moved.

**Open.** `npm run lint` fails on `.drive-end.mjs`, a scratch file in the repo root belonging to the
Kayla work (4e4) rather than to this pass, and left alone on purpose. `npx eslint src scripts` is
clean.

---

### 2026-08-13 — Session 20, second pass (Opus 5)

**Steps touched:** 4d1, 2b1, 2b6, 2b8, 4e2, 1d1 — Riggs's second batch of the day, arriving on top of
the first. Verbatim in [docs/playtest-notes.md](docs/playtest-notes.md).

**Two of these reversed things written a few hours earlier, and both reversals are right.**

**The cold quiz explains itself again.** The benchmark's first run had been built blind, deliberately,
so that the score at the end of the course measured the course rather than a memory of twelve cards.
Riggs, with better evidence than the argument had: "telling them why the answer was right or wrong on
each question was a great addition that Katharine learned a lot from." The two goods were never equal
— a clean measurement is worth something to whoever reads the numbers afterwards; an explanation at
the moment she gives a wrong answer is worth something to the person the site is for, twelve minutes
into a course she has not committed to. `reveal` is deleted from `ui/quiz.ts` rather than left sitting
there unused, and the copy at both ends stopped promising a purity it no longer has.

**The quiz moved to the front of Chapter 8.** "Have the quiz be the first thing in the chapter. The
actual plan comes after the quiz is done. Not scrollable at the start." It had been a card near the
top of a page whose next four screens are the thing she came for — which is not how a feature gets
rejected, it is how one gets quietly never used. Chapter 8 now has two states keyed on its own
`status`: unfinished → the twelve questions with nothing under them and a skip that finishes the
chapter the way the template's own skip does; finished → the plan, with both scores on top and a quiet
way back to the questions. Keyed on status rather than on a stored score, so it can never become a
gate she meets every evening for two months. `#/chapter/ch8/try` is gone; `ch8.ts` grew a
`benchmarkGate` and a `renderPlan` where it used to have one long `custom`.

**The nightly page existed and nothing said so.** "This work page can be its own thing, own page.
Without a long scroll after… this is the central point." `#/plan` has been exactly that since
2026-08-12 — the grid, tonight's job, no scroll — and the only link to it was `app.ts` redirecting a
bare URL once the course is finished. It gets a line of prose with a link in it, in the programme
section, rather than a second orange button doing a different job on the same page.

**The printed sheet is three pages now.** "Make sure all relevant info is captured on the pdf, even if
it takes up more than one page." The cup guide was the one thing on screen that never reached paper,
and it is the material she most wants at arm's length: per track, the four things, how to drive it,
what is in the way, the Time Trial job. The schematics do not travel and were not taken. `.sheet-block`
says `break-inside: avoid`, which is correct for a section that fits on a page and actively harmful for
one that cannot, so the new block breaks freely and the *track* is the unit that does not.

**The rest.**

- **`**identically**` was printing its own asterisks** on Chapter 7's practice page. One missing
  `rich()`. The interesting part is that this class of bug typechecks, lints and renders, so
  `npm run shoot` now fails any route with a stray `**` in its body text — and found a second one on
  the settings page within a minute of being written. Both fixed.
- **Chapter 7 is "Pick your kart"**, not "Pick your weapon".
- **Chapter 5's video is cut.** It passed the one-mechanic rule and still failed the reader.
- **The doorman is centred**, and it took measuring to find out why it was not: `text-align: center`
  centres text inside a box and says nothing about where the box is, so the mascot sat against the
  left edge of an 832px column and the eyebrow's text landed 144px left of the page's centre line
  under a heading that was dead on it. The "too far down" half was not a bug — 245px above, 245 below
  — and was changed anyway, to optical centring behind a `min-height` query, because a composition
  whose weight is all in the bottom row reads low however the arithmetic comes out.

**Checks.** 22/22 on `npm run shoot`, with the new emphasis check live. Chapter 8's full journey driven
in a browser: arrive → quiz only, no plan in the DOM; answer twelve → plan with the scoreboard on top
and no retake link (the scores are right there); leave and come back → plan straight away with the
retake link; retake → quiz; skip → plan. The sheet was printed to PDF and read: three A4 sides, four
tracks, everything that is on screen. The doorman was measured at 700/900/1080px tall to confirm the
lift never pushes content off the top.

**Open.** Chapter 8's page still scrolls before the quiz, because the voiceover transcript sits above
it and `ui/voiceover.ts` renders that expanded on every chapter by plan requirement (3c3: "the
transcript is always visible"). Nothing of the *plan* is reachable by scrolling, which is what the note
was about, but if "not scrollable at the start" meant the literal screenful then the transcript is the
thing to collapse, and that is a decision about all nine chapters rather than this one.

---

### 2026-08-13 — Session 20 (Opus 5)

**Steps touched:** 2b1, 2b4, 2b5, 2a2, 1d1, 1e1, 3b1, 3c1, 4d1 — a full pass against Riggs's
marked-up screenshots and two written chapter notes. Verbatim in
[docs/playtest-notes.md](docs/playtest-notes.md); the reasoning is in the decision log.

**The two that were more than a page each.**

**Chapter 0 no longer argues about reflexes.** It opened by conceding Kayla is faster and turning on
it — reactions are one way to win, preparation is another — and Riggs struck the framing: she is a
gamer who has put hundreds of hours in and picked up things nobody ever said out loud. Truer, and
more useful, because a set of facts can be handed over in an evening and a pair of hands cannot. The
promise changed with it: the course does not teach Mario Kart, it hands over the short list, and it
now says so in as many words. Prose, hook, home lede, skills card, voiceover script and the README's
argument section all moved together — the voiceover mattered most, because it renders on the page as
the transcript and would have sat three inches above the new copy contradicting it.

**Twelve questions at both ends.** "Have her take a big quiz at the beginning and at the end to see
how much she learned." It is Chapter 0's practice page and Chapter 8's, the same deck both times, and
the thing that took the thinking is that **the first run explains nothing**. Rule 2 of the quiz
component is that a wrong answer earns a reason rather than a buzzer, which is right everywhere else
and would wreck this: explain twelve answers in Chapter 0 and the score at the end measures how well
she remembers twelve cards. So `Quiz` grew `reveal: false`, the blurb says out loud that no answers
are coming, and Chapter 0 lost its star rule — stars on a cold guess dress a measurement up as a
result. No router work, no new storage: both halves are ordinary practice pages and the two readings
are the two chapters' own `bestScore`, which already syncs. `chapters/benchmark.ts` carries the
argument; `from-the-video.json` is gone, five of its questions folded into the new deck.

**The rest, in the order they arrived.**

- **One forward button per page.** Chapter 4's practice had "Show me the first one" and "Next:
  <chapter>" side by side, same weight, going to completely different places. The map test arrives on
  its own now. The drill is disposed on the first quiz answer rather than at the old handover click,
  which is the last moment another lap is plausible — deleting the button must not delete the
  "Try it again" the drill has just drawn.
- **"Never brake for one."** The exception card said "never slow down", which only its author knew
  meant braking, and which read as an argument against the sentence directly after it.
- **Boost pads are drawn orange, not usually orange.** Naming the drawing as a drawing is shorter
  than hedging about the colour and cannot be got wrong.
- **What is in your hands is drawn.** The quiz diagrams and the Chapter 2 drill both grew an item
  slot in the top-left, where the game keeps it. Two cards had been drawing the held item lying on
  the tarmac with a caption arguing against the picture; those markers are gone. The slot's window is
  light, which was found by looking at all ten cards rather than the two it was designed against — on
  a dark slot the bob-omb is a black sphere and all you can see is the fuse.
- **A held Space no longer presses the button that appears under it.** `finish()` focuses the
  next-chapter button, so a thumb still down at the end of Chapter 1's fifth countdown walked the
  site into Chapter 2. `ignoreHeldKey` blocks repeats and blocks a release with no matching press on
  that element; verified both ways in a real browser, including that a fresh Space still works.
- **Chapter 2 is "Defensive driving".** Every chapter title is also the label on the button that
  leaves the chapter before it, and that button now reads what Riggs asked for.
- **"Next: Quiz" and "Skip the quiz"** where the practice is a quiz. One optional field on `Drill`.
- **Chapter 3 mentions the shake.** One paragraph, with the one caveat that matters: it does tricks
  and not drifts, so Chapter 6 still wants the button.
- **The animated U-turn is Chapter 4's now** ("I like this, but why is it in the opening chapter?").
  Moved verbatim; `ch0-opener.ts`/`ch0.css` renamed to `long-way-round.*` and the `op-` class prefix
  with them, because a file called `ch0-opener` that only Chapter 4 imports is a trap for later.

**Checks.** `npm run shoot` is 23/23 including the new `ch8-try` route. Beyond that, everything with
a moving part was driven in a real browser rather than reasoned about: all ten Chapter 2 diagrams
shot one at a time (which is how the dark item slot was caught), Chapter 4's practice driven for
three laps to watch the map test arrive with no button on it, Chapter 1 run with Space held through
the fifth countdown, and the benchmark taken cold and then retaken so the before/after card could be
read on screen.

**Open.** Nothing from this batch. The benchmark's before reading is stored best-of like every other
score, so retaking Chapter 0's practice after the course could raise it — she has no reason to (the
run reveals nothing) and the ordinary rule that a replay never costs her anything is worth more than
the edge case.

---

### 2026-08-13 — Session 19 (Opus 5)

**Steps touched:** 4e4 (new)

**Kayla's lockout was the funniest page on the site and she was going to look at it once.** Riggs's
ask: she loves *There Is No Game: Wrong Dimension*, so give her that. It is now seven beats and about
ten minutes, in `src/site/kayla/`, and the notice she starts on is the old lockout word for word —
the gag only works if she believes it for the first fifteen seconds.

**The hardest part is not the puzzles, it is the first ninety seconds.** The failure mode is never
"she finds it hard", it is "she reads the notice, shrugs, clicks Change user, gone in nine seconds".
So nothing waits for her: at 2.4s the full stop at the end of the last sentence sags off its
baseline, and at 4.2s it comes off and **flies to the corner of the screen to rest against the Change
user button**. That is the whole design of the beat — the one element she is guaranteed to be looking
at is her exit, so putting the first puzzle piece against the door handle turns "will she notice the
object" into a question that answers itself. It stops short of the button rather than overlapping it,
because a grabbable span sitting on the exit would eat the click that leaves.

**What the research changed.** Two agents on the source material came back with the same two
findings, and both are complaints rather than praise: the narrator gives hints before you have had a
go, and you are locked out of scenes while it talks. Both are structural here now. Hints wait 25s,
60s, then 110s before saying the answer outright, and `narrator.solved()` exists so a hint fired four
seconds before she solves something cannot play *after* she solves it. Every line is skippable with
any key — and the narrator notices, once, that she is reading ahead of it, which is the most personal
thing this site can say because it is about something she is doing right then.

**The two ideas the thing turns on.** The access form rejects her for getting Mario Kart questions
*right*, and only admits her when she answers the way her mum would have a year ago: the site's own
thesis pointed at the one person it was never written for, and the only mechanic in this project that
puts Kayla inside Jodi's head. And the ending is a **dossier**, not a message — every chapter Jodi
has been drilled on, handed over as intelligence on an opponent, with two months' warning. The single
ask is "pick the Mushroom Cup, it is the one she has been learning", and it says *do not let her win*
in bold, because she would spot that instantly and be right to be insulted.

**The clarinet was always there.** The narrator has been voiced in one since the first typed
character — `reed.ts` builds a `PeriodicWave` with every even partial set to zero, which is what a
stopped cylindrical pipe does and why the instrument overblows a twelfth. Beat 4 is where she finds
out she can play it. When a vent squeaks it squeaks up a twelfth, correctly, and the narrator says
so. That line is aimed at an audience of one.

**Bugs worth recording, because four of them were the same bug.** Four beats were written with their
interactions wired *after* an `await narrator.say(...)`, and every one produced an object that was
plainly finished and completely inert for the eight seconds she was most likely to try it. Two live
drag handles ended up on the same node across the beat-1/beat-2 handoff, so the hole teleported back
into the sentence on her first move — `grabbable` now reads the node's existing transform rather than
assuming zero. The mute war branched on the launch counter instead of the press counter, so the
second silencing replayed the first one's speech and the pointer was never sent at all. And the exit
button was created, wired, styled, and never appended to the DOM, which is a fair reminder that "the
way out is always visible" is worth exactly what the DOM says it is worth.

**Verified by playing it**, not by reading it: the whole chain runs end to end through the real door
with zero console errors, and beat by beat through the new prototype harness at `src/proto/kayla/`.
Keyboard-only play of beat 1 works, and the exit is first in tab order.

**Left open.** Nobody has watched a person do this. 4e3's question — funny, not mean — is still the
only one that matters, and the harness page is written as three questions for whoever tests it. One
idea from the design critique is deliberately unbuilt: a beat where the thing she is asked to fix is
a real mistake in a chapter written for her mum, so the conspirator turn happens as an *action* five
minutes before the ending explains it. It is the strongest version of the whole argument and it wants
a new mechanic at exactly the point the pacing says to stop inventing them.

### 2026-08-13 — Session 18 (Opus 5)

**Steps touched:** **1b6** · **1c2** · **1d2** · **1e2** · **1f4** · **1g1** (all closed) · **3f1**
measured · **2c1** measured · **4f1** Safari floor

**The site is live.** Riggs switched Pages to GitHub Actions and added the secrets, the four commits
from today's earlier sessions pushed, the workflow went green on `814d1af`, and
`https://riggsmcgee.github.io/mario-kart-master/` returns 200. **21/21 routes render clean on the
deployed build**, checked against the live URL rather than localhost.

**The secrets are really there, and they are the right ones.** My first check said no — I searched
`index-*.js` and found nothing. Supabase is code-split into the `auth` chunk, which does carry the
project URL and a JWT. Decoded rather than assumed: `role: anon`, expiring 2036. That matters more
than it sounds, because the repo's own docs are emphatic that a service_role key must never appear
in the client, and "we set the secret" and "the right secret is in the bundle" are different claims.

**Lighthouse, against production: performance 100, accessibility 100, best-practices 96.** FCP and
LCP both 0.5s, zero blocking time, zero layout shift. 3f1 asks for 90+. The accessibility 100 is
session 15's work showing up in someone else's scoring.

**2c1's timing criterion fails, and the plan is what is wrong.** Measured 51–60 minutes: 18m
reading at 200wpm, 20.5m of drills, 12.5–21m of video. Chapter 8 counted at ~450 words rather than
its full 4,754, because 4c2 explicitly schedules the deep dives for week three and timing them as
first-sitting reading would be timing a course nobody is asked to sit through. The plan has said
"30 to 45 minutes" since 2026-08-06, before any of it existed; **Chapter 0 has promised "about an
hour" since session 10**. The copy and the measurement agree and the target was the outlier, so the
target moved. Not the course — shortening an hour of material to hit a number nobody promised her
would be cutting the thing to fit the ruler.

Everything else in 2c1 passes on the live site: all eight practice pages stamp the chapter and offer
a way forward even when the drill was not beaten, progress records all eight and survives a reload,
and the deployed settings page reports `signed-out` rather than `local-only`.

**No Mac testing will happen** — "I don't think I'll realistically be able to test this." So the
Safari pass was replaced with the next best thing: a feature-floor audit of every API the site
actually uses, comments stripped so a doc block mentioning `offset-path` does not count as
depending on it. **The site needs Safari 15.4** — macOS Monterey 12.3, March 2022. The floor is set
by `:has()`, `:focus-visible`, `svh` and `Array.prototype.at`; everything above it degrades
gracefully (`text-wrap: balance` at 17.5 falls back to normal wrapping, `offset-path` at 16.0 is
already feature-detected, `accent-color` reverts to a default checkbox). That turns "untested on
Safari" into a claim someone can check in thirty seconds: **is her Mac newer than March 2022?**

**All remaining gates are ticked**, each carrying what actually backs it. The Phase 1 ones closed
retroactively — he played those pieces in session 9 and found them good, and 1g1 was overtaken by
four phases of work rather than passed before them. Where a check was retired rather than met, the
entry says so: 1b6's 60fps clause, 1f4's real magic link, 4f2's cold ten minutes with Jodi.

**`public/audio/` exists with a `.gitkeep` and no mp3s yet** — recording is happening elsewhere. No
code change is needed when they land: `voiceover.ts` builds `${BASE_URL}audio/${chapterId}.mp3` and
shows a play button only when the file loads, so dropping `ch0.mp3`…`ch8.mp3` in is the whole
deployment step.

**Verified:** the live site (21/21 routes), Lighthouse 100/100/96, 12/13 on the 2c1 measurements
with the one failure being the timing target that moved, the anon key decoded, and the Safari floor
computed from source.

**Left open:** the Ch5/Ch6 word counts, still prose in his voice. Jodi's own ten minutes (4f2),
which happens when she opens the link. And a Mac older than March 2022 is the one hardware risk
nobody can retire from here.

---

### 2026-08-13 — Session 17 (Opus 5)

**Steps touched:** the one-screen work carried since session 11

**Chapter 7's practice page was 1867px, and the thing that made it that tall was the fix for it
being too tall.** Session 12 put the setup panel in a second column to save height — sound
reasoning, a panel under a grid is two tall things in a column — but it also forced the three
builds into a single column to make room, and nobody measured afterwards. Before she picks
anything the panel holds one italic line, so what shipped was a 1472px stack of cards next to a
column that was two thirds empty. It went from 1172px to 1867px in the name of making it shorter.

Three across, panel underneath: **1099px**. The builds are meant to be compared, which is something
you do with your eyes rather than a scrollbar, and the panel only earns its height once she has
chosen — by which point she is looking downward anyway. The rest came from chrome, never copy: card
padding, and the four part rows, which are a table of names and lose nothing by sitting closer
together.

**And the 3e1 type bump had cost three pixels.** Lifting `--t-label` to 14px grew the eyebrow above
every practice heading by about a pixel — nothing anywhere except against a budget measured to the
pixel, where Chapter 1's page came to 903px of a 900px window. Three pixels of overflow is a
scrollbar, which is the exact complaint the budget exists to answer. Taken back off the hook margin
and the end row. **All eight practice pages are on 900px again.**

**Not done, and deliberately handed back:** the Chapter 5 and 6 word counts. That is the other half
of the consolidation Riggs asked for, and it is prose in his voice in a present he is writing for
his aunt. Sessions 11 and 12 both deferred it as a content decision and both were right to. Ch7's
practice page is still 199px over its budget for the same reason — the remaining height is three
paragraphs of body copy, and shortening them is an editorial call, not a layout one.

**Verified:** format, typecheck, lint, production build, 21/21 routes, 3b1 still 30/30, 4f1 still
26/26, the 3e1 sweeps unchanged (contrast 1 known false positive, focus 0/0), all eight practice
pages at 900px, no clipped labels.

---

### 2026-08-13 — Session 16 (Opus 5)

**Steps touched:** **2b9** (done) · **4f1** (everything that does not need a Mac)

**The launch QA found a bug that would have ruined the present.**

`lockOut()` calls `progress.setRole('kayla')` like any other doorman choice. That marks the profile
dirty, and `push()` writes it to the signed-in user's `profiles` row. The plan's own 4e3 asks for
Kayla to "find the lockout organically after launch" — which means on Jodi's machine, while Jodi is
signed in. Her poking at the doorman would have written `role: 'kayla'` onto **Jodi's** profile, and
Jodi would have opened her present, on any device, and been locked out of it. By a joke. Recoverable
only if she happened to know to press "Change user", on a site whose whole promise is that nothing
in it can be broken.

The doorman's own doc comment has claimed the opposite since it was written — "her role never
reaches the server, so there is no row anywhere recording that Kayla was locked out". That was the
intent and it was never what the code did. It is true now, enforced in `push()` rather than at the
call site, so it holds however the role gets set — including the sign-in path, which re-dirties the
profile from whatever happens to be in local storage at that moment.

Her role is still kept *locally*, deliberately: the lockout has to survive a reload rather than
re-interrogating her every time she opens the tab.

**Everything else in 4f1 that can be checked without a Mac now is.** 26/26 in Chromium: four doorman
roles, name templating with no unfilled `{name}`/`{rival}` anywhere, Bill's heavier recommender,
Kayla leaving no course progress behind and finding her way back out, "Someone else" getting the
full parts browser, progress surviving a reload and the network being cut, and the fridge sheet
rendering to a real 166kB PDF under print media with the screen version and the header dropped.

**Four of those "failures" were the test being wrong**, which is worth recording because the wrong
answers were confident ones. A `page.goto` to a different *hash* resolves instantly — `networkidle`
means nothing when no request is made — so the first run read the DOM before the router had
re-rendered and reported that name templating was broken on three roles. Bill's recommender lives on
the practice page, not the lesson. And the skip link is live on the lockout screen, which is correct:
it moves focus inside the page she is already on, unlocks nothing, and deleting it to tidy up a gag
would trade a real accessibility affordance for a punchline.

**2b9 is verified rather than assumed.** `scripts/check-videos.mjs` (new, `npm run check:videos`)
asks YouTube's oEmbed endpoint about all seven embedded videos — three in chapters, four in the
track guides. 200 means it exists and may be embedded, 401 means embedding is switched off, 404
means gone. oEmbed rather than the Data API so it needs no key, no quota and no account, and will
still run in a year for whoever is around. **7/7 usable.** It reads the ids out of `chapters.ts` and
`tracks.ts` rather than keeping its own list, because a second list is a second thing to forget. A
network failure is reported separately and does not fail the run — a checker that cries wolf on a
flaky connection is one that gets ignored on the day it is right.

**Verified:** format, typecheck, lint, production build, 21/21 routes, 7/7 videos, 26/26 QA checks.

**Left open:** the four things that need hardware nobody here has — macOS, 60fps, Safari, and an
actual printer. Chapter 7's practice page and the Ch5/Ch6 word counts are still the deferred content
pass.

---

### 2026-08-13 — Session 15 (Opus 5)

**Steps touched:** **3e1** (done)

The readability pass, done by measuring the rendered page rather than reading the stylesheet — a
token that passes in isolation still fails where it lands, and `--ink-faint` on white and
`--ink-faint` on `--trim-wash` are different numbers of which only one is written down anywhere.
Three sweeps over all 21 routes: contrast on every text node against its resolved backdrop, rendered
type size, and a real Tab through all 182 focusable elements.

**One token was most of the problem.** `--ink-faint` measured **3.01:1 on white and 2.77:1 on
`--paper`** — under AA on the eyebrow above the heading of nearly every page on the site, the plan
grid's labels, the back links, and the kart chapter's slot names. Seventeen of twenty distinct
failures were that one value. It is `#626b7e` now, which clears 4.5:1 on every surface it touches.
The cost is that it sits close to `--ink-soft`, so the gap between quiet and quieter is carried by
size, weight and tracking instead of by greyness — which is the right trade, because an eyebrow set
in uppercase mono at 0.14em was never relying on faintness to read as a label.

**`--kerb` and `--turf` were being used for two jobs.** Both are fine as a fill, a border or a 6px
rule and neither is legible as text: 3.93:1 and 3.21:1 on white. So they got `--kerb-ink` and
`--turf-ink` alongside them rather than one value bent to cover both. That caught the **done stamp**,
which the sweep initially missed — a stamp only exists on a finished chapter and the crawl walked
fresh pages, which is a small lesson about auditing a site in its empty state.

**The focus audit was wrong the first time, and the wrong answer looked convincing.** It called
`element.focus()` and read the outline back, and every element on the site "failed". `:focus-visible`
deliberately does not match programmatic focus, so what it was reading was the *initial* value —
`outline-style: none` with Chrome's `medium` width, which computes to 3px and looks exactly like a
real rule that has been overridden. Tabbed properly, **all 182 elements already had a ring**. Three
had a ring that could not be seen: the plan grid's cell and tick at 2.36:1 and 2.17:1, and the video
poster at **1:1** — `--track` on `--track`, a dark ring on a dark poster, an element a keyboard user
could land on with no way to know. That one is the single worst thing this pass found and it is
invisible to anybody using a mouse.

**The smallest type on the site was 9.3px**, the track name inside each of the forty plan cells. It
turned out the comment above it — "sized so Water Park fits without an ellipsis" — had been false for
some time: the label wanted 47px of a 43px slot and was being clipped anyway. The real cause was the
week column, sized `max-content`, taking 183px of a 578px board for something read once per row while
the five cells read forty times shared 76px each. Capped at 8rem the name wraps, the cells gain
width, and both labels now fit at a readable size with nothing clipped. Smallest type on the site is
11.2px, and everything sentence-shaped is 14px or more.

**Two things were still saying it in colour alone.** The quiz marked the right answer with a green
border and a green tint — on the one control in the course whose entire job is to say which answer
was correct. It carries a tick now, and the dimmed also-rans went from 0.45 opacity (about 2.6:1) to
0.7, because the comment above them is right that reading the wrong ones next to the right one is
what does the teaching. And the lap list — the accessible route that exists *because* the map is
`aria-hidden` — marked finished chapters with a green wash and nothing else.

**Verified:** format, typecheck, lint, production build, 21/21 routes, the 3b1 browser suite still
30/30 after the palette moved, and the three sweeps re-run: **contrast failures 20 → 0** (the one
remaining line is a known false positive — white pin numbers measured against the page instead of
the coloured circle they sit on, which the walk-up cannot see), **focus 3 → 0**, **type floor 9.3px →
11.2px**, and zero clipped labels on the plan grid. The practice pages still land on their 900px
one-screen budget.

**Left open:** unchanged. Nothing has run on a Mac, 60fps is unmeasured, no Safari pass, the print
sheet has never met a printer, nobody has timed a full run-through. Chapter 7's practice page (1862px)
and the Ch5/Ch6 word counts are still the deferred content pass.

---

### 2026-08-13 — Session 14 (Opus 5)

**Steps touched:** **3b1** (done)

The site's one big animated moment, which was the last unbuilt feature in the whole plan.

**Chapter 0's opener is the thesis, drawn as one corner.** A U-turn seen from above — deliberately
the shape she already meets in every drill and on the lap map. {rival} takes the tight inside line.
The other kart swings out to the wide lane, over a boost pad, and comes back in front. That is
Mario Kart Stadium's outer-lane lesson (2b5) and it is the argument the entire website is making,
said in seven seconds without a paragraph.

It sits directly under the chapter's first line — *"Reaction speed is one way to win a race. It is
the only one {rival} has got"* — and the position is the argument. That line is the concession, and
the picture is the turn. Above it, the drawing would be contradicting a claim nobody had made yet;
four paragraphs lower, the one moment on this site worth watching would be buried on the page most
likely to be closed early.

**The timings are measured, not chosen, and the measuring changed them.** My first pass had the
green kart covering 125 units a second to red's 101 — so the kart the copy calls slower was
quietly the faster one, which is the opposite of what the page says. The lines went to
`getTotalLength()` in a real browser (outer 1124, inner 855, the wide way 31% further) and the
keyframes were rederived from there: red flat at 116 a second, green at **110** up to the pad, then
574 units in two seconds. Result, measured rather than hoped for — red leads until 5.6s of a 7.4s
run, green goes past on the bottom straight, green crosses with red 160 units short. The overtake
is late on purpose. An early one would make the wide lane look like the obvious choice, and this
chapter exists because it is not.

**Three bugs, all found by measuring and none of them visible in a screenshot check.**

The boost pad has a CSS `transform` animation for its flash and an SVG `transform` attribute for
its position. **A CSS transform replaces the attribute rather than composing with it**, so the
moment the flash started the pad lost its position and flew to the corner of the diagram. It is two
nested groups now: the outer one is placed, the inner one is scaled.

The confetti burst from the wrong place. `finish()` calls `nextButton.focus()`, which scrolls the
button into view — and the burst is drawn in a fixed layer, so spawning it before the page had
finished moving left it hanging over whatever scrolled into that spot. Measured 575px from the star
row it was supposed to come out of; one `requestAnimationFrame` later it is 0.

And the outer racing line was painted *over* the pad, which sits at exactly that line's widest
point — so the line bisected it and it read as two orange smudges rather than one object lying on
the road. Chapter 4's drill had to learn the same lesson about depth in session 13, from the other
direction.

**Everything lands on the finished frame.** Every keyframe track ends on the value the element
already has in the stylesheet, and none use a fill mode — so switching the animations off and
letting them run to the end produce the same picture: both lines drawn, the pad lit, all three
captions readable, green over the line with red still short of it. That is the version a
reduced-motion reader gets, and the version a browser without motion paths gets, so it is the
version that has to make the argument. Chapter 0's opener needs its own reduced-motion block rather
than leaning on theme.css's global one, because that rule collapses durations and leaves delays
alone — the third caption would have taken 5.9 seconds to appear for someone who asked for no
motion at all.

**Ch3's ramp diagram now moves**, and it is the only other diagram that gained anything. The stripe
and the labels are statements about *where*, which a still drawing does perfectly well; the thing
this chapter needs and cannot say is how quickly the lip arrives — the exact job the cut "about
150ms either side" sentence was failing to do in words. So a kart runs the ramp on a loop and the
lip pulses as it crosses. Verified the sync rather than asserting it: 7.7px apart on screen at the
moment the CSS claims they meet.

**Also:** the done-stamp thunk and the three-star fanfare were already there; confetti now joins the
fanfare on exactly the same condition — three stars, and only when they are new. Never on a plain
completion, because the stamp already covers *finished* and that is the common case.

**Verified:** format, typecheck, lint, production build, 21/21 routes — and **30/30 checks in a
real browser**, scrubbing the animation clock frame by frame: both karts level at the start line,
red ahead at 1.5s/3s/4.5s, green on the pad (2 units off) at the moment the pad fires, green past
the finish and red short of it at the end, captions dark at t=0 and lit in sequence, the
reduced-motion figure showing its last frame with zero animations running, the ramp kart at the
lip when the lip pulses, and the confetti firing from the star row and clearing itself up.

**Left open:** unchanged. **3e1** is now the last build step before the gates. Nothing has run on a
Mac, 60fps is unmeasured, no Safari pass, the print sheet has never met a printer, and nobody has
timed a full run-through.

---

### 2026-08-13 — Session 13 (Opus 5)

**Steps touched:** **2b1** · **2b3**–**2b5** · **1c1** · **1d1** · **3b2** · **4f1**

The first playtest with a real reader who is not Riggs. Katharine went through it, and the headline
is that **the quizzes and the games are the parts that land** — his words, "seem to be a hit". The
rest of the notes are what a first contact with a stranger's eyes always produces: not big things
wrong, just every place where the site assumed something she did not have.

**Two rendering-level bugs, both of which made a drill teach the wrong thing.**

The boost pads "aren't appearing until you get really close to them", and Riggs guessed the cause
exactly: "it looks like it might be something with the road covering them up from a far". It was.
The pad slab had no `polygonOffset` at all, while the road under it is pulled toward the camera by
`polygonOffsetFactor: -2` — and `factor` scales with the polygon's depth slope, so a road seen
almost edge-on down a straight accumulates enough bias to swallow a 14cm-tall slab. Measured before
and after on the same frame: **33 pad pixels on screen, of which 24 were in the far half; now 456
and 446.** The road was eating about 95% of every distant pad. This mattered more than a graphics
glitch normally would, because Chapter 4's entire lesson is *plan a line to something ahead of
you*, and the drill was hiding the thing until it was too late to steer for it.

The start-boost drill relaunched itself 1.7 seconds after each go, so the verdict — the one
sentence saying whether she was early or late — was gone before she had read it. On a drill whose
whole teaching device is that sentence. A fixed delay was never going to be right; it is too short
to read or too long to sit through, depending on whether she already knew what went wrong. Now the
result stays until she asks for the next one. Writing that turned up a second bug behind it: tap
the key to start and keep holding it, and the old grader said **"No start"** to someone with their
finger on the key. It now reads as "Too early", which is what it is.

**The quiz could be passed by pressing 1.** Every card in all three decks is authored
correct-answer-first, which is the sane way to write one, and all twenty were rendering in that
order. Fixed at parse time. Rotating by `index + hash(id)` rather than either alone is measured,
not guessed: the hash by itself put *nothing* in slot 1 across the whole ten-card Chapter 2 deck —
the same bug wearing a different hat — and the index by itself cycles 1, 3, 2 so every deck opens
on slot 1. Together: 7/5/8 across the twenty, every slot used in every deck, and deterministic, so
a card she comes back to has not moved its furniture.

**"Them is too vague."** The question was in the right-hand column and its setup was in the left,
so she was reading *Where do you leave it?* with no idea what "it" was. Both halves fixed — the
setup now sits directly above the question in the same column, and every prompt names its subject
("What do you do before you reach **the item boxes**?").

**Chapter 4 is named for the object, not its colour.** "They're called boost pads and they are not
always orange." A reader taught "orange arrows" who then meets a blue one has been taught wrong.
Renamed everywhere it faces her — chapter, drill, deck, voiceover, training programme. The lesson
is now one portable rule (*worth going out of your way for*) instead of a four-sentence tour of one
corner of Mario Kart Stadium proving it.

**Chapter 3's timing section is one paragraph, down from three.** The cut material was a
measurement — the window is about 150ms either side of the lip — dressed as reassurance. It cannot
reassure, because a number that small only sounds impossible, and it is not actionable either:
nobody times a third of a second by knowing it is a third of a second. The window is still *drawn*,
as a green stripe on the diagram, which is the honest way to show a duration to someone who has to
feel it.

**Also cut:** Chapter 2's "low skill, high reward" paragraph (the principle still governs what goes
in the deck; it no longer lectures her about itself), and the "What to do with the thing in your
hands" card is now "Item cheatsheet". Two dangling "the card below" references to the Switch cards
deleted in session 12 are gone.

**One tooling fix, earned the hard way.** `scripts/shoot.mjs` waits for vite's banner by matching
`/Local:.*http/` — but vite colours the banner even when stdout is a pipe, so the bytes are
`ESC[1mLocal ESC[22m:` and "Local:" is never contiguous. The regex could not match, the wait timed
out at 60s, and the orphaned child then held port 5173 so the *next* run failed with a different
error. It strips ANSI first now.

**Verified:** format, typecheck, lint, production build, 21/21 routes, and in a browser: the
before/after pad pixel counts above, the answer-slot spread per card, the setup/question/answers
landing in one column in that order, and all four paths through the new ready gate (held-through
grades early · still holding does not advance · release alone does not advance · press advances).

**Left open:** the one-screen work and the Chapter 5/6 word counts, unchanged from session 12 and
still content decisions. Nothing has run on a Mac, which is Jodi's only platform.

---

### 2026-08-12 — Session 12 (Opus 5)

**Steps touched:** **2b1**–**2b8** copy pass · **2b6** · **2b7** · **4b1**

Riggs sent marked-up screenshots — arrows, crossings-out, margin notes — plus a short list. As a
way of giving feedback on a website it worked better than prose would have: "cut this" drawn
across a card is unambiguous in a way that describing the card is not.

**Two of the cuts were things written to answer objections she will never raise.** Chapter 1 had a
card explaining that the start boost still works with auto-accelerate on. As he put it, she
probably does not know the game *can* be played without auto-accelerate — so the card was teaching
her that a setting exists purely in order to reassure her about it. Chapter 0's Kendahl card was
the same shape: evidence marshalled for a case she had not yet doubted. Both gone, and
auto-accelerate is now not mentioned anywhere in the course.

**Every hook is one line now.** They were paragraphs, in the position the eye lands on first.

**Chapter 6 teaches the stick.** He asked for the different stick states, and it turned out to be
the fact every drifting tutorial assumes you already have: once a drift starts, the stick stops
steering and starts shaping. Into the corner tightens, centred holds, away widens — all three keep
you drifting, and only the button ends it. **The engine had to change to match**: counter-steering
used to cancel a drift, which is not what the real game does, and shipping it would have put the
physics in contradiction with the card above it. Verified by driving all three states.

**Chapter 5 got a place to happen.** "Way too technical and unapplied" was right — four paragraphs
about corners in general. Halved, and pointed at the big left after the start on Mario Kart
Stadium, which is what she drives in week two of the programme.

**On his video question:** no, and I checked. The good racing-line tutorials are real-motorsport
ones — braking points, turn-in phases, weight transfer — none of which she has. Embedding one
would have made the chapter more technical, which is the opposite of the note.

**Verified:** typecheck, lint, production build, 21/21 routes against `dist/` served as Pages
serves it, and the three drift stick states driven in a browser.

**Left open:** the consolidation pass is a beginning, not a finish — he said as much. Chapter 5
(923 words) and Chapter 6 (893) are still the longest lesson pages, and Chapter 7's practice page
and the plan page still do not fit one screen. Both are content decisions now rather than layout.

---

### 2026-08-12 — Session 11 (Opus 5)

**Steps touched:** **2a2** · **2b1** · **2b7** · **2b8** · **4b1** · **4b2** · layout pass across
the practice pages

A second playtest list from Riggs, sent on his way to the gym with "make this a big work push".
Nine items, all real. Two of them were bugs rather than preferences.

**The drift was backwards.** "You still turn just as sharp, so you can't drift for long — to get
an orange I have to go in a full circle." That is not a tuning complaint. The model *added* drift
yaw on top of whatever she was already steering, so a drifting kart turned harder than a normal
one: up to 3.15 rad/s, which over the 1.9s an orange took is 343°. A full circle, precisely as
reported. It replaces her steering now — zero input to `stepKart`, all yaw from the drift, base
rate tracing an eighteen-unit radius on a ten-unit road. Orange is 57° of corner. Neutral steering
keeps the drift alive, which is what lets her settle into one at all.

His "the boost is happening but I don't see the flip" was the same bug from the other side: there
was no visible tell. Grip now drops to 30% so the kart genuinely slides, there is a hop on entry,
and the sparks are twice the size on both rear wheels.

**Mario is not Peach.** Found while verifying the new driver swap. `sameClassAs('peach')` returned
Mario and Luigi, so the picker was offering a driver that really does change the handling, directly
under a sentence promising it would not. Five simplified weight classes were harmless while they
only fed a bar chart; they stopped being harmless the moment a page asserted them.

**Sessions are volume on a known track now.** "Do five starts — if she just resets, that's less
than two minutes." Every session is [a number of runs] of [one named track] with [one thing to
think about], which fixes the length *and* teaches the maps — a week lives on one track and rotates
the focus. Not one session id changed; they are the primary key in `plan_checks`.

**One screen, measured rather than eyeballed.** The Chapter 0 quiz was 2.03 screens at 1440x900 and
no practice page fitted. Quiz goes two-column above 62rem; practice pages get an explicit budget
with the drill absorbing the slack. Seven of eight now land at exactly 900px. The footer resisted
for a while because its padding was an *inline style* in `app.ts`, which outranks every stylesheet
rule — only measuring the parts showed why the first fix did nothing.

**Verified:** typecheck, lint, production build; 21/21 routes against `dist/` served as Pages
serves it and against dev; drift charge behaviour, line scoring and the driver swap all exercised
by driving them in a real browser. The render check earned its keep again — it caught the Chapter 0
rename immediately.

**Left open, honestly:** Chapter 7's practice page is still 1172px, and the plan page 1304px. Both
are content rather than chrome, which is the pass Riggs said would come later.

**Not mine to commit:** `README.md` has his pasted notes in the working tree.

---

### 2026-08-12 — Session 10 (Opus 5)

**Steps touched:** **2a2** (rebuilt) · **2b1** · **2b6** · **2b7** · **2b8** · **2b9** (answered) ·
**4b1** (rebuilt) · **4b2** (new) · **1b7** (new — drift, racing line)

Riggs playtested the assembled site and sent back a list. Every item on it was a real problem, and
three of them were problems with decisions I had argued myself into. This session is the response.

**The chapters are two pages now.** He sent a screenshot of Chapter 3 with the drill arriving two
thirds of the way down a page of prose, and the fix is the obvious one once seen: `#/chapter/ch3`
is the lesson and `#/chapter/ch3/try` is the practice. Reading and playing want different postures.
The template (`chapter-page.ts`) draws both, so all nine still behave identically.

**The "On the Switch" cards are gone.** Nine of them amounted to a training programme delivered in
nine unconnected pieces, at the exact moment she was still learning the idea rather than ready to
practise it. That material is now Chapter 8's programme.

**Chapter 8 is a forty-box grid.** Rebuilt to his sketch: eight weeks down, five sessions across,
one job per box, with a panel beside it showing tonight's in full. `data/regimen.ts` is the new
spine. **There are no dates in it** — he picked two months as a shape, and a dated plan is one that
is behind by week three, at which point the honest response is to stop opening the website. Forty
numbered boxes self-pace. The print sheet is a *blank* wall chart for the same reason: it goes on
the fridge on day one and stays there, so mirroring her ticks would make it wrong by that evening.

**Finishing the course changes the front door.** A bare URL now lands on `#/plan` once every
chapter is done. Deep links still go where they point.

**Three things I had got wrong, and what replaced them:**

- **Chapter 5's coins were not a racing line.** I had written a long comment talking myself out of
  painting one, on the grounds that the coins *were* the line. They were not: collecting a coin is
  a discrete event, so the drill rewarded *touching* the line fifteen times rather than *staying
  on* it. Those are different skills and only one of them is the chapter. `engine/racing-line.ts`
  paints a real line and scores the share of the lap she spends on it.
- **Kendahl was the frame when she should have been an aside.** She now gets one sentence at the
  end of the section on smoothness, which is where the joke lands harder anyway.
- **Chapter 6 talked her out of a core mechanic.** It argued drifting was "the one you need least"
  while sending her to a video whose author plainly disagrees. Drifting is implemented
  (`engine/drift.ts` — hop, hold, blue then orange, release for a boost) and the chapter has a
  drill. The argument changed shape rather than volume: it is now "here is the one condition under
  which it pays", which was always the genuinely useful part.

**2b9 is answered without watching anything.** I could not get a transcript — YouTube's caption
endpoint now returns 200 with an empty body, the InnerTube clients 400, and the three transcript
services all 403. What I could read is each video's own **chapter markers and description**, which
is better evidence than a summary anyway because it is the author's own table of contents. On that
basis the rule changed from "one general tutorial per chapter" to **one mechanic per video, or no
video**:

- Kept **Bayesic's intro** (12m32s) as the anchor, **his coins video** (5m00s, one subject) for
  Chapter 5, and **his drifting video** starting at 1:31 — the uploader's own "Basics of Drifting"
  mark — for Chapter 6, with a note to stop at 5:03 where it turns into competitive tech.
- Cut **Shortcat's** 37-minute omnibus (items at 11:03) and **SwitchPlay's** general tour, whose
  own description says it was narrated by an AI voice. On a present, that one disqualifies itself.
- Chapters 1, 3, 4 and 7 now have **no video at all**, which is the honest answer.

All three survivors are the same person, which was not the plan and is better than the plan.

**Chapter 0 has a practice page**: five questions, one per section of the intro video. That video
is now load-bearing for the whole course, so "did she watch it" is worth asking — and a wrong
answer teaches the thing anyway. It is not a gate and nothing is marked.

**The kart chapter answers the weight question.** Jodi drives Pink Gold Peach because Kayla told
her heavier is better. That is not wrong, which is why it has stuck — weight really does buy top
speed and win collisions. It is the right answer to a different question, and the card concedes
the point before turning it. Alongside it: within a weight class the drivers are **mechanically
identical**, so Peach, Daisy, Birdo and Yoshi are one kart with four costumes. The headline build
is Peach now, the light one is Toadette, and Waluigi leads Bill's list.

**What was verified.** Typecheck, lint and production build clean. **21/21 routes** render the
right content under real Chromium, including all eight new practice pages. And the two new
mechanics were **driven, not just screenshotted** — a scripted browser held a drift three times and
banked three mini-turbos, and the line score read 100% on the line, 69% after driving straight past
where the line goes, and 39% after deliberately steering off. A screenshot proves a drill rendered;
it does not prove the mechanic works.

**One tool added.** `scripts/voiceover-doc.mjs` regenerates the quoted scripts in
`docs/voiceover-scripts.md` from `src/data/voiceover.ts`, preserving the hand-written Target/Tone
direction. The doc's own header says a transcript disagreeing with the audio is worse than no
transcript, and then the two drifted the first time I rewrote three chapters — so the words now
have one source. (Its first version had a regex bug that doubled every chapter: `\n*$` under the
`m` flag matches the end of every *line*. Fixed, and the reason is in the file.)

**Still not verified, unchanged from last session:** nothing has run on macOS, 60fps is unmeasured,
no Safari pass, the print sheet has never met a printer, and nobody has timed a full run-through.

**Open:** the Pages deploy still fails at `actions/configure-pages@v5` — Pages has not been
switched to "GitHub Actions" as its source, which is Riggs's to do. Everything before that step
passes on CI.

---

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

Only **Q9** is still live, and it is cosmetic — the binding has been settled by use for months.
Everything else was answered and is struck below; the answers are in 's Decision log.

5. ~~**The IP rule contradicts the content.**~~ — **answered 2026-08-12:** names yes, artwork no. Design principle 5 says "No Nintendo assets, names, or
   characters," but 2b8 recommends "Yoshi + Teddy Buggy + Roller," 4c names four tracks, and 4e2
   wants a checked-in JSON of every kart part. A kart recommender can't work without naming parts.
   Proposed rewording: no Nintendo *artwork, audio, logos, or fonts*; names used as plain factual
   references are fine. Needs Riggs's call so a later session doesn't "fix" it the wrong way.
6. ~~**No track authoring format in Phase 1, but Phase 2 assumes one.**~~ — **answered 2026-08-07:** a plain typed array positioned by `t` and `offset`. 1b5 builds one test track.
   2b4 (ramps), 2b5 (pads + decoys) and 2b6 (racing line + coins) each need their own layout, and
   2b6 needs a fading ideal-line path. If tracks are hardcoded, every Phase 2 chapter becomes engine
   work — which breaks the Lego rule exactly where it matters. Proposal: a data-driven track format
   (JSON: segments, pads, ramps, decoys, coin lines, ideal-line polyline) as part of 1b5 or a new
   1b7, so Phase 2 chapters are content, not code.
7. ~~**Scoring is stored but never defined.**~~ — **answered 2026-08-12:** one star for finishing, two and three at per-chapter thresholds in `chapters.ts`. 1f3 syncs `stars` and `best_score`; 2b6 says "1 to 3
   stars"; no step says what earns a star in any drill. Suggest defining it in the 1g1 gate write-up,
   once the drills have real feel to measure.
9. **The `accelerate` slot.** The plan's action map is steer/hop/item/uiConfirm, but Ch1's
   start-boost drill needs a hold-the-accelerator input, so 1a2 added a fifth slot. It defaults to
   Space, shared with `hop`, on the reasoning that the countdown drill and the driving drills are
   never on screen together. Confirm or rebind at gate 1g1.
8. ~~**GitHub Pages deep links (parked with 1a5).**~~ — **answered 2026-08-12:** hash routing. The Promotions-folder warning below is still worth remembering at launch. Static Pages has no SPA fallback, so a refresh on
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
