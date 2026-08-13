/**
 * The voiceover scripts. (3c1)
 *
 * Each of these is read twice: once by Riggs into a phone microphone (3c2), and once by whoever
 * is sat on the chapter page reading instead of listening. **They are the same text on purpose.**
 * A separate "transcript" would be written once, drift the first time a sentence got reworded at
 * the microphone, and then quietly lie to the one person on the site who most needs the written
 * version. So the script *is* the transcript, this file is the single copy of it, and the rule for
 * recording is: change a word while reading, change it here too.
 *
 * **Paragraphs, not one blob.** Each string is one thought, which does two jobs at once — it is a
 * paragraph on the page and a breath mark in the booth. Anything that would need a comma-heavy
 * subordinate clause to hold together gets split into two strings instead, because the man reading
 * this is a nephew with a phone, not a voice actor, and long sentences are where takes die.
 *
 * **`{name}` and `{rival}` survive into the spoken script**, which looks pointless for audio that
 * is baked once and addressed to one person. It is not: the doorman (4e) can rename the student to
 * Bill, and the transcript on his page has to say Bill even though the recording still says Jodi.
 * The plan already accepts that mismatch as part of the joke; what it cannot accept is the written
 * copy being the thing that breaks the illusion. `docs/voiceover-scripts.md` carries the same nine
 * scripts with the placeholders resolved, so nobody has to read punctuation aloud.
 *
 * **Length is deliberately short: 60 to 90 seconds, 150 to 230 words.** This plays while she is
 * looking at a page that also explains itself in writing, and a voice that outlasts the reading
 * loses to the scroll bar. The voiceover is not the chapter — it is the version she would get if
 * he were sitting next to her, and every chapter still works with the sound off.
 *
 * Formatting is whatever `rich()` understands, which is `**bold**` and `*italic*` and nothing
 * else. Bold marks the one line of the chapter to lean on. It is a stage direction that happens
 * to also render.
 */

