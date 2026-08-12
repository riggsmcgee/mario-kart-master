# Voiceover scripts — the recording copy (3c1 → 3c2)

Nine scripts, one per chapter, with the names filled in so you can just read them.

**These are also the on-page transcripts.** The text that ships lives in `src/data/voiceover.ts`
with `{name}` and `{rival}` placeholders (the doorman can rename the student to Bill, so the
written version has to be templated even though the recording is not). This file is the same nine
scripts with the placeholders resolved to **Jodi** and **Kayla**. If you change a word at the
microphone, change it in `src/data/voiceover.ts` too — the page prints that file underneath the
player, and a transcript that disagrees with the audio is worse than no transcript.

## Before you start

- **Quiet room.** Soft furnishings beat a big empty kitchen. Bedroom, curtains shut, sit on the
  bed. Turn the fridge conversation off — you will hear it, and so will she.
- **Phone mic is fine.** Voice Memos or QuickTime. No equipment, no plugins, no faffing.
- Hold the phone about a hand's width away and slightly off to one side, so the p's do not pop.
- **One take per chapter.** Not one long take chopped up later. A chapter that goes wrong is one
  chapter to redo; takes are cheap and editing is not.
- If you fluff a line mid-take, do not start over. Stop, leave two full seconds of silence, and
  go again from the top of that paragraph. The silence is easy to find and easy to cut.
- Leave a second of silence at the top and tail of every take.
- Read it at your normal talking speed, sitting down, to one person. The target is 60 to 90
  seconds; if a take comes out at 100, nobody dies.
- **A blank line between paragraphs is a real pause** — about a breath. They are the paragraph
  breaks on the page as well, so they are already in the right places.
- **Bold means lean on it**, not shout it. It marks the one line of the chapter that has to land.
- Italics (`*two*`, in Chapter 1) mean a small stress on that word, nothing more.

## When you have a file

Save each take as `ch0.mp3` … `ch8.mp3` and drop them in `public/audio/`. That is the whole
integration step — there is no list to update and no code to touch.

The player probes for its own chapter's file when the page loads. If it finds one, a play button
appears above the transcript; if it does not, there is no control at all, not a broken one. So
**recording them out of order or one at a time is completely fine** — record `ch0.mp3` tonight and
ship it, and the other eight chapters simply stay as text until they are not.

Voice Memos exports `.m4a`; convert to `.mp3` before dropping it in, because the player asks for
the file by name.

---

## Chapter 0 — So you want to beat Kayla at Mario Kart?

**Target:** 60–90 seconds (~260 words)
**Tone:** Warm and conspiratorial — you are letting her in on a plan, not opening a lecture. Slow
right down on the homework line; it is the thesis of the entire site. The last two lines are a
grin, so grin while you say them.

> Hi Jodi. It's Riggs. Give me one minute and I'll tell you exactly how this is going to go.
>
> You want to beat Kayla at Mario Kart. So let's start by being honest about why you don't.
>
> She's faster than you. Not cleverer — faster. Her hands do the thinking. Something comes at her
> and she has already moved. That's real, and you are not going to out-twitch her. Neither am I.
>
> So we're not going to try. **We're going to beat her with homework.**
>
> Because here's the thing about Kayla. She has played this game for years and she has never once
> studied it. She doesn't know where the boost pads are. She's quick enough not to have had to.
>
> You're about to know. All of it.
>
> Nine short chapters, about half an hour. Each one is two pages: a page that explains the idea,
> and then a page where you get to try it, so it lands in your hands instead of just your head.
>
> Then the real work happens on your Switch, and the last chapter is where that lives — forty
> short sessions with one job each. That's the course. This is just the classroom.
>
> Fair warning. You'll be terrible at the drills for two minutes. Everybody is. Nothing here can
> be broken and nothing counts against you.
>
> I can't promise you'll beat her. I can promise that one evening she is going to look over and
> say, when did you learn that. And you get to shrug.
>
> Right. Chapter one.

---

## Chapter 1 — The race is won before it starts

**Target:** 60–90 seconds (~190 words)
**Tone:** Brisk, and slightly incredulous that nobody picks this up. "It still works" is the news
of the chapter — say it like you are telling her something you personally went and checked, because
you did.

> There is free speed sitting on the start line, Jodi, and almost nobody picks it up.
>
> The countdown goes three, two, one, GO. When the *two* starts to fade off the screen — that is
> your moment. Hold the accelerator then, and keep holding it.
>
> Now, you've got auto-accelerate switched on, so you'd think holding the button does nothing. I
> didn't believe it either. So I went and tested it on my own Switch. **It still works.** You
> still get the boost.
>
> Get the timing wrong and you just start normally. That is the entire punishment. So there is
> genuinely no reason not to try it every single race.
>
> The drill on this page runs the countdown five times. Press and hold on the beat. It shows you
> how close you were in thousandths of a second — ignore that number if it annoys you, it's only
> there so you can watch yourself getting closer.
>
> What do you win? About a kart length. Which does not sound like much.
>
> It's the difference between arriving at the first corner in front of Kayla or behind her. And
> she goes very quiet when she's behind you.

