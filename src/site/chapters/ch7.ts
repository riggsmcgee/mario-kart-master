/**
 * Chapter 7: pick your weapon. (2b8)
 *
 * The last chapter of the classroom, and the only one whose output leaves the browser as a
 * *decision* rather than as a skill. Everything before this taught her something to practise; this
 * one asks her to press about six buttons on a Switch once and then never think about it again.
 *
 * **Three personalities, not a stats table.** The research (2b8) is unambiguous — at 100cc with
 * items on, acceleration and handling beat top speed, and Roller-class tyres carry every build —
 * but a stats table would hand a non-gamer five bars she has no way to weigh and invite her to
 * optimise. So the numbers stayed in `src/data/parts.ts` (where the doorman's combo browser needs
 * them) and the chapter presents finished builds with names and temperaments. She picks the one
 * that *sounds like her*, which is a question she can actually answer, and every answer is right.
 *
 * **Why the pick is stored.** Chapter 8's race-day card reminds her what she chose, and a race-day
 * card that says "your combo" is worth nothing. It goes to localStorage rather than the synced
 * progress store because it is a preference, not an achievement: worth nothing to anyone else,
 * and it must be readable by Chapter 8 instantly and offline. The shape and the key live in
 * `parts.ts` so both chapters agree about it in one place.
 *
 * **Bill's variant** (the doorman, 4e) reorders rather than rewrites: the sturdy build leads and a
 * heavier alternate joins the list. The stat philosophy underneath is identical, because it is
 * correct for both of them — only the order of the shelf changes.
 */

import {
  ARCHETYPES,
  loadCombo,
  sameClassAs,
  saveCombo,
  type ArchetypeId,
  type Combo,
} from '../../data/parts';
import { el, frag, prose, rich } from '../dom';
import type { ChapterContent, ChapterContext, Mounted } from '../types';
import './ch7.css';

interface BuildCopy {
  title: string;
  /** One line under the name. Sets the temperament before any part is mentioned. */
  tagline: string;
  /** Three words, the things this build is. Not stats — impressions. */
  tags: readonly string[];
  /** The honest pitch, tradeoff included. Every build here names what it costs. */
  why: string;
}

const COPY: Record<ArchetypeId, BuildCopy> = {
  comfy: {
    title: 'The Comfy Speedster',
    tagline: 'The one most people should pick.',
    tags: ['Forgiving', 'Quick recovery', 'Easy corners'],
    why: 'Quick to get going again, easy round a corner, and just heavy enough that a bump moves you rather than launching you into the scenery. This is the build people recommend when somebody says "I just want a kart that does not fight me".',
  },
  zippy: {
    title: 'The Zippy One',
    tagline: 'For the impatient.',
    tags: ['Fastest pick-up', 'Tiny', 'Gets shoved'],
    why: 'The fastest recovery on this page — get hit, and you are back at full speed almost before the shell has finished gloating. The price is that you are light, and light karts get shoved about. If {rival} enjoys bumping into people, she will enjoy it more against this one. Toad, Koopa, Shy Guy and Wendy all drive identically, so take whichever one makes you laugh.',
  },
  steady: {
    title: 'The Steady One',
    tagline: 'Hard to push around.',
    tags: ['Holds its ground', 'Unbothered', 'Slower to recover'],
    why: 'Heavier, so the bumping happens to other people. A little slower to wind back up after a hit — you are trading "recover faster" for "get knocked about less", which is a perfectly respectable trade, and the closest thing here to the kart you are already on. Still on Rollers, so it never feels like steering a bus. Waluigi, Donkey Kong and King Boo are the same build with a different face.',
  },
  muscle: {
    title: 'The Muscle',
    tagline: 'For when the answer is simply "more".',
    tags: ['Immovable', 'Top speed', 'Slow to recover'],
    why: 'Heavy, and still turns properly. More top speed, slower to get going after a knock, and nobody is moving you off your line. Same rule underneath: the Rollers are doing the quiet work, which is what stops this from being a barge.',
  },
};

