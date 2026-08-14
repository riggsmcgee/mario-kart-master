/**
 * Chapter 2: item smarts. (2b3)
 *
 * The chapter with a thesis, settled by Riggs on 2026-08-11: **her item play is entirely
 * defensive.** Anything that can block is held behind the kart and never fired. The single
 * exception is the red shell, because it steers itself and is therefore the only item in the
 * game that scores a hit without being aimed. Every other answer in the deck below passes the
 * same filter — *low skill, high reward* — and anything that fails it is not taught here, however
 * good it looks on a highlight reel.
 *
 * That thesis is why this chapter's interactive is two things rather than one. The drill builds
 * the habit in the hands: hold the button, and the shell hits the banana instead of you. The
 * quiz builds the same habit as a *decision*, across ten situations the drill cannot stage — a
 * bob-omb ticking in her hands, two full slots on the run-in to an item box, a coin she thinks
 * is a wasted turn. Neither half works alone. A drill on its own teaches one reflex on one
 * track; a quiz on its own is a page of advice she agrees with and then forgets at 100cc.
 *
 * **The order matters and is not negotiable.** The drill goes first because it is the part that
 * costs her something to believe — being hit three times while holding nothing is a more
 * convincing argument than any paragraph — and the quiz second, when "hold it behind you" is
 * something she has already felt work.
 *
 * The ten cards come from `src/data/quiz/item-smarts.json`, which is the deck 1d1 shipped
 * instead of three samples precisely so that this chapter would already be written when it got
 * here. It is data, and it is edited as data: nothing in this file restates it.
 */

import itemSmarts from '../../data/quiz/item-smarts.json';
import { Quiz, parseQuiz, fillQuiz } from '../../ui/quiz';
import { createShieldDrill } from '../../ui/shield-drill';
import { el, prose, rich } from '../dom';
import type { ChapterContent, ChapterContext, Mounted } from '../types';
import '../../ui/quiz.css';

/**
 * How many shells the drill throws at her.
 *
 * Six, and the number is load-bearing in two places: `chapters.ts` scores this chapter as
 * "shells blocked out of 6" with two stars at 3 and three at 5, and the copy below counts in
 * sixes. Move one and move all three.
 */
const THREATS = 6;

/**
 * `quiz.css` was written for the Phase 1 testbed and reaches for its palette variables
 * (`--accent`, `--line`, `--muted`, `--fg`, `--bg`), none of which exist in `theme.css`. Rather
 * than edit a shared stylesheet from inside one chapter, the wrapper below defines them locally
 * in terms of the real house tokens, which scopes the mapping to the element the quiz renders
 * into. `--bg` is the *text* colour of the next button, hence the dark brown: it is there to make
 * that button read exactly like the site's own `.btn-go`, which is orange with dark type.
 */
const QUIZ_TOKENS = [
  '--accent: var(--boost)',
  '--line: var(--rule)',
  '--muted: var(--ink-soft)',
  '--fg: var(--ink)',
  '--bg: #3a1c00',
].join('; ');

/** Parsed once, at import. A typo in the deck should fail loudly here rather than draw a blank card. */
const DECK = parseQuiz(itemSmarts);

/** One line of the item reference. Bold verdict first, because that is the part she will skim. */
function itemRule(item: string, verdict: string, why: string): HTMLLIElement {
  return el(
    'li',
    { style: { marginBottom: '0.6em' } },
    el('strong', null, `${item} — ${verdict}`),
    ' ',
    rich(why),
  );
}

/** What to say about her drill score, before the quiz starts. */
function scoreline(blocked: number): string {
  if (blocked >= THREATS) {
    return 'Every single one. Nothing on that track could touch you, and you never once had to aim at anything.';
  }
  if (blocked * 3 >= THREATS * 2) {
    return 'Good. Look at what the misses had in common: an empty pair of hands, or a banana you were not holding out. There is no third way to be hit.';
  }
  if (blocked > 0) {
    return 'That is the lesson arriving the honest way. A shell that is locked on nearly always finds you, so the only thing that saves you is the thing already sitting behind your bumper.';
  }
  return 'Every one of those got through, and every one of them was preventable by holding a button you were not using for anything else. That is the whole chapter, and it does not get harder than that.';
}