---

## Chapter 2 — The banana behind you

**Target:** 60–90 seconds (~240 words)
**Tone:** The most emphatic of the nine. This one is a coach talking, not a chat. Land "hold the
button down" as an instruction and let it sit for a beat. The doorway joke is throwaway — do not
sell it.

> This is the chapter that wins you races, Jodi. If you skim one of them, don't let it be this
> one.
>
> When you get an item, your instinct is to use it. Fire it, throw it, get it gone. That instinct
> is losing you races.
>
> **Hold the button down and the item sits behind your kart.** A banana, a shell, it does not
> matter which. Anything that arrives at your back bumper hits that instead of hitting you.
>
> And holding costs you nothing. No speed, no steering, no downside. You can carry a banana round
> a whole lap and all it does is protect you.
>
> One exception. The red shell. Fire that one, because it steers itself — it's the only item in
> the game you can't miss with. Everything else stays behind you.
>
> I know a green shell feels like a weapon. Not really — it flies dead straight, so hitting a kart
> that's weaving is luck, not skill. And a miss leaves your back bare, just as the shell that was
> coming for you arrives.
>
> A mushroom is different again. That is a boost, not armour, so save it for a straight bit of
> road. A mushroom in a corner is like sprinting in a doorway.
>
> There's a drill here where shells come at you from behind, and some quick questions after it.
> Six shells. Hold the button, keep the banana, and not one of them touches you.

---

## Chapter 3 — Every ramp is free speed

**Target:** 60–90 seconds (~190 words)
**Tone:** Light and easy. This is the cheapest skill in the game and it should sound like it.
"Like a sensible person" is the only joke — say it dry. Warm on the last paragraph: it is a
compliment disguised as a fact about Kayla.

> Every ramp in this game has a boost hidden inside it, and it costs you one button press.
>
> As the kart reaches the top of the ramp — right at the lip, as the ground leaves you — press the
> shoulder button. The kart does a little flip in the air, and you land going faster than you took
> off.
>
> That flip is the tell, Jodi. A spin means you got it. If it sails over like a sensible person,
> you missed it.
>
> The timing is the whole skill. Not on the way up. Not floating about in the air. Right at the
> top.
>
> And missing costs you absolutely nothing. A missed trick is just a jump. So press it every time
> — ramps, jumps, bumps, that little rise where the road changes.
>
> The drill here has six ramps round a loop, and it tells you how early or late you were. Don't
> chase a perfect score. Chase the habit.
>
> Kayla does this without thinking about it. That is not talent, that's just having done it a
> thousand times. There is nothing stopping you doing it a thousand times as well.

---

## Chapter 4 — The fast way round is not the tight way round

**Target:** 60–90 seconds (~210 words)
**Tone:** The reveal chapter. Quiet and matter-of-fact on the setup, then put the weight on "not on
the line you would naturally drive" and pause after it. "Let her" is allowed to be a little smug.

> Orange arrows painted on the road. Drive over one, go fast. You knew that bit already.
>
> Here's the bit nobody tells you. **The arrows are usually not on the line you would naturally
> drive.**
>
> Take Mario Kart Stadium — the first track, the easy one. After the first right-hander the road
> opens out into lanes. The outside one. The wide one. The one that obviously looks longer.
>
> That is where the boost pads are. And the coins.
>
> So the long way round is the fast way round, and you would never work that out by driving it.
> Somebody has to tell you, or you have to go looking.
>
> That is this entire website, in one corner of one track. Kayla is hugging the inside because the
> inside looks shorter. Let her.
>
> The drill has eight pads on a lap and some of them are deliberately out where you'd never go.
> You'll have to plan the lap instead of reacting to it — which, conveniently, is the only kind of
> racing where you have the advantage.
>
> On the Switch, drive one lap of each of your four tracks where the only goal is hitting arrows.
> Finish last. Doesn't matter. You're not racing, you're drawing a map.

---

## Chapter 5 — The fast way round a corner

**Target:** 60–90 seconds (~310 words)
**Tone:** The sincere one. Open by meaning it — "this is the big one" is not a hook, it is true,
and it should sound like you have thought about which chapter matters most. Take "wide, tight,
wide" slowly enough that she could say it along with you. The Kendahl line at the end is an
afterthought you happened to remember: throw it away, do not land it.

