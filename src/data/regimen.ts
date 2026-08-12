/**
 * The training regimen. (4b1, rebuilt 2026-08-12 to Riggs's sketch.)
 *
 * Chapter 8 used to be a set of lists: some homework per chapter, a two-stage cup plan, a ladder
 * of milestones. All of it true, none of it answering the only question she will actually have,
 * which is **"what am I doing tonight?"**
 *
 * So the programme is now a calendar-shaped thing with exactly one job in each box. Eight weeks,
 * five sessions a week, weekends off — forty sessions, fifteen to twenty minutes each, which is
 * ten to thirteen hours of Mario Kart spread over two months.
 *
 * **There are no dates anywhere in this file, and that is deliberate.** Riggs picked two months
 * as a shape rather than a deadline, and a dated plan is a plan that is already behind by week
 * three — at which point the honest response is to stop opening the website. A grid of forty
 * numbered boxes self-paces: do two in an evening if it is going well, miss a week and nothing
 * has gone wrong, and the next box is always simply the next box.
 *
 * **Repetition over times.** Almost nothing here is scored. The goal of a session is to have done
 * it, not to have hit a number — the one skill in this course with a high floor is the racing
 * line, and a line is learned by driving it until it is boring. Where a session does name a
 * target it is a soft one ("ten coins"), never a lap time. The only ranked thing in the whole
 * programme is her own ghost, which is the one opponent who is guaranteed to be exactly her
 * speed.
 *
 * **Ids are stable, semantic and append-only**, for the same reason as everything else that gets
 * ticked: an id is the primary key in Supabase's `plan_checks` table, and renaming one unticks a
 * box she earned, on every device, with no error anywhere. `plan.session.w3d2` is positional in
 * its name only — the week and day it refers to never change once written. Reordering the display
 * is free. Renaming is not, so it does not happen.
 *
 * Copy uses `{name}` and `{rival}` and never a literal name (4e1).
 */

/** The four tracks of the cup, by the name that appears on her screen. */
export const STADIUM = 'Mario Kart Stadium';
export const WATER_PARK = 'Water Park';
export const CANYON = 'Sweet Sweet Canyon';
export const RUINS = 'Thwomp Ruins';

/**
 * Short forms, for the grid cells.
 *
 * A cell is about eight characters wide at the size the grid has to be to fit forty of them on one
 * screen, and the full names truncate to "Mario Ka…", "Sweet S…" and "Thwomp …" — which are not
 * merely ugly, they are ambiguous between two of the four. The panel always shows the full name,
 * so nothing is lost: the grid is a glance and the panel is the answer.
 */
const SHORT: Record<string, string> = {
  [STADIUM]: 'Stadium',
  [WATER_PARK]: 'Water Park',
  [CANYON]: 'Canyon',
  [RUINS]: 'Ruins',
};

export function shortTrack(name: string): string {
  return SHORT[name] ?? name;
}

/** What she sets the machine to before she starts. Kept short — it goes in the session box. */
export type Mode = 'Time Trial' | 'VS · 100cc · Hard' | 'Mushroom Cup · 100cc · Hard' | 'Anything';

export interface Session {
  /** Stable, semantic, append-only. See the file header before you touch one. */
  id: string;
  week: number;
  /** 1 to 5. Monday to Friday, if she wants it to be. */
  day: number;
  /** The chapter that taught this. The session box links back to it. */
  chapterId: string;
  /** Two or three words. This is what fits in a grid cell. */
  label: string;
  track: string;
  mode: Mode;
  /** The job, in her hands. Two or three sentences at most — it is read standing up. */
  job: string;
  /** Why this is tonight's job, in one line. */
  why: string;
}

export interface Week {
  number: number;
  title: string;
  /** One line. What she will be able to do that she could not do on Monday. */
  goal: string;
  sessions: Session[];
}

function session(
  week: number,
  day: number,
  chapterId: string,
  label: string,
  track: string,
  mode: Mode,
  job: string,
  why: string,
): Session {
  return { id: `plan.session.w${week}d${day}`, week, day, chapterId, label, track, mode, job, why };
}

/**
 * Eight weeks, in the order the course taught them, with one exception: **drifting is week five,
 * not week six.** The course teaches it last because it is the hardest idea to explain; the
 * programme practises it in the middle because it is the hardest thing to get into her hands, and
 * the last three weeks want to be about racing rather than about learning a new button.
 *
 * The last week has no fixed content and says so. A programme that schedules the match for a
 * particular Friday is a programme that has decided when she is ready on her behalf.
 */
