# Playtest notes

Raw feedback, kept in the words it arrived in. This is the source; what was _decided_ because of it
lives in the [build-plan decision log](../build-plan.md#decision-log), and how it went lives in
[WORKLOG.md](../WORKLOG.md). Three copies sounds like two too many, but the raw note is the only one
that cannot be spun after the fact — when a later session wants to know whether a change was really
asked for, this is the file that answers.

Newest at the top.

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

Nothing from either batch is outstanding. Two things were explicitly deferred rather than done:

- **One screen, no scrolling.** Chapter 7's practice page and the plan page still overflow. Riggs
  called this correctly as something that gets easier as content is cut, so it belongs with the next
  consolidation pass rather than with a layout fix.
- **Consolidating the writing.** "Let's go through and _start_ to consolidate" — a beginning, not a
  finish. Chapters 5 and 6 are still the longest lesson pages.
