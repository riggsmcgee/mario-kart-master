/**
 * Chapter 5: racing lines and coins. (2b6)
 *
 * This is the chapter the whole course is really for, and the copy says so out loud. Everything
 * else we teach is a *knack* — a button at an instant, an item held at a moment — and a knack has
 * a bad day. A line does not. It is the one skill here with a high floor rather than a high
 * ceiling, which is exactly the shape of skill that beats a faster opponent over four races.
 *
 * The concept leads with Kendahl and does not bury her, because she is the strongest evidence
 * this project has and she is not a statistic — she is at the same kitchen table. An argument
 * from a family member who already wins this way lands somewhere a paragraph about apex theory
 * never will.
 *
 * **The painted line, and what replaced it.** The plan asked for an ideal line painted on the
 * road that fades as she improves. `createKartDrill` cannot paint one, and adding line-rendering
 * to a component three chapters share — to serve one of them — is the wrong trade for a feature
 * that is only a teaching aid. So the coins ARE the painted line. Every coin below sits on the
 * line she should be driving, so following the trail and driving well are the same action, and
 * unlike a painted stripe the trail rewards her for being on it. It also fades exactly the way
 * the plan wanted, and for a better reason than a difficulty setting: a collected coin does not
 * come back, so by lap three the guide has genuinely disappeared from the parts of the track she
 * has already got right, and only the corners she has been missing are still lit up.
 *
 * **Why the layout is shaped like this.** The trail traces wide-in / tight-at-the-apex / wide-out
 * through the U-turn, the chicane and the hairpin, with the two boost pads deliberately bracketing
 * the U-turn rather than sitting in the middle of it. That is the "route pad-to-pad" lesson made
 * physical: the pads are the easy part, and the twenty seconds of driving between them is the part
 * that is actually being taught. Nothing sits further than 5 units off the centreline, because the
 * steer assist starts objecting at 5.5 (`startFraction` 0.55 of a 10-unit half-width) and a trail
 * that fights her own smart-steering setting would teach her that the good line feels wrong.
 *
 * **No ramps, on purpose.** Chapter 3 owns tricks. A ramp here would be a second thing to think
 * about, and the one instruction this drill wants to give is "stop thinking and follow the line".
 * The key hint says so too: steering is the only input that does anything.
 *
 * **Why `set` and not `add`.** The counter is coins *held*, read back off the track run each tick,
 * not a tally we keep ourselves. In the real game that number goes down — three coins every time
 * something hits her — and the drill's counter should be the same kind of number as the one on her
 * Switch, even though nothing in this particular drill can knock them off her. The cost is that
 * `set` does not end the drill at target the way `add` does, so we end it explicitly; without that
 * she would keep driving an empty track after the win, which is the one ending the plan forbids.
 */

import type { FurnitureSpec } from '../../engine/track';
import { createKartDrill } from '../../ui/kart-drill';
import { el, frag, prose, rich } from '../dom';
import type { ChapterContent, ChapterContext, Mounted } from '../types';

const TARGET = 10;
const LAPS = 3;

function coin(t: number, offset: number): FurnitureSpec {
  return { kind: 'coin', t, offset };
}

/**
 * The trail. Fifteen coins for a target of ten, so three laps is comfortable even if she misses
 * a whole corner every time round — the plan's "generous difficulty, ends on a win" rule costed
 * out in coins rather than argued about.
 *
 * `t` is distance around the lap and `offset` is metres off the centreline, negative toward the
 * infield. Section boundaries on the test circuit: 0–0.28 main straight, 0.28–0.58 the wide
 * U-turn, 0.58–0.84 back straight and chicane, 0.84–1 the tight hairpin.
 */