> This is the big one, Jodi. If you take one thing away from this whole website, take this
> chapter.
>
> Everything else I've taught you is a knack — a button at the right moment, an item held at the
> right time. Knacks have bad days. This one doesn't.
>
> Here's the idea. Every corner has a good path through it and a bad one, and the bad one is the
> one everybody picks by instinct, which is to hug the inside all the way round. Shortest, yes.
> Fastest, no.
>
> The good way is three parts. Wide going in. Tight through the middle. Wide coming out. It is a
> longer path on paper and a faster one in the kart, because you never have to slow down as much
> and you come out pointing at the next corner instead of at a wall.
>
> And underneath all of it: be smooth. Most of the speed people lose isn't lost in corners at all
> — it's lost sawing left, right, left, right down a straight. Pick a line, sit on it, stop
> fiddling.
>
> Coins, while we are here. Ten of them and your kart is genuinely faster. Not a trick, not a
> myth. It stops at ten, so ten is the number, and almost nobody bothers.
>
> They're armour as well. Every time something hits you, you drop three. Which is one more reason
> to be carrying that banana from chapter two.
>
> On the next page there's a line painted straight onto the road. Your score is how much of the
> lap you spend sitting on it — not how much of it you touch. Smooth wins.
>
> Oh — and this is exactly what Kendahl does, incidentally. No drifting, no items, no risks. A
> tidy line and her coins, and she beats Kayla regularly. Make of that what you like.

---

## Chapter 6 — Drifting is a boost you steer with

**Target:** 60–90 seconds (~310 words)
**Tone:** Let-me-in-on-it. The second paragraph is the one to slow right down on — "not a way of
taking a corner, a way of manufacturing a boost" is the whole chapter and everything after it is
consequences. Brighten up on "long corners only"; that is the practical bit she can use tonight.
Take the drafting aside faster and lighter, like you have just remembered it.

> Right. Drifting. The famous one, the one everybody goes on about — and for once the fuss is
> fair.
>
> But here's the bit nobody says out loud. A drift is not a way of taking a corner. It is a way of
> manufacturing a boost out of a corner you had to take anyway. Get that and the whole thing makes
> sense.
>
> So: you hold the drift button through the corner and the kart slides round instead of steering
> round. Sparks come off the back wheels. Blue first, then orange. Let go while they are glowing
> and you fire out of the corner.
>
> Blue arrives quickly and is worth very little. Orange takes about a second and a half and is
> worth nearly three of them. There is a third colour, purple, and you can ignore it entirely — it
> needs a longer drift than any corner in your cup, and it is for people who play this for a
> living.
>
> Which brings us to the part people skip, and it is the useful part: long corners only. On a
> tight one you spend the whole thing charging a spark that never arrives and you come out slower
> than if you'd just driven round it. On a long sweeper you get orange and you leave faster than
> you went in. Sweet Sweet Canyon is full of exactly those.
>
> While I've got you — thirty seconds on drafting. Sit right behind another kart down a long
> straight and their air pulls you along with them. You'll feel it happen. So next time Kayla is
> just ahead of you, tuck in behind her and wait. Free speed for doing nothing, which is my
> favourite kind.
>
> Next page you get six corners to try it on. Nothing is at stake and a fluffed one costs you
> nothing at all, so go and fluff a few.

---

## Chapter 7 — Pick your weapon

**Target:** 60–90 seconds (~200 words)
**Tone:** Decisive. Short sentences, no hedging, no "you could also" — she should come away feeling
handed an answer rather than a menu. Say the combo slowly enough that she could write it down.

> One decision, Jodi. You make it once and then you never think about it again.
>
> The temptation is to pick whatever looks fastest. Don't. With items switched on you are going to
> get hit — that is not pessimism, that's the game. So what matters is not your top speed. It's
> how quickly you are back up to speed after something knocks you sideways.
>
> Which means acceleration and handling. Top speed is the bar that looks best on the screen and
> helps you least.
>
> My pick for you: **Yoshi, the Teddy Buggy, roller tyres, and the cloud glider.** Quick to
> recover, easy to steer, very hard to get wrong.
>
> The tyres are the important part. The little fat roller ones. If you change nothing else on that
> whole screen, change the tyres.
>
> There are two more combos on this page, a lighter one and a heavier one, and honestly any of the
> three is fine. What is not fine is swapping it about every week. You can't learn a kart you keep
> changing.
>
> And that is the classroom finished. Go and set it up on the Switch now, while it's fresh.
> Chapter eight is the bit you keep.

---

## Chapter 8 — The Kayla Plan

**Target:** 60–90 seconds (~200 words)
**Tone:** The send-off. Warm the whole way through, brisk in the middle where it is logistics, and
then mean the last paragraph — this is the one she will play again. Do not rush "I want the phone
call". Stop talking after it.

> Right, Jodi. This is the one you print out and stick on the fridge.
>
> Three or four sessions a week, fifteen or twenty minutes each. That's less than an episode of
> anything.
>
> One cup: the Mushroom Cup. Four tracks. You're going to know those four the way you know your
> own street — and when it is your turn to pick, you pick them. Every time. Don't be polite about
> it.
>
> There is a guide in here for each one. Where the pads are, where the coins are, the single
> hazard that actually matters. Read the overviews now. The deep dives are for about week three,
> when the words will mean something.
>
> And there is a ladder to climb. Beat your own ghost. Then finish top three against the computer.
> Then win the cup against the computer. Then take one race off Kayla. Then take the whole cup off
> her.
>
> That last rung might take a while. That is fine. That is what a plan is for.
>
> Jodi, I have loved making this for you. If you never beat her, I'd still call it a good present.
> But you are going to beat her — and when you do, I want the phone call.