export const VOICEOVER: Record<string, string[]> = {
  ch0: [
    "Hi {name}. It's Riggs. Give me one minute and I'll tell you exactly how this is going to go.",
    "You want to beat {rival} at Mario Kart. So let's start by being honest about why you don't.",
    "She's faster than you. Not cleverer — faster. Her hands do the thinking. Something comes at her and she has already moved. That's real, and you are not going to out-twitch her. Neither am I.",
    "So we're not going to try. **We're going to beat her with homework.**",
    "Because here's the thing about {rival}. She has played this game for years and she has never once studied it. She doesn't know where the boost pads are. She's quick enough not to have had to.",
    "You're about to know. All of it.",
    'Nine short chapters, about an hour all in. Each one is two pages: a page that explains the idea, and then a page where you get to try it, so it lands in your hands instead of just your head.',
    "Then the real work happens on your Switch, and the last chapter is where that lives — forty short sessions with one job each. That's the course. This is just the classroom.",
    "Fair warning. You'll be terrible at the drills for two minutes. Everybody is. Nothing here can be broken and nothing counts against you.",
    "I can't promise you'll beat her. I can promise that one evening she is going to look over and say, when did you learn that. And you get to shrug.",
    'Right. Chapter one.',
  ],

  ch1: [
    'There is free speed sitting on the start line, {name}, and almost nobody picks it up.',
    'The countdown goes three, two, one, GO. When the *two* starts to fade off the screen — that is your moment. Hold the accelerator then, and keep holding it.',
    "Now, you've got auto-accelerate switched on, so you'd think holding the button does nothing. I didn't believe it either. So I went and tested it on my own Switch. **It still works.** You still get the boost.",
    'Get the timing wrong and you just start normally. That is the entire punishment. So there is genuinely no reason not to try it every single race.',
    "The drill on this page runs the countdown five times. Press and hold on the beat. It shows you how close you were in thousandths of a second — ignore that number if it annoys you, it's only there so you can watch yourself getting closer.",
    'What do you win? About a kart length. Which does not sound like much.',
    "It's the difference between arriving at the first corner in front of {rival} or behind her. And she goes very quiet when she's behind you.",
  ],

  ch2: [
    "This is the chapter that wins you races, {name}. If you skim one of them, don't let it be this one.",
    'When you get an item, your instinct is to use it. Fire it, throw it, get it gone. That instinct is losing you races.',
    '**Hold the button down and the item sits behind your kart.** A banana, a shell, it does not matter which. Anything that arrives at your back bumper hits that instead of hitting you.',
    'And holding costs you nothing. No speed, no steering, no downside. You can carry a banana round a whole lap and all it does is protect you.',
    "One exception. The red shell. Fire that one, because it steers itself — it's the only item in the game you can't miss with. Everything else stays behind you.",
    "I know a green shell feels like a weapon. Not really — it flies dead straight, so hitting a kart that's weaving is luck, not skill. And a miss leaves your back bare, just as the shell that was coming for you arrives.",
    'A mushroom is different again. That is a boost, not armour, so save it for a straight bit of road. A mushroom in a corner is like sprinting in a doorway.',
    "There's a drill here where shells come at you from behind, and some quick questions after it. Six shells. Hold the button, keep the banana, and not one of them touches you.",
  ],

  ch3: [
    'Every ramp in this game has a boost hidden inside it, and it costs you one button press.',
    'As the kart reaches the top of the ramp — right at the lip, as the ground leaves you — press the shoulder button. The kart does a little flip in the air, and you land going faster than you took off.',
    'That flip is the tell, {name}. A spin means you got it. If it sails over like a sensible person, you missed it.',
    'The timing is the whole skill. Not on the way up. Not floating about in the air. Right at the top.',
    'And missing costs you absolutely nothing. A missed trick is just a jump. So press it every time — ramps, jumps, bumps, that little rise where the road changes.',
    "The drill here has six ramps round a loop, and it tells you how early or late you were. Don't chase a perfect score. Chase the habit.",
    "{rival} does this without thinking about it. That is not talent, that's just having done it a thousand times. There is nothing stopping you doing it a thousand times as well.",
  ],

  ch4: [
    'Orange arrows painted on the road. Drive over one, go fast. You knew that bit already.',
    "Here's the bit nobody tells you. **The arrows are usually not on the line you would naturally drive.**",
    'Take Mario Kart Stadium — the first track, the easy one. After the first right-hander the road opens out into lanes. The outside one. The wide one. The one that obviously looks longer.',
    'That is where the boost pads are. And the coins.',
    'So the long way round is the fast way round, and you would never work that out by driving it. Somebody has to tell you, or you have to go looking.',
    'That is this entire website, in one corner of one track. {rival} is hugging the inside because the inside looks shorter. Let her.',
    "The drill has eight pads on a lap and some of them are deliberately out where you'd never go. You'll have to plan the lap instead of reacting to it — which, conveniently, is the only kind of racing where you have the advantage.",
    "On the Switch, drive one lap of each of your four tracks where the only goal is hitting arrows. Finish last. Doesn't matter. You're not racing, you're drawing a map.",
  ],

  ch5: [
    'This is the big one, {name}. If you take one thing away from this whole website, take this chapter.',
    "Everything else I've taught you is a knack — a button at the right moment, an item held at the right time. Knacks have bad days. This one doesn't.",
    "Here's the idea. Every corner has a good path through it and a bad one, and the bad one is the one everybody picks by instinct, which is to hug the inside all the way round. Shortest, yes. Fastest, no.",
    'The good way is three parts. Wide going in. Tight through the middle. Wide coming out. It is a longer path on paper and a faster one in the kart, because you never have to slow down as much and you come out pointing at the next corner instead of at a wall.',
    "And underneath all of it: be smooth. Most of the speed people lose isn't lost in corners at all — it's lost sawing left, right, left, right down a straight. Pick a line, sit on it, stop fiddling.",
    'Coins, while we are here. Ten of them and your kart is genuinely faster. Not a trick, not a myth. It stops at ten, so ten is the number, and almost nobody bothers.',
    "They're armour as well. Every time something hits you, you drop three. Which is one more reason to be carrying that banana from chapter two.",
    "On the next page there's a line painted straight onto the road. Your score is how much of the lap you spend sitting on it — not how much of it you touch. Smooth wins.",
    'Oh — and this is exactly what Kendahl does, incidentally. No drifting, no items, no risks. A tidy line and her coins, and she beats {rival} regularly. Make of that what you like.',
  ],

  ch6: [
    'Right. Drifting. The famous one, the one everybody goes on about — and for once the fuss is fair.',
    "But here's the bit nobody says out loud. A drift is not a way of taking a corner. It is a way of manufacturing a boost out of a corner you had to take anyway. Get that and the whole thing makes sense.",
    'So: you hold the drift button through the corner and the kart slides round instead of steering round. Sparks come off the back wheels. Blue first, then orange. Let go while they are glowing and you fire out of the corner.',
    'Blue arrives quickly and is worth very little. Orange takes about a second and a half and is worth nearly three of them. There is a third colour, purple, and you can ignore it entirely — it needs a longer drift than any corner in your cup, and it is for people who play this for a living.',
    "Which brings us to the part people skip, and it is the useful part: long corners only. On a tight one you spend the whole thing charging a spark that never arrives and you come out slower than if you'd just driven round it. On a long sweeper you get orange and you leave faster than you went in. Sweet Sweet Canyon is full of exactly those.",
    "While I've got you — thirty seconds on drafting. Sit right behind another kart down a long straight and their air pulls you along with them. You'll feel it happen. So next time {rival} is just ahead of you, tuck in behind her and wait. Free speed for doing nothing, which is my favourite kind.",
    'Next page you get six corners to try it on. Nothing is at stake and a fluffed one costs you nothing at all, so go and fluff a few.',
  ],

  ch7: [
    'One decision, {name}. You make it once and then you never think about it again.',
    "The temptation is to pick whatever looks fastest. Don't. With items switched on you are going to get hit — that is not pessimism, that's the game. So what matters is not your top speed. It's how quickly you are back up to speed after something knocks you sideways.",
    'Which means acceleration and handling. Top speed is the bar that looks best on the screen and helps you least.',
    'My pick for you: **Yoshi, the Teddy Buggy, roller tyres, and the cloud glider.** Quick to recover, easy to steer, very hard to get wrong.',
    'The tyres are the important part. The little fat roller ones. If you change nothing else on that whole screen, change the tyres.',
    "There are two more combos on this page, a lighter one and a heavier one, and honestly any of the three is fine. What is not fine is swapping it about every week. You can't learn a kart you keep changing.",
    "And that is the classroom finished. Go and set it up on the Switch now, while it's fresh. Chapter eight is the bit you keep.",
  ],

  ch8: [
    'Right, {name}. This is the one you print out and stick on the fridge.',
    "Forty boxes. One a day, five days a week, weekends off — so about two months, and each one is fifteen or twenty minutes. That's less than an episode of anything.",
    'Every box is the same shape: a few runs of one particular track, with one thing to think about while you drive them. That is deliberate. You get better at the skill and you learn the map, at the same time, off the same laps.',
    "And it is one cup: the Mushroom Cup. Four tracks. By the end of this you're going to know those four the way you know your own street — and when it is your turn to pick, you pick them. Every time. Don't be polite about it.",
    'There is a guide in here for each one. Where the pads are, where the coins are, the single hazard that actually matters. Read the overviews now. The deep dives are for about week three, when the words will mean something.',
    'And there is a ladder to climb. Beat your own ghost. Then finish top three against the computer. Then win the cup against the computer. Then take one race off {rival}. Then take the whole cup off her.',
    'That last rung might take a while. That is fine. That is what a plan is for.',
    "{name}, I have loved making this for you. If you never beat her, I'd still call it a good present. But you are going to beat her — and when you do, I want the phone call.",
  ],
};