const CH5_LAYOUT: FurnitureSpec[] = [
  // Main straight. The line here is obvious, so the coins are sparse and their only job is to
  // walk her out to the outside edge before the corner arrives — the move that feels most wrong
  // and matters most.
  coin(0.05, 0),
  coin(0.11, 2),
  coin(0.16, 3.5),

  // Boost one, sitting where the line already wanted to be. A pad she has to leave the line to
  // reach is Chapter 4's lesson; this chapter's point is the opposite one.
  { kind: 'pad', t: 0.21, offset: 4 },

  // The U-turn, and the reason this drill exists. Wide and patient to 0.31, cutting across to
  // the apex by 0.44, then unwinding back out. Held at the apex for two coins rather than one:
  // this corner is long, and the mistake she will make is turning in early and running out of
  // road, not turning in late.
  coin(0.26, 4.5),
  coin(0.31, 4),
  coin(0.36, 1),
  coin(0.4, -2.5),
  coin(0.44, -4.5),
  coin(0.48, -4),
  coin(0.53, -1),

  // Boost two, on the exit. Getting here at speed is the whole reward for the eight coins above,
  // and the wide exit flows straight into the chicane's first apex without another correction.
  { kind: 'pad', t: 0.58, offset: 3.5 },

  // The chicane: left, right, left. One coin per apex, which is the only way through it that is
  // not a series of panicky corrections.
  coin(0.63, 4),
  coin(0.69, -4),
  coin(0.76, 2.5),

  // The hairpin. Wide entry, late apex — the same three-part shape as the U-turn, at a quarter
  // of the size, so it reads as the same idea rather than a new one.
  coin(0.84, 3.5),
  coin(0.92, -4.5),
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
      el(
        'div',
        { class: 'card', style: { borderLeft: '8px solid var(--kerb)' } },
        el('p', { class: 'eyebrow' }, 'The case study'),
        el(
          'h2',
          { style: { fontSize: 'var(--t-section)', margin: '0 0 0.9rem' } },
          ctx.t('Kendahl does none of this, and she beats {rival} anyway'),
        ),
        prose([
          ctx.t("Before anything else, we need to talk about {rival}'s big sister."),
          'Kendahl does not drift. She does not carry a banana behind her. She takes no risks at all — no ambitious overtakes, no cutting a corner and hoping. She drives a tidy line and she picks up coins. That is the entire act.',
          ctx.t('And she beats {rival}. Not once as a fluke. Regularly.'),
          'That is the argument for this chapter, and it is already sitting at your kitchen table. **Everything else in this course is a knack you have to catch** — a button at the right instant, an item held at the right moment — and a knack has bad days. This one has none. This one is deciding where on the road you want to be, and then being there.',
          'Which makes it the most valuable half hour in the whole course. It is the skill with the highest floor: it pays on your sharpest day, and it still pays on the evening you are tired and your tea has gone cold. **If you only remember one chapter, remember this one.**',
          'Your role model here is your own daughter. Do what Kendahl does.',
        ]),
      ),

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
        'So: the practice track, with a trail of coins laid along the good line and two boost pads sitting on it. Three laps, ten coins, and steering is the only control that does anything.',
        'Follow the coins. If the trail seems to be taking you the long way round a corner, good — that is the lesson. And do not lunge at them one at a time, because that is what makes you saw at the wheel. Look at where the trail goes *next* and let the kart run to it.',
      ]),
    );
  },

  interactive(mount: HTMLElement, ctx: ChapterContext): Mounted {
    // Coaching lines are one-shot per attempt. The drill owns its own "try it again" button and
    // gives us no restart hook, so a restart is inferred from the only thing that can possibly
    // mean one: the coin count going *down*. Within a run coins never come back, so a fall can
    // only be a fresh start.
    let coinsSeen = 0;
    let padsCalled = 0;
    let saidHalfway = false;
    let saidOneMore = false;

    return createKartDrill({
      mount,
      sfx: ctx.sfx,
      layout: CH5_LAYOUT,
      goal: 'Follow the coins',
      unit: 'coins',
      target: TARGET,
      laps: LAPS,
      keys: 'Arrow keys to steer — that is the whole control scheme',

      onTick(tick, api) {
        if (tick.coins < coinsSeen) {
          padsCalled = 0;
          saidHalfway = false;
          saidOneMore = false;
        }
        coinsSeen = tick.coins;
        api.set(tick.coins);

        // Only the first two pads get a word. She drives over six across three laps, and a drill
        // that congratulates her six times for the same thing stops being congratulation.
        if (tick.events.padHit && padsCalled < 2) {
          padsCalled++;
          api.say(
            padsCalled === 1
              ? 'Boost one. Now drive the line to boost two.'
              : 'Both of them. The bit in between was the lap.',
            'good',
          );
        }

        if (!saidHalfway && tick.coins >= 5 && tick.coins < TARGET - 1) {
          saidHalfway = true;
          api.say('Halfway. Stay smooth.');
        }
        if (!saidOneMore && tick.coins >= TARGET - 1 && tick.coins < TARGET) {
          saidOneMore = true;
          api.say('One more.');
        }

        // `set` does not end the drill the way `add` does, so the win has to be declared here.
        if (tick.coins >= TARGET) api.finish();
      },

      onFinish(score) {
        ctx.finish({ score });
      },

      verdict(score) {
        if (score >= TARGET) {
          return {
            title: 'Ten coins. That is your kart at full speed.',
            detail: ctx.t(
              'And you did it without one clever move — which is exactly the point, and exactly the lap Kendahl drives. Now go and do it on the Switch, where it counts against {rival}.',
            ),
          };
        }
        if (score >= 6) {
          return {
            title: `${score} coins, and a tidy line.`,
            detail:
              'The ones you missed are almost certainly the coins on the inside of a corner, where being there feels wrong. Go round again and trust the trail — it is not lost, it knows where it is going.',
          };
        }
        return {
          title: `${score} coins.`,
          detail:
            'Try it once more, and this time stop steering at the coins. Look at where the trail goes next, aim there, and let the kart carry you across the ones in between. Smooth picks up more than quick does.',
        };
      },
    });
  },
};

export default content;
