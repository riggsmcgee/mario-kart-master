/**
 * Chapter 5: racing lines and coins. (2b6)
 *
 * This is the chapter the whole course is really for, and the copy says so out loud. Everything
 * else we teach is a *knack* — a button at an instant, an item held at a moment — and a knack has
 * a bad day. A line does not. It is the one skill here with a high floor rather than a high
 * ceiling, which is exactly the shape of skill that beats a faster opponent over four races.
 *
 * **Kendahl is one sentence now.** (Riggs, 2026-08-12.) She used to open the chapter in a card of
 * her own, and on playtest that was too much of her: the point of the chapter is the racing line,
 * and a case study running above the teaching turned the lesson into an argument about somebody
 * else's daughter. She is still here, because she is genuinely the best evidence this project has
 * — she is just a remark at the end of the section rather than the frame around it.
 *
 * **The line is real now.** The plan always asked for an ideal line painted on the road; the first
 * build talked itself out of it and laid a trail of coins along the good line instead, on the
 * argument that the coins *were* the line. Riggs played that and asked for the real thing, and he
 * is right for a reason the first version missed: collecting a coin is a discrete event, so the
 * old drill rewarded **touching** the line fifteen times rather than **staying on** it. Those are
 * different skills and only one of them is this chapter.
 *
 * So `engine/racing-line.ts` owns the line, the scene paints it, and the score is the share of the
 * lap she spends within a couple of metres of it. The coins stay, sitting *on* the line, doing the
 * job they are good at — pulling the eye toward where she should be going next.
 *
 * **Why the shape is what it is.** Wide-in / tight-at-the-apex / wide-out through the U-turn, the
 * chicane and the hairpin, with the two boost pads bracketing the U-turn rather than sitting in
 * the middle of it. That is the "route pad-to-pad" lesson made physical: the pads are the easy
 * part, and the twenty seconds of driving between them is what is actually being taught. Nothing
 * sits further than 5 units off the centreline, because the steer assist starts objecting at 5.5
 * (`startFraction` 0.55 of a 10-unit half-width) and a line that fights her own smart-steering
 * setting would teach her that the good line feels wrong.
 *
 * **No ramps, on purpose.** Chapter 3 owns tricks. A ramp here would be a second thing to think
 * about, and the one instruction this drill wants to give is "stop thinking and follow the line".
 * The key hint says so too: steering is the only input that does anything.
 */

import { buildRacingLine, LineTracker, type LinePoint } from '../../engine/racing-line';
import type { FurnitureSpec } from '../../engine/track';
import { createKartDrill } from '../../ui/kart-drill';
import { el, frag, prose, rich } from '../dom';
import type { ChapterContent, ChapterContext, Mounted } from '../types';

const LAPS = 3;
/** Percent of the lap on the line. Three stars is 75 — see `chapters.ts` for why not higher. */
const TARGET = 100;

/**
 * The line itself: metres off the centreline at each fraction of the lap.
 *
 * These are the same control points the coin trail used, because that shape was already tuned and
 * the change was never about the shape. Section boundaries on the test circuit: 0–0.28 main
 * straight, 0.28–0.58 the wide U-turn, 0.58–0.84 back straight and chicane, 0.84–1 the hairpin.
 */
const CH5_LINE: LinePoint[] = [
  // Main straight: drift out to the outside edge before the corner arrives. The move that feels
  // most wrong and matters most.
  { t: 0.0, offset: 0 },
  { t: 0.11, offset: 2 },
  { t: 0.21, offset: 4 },

  // The U-turn. Wide and patient to 0.31, across to the apex by 0.44, then unwinding back out.
  { t: 0.31, offset: 4 },
  { t: 0.36, offset: 1 },
  { t: 0.44, offset: -4.5 },
  { t: 0.48, offset: -4 },
  { t: 0.53, offset: -1 },
  { t: 0.58, offset: 3.5 },

  // The chicane: left, right, left. One apex each, which is the only way through it that is not
  // a series of panicky corrections.
  { t: 0.63, offset: 4 },
  { t: 0.69, offset: -4 },
  { t: 0.76, offset: 2.5 },

  // The hairpin. Wide entry, late apex — the same three-part shape as the U-turn at a quarter of
  // the size, so it reads as the same idea rather than a new one.
  { t: 0.84, offset: 3.5 },
  { t: 0.92, offset: -4.5 },
  { t: 0.97, offset: -1 },
];

const CH5_RACING_LINE = buildRacingLine(CH5_LINE);

function coin(t: number, offset: number): FurnitureSpec {
  return { kind: 'coin', t, offset };
}

/**
 * Coins, sitting *on* the line rather than being it.
 *
 * They are no longer the score — the line is — so their job here is purely to pull the eye
 * forward. A coin fifteen metres ahead makes her look at where the line goes next, which is
 * exactly the instruction the concept section ends on and the one thing that stops her sawing at
 * the wheel. Every offset below is `CH5_RACING_LINE.offsetAt(t)` rounded, so a coin can never sit
 * off the line it is advertising.
 */