const content: ChapterContent = {
  concept(ctx: ChapterContext): Node {
    const t = (text: string): string => ctx.t(text);

    // One column, generously spaced: prose, the exception, the reference card, prose. `.stack-lg`
    // rather than margins of its own, so this chapter breathes at exactly the same rhythm as the
    // other eight.
    return el(
      'div',
      { class: 'stack-lg' },
      prose([
        t(
          'Here is the whole chapter, {name}, and you may stop reading after this sentence: **hold on to everything, and never fire it forwards.**',
        ),
        t(
          'Hold the item button and anything you can throw — a banana, a green shell, a red shell — sits out behind your back bumper, in the way. Anything coming up the road hits it instead of you. It costs you nothing to carry — no speed, no steering. So carry it, all race.',
        ),
        t(
          'When something *is* coming for you, the game tells you — a little picture appears and a siren starts. That is not a signal to start swerving. It is a reminder to hold the button.',
        ),
      ]),

      el(
        'div',
        { class: 'card stack' },
        el('p', { class: 'eyebrow' }, 'The one exception'),
        el('h3', null, t('Fire the red shells')),
        el(
          'p',
          null,
          rich(
            t(
              'A red shell steers itself — round corners, over hills, straight to whoever is in front of you. You never have to see them and you never have to aim. It is the only item that lands a hit *for* you, so it is the only one worth firing. Everything else stays behind you.',
            ),
          ),
        ),
      ),

      el(
        'div',
        { class: 'card' },
        el('p', { class: 'eyebrow' }, 'Item cheatsheet'),
        el(
          'ul',
          { style: { marginTop: '0.8rem', paddingLeft: '1.2em' } },
          itemRule(
            'Banana',
            'hold it.',
            'Behind the bumper, all the way round the track. It is in the way, and being in the way is the entire job.',
          ),
          itemRule(
            'Green shell',
            'hold it.',
            'Thrown, it flies dead straight and a moving kart is a hard thing to hit. Held, it stops whatever arrives behind you, and it does that every single time.',
          ),
          itemRule(
            'Red shell',
            'fire it.',
            'The exception, for the reason above: it does the aiming, so you do not have to.',
          ),
          itemRule(
            'Bob-omb',
            'throw it backwards, straight away.',
            'The one thing you must never hold. Anything that touches it back there sets it off — a shell aimed at you, a kart on your bumper — and you are well inside the blast when it does. Backwards is also where everyone chasing you is, and the bang is wide enough that you cannot really miss.',
          ),
          itemRule(
            'Triple bananas or triple shells',
            'nothing to do.',
            'Three of them circle your kart on their own, without you holding anything. That is already armour. Drive, and spend them one at a time when you feel like it.',
          ),
          itemRule(
            'Coin',
            'use it now.',
            'Not a wasted turn. Every coin makes you slightly faster, up to ten of them, and you lose three each time something hits you — so you are usually topping up rather than getting greedy. Using it also empties the slot.',
          ),
          itemRule(
            'Mushroom',
            'save it for a corner exit.',
            'It gives you the same shove wherever you use it, so it is worth the most where you are slowest — coming out of a corner onto a straight, not halfway round the bend.',
          ),
        ),
      ),

      prose([
        t(
          '**With both item slots full, driving through a box gives you nothing.** Not a swap — nothing. So on the run-in to a row of boxes, spend the junk and keep the armour.',
        ),
        t(
          'And if you are dumping something anyway, drop it *on* the boxes. Everybody has to drive at those.',
        ),
      ]),
    );
  },

  interactive(mount: HTMLElement, ctx: ChapterContext): Mounted {
    const t = (text: string): string => ctx.t(text);

    const stage = el('div');
    mount.replaceChildren(stage);

    let live: Mounted | null = null;
    let disposed = false;
    let completed = false;

    function startQuiz(blocked: number): void {
      live?.dispose();
      live = null;
      if (disposed) return;

      const heading = el('h3', null, `${blocked} of ${THREATS} blocked`);
      const comment = el('p', null, rich(t(scoreline(blocked))));
      const nextUp = el(
        'p',
        null,
        rich(
          t(
            'Now ten situations, no driving. Every one is the same question: **what do you do with the thing in your hands?**',
          ),
        ),
      );
      const board = el(
        'div',
        { class: 'card stack' },
        el('p', { class: 'eyebrow' }, 'Part one done'),
        heading,
        comment,
        nextUp,
      );

      const quizMount = el('div', { attrs: { style: QUIZ_TOKENS } });

      const quiz = new Quiz({
        mount: quizMount,
        questions: fillQuiz(DECK, t),
        // Sound on every answer, and deliberately not a buzzer on the wrong ones — the plan is
        // explicit that nothing here marks her.
        onAnswer: (result) => ctx.sfx.play(result.correct ? 'right' : 'nudge'),
        onComplete: (summary) => {
          if (completed) return;
          completed = true;
          heading.textContent = t('That is Chapter 2 done');
          comment.replaceChildren(
            rich(
              t(
                `You blocked **${blocked} of ${THREATS}** out on the track and got **${summary.correct} of ${summary.total}** of the situations. Neither number is the point — the habit is.`,
              ),
            ),
          );
          nextUp.replaceChildren(
            rich(
              t(
                'Hold what you have got, fire only the red shells, and throw the bob-omb backwards. That is the whole of it.',
              ),
            ),
          );
          ctx.finish({ score: blocked });
        },
      });

      live = { dispose: () => quiz.dispose() };
      stage.replaceChildren(board, quizMount);
    }

    live = createShieldDrill({
      mount: stage,
      sfx: ctx.sfx,
      target: THREATS,
      onFinish(blocked) {
        // Deferred out of the drill's own tick. `startQuiz` disposes the drill, and tearing down
        // a running loop from inside a callback that loop is currently making is the kind of
        // thing that works until the day it does not.
        queueMicrotask(() => startQuiz(blocked));
      },
    });

    return {
      dispose() {
        disposed = true;
        live?.dispose();
        live = null;
      },
    };
  },
};

export default content;
