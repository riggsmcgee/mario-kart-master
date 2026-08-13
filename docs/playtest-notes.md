# Playtest notes

Raw feedback, kept in the words it arrived in. This is the source; what was _decided_ because of it
lives in the [build-plan decision log](../build-plan.md#decision-log), and how it went lives in
[WORKLOG.md](../WORKLOG.md). Three copies sounds like two too many, but the raw note is the only one
that cannot be spun after the fact — when a later session wants to know whether a change was really
asked for, this is the file that answers.

Newest at the top.

---

## 2026-08-13 — Riggs, third pass

Delivered in session 20. One screenshot and one written note.

> This should be the top of the plan page. With the pdf right before it. By FAR the most important
> detail that is missing _(drawn over the top-left of the forty-session grid.)_
>
> You can remove the scripts from all the chapters. I'm recording what I want now. I think I'll just
> do one video on chapter 0 to explain the site. I don't want to spend so much time recording

The plan-page note turned out to be pointing at a real absence rather than a layout preference. There
was a "Print the sheet" button in the strip at the bottom of `#/plan`, and what it printed was that
page — the grid and three cards — because `.plan-sheet` was built inside Chapter 8 and no other
document contained one. So the daily driver could not produce the thing the whole chapter is for.
Fixed by lifting the sheet into `site/plan-sheet.ts` and moving the button to directly above the
grid, where the offer is next to the thing being offered.

The scripts one is a straight subtraction and worth recording as such: nine ninety-second scripts,
about two thousand words, written to be read by one person who was never going to find nine evenings
to read them. They were also, by design, the same material as the pages they sat on — which makes
them the one part of this website whose absence costs a reader nothing. One clip that explains the
site is a different job from nine that re-explain the chapters, and it is the job only he can do.

---

## 2026-08-13 — Riggs, second full pass

Delivered in session 20, after the first pass had landed. Screenshots again, plus one written note.

> Ch0 quiz. Telling them why the answer was right or wrong on each questions was a great addition
> that Katharine learned a lot from. I'd like to see that return

On the screenshots:

> This work page can be its own thing, own page. Without a long scroll after. After she completes
> the site. This is the central point. Make sure all relavent info is captured on the pdf, even if it
> takes up more than one page. _(the forty-session grid and tonight's panel, on Chapter 8.)_
>
> Have the quiz be the first thing in the chapter. The actual plan comes after the quiz is done. Not
> scrollable at the start _(the card that used to link out to Chapter 8's practice page.)_
>
> I'm not sure if "identically" is rendering how you intended _(Chapter 7's practice page, with
> `**identically**` printing its own asterisks.)_
>
> Change title to "Pick your kart" _(over Chapter 7's "Pick your weapon".)_
>
> Just remove the video from Ch 5. It's too technical and just says the same thing. _(a still of the
> coins video, showing an archived Reddit thread about distance units per frame.)_
>
> I love this layout, I just feel like its a little off center. A little too far down. Do you see
> that? _(the doorman.)_

Two of these overturned decisions taken earlier the same day, and both were right to.

The quiz one reverses a deliberate call: the cold run at Chapter 0 had been built to explain nothing,
so that the score at the end measured the course rather than a memory of twelve cards. That is a real
thing to want, and it is worth less than the thing it cost — a wrong answer explained at the moment
she gives it, on the page she is least committed to. Katharine's run is better evidence than the
argument was.

He was also right that the doorman was off centre, and it took measuring to find out why: centred
text says nothing about where its box is, so the mascot sat against the left edge of an 832px column
and the eyebrow's text landed 144px left of the page's centre line, under a heading that was dead on
it. The "too far down" half was not a bug — the block was centred to the pixel — and got fixed
anyway, because a composition whose weight is all in the bottom row reads low however the arithmetic
comes out.

The `**identically**` note is the one worth keeping for its own sake. It is a whole class of bug —
copy carries `**bold**`, and only `rich()` turns that into emphasis — and it typechecks, lints and
renders. `npm run shoot` now fails any route with a stray `**` in its text, which found a second one
on the settings page within a minute of being written.

---

## 2026-08-13 — Riggs, first full pass

Delivered in session 20. Marked-up screenshots again, plus two written chapter notes. Kept verbatim.

> Ch0. I don't feel like the emphasis on reflexes are very applicable. Let's just craft the narrative
> around Kayla being a gamer and knowing a few key things that differentiate her. We can't teach Jodi
> all the nuances of the game, but we can lay things out simply and point out the highest value
> things to learn
>
> Ch 3. We should mention that you can shake the remote instead of pressing the button to get the
> ramp boost if that is preferred.

On the screenshots, in the order they arrived:

> Having functionally two different "Next" buttons is confusing. Just have one button that leads into
> the next practice. _(Chapter 4's practice page, on "Show me the first one" beside "Next: The fast
> way round a corner".)_
>
> Probably clarify that slowing down means braking _(Chapter 4, "The one exception")._
>
> Just say that I'm representing them with orange arrows. They're often not orange. _(Chapter 4's
> opening paragraph, with the colour hedge struck through.)_
>
> Show the items that you have visually in the corner as well as in the text. Apply to all relevant
> questions _(a Chapter 2 quiz card, arrow drawn at the top-left of the diagram)._
>
> Let's move the item box to the top left to reflect the game and make it a bit more visual _(the
> "No item — drive through a box" chip in the Chapter 2 drill)._
>
> If you're holding down space after the last exercise, then it automatically selects this next
> button. Not a big deal, but a little disorientating
>
> Change to "Next: Defensive Driving" _(the same button, which took its label from Chapter 2's title
> "The banana behind you")._
>
> Replace with "Next: Quiz" / Keep button. Just change text _(Chapter 0's "Next: Practice" and "Skip
> the practice")._
>
> I think we should have her take a big quiz at the beginning and at the end to see how much she
> learned
>
> I like this, but why is it in the opening chapter? _(the animated U-turn figure at the top of
> Chapter 0.)_

The two that changed more than a page each: the benchmark quiz, which became Chapter 0's practice and
Chapter 8's practice; and the Chapter 0 reframe, which also took the home page's lede and Chapter 0's
voiceover script with it. Both were revised again the same day by the batch above — the quiz moved to
the front of Chapter 8, and the blind first run it originally shipped with was reverted.

The held-space one is a good bug to have found from a screenshot. Finishing a chapter moves focus to
the next-chapter button, and a key still down from the drill repeats onto it — so the site walked
itself into the next chapter. See `ignoreHeldKey` in `chapter-page.ts`.

---

## 2026-08-12 — Katharine's run (via Riggs)

First reader who is not the author. Delivered in session 13.

> I'm not sure where this should live, but I think an item quiz asking what you should do in what
> situation would be good. Here are some questions I thought of: _right before mystery box_ Use item
> to make space or not? _behind enemy_ red shell throw? _behind enemy_ green shell throw? Instead of
> spelling it out, it could have visuals for this question. During testing I realized you already
> have this and I just didn't see it. There are some corrections in screenshots. Great work.
>
> Ch4 is a bit conviluted. They're called boost pads and they are not always orange. I think the big
> thing is emphasizing that using a pad is usually faster than not using one, even if its out of the
> way. Lose the rest of the complexity.
>
> For the quiz questions, the correct answer always lands on item 1. Change that
>
> In the starting game (literally the starting boost). Katharine could see the instructions after a
> failed attempt because they went too quickly. Maybe make it slower or more prominent. Not sure.
> Maybe have her press space when she is ready to go next
>
> The quizes and games seem to be a hit. Katharine really likes them
>
> Boost pads aren't appearing until you get really close to them. It makes the minigame unrealistic
> and needlessly hard. It looks like it might be something with the road covering them up from a far
>
> Overall, the feedback from the test run was VERY positive. Great work!!

Marked-up screenshots came with it, and worked better than prose — "cut this" drawn across a card is
unambiguous in a way that describing the card is not. They asked for: the item card retitled
"Item cheatsheet", Chapter 2's "low skill, high reward" paragraph cut, Chapter 3's timing section
consolidated to one paragraph with the jargon dropped, and the quiz situation combined with its
question ("Katharine wants to combine the information here to make it more clear. Applies to
multiple questions" / "Not clearly item box. Them is too vague").

---

## 2026-08-12 — Riggs, second pass

Delivered in session 11. Kept verbatim; this batch used to sit in `README.md`.

> Settings need some sort of "back to menu" or "return" button. Currently, its a little confusing to
> get out of settings
>
> Ch 0 , I like "The Goal" better than "The Promise"
>
> I noticed this in the quiz for ch 0. I lot of places require scrolling to see everything. For the
> quiz. I think everything should easily fit on one computer screen with no scrolling. This is
> something that will be easier to fix later on, as we cut and refine content in later revisions.
> Take note and consider making structural changes now
>
> Instead of "Try it...." just say "Next: Practice" so its consisent
>
> Ch 6 practice. The boost is happening, but I don't see the flip anymore. Once again, this is a spot
> where everything should fit on the screen. No scrolling
>
> Drifting doesn't feel quite right. You still turn just as sharp, so you can't drift for long. In
> order for me to actually get an orange drift, I have to go in a full circle
>
> Ch7 should give an option to change your character and see the other options without committing
> after you've already selected
>
> Kayla plan. I like the layout you have, but I don't like the actual tasks. For example, "do five
> starts". If she just resets, that's less then two minutes. I think should more involve getting
> familiar with the maps, time trials, learning maps specific routes, etc. all while focusing on
> something. For example, I think play through a certain map [x] number of times while trying to get
> a perfect boost every time is much better than do five starts. That way she can play through the
> same map while focusing on different things.

The drift note turned out to be a real physics bug rather than a taste one: drift yaw was being added
_on top of_ steering, which at full lock came to 3.15 rad/s — about 343 degrees over a 1.9s drift,
which is exactly the "full circle" described.

---

## Still open

Nothing from any of the five batches is outstanding. Two things were explicitly deferred rather than
done:

- **One screen, no scrolling.** Chapter 7's practice page and the plan page still overflow. Riggs
  called this correctly as something that gets easier as content is cut, so it belongs with the next
  consolidation pass rather than with a layout fix.
- **Consolidating the writing.** "Let's go through and _start_ to consolidate" — a beginning, not a
  finish. Chapters 5 and 6 are still the longest lesson pages.