const COIN_TS = [
  // Main straight, sparse — the line here is obvious.
  0.05, 0.11, 0.16,
  // The U-turn, and the reason this drill exists. Dense through the apex, because this corner is
  // long and the mistake she will make is turning in early and running out of road.
  0.26, 0.31, 0.36, 0.4, 0.44, 0.48, 0.53,
  // The chicane: left, right, left. One per apex.
  0.63, 0.69, 0.76,
  // The hairpin.
  0.84, 0.92,
];

/** The two boost pads, bracketing the U-turn rather than sitting in the middle of it. */
const PAD_TS = [0.21, 0.58];

const CH5_LAYOUT: FurnitureSpec[] = [
  ...COIN_TS.map((t) => coin(t, CH5_RACING_LINE.offsetAt(t))),
  // Sitting where the line already wanted to be. A pad she has to leave the line to reach is
  // Chapter 4's lesson; this chapter's point is the opposite one.
  ...PAD_TS.map((t): FurnitureSpec => ({ kind: 'pad', t, offset: CH5_RACING_LINE.offsetAt(t) })),
];

function heading(text: string): HTMLElement {
  return el(
    'h2',
    { style: { fontSize: 'var(--t-section)', margin: 'var(--gap-lg) 0 0.9rem' } },
    text,
  );
}

/** One of the three beats of a corner. Colour-coded, but never *only* colour-coded — see 3e1. */
function beat(step: string, title: string, body: string, wash: string, edge: string): HTMLElement {
  return el(
    'div',
    {
      style: {
        background: wash,
        border: `2px solid ${edge}`,
        borderRadius: 'var(--round)',
        padding: '1.1rem 1.2rem',
      },
    },
    el('p', { class: 'eyebrow', style: { margin: '0 0 0.4rem' } }, step),
    el('h3', { style: { fontSize: '1.2rem', margin: '0 0 0.45rem' } }, title),
    el('p', { style: { margin: '0', fontSize: '1rem', lineHeight: '1.55' } }, rich(body)),
  );
}