/** Bill leads with the sturdy build and gets the heavy alternate. Everyone else gets the three. */
function buildOrder(role: string): readonly ArchetypeId[] {
  return role === 'bill' ? ['steady', 'muscle', 'comfy', 'zippy'] : ['comfy', 'zippy', 'steady'];
}

const NUMBER_WORDS: Record<number, string> = { 3: 'three', 4: 'four' };

/** The four slots of a build, in the order the game's own screens ask for them. */
function slotRows(combo: Combo): ReadonlyArray<{ label: string; name: string }> {
  return [
    { label: 'Driver', name: combo.character.name },
    { label: 'Kart', name: combo.body.name },
    { label: 'Tyres', name: combo.tyres.name },
    { label: 'Glider', name: combo.glider.name },
  ];
}

interface BuiltCard {
  card: HTMLButtonElement;
  /** The pill at the bottom. Its wording changes when this build is the chosen one. */
  label: HTMLSpanElement;
}

function buildCard(id: ArchetypeId, headline: boolean, t: (text: string) => string): BuiltCard {
  const combo = ARCHETYPES[id];
  const copy = COPY[id];
  const label = el('span', { class: 'combo-choose' }, 'Choose this one');

  const card = el(
    'button',
    {
      class: 'combo-card',
      type: 'button',
      data: { archetype: id, headline: String(headline) },
      attrs: { 'aria-pressed': 'false' },
    },
    headline ? el('span', { class: 'combo-flag' }, 'Start here') : null,
    el('span', { class: 'combo-title' }, copy.title),
    el('span', { class: 'combo-tagline' }, t(copy.tagline)),
    el(
      'span',
      { class: 'combo-parts' },
      ...slotRows(combo).flatMap((row) => [
        el('span', { class: 'combo-slot' }, row.label),
        el('span', { class: 'combo-part' }, row.name),
      ]),
    ),
    el('span', { class: 'combo-why' }, rich(t(copy.why))),
    el(
      'span',
      { class: 'combo-tags' },
      ...copy.tags.map((tag) => el('span', { class: 'combo-tag' }, tag)),
    ),
    label,
  );

  return { card, label };
}

/** What to do on the Switch, for the build she actually chose. */
function setupPanel(id: ArchetypeId, t: (text: string) => string): HTMLElement {
  const combo = ARCHETYPES[id];
  const copy = COPY[id];

  const steps = [
    'On the Switch, start a race — Grand Prix, VS, anything at all — and stop when it asks who you are.',
    `Driver: **${combo.character.name}**.`,
    `Next screen is the kart itself: **${combo.body.name}**.`,
    `Then the wheels: **${combo.tyres.name}**. This is the one that matters most.`,
    `Then the glider: **${combo.glider.name}**. Gliders change the least of anything here, so swap it for one you like the look of if you want.`,
    'That is it. The game remembers, so every race from now on starts with the right kart underneath you.',
  ];

  return el(
    'div',
    { class: 'combo-setup-card card' },
    el('p', { class: 'eyebrow' }, 'Your setup'),
    el('h4', null, t(`You picked ${copy.title}.`)),
    el(
      'p',
      null,
      'Here is exactly how to set it. It takes about ninety seconds, and you never have to do it again.',
    ),
    el('ol', { class: 'combo-steps' }, ...steps.map((step) => el('li', null, rich(t(step))))),
    el(
      'p',
      { class: 'combo-bridge' },
      rich(
        t(
          '**That is the classroom done.** Go and set this on your Switch right now — before Chapter 8, before the kettle goes on. Ninety seconds, and then it is yours forever.',
        ),
      ),
    ),
    el(
      'p',
      { class: 'combo-change' },
      'Changed your mind? Choose a different one above. Nothing here is locked.',
    ),
  );
}

