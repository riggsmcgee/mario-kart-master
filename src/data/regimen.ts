/**
 * The training regimen. (4b1, rebuilt 2026-08-12 to Riggs's sketch, reshaped the same day.)
 *
 * Chapter 8 used to be a set of lists: some homework per chapter, a two-stage cup plan, a ladder
 * of milestones. All of it true, none of it answering the only question she will actually have,
 * which is **"what am I doing tonight?"** So the programme is a calendar-shaped thing with exactly
 * one job in each box: eight weeks, five sessions a week, weekends off.
 *
 * **Every session is [a number of runs] of [one named track] with [one thing to think about].**
 * That shape is Riggs's, and it replaced a first draft whose sessions were things like "do five
 * starts" — which, as he pointed out, is under two minutes of actual Mario Kart. A session has to
 * be a real sitting, and the way to make it one is *volume on a known track*, not a longer list of
 * chores.
 *
 * The shape does a second job that the first draft missed entirely: **it teaches the maps.** The
 * strategic thesis of this whole course is that she wins on preparation rather than reactions, and
 * the most preparable thing in the game is where the road goes. So a week lives on one track and
 * rotates what she is paying attention to — Stadium for the first fortnight, then Water Park, then
 * the Canyon, then the Ruins. By week seven she has driven every corner of her cup a few dozen
 * times, and each of those laps was also a lap of practising something.
 *
 * **There are no dates anywhere in this file, and that is deliberate.** Riggs picked two months as
 * a shape rather than a deadline, and a dated plan is a plan that is already behind by week three —
 * at which point the honest response is to stop opening the website. A grid of forty numbered
 * boxes self-paces: do two in an evening if it is going well, miss a week and nothing has gone
 * wrong, and the next box is always simply the next box.
 *
 * **Repetition over times.** Almost nothing here is scored. The goal of a session is to have done
 * it, not to have hit a number. Where a session does name a target it is a soft one ("ten coins"),
 * never a lap time — the only ranked thing in the whole programme is her own ghost, which is the
 * one opponent guaranteed to be exactly her speed.
 *
 * **Ids are stable, semantic and append-only**, for the same reason as everything else that gets
 * ticked: an id is the key a tick is stored under, and renaming one unticks a box she earned,
 * with no error anywhere. Reordering the display is free.
 * Renaming is not, so it does not happen — including through this reshape, which changed every
 * session's *content* and not one of its ids.
 *
 * Copy uses `{name}` and `{rival}` and never a literal name (4e1).
 */

/** The four tracks of the cup, by the name that appears on her screen. */
export const STADIUM = 'Mario Kart Stadium';
export const WATER_PARK = 'Water Park';
export const CANYON = 'Sweet Sweet Canyon';
export const RUINS = 'Thwomp Ruins';
/** Cup sessions, which are all four in order. */
export const ALL_FOUR = 'All four tracks';
/**
 * The session that deliberately does not name a track.
 *
 * Week 7 day 4 is "whichever of the four has gone worst this week", and it was pinned to Mario Kart
 * Stadium — so the grid cell and the printed fridge sheet both named a track its own copy tells her
 * to ignore. On paper, out of context, in week seven, the cell is all she has.
 */
export const ANY_TRACK = 'Your pick';

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
  [ALL_FOUR]: 'The cup',
  [ANY_TRACK]: 'Your pick',
};

export function shortTrack(name: string): string {
  return SHORT[name] ?? name;
}

/**
 * What she sets the machine to before she starts. Kept short — it goes in the session box.
 *
 * **Grand Prix has no difficulty setting, so the cup sessions must not name one.** They used to say
 * "Mushroom Cup · 100cc · Hard", which is not a thing she can select: in Mario Kart 8 Deluxe the
 * Easy/Normal/Hard choice exists in VS Race only, and Grand Prix computers are always the hard ones
 * whatever engine class you pick. Printing an unfindable setting on the fridge sheet is the worst
 * kind of wrong — she stands in front of a menu looking for something that is not there and
 * concludes the plan was written by somebody who has not played the game.
 *
 * `VS · 100cc · Hard` keeps its Hard, because that one is real and does have to be set.
 */