export const WEEKS: Week[] = [
  {
    number: 1,
    title: 'Free speed',
    goal: 'Two habits that cost nothing, take no reactions, and pay in every single race.',
    sessions: [
      session(
        1,
        1,
        'ch1',
        'Five starts',
        STADIUM,
        'Time Trial',
        'Start the trial, take the boost, then restart straight away. Five times. You are not driving a lap tonight — you are only doing the first two seconds, over and over.',
        'It is the one skill worth making automatic before anything else, because it happens before the race does.',
      ),
      session(
        1,
        2,
        'ch1',
        'Starts, for real',
        WATER_PARK,
        'VS · 100cc · Hard',
        'Four races. Go for the start boost in every one, including the ones that are already going badly. Finish where you finish — position is not the job tonight.',
        'A knack you only use when it matters is a knack you do not have yet.',
      ),
      session(
        1,
        3,
        'ch3',
        'Every ramp',
        STADIUM,
        'Time Trial',
        'One lap, and press the trick button at the top of every single ramp and bump. Watch for the flourish — the little flip. No flourish, no boost.',
        'The flourish is instant feedback. You never have to wonder whether that one worked.',
      ),
      session(
        1,
        4,
        'ch3',
        'Ramps, harder',
        WATER_PARK,
        'Time Trial',
        'Same job on a bumpier track. There are more of them here than you think, and several are not obviously ramps — anything that lifts the wheels counts.',
        'Learning to *spot* them matters more than the timing does.',
      ),
      session(
        1,
        5,
        'ch1',
        'Both, together',
        STADIUM,
        'Mushroom Cup · 100cc · Hard',
        'The full cup. Two jobs only: the start boost off every line, and a trick off every ramp. Ignore items, ignore position, ignore everything else.',
        'First time the two live in the same race. Notice that neither one needed a fast hand.',
      ),
    ],
  },
  {
    number: 2,
    title: 'Stop throwing things',
    goal: 'The banana behind you, and the end of firing items into the middle distance.',
    sessions: [
      session(
        2,
        1,
        'ch2',
        'Fire nothing',
        STADIUM,
        'VS · 100cc · Hard',
        'One whole race where you never fire a single item forwards. Everything you pick up gets held behind you instead. Yes, everything.',
        'Count how often something hits the thing you were carrying instead of hitting you. That number is the lesson.',
      ),
      session(
        2,
        2,
        'ch2',
        'Red shells only',
        WATER_PARK,
        'VS · 100cc · Hard',
        'One race. The only item you are allowed to fire is a red shell. Hold everything else.',
        'It steers itself, so it is the only item that does not need aiming — which makes it the only one worth firing.',
      ),
      session(
        2,
        3,
        'ch2',
        'Free hands',
        CANYON,
        'VS · 100cc · Hard',
        'Spend the junk item before you reach the next box, so you never drive through a box with both slots full.',
        'A box you cannot take anything from is a box {rival} just got instead of you.',
      ),
      session(
        2,
        4,
        'ch2',
        'Watch the coins',
        RUINS,
        'VS · 100cc · Hard',
        'Play normally, but every time something hits you, look at your coin counter before and after. It goes down by three.',
        'This is the moment items and coins turn out to be the same subject.',
      ),
      session(
        2,
        5,
        'ch2',
        'Defensive cup',
        STADIUM,
        'Mushroom Cup · 100cc · Hard',
        'The full cup, played defensively the whole way. Hold everything. Fire only red shells. See where you finish.',
        'Two weeks in, and you have not yet practised driving faster. Look at the result anyway.',
      ),
    ],
  },
  {
    number: 3,
    title: 'The line',
    goal: 'Wide, tight, wide — and ten coins by the end of lap one, every time.',
    sessions: [
      session(
        3,
        1,
        'ch5',
        'Ten coins',
        STADIUM,
        'Time Trial',
        'One goal: cross the line holding ten coins. Nothing else counts tonight. Take whatever route collects them.',
        'Ten is where the speed bonus stops. Getting there early means the whole rest of the race is faster.',
      ),
      session(
        3,
        2,
        'ch5',
        'Wide, tight, wide',
        STADIUM,
        'Time Trial',
        'Three laps of the big corners, saying it out loud as you go: wide going in, tight at the middle, wide coming out. It will feel like the long way round.',
        'It is the long way round. It is also the fast way round, and that stops feeling strange after about four laps.',
      ),
      session(
        3,
        3,
        'ch5',
        'Beat your ghost',
        STADIUM,
        'Time Trial',
        'Set a time and save the ghost. Then race it. Then race it again.',
        'The only opponent in the game who is exactly your speed, and the first hard proof any of this is working.',
      ),
      session(
        3,
        4,
        'ch5',
        'Line and coins',
        WATER_PARK,
        'Time Trial',
        'Both jobs at once on a new track: drive the wide-tight-wide line, and finish holding ten coins. They are usually the same path.',
        'A line of coins is the game quietly telling you where the fast way round is.',
      ),
      session(
        3,
        5,
        'ch5',
        'Ghost again',
        WATER_PARK,
        'Time Trial',
        'Save a ghost here too, then beat it. If you cannot, drive three laps following exactly the same line until it feels boring, and try again.',
        'Boring is the target. Boring means you have stopped making decisions and started driving.',
      ),
    ],
  },
  {
    number: 4,
    title: 'Where the arrows are',
    goal: 'A map of all four tracks in your head — the part {rival} is guessing at.',
    sessions: [
      session(
        4,
        1,
        'ch4',
        'Outer lane',
        STADIUM,
        'Time Trial',
        'After the first turn the road splits into three lanes. Drive the outer one, every lap, until it stops feeling like a detour.',
        'The dash panels and the coins are both out there. It is not a detour.',
      ),
      session(
        4,
        2,
        'ch4',
        'Every arrow',
        WATER_PARK,
        'Time Trial',
        'One lap with a single goal: touch every orange arrow you can find. Go out of your way. Take the ugly line.',
        'You are drawing a map tonight, not racing. Position does not exist.',
      ),
      session(
        4,
        3,
        'ch4',
        'Every arrow',
        CANYON,
        'Time Trial',
        'Same job, new track. This one has more of them and they are further off the obvious line.',
        'Knowing where they are is worth more than driving well over them.',
      ),
      session(
        4,
        4,
        'ch4',
        'The middle path',
        RUINS,
        'Time Trial',
        'Find the split in the road and take the middle route rather than either wall. Do it three laps running so it becomes the thing you do without deciding.',
        'It is the one place in the cup where the fastest option and the easiest option are the same option.',
      ),
      session(
        4,
        5,
        'ch4',
        'Arrow cup',
        STADIUM,
        'Mushroom Cup · 100cc · Hard',
        'The whole cup with one instruction: take every boost pad you now know about. Everything else is a bonus.',
        'Four weeks of free speed, all in one cup. This is the one where the score starts to look different.',
      ),
    ],
  },
  {
    number: 5,
    title: 'The drift',
    goal: 'Blue sparks, then orange, and a boost coming out of corners you had to take anyway.',
    sessions: [
      session(
        5,
        1,
        'ch6',
        'Blue sparks',
        CANYON,
        'Time Trial',
        'The long sweeping corners here are the best in the cup. Hop into one, hold the drift, and just watch for the blue sparks. Do not worry about where you end up.',
        'Tonight is only about seeing the sparks appear. That is genuinely the whole job.',
      ),
      session(
        5,
        2,
        'ch6',
        'Let go',
        CANYON,
        'Time Trial',
        'Same corners. Blue sparks, then release the drift and feel the kick. Ten of them, then stop.',
        'The release is the boost. Holding a drift you never let go of has done nothing for you.',
      ),
      session(
        5,
        3,
        'ch6',
        'Orange sparks',
        CANYON,
        'Time Trial',
        'Hold the drift longer — through the whole corner — until the sparks turn orange, then release.',
        'Orange is worth roughly twice blue. Long corners are where it is free.',
      ),
      session(
        5,
        4,
        'ch6',
        'Drift a lap',
        STADIUM,
        'Time Trial',
        'One full lap, drifting the big corners only. Leave the tight ones alone entirely — they are not worth it and they cost you your line.',
        'Knowing which corners to *not* drift is most of the skill.',
      ),
      session(
        5,
        5,
        'ch6',
        'Drift cup',
        STADIUM,
        'Mushroom Cup · 100cc · Hard',
        'Full cup. Drift the long corners, drive the rest normally. If a drift goes wrong, straighten up and carry on — no rescuing it.',
        'A drift you abandon costs you nothing. A drift you fight costs you the corner.',
      ),
    ],
  },
  {
    number: 6,
    title: 'All of it at once',
    goal: 'Stop practising one thing. Start racing, with all of it switched on.',
    sessions: [
      session(
        6,
        1,
        'ch5',
        'All of it',
        STADIUM,
        'VS · 100cc · Hard',
        'Two races with every single thing switched on: start boost, tricks, outer lane, ten coins, hold your items, drift the big corners.',
        'It will feel like too much to think about. It is — which is why the last five weeks were one thing at a time.',
      ),
      session(
        6,
        2,
        'ch5',
        'All of it',
        WATER_PARK,
        'VS · 100cc · Hard',
        'Same again here. If it falls apart, drop the drifting first and keep the rest.',
        'Drifting is the only thing on the list that can make you slower. Everything else is free.',
      ),
      session(
        6,
        3,
        'ch5',
        'All of it',
        CANYON,
        'VS · 100cc · Hard',
        'And here. Notice which of the six jobs you no longer have to remember to do.',
        'The ones that have gone quiet are the ones you have actually learned.',
      ),
      session(
        6,
        4,
        'ch5',
        'All of it',
        RUINS,
        'VS · 100cc · Hard',
        'Last of the four. Take the middle path, watch the thwomp rhythm, keep your coins.',
        'This is the track where knowing beats reacting by the widest margin in the cup.',
      ),
      session(
        6,
        5,
        'ch4',
        'Top three',
        STADIUM,
        'Mushroom Cup · 100cc · Hard',
        'The full cup, everything on, and a real target for the first time: finish top three overall.',
        'A cup is won by the person with no disaster, not the person with one brilliant race.',
      ),
    ],
  },
  {
    number: 7,
    title: 'Own the cup',
    goal: 'Top three stops being a good day and starts being the normal one. Then you win it.',
    sessions: [
      session(
        7,
        1,
        'ch4',
        'Top three again',
        STADIUM,
        'Mushroom Cup · 100cc · Hard',
        'Same target, second time. Routine is the word that matters this week.',
        'Doing it twice is the difference between it having happened and you being able to do it.',
      ),
      session(
        7,
        2,
        'ch4',
        'Thwomp rhythm',
        RUINS,
        'Time Trial',
        'Time Trial here until the thwomps stop being a surprise. They pound on a fixed cycle, in fixed places, every single lap.',
        'She dodges them by reacting. You will not have to react — this is memorisation, and memorisation does not have off days.',
      ),
      session(
        7,
        3,
        'ch4',
        'Go for the win',
        STADIUM,
        'Mushroom Cup · 100cc · Hard',
        'Full cup, and this time the target is first. If it does not happen, note which race lost it and go and drive that track tomorrow.',
        'You now have somewhere specific to put a bad result, which is what a plan is for.',
      ),
      session(
        7,
        4,
        'ch5',
        'Your worst track',
        STADIUM,
        'Time Trial',
        'Whichever of the four went worst yesterday. Time Trial, three laps, line and coins only.',
        'One weak track is what a cup gets lost on. It is also the easiest thing on this whole list to fix.',
      ),
      session(
        7,
        5,
        'ch4',
        'Win it',
        STADIUM,
        'Mushroom Cup · 100cc · Hard',
        'Win the Mushroom Cup against Hard computers. When you have, do it once more to prove it was not luck.',
        'At this point the cup is yours, and {rival} is the only thing left on the track.',
      ),
    ],
  },
  {
    number: 8,
    title: 'Her',
    goal: 'Nothing new. Sharpen what you have, then go and use it.',
    sessions: [
      session(
        8,
        1,
        'ch5',
        'Ghosts',
        STADIUM,
        'Time Trial',
        'Beat your own ghosts on both of your best tracks. If the ghost is old, set a new one afterwards.',
        'A fair fight against someone exactly your speed, on the night before it counts.',
      ),
      session(
        8,
        2,
        'ch2',
        'Against a person',
        STADIUM,
        'VS · 100cc · Hard',
        'Get anybody — Bill, Kendahl, whoever is in the room — and play two-player. A person on the sofa is not the same as a computer, and the difference is worth meeting before it matters.',
        'People block. People hold items. People make you rush. Meet that now rather than on the night.',
      ),
      session(
        8,
        3,
        'ch4',
        'Your cup',
        STADIUM,
        'Mushroom Cup · 100cc · Hard',
        'One more clean run of the cup. Do not change anything, do not try anything new, do not experiment with your kart.',
        'The week before a race is not the week to learn a skill. It is the week to stop learning skills.',
      ),
      session(
        8,
        4,
        'ch8',
        'Read the card',
        STADIUM,
        'Anything',
        'Read the seven race-day rules on the plan. Then play four races for fun and think about none of it.',
        'You are not going to gain anything tonight. You can definitely lose something by grinding.',
      ),
      session(
        8,
        5,
        'ch8',
        'Race {rival}',
        STADIUM,
        'Mushroom Cup · 100cc · Hard',
        'When it is your pick, it is your cup. Every time, no mercy picks. Hold the banana, take your ten coins, and be the boring one.',
        'Whenever you are ready. This box has no date on it and never did.',
      ),
    ],
  },
];

export const SESSIONS: Session[] = WEEKS.flatMap((week) => week.sessions);

export const SESSION_COUNT = SESSIONS.length;

export function getSession(id: string): Session | undefined {
  return SESSIONS.find((item) => item.id === id);
}

/**
 * The next session she has not ticked, or `null` once the whole programme is done.
 *
 * Strictly "the first unticked box", not "the one after the last ticked box". If she skips week
 * three and comes back, the plan should send her back to week three rather than quietly writing
 * it off — the sessions build on each other, and the one she skipped is usually the one she found
 * hard.
 */
export function nextSession(isChecked: (id: string) => boolean): Session | null {
  return SESSIONS.find((item) => !isChecked(item.id)) ?? null;
}

/** Every session id, for the counter. Derived, so it can never fall out of step with the grid. */
export function allSessionIds(): string[] {
  return SESSIONS.map((item) => item.id);
}