/**
 * "Is heavier better?" — answered properly. (Riggs, 2026-08-12.)
 *
 * Jodi drives Pink Gold Peach because {rival} told her the heavier the character the better, and
 * the temptation is to call that wrong and move on. It is not wrong, which is exactly why it has
 * stuck: weight really does buy top speed, and it really does win the shoving matches. What it
 * does not do is help the person who is getting hit six times a race at 100cc, and *that* is the
 * correction.
 *
 * So the card concedes the point before turning it. A card that opened by telling her she has
 * been driving the wrong character for two years on somebody else's bad advice would be
 * technically useful and would land as a telling-off, and this is a present.
 */
function weightCard(t: (text: string) => string): HTMLElement {
  return el(
    'div',
    { class: 'card', style: { borderLeft: '8px solid var(--trim)' } },
    el('p', { class: 'eyebrow' }, 'The thing you were told'),
    el('h3', null, t('"The heavier the character, the better"')),
    prose(
      [
        '{rival} is not making this up, and it is worth saying so plainly: heavy characters really do have a higher top speed, and they really do win the bumping. If two karts touch, the heavier one keeps its line and the lighter one goes into the grass. That is all true.',
        'It is also the answer to a different question. It is the right advice for somebody driving clean laps at 150cc who is rarely getting hit — and you are playing 100cc with items on, against a houseful of people throwing shells. **You are going to get hit.** The number that decides your race is not how fast you go, it is how long you spend not going.',
        'Which is where heavy quietly costs you: Pink Gold Peach is one of the heaviest drivers in the game, and she is correspondingly one of the slowest to wind back up after a knock. Every shell costs you noticeably more than it costs the person who hit you.',
        'So: keep the weight if you enjoy shoving people, it is a real strategy. But swap those standard tyres for **Rollers**, because that one change buys back most of the pick-up you are missing and costs you almost nothing you were using.',
      ].map(t),
    ),
  );
}

/**
 * The character-select fact nobody is told, and the reason this chapter can hand her a feminine
 * pick without hedging: within a weight class the drivers are mechanically identical.
 */
function driverCard(t: (text: string) => string): HTMLElement {
  const alts = sameClassAs('peach');

  return el(
    'div',
    { class: 'card', style: { borderLeft: '8px solid var(--box)' } },
    el('p', { class: 'eyebrow' }, 'And on who you drive as'),
    el('h3', null, t('Peach, Daisy, Birdo and Yoshi are the same kart')),
    prose(
      [
        'Genuinely. Not "roughly the same" — the game sorts every driver into a handful of weight groups, and inside a group they are identical in every number that exists. Different face, same kart.',
        'So the answer to "which character should I be" is: **whichever one you like the look of.** Pick the character, then fix the weight class with the kart and the tyres, which is where all the real difference lives anyway.',
      ].map(t),
    ),
    el(
      'p',
      { class: 'ms', style: { color: 'var(--ink-soft)', margin: '0' } },
      t(
        `Drives exactly like Peach: ${alts.map((item) => item.name).join(', ')}. Take your pick.`,
      ),
    ),
  );
}

