/**
 * There Is No Course. (4e4)
 *
 * The lockout, rebuilt as something to play.
 *
 * **What was here before.** Kayla clicks her own name at the doorman and the site tells her, flatly,
 * that this was built for somebody else and every chapter is locked. That was the right joke and it
 * had one flaw: it is over in eight seconds. She reads it, she gets it, she clicks "Change user",
 * and the funniest thing on the site is a paragraph she will never look at twice.
 *
 * **What it is now.** The notice is still the first thing she sees and it still says exactly what it
 * said. The difference is that the notice can be taken apart, and taking it apart is the game — a
 * ten-minute run of beats in which the website insists there is nothing here while she steals its
 * punctuation, fills in its progress bar by hand, silences it, and gets in anyway. The genre is
 * lifted wholesale from a game she loves and this file is not shy about it.
 *
 * **Why it is worth building at all.** She is the rival. The entire site is named after beating her,
 * every chapter mentions her, and she is the one person it is aimed at who gets nothing out of it.
 * A lockout is a punchline; this is a present, hidden inside the punchline, which she can only find
 * by being exactly as nosy as everyone already knows she is going to be.
 *
 * **The rules the old lockout set, which all still hold.**
 *
 *  - *Deadpan, never a taunt.* The comedy is a website being bureaucratic at a teenager. It never
 *    scores a point off her, and the one place it could — she is better at this game than her mum —
 *    is the place it is warmest.
 *  - *The exit is always visible.* `stage.ts` draws "Change user" itself so that no beat is capable
 *    of removing it. She can leave at any second of the ten minutes.
 *  - *Almost nothing is stored.* No progress, no role on the server, no row anywhere recording that
 *    she was here — `progress.ts` already refuses to push the `kayla` role. The single exception is
 *    the local flag written at the very end, when she has been through all of it and said yes three
 *    times, and the narrator makes that the ceremony rather than hiding it: *"So I will write your
 *    name down instead. I have never done that."*
 */

import type { Sfx } from '../../ui/sfx';
import type { Mounted } from '../types';
import { BEATS } from './beats';
import { runStage } from './stage';
import './kayla.css';

export { BEATS } from './beats';

export interface KaylaDeps {
  sfx: Sfx;
  /** Back to the doorman. Owned by the caller because only it knows how to reopen it. */
  onLeave: () => void;
  /** She finished it and said yes three times. Let her into the actual site. */
  onAdmitted: () => void;
  /**
   * Somebody who is not Kayla is having a look.
   *
   * Riggs, 2026-08-13: *"maybe a button for trying out Kay's game for everyone in the settings would
   * be nice."* Reasonable — four people are going to be shown this thing and only one of them is
   * meant to find it on her own.
   *
   * **A preview run writes nothing down.** It plays identically, right through to the end, and then
   * declines to set the admission flag. That matters more than it looks: without it, Jodi playing the
   * demo to the end would leave `mkm.kayla.admitted.v1` set on the family laptop, and Kayla clicking
   * her own name a week later would be waved straight through to the site having never seen any of
   * it. The one bit of state this experience creates is the one bit a demo must not create.
   */
  preview?: boolean;
  /** Prototype harness only. */
  from?: number;
}

export function renderKayla(mount: HTMLElement, deps: KaylaDeps): Mounted {
  return runStage(mount, {
    sfx: deps.sfx,
    onLeave: deps.onLeave,
    onAdmitted: deps.onAdmitted,
    preview: deps.preview === true,
    beats: BEATS,
    ...(deps.from === undefined ? {} : { from: deps.from }),
  });
}