export type Mode = 'Time Trial' | 'VS · 100cc · Hard' | 'Mushroom Cup · 100cc' | 'Anything';

export interface Session {
  /** Stable, semantic, append-only. See the file header before you touch one. */
  id: string;
  week: number;
  /** 1 to 5. Monday to Friday, if she wants it to be. */
  day: number;
  /** The chapter that taught this. The session box links back to it. */
  chapterId: string;
  /** Two or three words. This is what fits in a grid cell — always the *focus*, never the volume. */
  label: string;
  track: string;
  mode: Mode;
  /**
   * How much. Sized so every session is fifteen to twenty minutes: a Time Trial run of a Mushroom
   * Cup track is about two minutes, a VS race four or five, and the full cup a bit under twenty.
   */
  reps: string;
  /** The one thing to think about, in a handful of words. Shown as the session's headline job. */
  focus: string;
  /** How to do it. Two or three sentences at most — it is read standing up. */
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
  reps: string,
  focus: string,
  job: string,
  why: string,
): Session {
  return {
    id: `plan.session.w${week}d${day}`,
    week,
    day,
    chapterId,
    label,
    track,
    mode,
    reps,
    focus,
    job,
    why,
  };
}

/**
 * Eight weeks. One track at a time until she has all four, then the cup.
 *
 * Two orderings worth stating. **Drifting is week five, not last**, because the course teaches it
 * last (it is the hardest idea to explain) while the programme wants it in her hands with three
 * weeks of racing left to use it. And **items are week four rather than week two**, because
 * defending against items is much easier to think about once the driving has stopped taking all
 * of her attention.
 *
 * The last week has no fixed content and says so. A programme that schedules the match for a
 * particular Friday has decided when she is ready on her behalf.
 */