const content: ChapterContent = {
  concept(ctx: ChapterContext): Node {
    return frag(
      prose([
        '**Everything else in this course is a knack you have to catch** — a button at the right instant, an item held at the right moment. Knacks have bad days.',
        'This one does not. This one is deciding where on the road you want to be, and then being there. It is the skill with the highest floor in the whole course: it pays on your sharpest evening and it still pays on the one where you are tired and your tea has gone cold. **If you only remember one chapter, remember this one.**',
      ]),

      heading('So what is a racing line?'),
      prose([
        'It is just the path you take through a corner. There is a good one and a bad one, and the bad one is the one everybody picks by instinct: hug the inside, all the way round.',
        'Hugging the inside genuinely is the shortest way round. It is also the *tightest* way round, so it is the one where you have to slow down the most, and you come out of it pointing at the edge of the road instead of down the next straight. Shortest and fastest are not the same thing. They almost never are.',
        'The good line has three parts, and you can say them out loud while you drive.',
      ]),

      el(
        'div',
        {
          style: {
            display: 'grid',
            gap: '0.9rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
            margin: '0 0 1.4rem',
          },
        },
        beat(
          'One',
          'Wide going in',
          'On the approach, move across to the **outside** edge of the road. Yes, it feels like the wrong direction. Do it anyway.',
          'var(--turf-wash)',
          'var(--turf)',
        ),
        beat(
          'Two',
          'Tight in the middle',
          'Cut in and brush the **inside** edge at the tightest point. That spot has a name — the apex — and now you can drop it into conversation at dinner.',
          'var(--trim-wash)',
          'var(--trim)',
        ),
        beat(
          'Three',
          'Wide coming out',
          'Let the kart run back **out** to the far edge as you straighten up. You leave the corner already aimed at the next one.',
          'var(--box-wash)',
          'var(--box)',
        ),
      ),

      prose([
        '**Wide, tight, wide.** It is a longer path on paper and a faster one in the kart, because you never have to slow down as much and you finish the corner facing the right way.',
        'And here is the unglamorous bit holding all of it up: **be smooth.** Most of the speed people lose is not lost in corners at all. It is lost sawing left-right-left-right down a straight, trying to sit in the exact middle of the road. Every one of those little corrections shaves a sliver off your speed, and there are hundreds of them in a race.',
        'Pick a line. Sit on it. Stop fiddling. Boring is fast.',
        ctx.t(
          'Which is, incidentally, exactly what Kendahl does. No drifting, no items, no risks — a tidy line and her coins, and she beats {rival} regularly. Make of that what you like.',
        ),
      ]),

      heading('Coins are speed. Ten of them.'),
      prose([
        'Coins are not points and they are not decoration. Every coin you are carrying makes your kart slightly quicker. It stacks up to ten, and then it stops — past ten they do nothing for your speed at all.',
        'So ten is the number. Ten by the end of lap one, and then simply keep them. Hardly anybody bothers to do this, which is precisely why it works.',
      ]),

      el(
        'div',
        {
          class: 'card',
          style: {
            background: 'var(--kerb-wash)',
            boxShadow: 'none',
            border: '3px solid var(--kerb)',
          },
        },
        el('p', { class: 'eyebrow', style: { color: 'var(--kerb)' } }, 'The sting in the tail'),
        el('p', null, rich('**Get hit and you drop three coins.** Not one. Three.')),
        el(
          'p',
          { style: { margin: '0' } },
          rich(
            ctx.t(
              'Get clobbered twice and your ten is a four, and now you are slower for the rest of the lap on top of the seconds you already lost spinning around. Which is Chapter 2 arriving back round the other side: the banana trailing behind you is not only protecting your bumper, it is protecting your top speed. {rival} has almost certainly never thought about this. You have now.',
            ),
          ),
        ),
      ),

      heading('The bit between the boosts'),
      prose([
        'Last chapter you learned where the boost pads live. Now stop thinking of them as things you happen to drive over, and start thinking of them as dots to be joined up.',
        ctx.t(
          '**The lap is won in the paths between the boosts.** Anyone can drive over a pad that is already underneath them. Getting from this one to the next one without wasting a single metre is the actual driving — and it is a thing you can work out in advance, in the calm, while {rival} is finding out at full speed.',
        ),
        'Coins work the same way. A line of coins on a track is not treasure scattered about. It is the game quietly telling you where the fast way round is. Follow the coins and you are usually already on the racing line.',
      ]),

      prose([
        'So: the practice track, with the good line painted straight onto the road in teal, coins sitting along it, and two boost pads where it already wanted to go. Three laps, and steering is the only control that does anything.',
        '**Your score is the share of the lap you spend on the line** — not how much of it you touch. Sitting on it is the whole exercise, so smooth beats quick here in a way it does not anywhere else in this course.',
        'If the line seems to be taking you the long way round a corner, good. That is the lesson. And do not lunge at it, because lunging is what makes you saw at the wheel — look at where it goes *next*, aim there, and let the kart run to it.',
      ]),
    );
  },

  interactive(mount: HTMLElement, ctx: ChapterContext): Mounted {
    const tracker = new LineTracker();

    // Coaching lines are one-shot per attempt. The drill owns its own "try it again" button and
    // gives us no restart hook, so a restart is inferred from the only thing that can mean one:
    // the lap counter going back to 1 after it has been higher.
    let lapSeen = 1;
    let padsCalled = 0;
    let saidSettled = false;
    let offSince: number | null = null;
    let strayCalled = false;

    return createKartDrill({
      mount,
      sfx: ctx.sfx,
      layout: CH5_LAYOUT,
      racingLine: CH5_RACING_LINE,
      goal: 'Stay on the line',
      unit: '% on the line',
      format: (score) => `${score}% on the line`,
      target: TARGET,
      laps: LAPS,
      keys: 'Arrow keys to steer — that is the whole control scheme',

      onTick(tick, api) {
        if (tick.lap < lapSeen) {
          tracker.reset();
          padsCalled = 0;
          saidSettled = false;
          strayCalled = false;
          offSince = null;
        }
        lapSeen = tick.lap;

        const on = tracker.sample(tick.line);
        api.set(tracker.percent());

        // Only the first two pads get a word. She drives over six across three laps, and a drill
        // that congratulates her six times for the same thing stops being congratulation.
        if (tick.events.padHit && padsCalled < 2) {
          padsCalled++;
          api.say(
            padsCalled === 1
              ? 'Boost one — the line put you there.'
              : 'Both of them. The bit in between was the lap.',
            'good',
          );
        }

        // One nudge, the first time she is properly off it for a while. A drill that comments
        // every time she wanders becomes a drill that nags.
        const now = performance.now();
        if (!on && tick.line) {
          offSince ??= now;
          if (!strayCalled && now - offSince > 1600) {
            strayCalled = true;
            api.say(
              tick.line.side < 0 ? 'Too tight — let it run wider.' : 'Drifting wide. Ease in.',
            );
          }
        } else {
          offSince = null;
        }

        if (!saidSettled && tick.lap >= 2 && tracker.percent() >= 60) {
          saidSettled = true;
          api.say('That is it. Now just keep doing nothing.', 'good');
        }
      },

      onFinish(score) {
        ctx.finish({ score });
      },

      verdict(score) {
        if (score >= 75) {
          return {
            title: `${score}% of the lap on the line.`,
            detail: ctx.t(
              'That is a driver, not a passenger — and you did it without one clever move, which is exactly the point. Now go and be that boring against {rival}.',
            ),
          };
        }
        if (score >= 55) {
          return {
            title: `${score}% on the line. Solidly on it.`,
            detail:
              'The part you are losing is almost certainly the corner entries, where going wide feels like going the wrong way. Go round again and commit to the wide bit — the line is not lost, it knows where it is going.',
          };
        }
        return {
          title: `${score}% on the line.`,
          detail:
            'Try once more, and this time stop steering at the line. Look at where it goes next, aim there, and let the kart carry you along the bit in between. Every little correction costs you speed, and there are hundreds of them in a race.',
        };
      },
    });
  },
};

export default content;
