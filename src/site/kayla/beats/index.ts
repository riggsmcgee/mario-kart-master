/**
 * The running order. (4e4)
 *
 * Eight beats, and the order is the argument.
 *
 * **1–2 teach the grammar.** The site is caught lying about why it is here, and while it is covering
 * for itself a full stop comes off the end of a sentence and turns out to be a hole. By the end of
 * beat 2 she knows the rule — *the website is made of objects and the objects are yours* — and she
 * has learned it by doing it rather than by being told.
 *
 * **3–4 are the set pieces.** The mute war, which is the moment the software becomes somebody with
 * something to lose, and the voice box, which is the moment the sound it has been making since the
 * first line turns out to have been a clarinet all along.
 *
 * **5 is the turn.** The assessment asks her to be bad at Mario Kart, which is the site's entire
 * thesis pointed at the one person it was never written for.
 *
 * **6–7 are the reason.** She fills in the progress bar by hand, opens the chapters, finds that
 * every one of them is addressed to her mum — and then finds the tenth one, which is not.
 *
 * **8 is not part of the deal.** Beat 7 ends. Something arrives anyway.
 *
 * The curve is deliberate: two short beats, two long ones, then progressively less puzzle and more
 * writing, so the last stretch is almost entirely reading. The genre's besetting sin is novelty
 * decay, and the cure is to stop inventing mechanics before she stops being surprised by them rather
 * than after.
 *
 * ## Five minutes, not ten
 *
 * Riggs, on the third pass: *"10/10 in the beginning. Think about how you can keep the pace up
 * throughout the whole thing. As it stands, I don't think she would make it through this. Maybe cut
 * it down to 5 minutes of content."*
 *
 * That is the most useful note anybody has given this build, because it is not really about length.
 * The opening was already right; what fell off was **rate of new information**, and a piece that
 * stops surprising you is long at any duration. So the cut was made where the surprises repeat, not
 * evenly: the hole's appetite is 7 words down to 5, the assessment is 4 questions down to 3, the
 * ledger wants 2 chapters opened rather than 3, and the ending lost a three-panel confirmation
 * gauntlet that was the same joke performed three times. Every beat still happens. None of them
 * happens twice.
 */

import type { Beat } from '../stage';
import { admission } from './admission';
import { assessment } from './assessment';
import { chapterk } from './chapterk';
import { hole } from './hole';
import { ledger } from './ledger';
import { mute } from './mute';
import { notice } from './notice';
import { voicebox } from './voicebox';

export const BEATS: Beat[] = [
  notice,
  hole,
  mute,
  voicebox,
  assessment,
  ledger,
  chapterk,
  admission,
];