const content: ChapterContent = {
  concept(ctx: ChapterContext): Node {
    const line = (text: string): string => ctx.t(text);
    const count = NUMBER_WORDS[buildOrder(ctx.player.role).length] ?? 'three';

    return frag(
      prose(
        [
          'Everybody assumes the fast kart wins. At 100cc, with items switched on, against somebody who is definitely going to hit you with a shell — the fast kart does not win. **The kart that gets back up to speed wins.**',
          'Because you are going to get hit. Not might: will. {rival} will hit you, the computer will hit you, a banana you never saw will hit you. Every hit costs the same amount of dignity but a different number of seconds, and that number is decided right now, on the character select screen, before the race even exists.',
          'A big heavy fast build takes a long, sad moment to wind itself back up. A light nippy one is back at full pelt before you have finished complaining. So we are choosing **pick-up and turning**, and cheerfully giving away top speed you would rarely reach anyway — on your four tracks you are almost never flat out for long enough to notice.',
        ].map(line),
      ),
      el(
        'div',
        { class: 'card combo-rule' },
        el('p', { class: 'eyebrow' }, 'The whole chapter, in one line'),
        el(
          'p',
          null,
          rich(
            line(
              'Choose the kart that **recovers** fastest, not the one that **goes** fastest. You spend far more of a race recovering.',
            ),
          ),
        ),
      ),
      weightCard(line),

      driverCard(line),

      prose(
        [
          'One part does more work than the rest, and it is the part nobody ever changes: **the tyres**. The small Roller wheels — they look like something off a shopping trolley — add pick-up and turning to whatever they are bolted onto. Every setup below is wearing them. If you change one single thing after reading this page, change the tyres.',
          `Below are ${count} complete setups. They are all good. Pick the one whose description sounds like **you**, rather than the one you think is objectively best, because the gap between them is genuinely smaller than the gap between remembering your start boost and forgetting it.`,
          ctx.player.role === 'bill'
            ? 'Your list is shuffled, by the way: the sturdy one leads, on the theory that you would rather be immovable than nippy. The rule underneath has not changed a bit.'
            : 'And do not agonise. This is the least important decision in the whole course, which is exactly why it should take you thirty seconds.',
        ].map(line),
      ),
    );
  },

  interactive(mount, ctx): Mounted {
    const t = (text: string): string => ctx.t(text);
    const order = buildOrder(ctx.player.role);

    const grid = el('div', { class: 'combo-grid' });
    // Announced when it changes: she has just pressed a button and the answer appears below the
    // fold on a small screen, which is exactly the case a live region exists for.
    const setup = el('div', { class: 'combo-setup', attrs: { 'aria-live': 'polite' } });

    const cards = new Map<ArchetypeId, BuiltCard>();

    /** True once she has chosen in this visit, so a re-pick does not re-throw the fanfare. */
    let chosen = false;

    const choose = (id: ArchetypeId, fromHer: boolean): void => {
      for (const [key, built] of cards) {
        const picked = key === id;
        built.card.dataset['picked'] = String(picked);
        built.card.setAttribute('aria-pressed', String(picked));
        built.label.textContent = picked ? 'This one is yours' : 'Choose this one';
      }

      const combo = ARCHETYPES[id];
      saveCombo({
        archetype: id,
        title: COPY[id].title,
        character: combo.character.name,
        body: combo.body.name,
        tyres: combo.tyres.name,
        glider: combo.glider.name,
      });

      setup.replaceChildren(setupPanel(id, t));

      if (!fromHer) return;

      // The first choice gets the chapter's own done-stamp sound from finish(). A change of mind
      // gets a quiet acknowledgement instead, because a second fanfare for the same decision
      // would read as sarcasm.
      if (chosen) ctx.sfx.play('right');
      chosen = true;
      ctx.finish();
    };

    order.forEach((id, index) => {
      const built = buildCard(id, index === 0, t);
      built.card.addEventListener('click', () => choose(id, true));
      cards.set(id, built);
      grid.append(built.card);
    });

    // Coming back to a chapter she has already done should show her own choice, not an empty
    // slate — but silently: no sound, no second stamp, nothing that pretends this is news.
    const saved = loadCombo();
    if (saved && cards.has(saved.archetype)) {
      chosen = true;
      choose(saved.archetype, false);
    } else {
      setup.replaceChildren(
        el(
          'p',
          { class: 'combo-prompt' },
          'Choose one and I will tell you exactly which buttons to press.',
        ),
      );
    }

    mount.replaceChildren(el('div', { class: 'combo-picker' }, grid, setup));

    return {
      dispose() {
        // The listeners live on nodes inside the mount; dropping the nodes drops them with it.
        mount.replaceChildren();
      },
    };
  },
};

export default content;