export const WEEKS: Week[] = [
  {
    number: 1,
    title: 'Stadium · free speed',
    goal: 'One track you know, and two habits that cost nothing and pay in every race.',
    sessions: [
      session(
        1,
        1,
        'ch1',
        'Perfect starts',
        STADIUM,
        'Time Trial',
        'Four runs',
        'A perfect start boost on every single run.',
        'Four full Time Trial runs of Stadium. The only thing you are grading yourself on is the launch: hold as the 2 fades, every time. Drive the rest of the lap however you like and have a look around while you are there.',
        'Four runs is four goes at the start and about eight minutes of learning the easiest track in the game. Both matter.',
      ),
      session(
        1,
        2,
        'ch3',
        'Every ramp',
        STADIUM,
        'Time Trial',
        'Three runs',
        'A trick off every single ramp and bump.',
        'Same track. This time press the trick button at the top of everything that lifts the wheels — the glider ramp before the last turn, and the little ramp at the end of the outer lane on the finish straight. Watch for the flip. No flip, no boost.',
        'Same road as yesterday, different thing to think about. That is how this whole programme works.',
      ),
      session(
        1,
        3,
        'ch1',
        'Both at once',
        STADIUM,
        'Time Trial',
        'Three runs',
        'Start boost and every ramp, in the same lap.',
        'Both jobs together now. If you drop one, drop the tricks and keep the start — the start is the one that becomes automatic first.',
        'Two things at once is genuinely harder than two things separately, and it is where the habit actually forms.',
      ),
      session(
        1,
        4,
        'ch1',
        'Under pressure',
        STADIUM,
        'VS · 100cc · Hard',
        'Four races',
        'The start boost, with eleven other karts on the line.',
        'First racing of the programme, on the track you now know better than any other. Go for the boost every time, including the races that are already going badly. Position does not matter tonight.',
        'A knack you only manage in an empty Time Trial is a knack you do not have yet.',
      ),
      session(
        1,
        5,
        'ch3',
        'First cup',
        ALL_FOUR,
        'Mushroom Cup · 100cc',
        'One full cup',
        'Start boost off every line, trick off every ramp.',
        'The whole cup, all four races. You have only properly driven the first one, and that is fine — the other three are a look around. Two jobs only, and ignore everything else including where you finish.',
        'Your first look at the other three tracks, with something to do so it is not just sightseeing.',
      ),
    ],
  },
  {
    number: 2,
    title: 'Stadium · the line',
    goal: 'The same track again, and the skill with the highest floor in the whole course.',
    sessions: [
      session(
        2,
        1,
        'ch4',
        'Outer lane',
        STADIUM,
        'Time Trial',
        'Three runs',
        'The outer lane after the first turn, every lap.',
        'After the first right the road splits into three lanes. Take the outer one every single lap, all three runs, until it stops feeling like a detour.',
        'The boost pads and the coins are both out there. It is not a detour, and it feels wrong for about four laps.',
      ),
      session(
        2,
        2,
        'ch5',
        'Ten coins',
        STADIUM,
        'Time Trial',
        'Three runs',
        'Ten coins by the end of lap one.',
        'One number tonight. Get to ten coins before lap one ends and then simply keep them. Take whatever route collects them — you already know where they are.',
        'Ten is where the speed bonus stops, so getting there early makes the whole rest of the race faster.',
      ),
      session(
        2,
        3,
        'ch5',
        'Wide, tight, wide',
        STADIUM,
        'Time Trial',
        'Three runs',
        'Say it out loud through every corner.',
        'Wide going in, tight through the middle, wide coming out. Say it as you drive. It will feel like the long way round, because it is — and it is also the fast way round.',
        'On a track this familiar you have the spare attention to think about *how* you are driving instead of *where*.',
      ),
      session(
        2,
        4,
        'ch5',
        'Beat your ghost',
        STADIUM,
        'Time Trial',
        'Set one, then chase it',
        'Beat the you of twenty minutes ago.',
        'Do one clean run with everything you have learned. Beat your best time and the game keeps that lap as your ghost by itself — there is nothing to save. Then pick your ghost on the course screen and race it. Then race it again.',
        'The only opponent in the game who is exactly your speed, and the first hard proof that any of this is working.',
      ),
      session(
        2,
        5,
        'ch4',
        'Stadium, for real',
        STADIUM,
        'VS · 100cc · Hard',
        'Four races',
        'Everything from the last two weeks, on your best track.',
        'Start boost, tricks, outer lane, ten coins. Four races on the one track you now genuinely know. Notice how much of it you no longer have to remember to do.',
        'The bits that have gone quiet are the bits you have actually learned. There should already be a few.',
      ),
    ],
  },
  {
    number: 3,
    title: 'Water Park · a second map',
    goal: 'Do the whole of the last fortnight again, on a track you have barely seen.',
    sessions: [
      session(
        3,
        1,
        'ch4',
        'Look around',
        WATER_PARK,
        'Time Trial',
        'Three runs',
        'Nothing. Learn where the road goes.',
        'No jobs tonight at all. Drive three runs of Water Park and just look at it: where it turns, where it splits, where the water bits are. Drive badly if you like.',
        'You cannot practise a skill on a track you are still reading. One session of pure looking pays for itself all week.',
      ),
      session(
        3,
        2,
        'ch3',
        'Every ramp',
        WATER_PARK,
        'Time Trial',
        'Three runs',
        'A trick off everything that lifts the wheels.',
        'There are more of them here than you would think, and several are not obviously ramps. Anything that gets the wheels off the ground counts.',
        'Learning to *spot* them matters more than the timing does, and this track is where that gets tested.',
      ),
      session(
        3,
        3,
        'ch4',
        'Every free boost',
        WATER_PARK,
        'Time Trial',
        'Three runs',
        'Touch every free boost you can find.',
        'Water Park gives its speed away differently: there are no boost pads here. Touch the wheels on the submarines in the anti-gravity loop and you get a boost, and the ramps give you one if you trick. Go out of your way, take the ugly line, and find all of them. A slow lap that finds a new one is a good lap.',
        'Knowing where they are is worth more than driving well over them, and knowing is a thing you can do in advance.',
      ),
      session(
        3,
        4,
        'ch5',
        'Line and coins',
        WATER_PARK,
        'Time Trial',
        'Three runs',
        'Wide-tight-wide, and ten coins.',
        'Both at once, on your second track. They are usually the same path — a line of coins is the game quietly telling you where the fast way round is.',
        'Second time you have done this, and it should already feel less like a list of instructions.',
      ),
      session(
        3,
        5,
        'ch5',
        'Ghost here too',
        WATER_PARK,
        'Time Trial',
        'Set one, then chase it',
        'Beat the you of twenty minutes ago, again.',
        'Same job as last week on the new track. If you cannot beat it, drive three laps on exactly the same line until it feels boring, then try again.',
        'Boring is the target. Boring means you have stopped making decisions and started driving.',
      ),
    ],
  },
  {
    number: 4,
    title: 'Items',
    goal: 'Stop throwing things. Two known tracks, so all the attention goes on your hands.',
    sessions: [
      session(
        4,
        1,
        'ch2',
        'Fire nothing',
        STADIUM,
        'VS · 100cc · Hard',
        'Four races',
        'Never fire a single item forwards.',
        'Anything you can throw — banana, green shell, red shell — gets held behind you instead. A coin or a mushroom you simply use, and the bob-omb goes straight out the back. Count how often something hits the thing you were carrying rather than hitting you.',
        'That count is the entire lesson, and it is always higher than people expect.',
      ),
      session(
        4,
        2,
        'ch2',
        'Red shells only',
        WATER_PARK,
        'VS · 100cc · Hard',
        'Four races',
        'The only item you may fire is a red shell.',
        'Hold everything else. A red shell steers itself, so it is the only item that does not need aiming — which makes it the only one worth firing.',
        'Aiming is a reaction. Not needing to aim is the whole strategy of this course.',
      ),
      session(
        4,
        3,
        'ch2',
        'Free hands',
        STADIUM,
        'VS · 100cc · Hard',
        'Four races',
        'Never drive through a box with both slots full.',
        'Spend the junk item before you reach the next box. Still holding the good one behind you, still firing nothing forwards.',
        'A box you cannot take anything from is a box {rival} just got instead of you.',
      ),
      session(
        4,
        4,
        'ch5',
        'Watch the coins',
        WATER_PARK,
        'VS · 100cc · Hard',
        'Four races',
        'Look at your coin counter before and after every hit.',
        'Play normally — defensively, as you have been — but every time something hits you, look at the number. It drops by three.',
        'This is the session where items and coins turn out to be the same subject.',
      ),
      session(
        4,
        5,
        'ch2',
        'Defensive cup',
        ALL_FOUR,
        'Mushroom Cup · 100cc',
        'One full cup',
        'Hold everything. Fire nothing but red shells.',
        'The full cup played defensively the whole way through. Then look at where you finished, and remember that you have not yet practised going faster.',
        'Four weeks in. This is the first result worth actually looking at.',
      ),
    ],
  },
  {
    number: 5,
    title: 'Sweet Sweet Canyon · the drift',
    goal: 'A third map, and the one skill that manufactures speed out of nothing.',
    sessions: [
      session(
        5,
        1,
        'ch4',
        'Look around',
        CANYON,
        'Time Trial',
        'Three runs',
        'Nothing. Find the long corners.',
        'Third track, same opening move: drive it and look at it. One thing to notice though — the long lazy turns. Point at them out loud. They are the reason we are here this week.',
        'This track has the best drifting corners in the cup, and you need to know where they are before you can use them.',
      ),
      session(
        5,
        2,
        'ch6',
        'Blue sparks',
        CANYON,
        'Time Trial',
        'Three runs',
        'See blue sparks. That is the whole job.',
        'Hop into one of those long corners, hold the drift, and watch the back wheels. Do not worry about where you end up or how fast you are going.',
        'Tonight is only about seeing the sparks appear. Genuinely, that is all.',
      ),
      session(
        5,
        3,
        'ch6',
        'Let go',
        CANYON,
        'Time Trial',
        'Three runs',
        'Release while the sparks are lit, and feel the kick.',
        'Same corners. Blue sparks, then let go of the drift and feel the boost. Ten of them across the three runs and you have got it.',
        'The release *is* the boost. A drift you never let go of has done nothing for you at all.',
      ),
      session(
        5,
        4,
        'ch6',
        'Orange sparks',
        CANYON,
        'Time Trial',
        'Three runs',
        'Hold through the whole corner until the sparks go orange.',
        'Longer now. Stay in the drift through the entire sweeper until the colour changes, then release. And on the tight corners: do not bother at all.',
        'Orange is worth nearly three blues, and knowing which corners to *not* drift is most of the skill.',
      ),
      session(
        5,
        5,
        'ch6',
        'Drift a race',
        CANYON,
        'VS · 100cc · Hard',
        'Four races',
        'Drift the long corners only, and abandon any that go wrong.',
        'Racing now, on the track you have spent all week on. Drift the sweepers, drive the tight stuff normally, and if a drift goes wrong just straighten up and carry on.',
        'A drift you abandon costs you nothing. A drift you fight costs you the corner.',
      ),
    ],
  },
  {
    number: 6,
    title: 'Thwomp Ruins · the last map',
    goal: 'The fourth track, and the biggest knowledge edge in the whole cup.',
    sessions: [
      session(
        6,
        1,
        'ch4',
        'Look around',
        RUINS,
        'Time Trial',
        'Three runs',
        'Nothing. Find the split in the road.',
        'Last new track. Drive it, look at it, and find the place where the road offers you three ways through. You are not choosing yet.',
        'Three of your four tracks give you a decision. This is the one where the decision is worth the most.',
      ),
      session(
        6,
        2,
        'ch4',
        'The middle path',
        RUINS,
        'Time Trial',
        'Three runs',
        'Take the middle route at the split, every lap — and watch what turns up on lap two.',
        'Not either wall — straight down the middle. On lap one that means through the water. From lap two a rolling boulder knocks a glide ramp into place and the middle gives you a glide as well. Every lap of all three runs, until it is the thing you do without deciding.',
        'From lap two it is the one place in the cup where the fastest option and the easiest option are the same option.',
      ),
      session(
        6,
        3,
        'ch4',
        'Thwomp rhythm',
        RUINS,
        'Time Trial',
        'Three runs',
        'Stop reacting to the thwomps. Start knowing them.',
        'They pound on a fixed cycle, in fixed places, every single lap. Drive until they stop being a surprise and start being furniture.',
        'She dodges them by reacting. You will not have to react — and memorisation does not have off days.',
      ),
      session(
        6,
        4,
        'ch5',
        'Pads and coins',
        RUINS,
        'Time Trial',
        'Three runs',
        'Every boost pad, and ten coins.',
        'The usual two jobs on the last new track. Fourth time you have done this now, so it should mostly run itself.',
        'You have a routine for meeting a track. That is worth more than any single track you have learned with it.',
      ),
      session(
        6,
        5,
        'ch5',
        'Ghost here too',
        RUINS,
        'Time Trial',
        'Set one, then chase it',
        'Beat the you of twenty minutes ago.',
        'Last of the four ghosts. By now you know how this goes: one clean run, then chase the ghost the game has kept for you.',
        'Every track in your cup now has a version of you on it that you have already beaten.',
      ),
    ],
  },
  {
    number: 7,
    title: 'The cup, all of it on',
    goal: 'Stop practising one thing. Start racing, with everything switched on.',
    sessions: [
      session(
        7,
        1,
        'ch1',
        'Speed cup',
        ALL_FOUR,
        'Mushroom Cup · 100cc',
        'One full cup',
        'Start boost and tricks, on all four.',
        'The whole cup with the free-speed jobs switched on and nothing else to think about. You know all four tracks now, which makes this a very different cup from week one.',
        'Compare it to the first cup you ran. Same four races, and you are a different driver on them.',
      ),
      session(
        7,
        2,
        'ch5',
        'Coins cup',
        ALL_FOUR,
        'Mushroom Cup · 100cc',
        'One full cup',
        'Ten coins and a tidy line, on all four.',
        'Same cup, different focus. Ten coins by the end of lap one in every race, and the wide-tight-wide line everywhere.',
        'This is the one that moves your finishing position the most. It always is.',
      ),
      session(
        7,
        3,
        'ch2',
        'Items cup',
        ALL_FOUR,
        'Mushroom Cup · 100cc',
        'One full cup',
        'Hold everything. Fire only red shells.',
        'Third pass at the cup, this time watching your hands. Everything from the other two cups should still be happening underneath without you asking it to.',
        'Three cups, three focuses, one set of habits. This is the last one that gets a single job.',
      ),
      session(
        7,
        4,
        'ch5',
        'Your worst track',
        ANY_TRACK,
        'Time Trial',
        'Four runs',
        'Whichever of the four has gone worst this week.',
        'Pick the track that has been letting you down and go and drive four Time Trial runs of it. Line and coins only — no items, no pressure.',
        'A cup is lost on one weak track, and that is by far the easiest thing on this list to fix.',
      ),
      session(
        7,
        5,
        'ch8',
        'Top three',
        ALL_FOUR,
        'Mushroom Cup · 100cc',
        'One full cup',
        'Everything on, and a real target: finish top three.',
        'No single focus tonight. Everything at once, and for the first time a result that counts.',
        'A cup is won by the person with no disaster, not the person with one brilliant race.',
      ),
    ],
  },
  {
    number: 8,
    title: 'Own it, then her',
    goal: 'Make winning routine, then go and use it. No new skills this week.',
    sessions: [
      session(
        8,
        1,
        'ch8',
        'Top three again',
        ALL_FOUR,
        'Mushroom Cup · 100cc',
        'One full cup',
        'Do it a second time.',
        'Same target as Friday. If it happens again, it was not luck.',
        'Doing it twice is the difference between it having happened and you being able to do it.',
      ),
      session(
        8,
        2,
        'ch8',
        'Go for the win',
        ALL_FOUR,
        'Mushroom Cup · 100cc',
        'One full cup',
        'First place overall.',
        'Win the Mushroom Cup at 100cc. If it does not happen, note which race lost it — that track is tomorrow.',
        'You now have somewhere specific to put a bad result, which is the entire point of having a plan.',
      ),
      session(
        8,
        3,
        'ch8',
        'Win it again',
        ALL_FOUR,
        'Mushroom Cup · 100cc',
        'One full cup',
        'Win it twice running.',
        'Or, if yesterday went wrong, four Time Trial runs of the race that lost it and then the cup again.',
        'At this point the cup is yours, and {rival} is the only thing left on the track.',
      ),
      session(
        8,
        4,
        'ch2',
        'Against a person',
        STADIUM,
        'VS · 100cc · Hard',
        'Four races',
        'Play a human. Anyone at all.',
        'Get Bill, Kendahl, whoever is in the room, and play two-player. People block, people hold items, people make you rush — and none of that is how a computer plays.',
        'Meet that difference now, on your own sofa, rather than on the night it counts.',
      ),
      session(
        8,
        5,
        'ch8',
        'Race {rival}',
        ALL_FOUR,
        'Mushroom Cup · 100cc',
        'One full cup',
        'When it is your pick, it is your cup. Every time.',
        'No mercy picks. Hold the banana, take your ten coins, drive the boring line, and let her find out. Read the seven race-day rules before you sit down, not during.',
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
 * three and comes back, the plan should send her back to week three rather than quietly writing it
 * off — the sessions build on each other, and a skipped one is usually skipped because it was hard.
 */
export function nextSession(isChecked: (id: string) => boolean): Session | null {
  return SESSIONS.find((item) => !isChecked(item.id)) ?? null;
}

/** Every session id, for the counter. Derived, so it can never fall out of step with the grid. */
export function allSessionIds(): string[] {
  return SESSIONS.map((item) => item.id);
}
