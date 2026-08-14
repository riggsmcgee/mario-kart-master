/**
 * The Mushroom Cup, track by track. (4c1 + 4c2)
 *
 * This is the memorisation payload — the part of the site that exists purely to convert the
 * family's own problem ("{rival} reacts faster") into the one thing reactions cannot beat, which
 * is already knowing what is coming. Everything here was chosen against that test. A fact that
 * only helps someone with fast hands is not in this file.
 *
 * **Two stages, on purpose** (Riggs + Claude, 2026-08-06). The `callouts` are stage one: three or
 * four things per track, readable on day one, printed next to a schematic. The `deep` dive is
 * stage two and Chapter 8 labels it "come back to this in week 3" — not hidden, just explicitly
 * scheduled, because a path-choice argument means nothing to someone who has not yet driven the
 * corner it is about. Front-loading it would turn the best material in the course into a wall she
 * bounces off in week one.
 *
 * **Everything is filtered through her settings.** Smart steering resists leaving the road, so
 * every classic mushroom shortcut is not merely skipped, it is *named* in `notForYou` — because
 * she is going to watch the videos, see somebody fly over a canyon, and quite reasonably wonder
 * why she cannot. Answering that once in writing is kinder than letting it sit there as a
 * suspicion that the real technique is being withheld from her.
 *
 * **Where the claims come from.** The plan's Appendix (research, 2026-08-06) plus the four
 * verified IGN "Fastest Path" videos, rewritten rather than pasted — the appendix is notes to a
 * developer and this is coaching addressed to a person. Layout descriptions stay at the level the
 * research supports: which way to go and why, not an invented metre-by-metre map. The video
 * carries the geography; this file carries the decisions.
 *
 * Copy uses `{name}` and `{rival}` and never a literal name (4e1).
 */

import type { VideoRef } from './chapters';
import type { MapPin, TrackSchematic } from '../ui/track-map';
import { loop, route } from '../ui/track-map';

/** A stage-one callout: a pin on the schematic and a sentence in the list beside it. */
export interface TrackCallout extends MapPin {
  /** The full version, for the numbered list. One or two sentences, no more. */
  note: string;
}

/** A place the road offers a decision. Three of the four tracks have one; that is why this cup. */
export interface PathChoice {
  title: string;
  /** What to do, short enough to remember at 100cc. */
  take: string;
  why: string;
}

export interface LineSection {
  /** Named the way she would describe it out loud, not the way a guide would. */
  section: string;
  drive: string;
}

export interface TrackDeepDive {
  choices: PathChoice[];
  line: LineSection[];
  /** Fixed hazards and their timing. The whole reason this cup was chosen. */
  hazards: string[];
  /** What a Time Trial on this track is actually for — every track gets a different answer. */
  timeTrial: string[];
  /** The part that only matters when the other kart is hers. */
  versus: string;
}

export interface MushroomTrack {
  id: string;
  name: string;
  /** Race order within the cup. */
  order: number;
  /** One line: why this track is on her side. */
  blurb: string;
  schematic: TrackSchematic;
  callouts: TrackCallout[];
  deep: TrackDeepDive;
  /** The sweaty shortcuts, named so she can recognise one and let it go past. */
  notForYou: string[];
  video: VideoRef;
}

/**
 * The standing explanation for every `notForYou` list.
 *
 * Written once here rather than four times in the data: it is the same answer every time, and
 * four slightly different phrasings of it would read as four different rules.
 */
export const NOT_FOR_YOU_INTRO =
  'These are the sweaty shortcuts. Every one of them needs a mushroom **and** needs you to leave the road, and your steering setting is built to stop you leaving the road. So they are not options you are failing to take — they are not options. Skip them, and know what they are when you see one in a video.';

export const CUP = {
  name: 'Mushroom Cup',
  cc: '100cc',
  /** Why this cup, in the one sentence that has to survive being repeated to {rival}. */
  why: 'Four gentle tracks, wide roads, and — the part that matters — not one hazard in the whole cup that changes between races.',
};

/*
 * The schematics.
 *
 * Corner points and a radius, nothing else. They are not to scale and are not trying to be:
 * exaggerating the shape is what makes one track recognisably not another at a glance, which is
 * the only job a diagram this small can actually do. Hence four deliberately different
 * silhouettes and four different corner radii — the stadium is a smooth oval, the ruins are all
 * hard angles, the water park has a kink in it. Rounded to the same radius they all became the
 * same blob, which was worse than no diagram at all.
 */

const STADIUM_SHAPE: TrackSchematic = {
  path: loop(
    [
      [210, 130],
      [690, 130],
      [880, 215],
      [880, 335],
      [690, 440],
      [350, 440],
      [140, 350],
      [140, 215],
    ],
    50,
  ),
  branches: [
    {
      path: route(
        [
          [862, 336],
          [930, 430],
          [690, 492],
          [420, 455],
        ],
        60,
      ),
      label: 'The outer lane\npads and coins',
      tone: 'take',
      labelAt: 0.5,
    },
  ],
};

const WATER_PARK_SHAPE: TrackSchematic = {
  path: loop(
    [
      [170, 150],
      [470, 150],
      [560, 250],
      [770, 200],
      [900, 310],
      [830, 430],
      [600, 470],
      [330, 470],
      [150, 330],
    ],
    34,
  ),
};

const CANYON_SHAPE: TrackSchematic = {
  path: loop(
    [
      [180, 180],
      [420, 110],
      [720, 130],
      [880, 260],
      [820, 400],
      [560, 480],
      [300, 450],
      [150, 320],
    ],
    34,
  ),
  // The path starts on a diagonal, so the start line is nudged onto the top straight — a
  // chequered flag drawn across a corner reads as a mistake rather than as a start.
  start: 0.15,
  branches: [
    {
      path: route(
        [
          [726, 132],
          [930, 200],
          [930, 330],
          [822, 402],
        ],
        55,
      ),
      label: 'Pink path\na hair faster',
      tone: 'either',
      labelAt: 0.5,
    },
  ],
};

const THWOMP_SHAPE: TrackSchematic = {
  path: loop(
    [
      [210, 130],
      [620, 130],
      [890, 270],
      [760, 440],
      [420, 470],
      [220, 400],
      [150, 260],
    ],
    26,
  ),
  branches: [
    {
      path: route(
        [
          [624, 132],
          [930, 240],
          [900, 380],
          [770, 442],
        ],
        55,
      ),
      label: 'Wall route\nor floor route',
      tone: 'either',
      labelAt: 0.5,
    },
    {
      path: route([
        [480, 465],
        [172, 292],
      ]),
      label: 'Glider',
      tone: 'take',
      labelAt: 0.5,
      side: 'in',
    },
  ],
};

export const TRACKS: MushroomTrack[] = [
  {
    id: 'stadium',
    name: 'Mario Kart Stadium',
    order: 1,
    blurb:
      'The gentlest track in the game, and the one with the biggest free lunch sitting on it. If you only ever learn one track properly, learn this one.',
    schematic: STADIUM_SHAPE,
    callouts: [
      {
        kind: 'hazard',
        at: 0.37,
        side: 'in',
        label: 'Warp pipes\nyour cue for the lanes',
        note: 'Green pipes stand in the dirt on the inside of the first big turn. They are off the road, so you will never touch one — they are a landmark, not a hazard. Use them as your cue that the three lanes are about to appear.',
      },
      {
        kind: 'pad',
        at: 0.46,
        side: 'in',
        label: 'Three lanes\ntake the outer one',
        note: 'The road paints itself into three lanes. The outer one carries the boost pads **and** the coins, so the long way round is the fast way round. This is Chapter 4 made real, on the first track of your cup.',
      },
      {
        kind: 'trick',
        at: 0.76,
        side: 'out',
        label: 'Glider ramp',
        note: 'A ramp into a glide before the final turn. Press the trick button at the lip, watch for the flourish, then keep your hands still in the air.',
      },
      {
        kind: 'pad',
        at: 0.93,
        side: 'out',
        label: 'Three more pads\nand a ramp',
        note: 'The outer path down the finish straight has three more boost pads and a ramp on it. It is the last thing that happens before the lap ticks over, so you start the next lap already moving.',
      },
    ],
    deep: {
      choices: [
        {
          title: 'The three lanes, after the first big right',
          take: 'Outer. The wide one. The one that feels wrong.',
          why: 'The boost pads and the coins are both painted out there. The inside line is shorter and slower, which is the strangest true thing in this whole course. {rival} will be hugging the inside, because the inside looks correct. Let her.',
        },
        {
          title: 'The run to the line',
          take: 'Outer again — three boost pads and a ramp.',
          why: 'A boost at the end of a lap is worth more than the same boost in the middle of one, because you are still carrying it when the next lap starts. Nothing else on this track compounds like that.',
        },
      ],
      line: [
        {
          section: 'The start straight',
          drive:
            'Hold A as the 2 vanishes. Then nothing — point straight and let the pack sort itself out.',
        },
        {
          section: 'Turn one',
          drive:
            'Go in wide and come out wider. You are not trying to win this corner, you are trying to already be heading towards the outside when the lanes appear.',
        },
        {
          section: 'The pipes and the split',
          drive:
            'Pipes first, in their usual spot. Then commit to the outer lane **before** the paint splits. Deciding late is what dumps you in the middle lane, and the middle lane has nothing in it.',
        },
        {
          section: 'The boosted lane',
          drive: 'Panel, coin, panel. Follow the orange and take whatever coins are on the way.',
        },
        {
          section: 'The glider ramp',
          drive:
            'Trick at the lip. In the air, hands still — steering while gliding scrubs off the speed you just earned.',
        },
        {
          section: 'The finish straight',
          drive: 'Outer. Three boost pads, a ramp, and the line. Then do it all again.',
        },
      ],
      hazards: [
        'Green pipes in the dirt on the inside of the first big turn. They never move, and they are off the road — a landmark, not a hazard.',
        'That is the entire list. This is the easiest track in the game and it is the first race of your cup — which is a very good way for a cup to start.',
      ],
      timeTrial: [
        'Ghost track number one. Time Trials: no items, no computer, nobody to hit you.',
        'Three laps with one rule — every panel in the outer lane, all three laps.',
        'Save the ghost. Tomorrow, race it and beat it by anything at all. You are not chasing a record, you are chasing yesterday-you.',
        'Ten coins by the end of lap one is easy here. If it is not happening, you are still driving the inside line.',
      ],
      versus:
        'The outer lane does a second job when she is close: it keeps you off the inside, which is exactly where she will try to come past. Being fast and being in the way happen to be the same move on this track.',
    },
    notForYou: [
      'Mushroom cuts across turns one, two and three.',
      'The mushroom cut across the sand at the final turn.',
    ],
    video: {
      id: 'TRywiShGKb4',
      title: 'Mario Kart 8 — The Fastest Path: Mario Kart Stadium',
      channel: 'IGN',
      note: 'Made for the older Wii U version, so the menus look different — the track is the same one you drive. **Watch for:** the lane split and the pipes. **Ignore:** every jump that leaves the road. Those need a mushroom and they need you to steer off the tarmac, which your steering setting exists to stop.',
    },
  },

  {
    id: 'water-park',
    name: 'Water Park',
    order: 2,
    blurb:
      'The friendliest track in the cup for your settings: there is essentially nothing here that can hurt you, and three free boosts lying around for anyone who presses one button.',
    schematic: WATER_PARK_SHAPE,
    callouts: [
      {
        kind: 'trick',
        at: 0.24,
        side: 'in',
        label: 'Ramp into the water\ntrick as you drop',
        note: 'The trick ramps are the best value on the track. Three of them in a lap, one press each, and a missed one costs you nothing at all. This is the first: the ramp that drops you into the water.',
      },
      {
        kind: 'pad',
        at: 0.47,
        side: 'out',
        label: 'The submarines\nbump one on purpose',
        note: 'In the upside-down loop, little submarines run along the rail beside you, and their wheels give you a nudge of speed when you touch them. They are the one moving thing in this cup you are actively trying to hit. They drift along as the race goes on, so they sit somewhere different each lap: take the one in front of you, and never chase one.',
      },
      {
        kind: 'coins',
        at: 0.68,
        side: 'out',
        label: 'Coins, everywhere\nten by lap one',
        note: 'Coins here come in easy handfuls on wide road. This is one of your two ten-coins-by-lap-one tracks, and you should never have to go out of your way for a single one.',
      },
      {
        kind: 'trick',
        at: 0.87,
        side: 'out',
        label: 'Glide ramp\none more trick',
        note: 'Coming off the teacups there is a glide ramp. Same button, same moment, same free speed — and then a short glide down to the line.',
      },
    ],
    deep: {
      choices: [
        {
          title: 'The submarines',
          take: 'Drive into it. Yes, really.',
          why: 'Everything else in Mario Kart that moves is trying to ruin your race. These hand you a small turbo instead, and they cannot hurt you if you get it wrong. They sit somewhere different every lap, so there is no timing to learn: if one is beside you, lean into it, and if it is not, drive on.',
        },
        {
          title: 'The water section',
          take: 'Middle of the road, trick off all three ramps.',
          why: 'There is no clever line here and nothing to dodge. Three tricks a lap is roughly a kart length, free, forever — and a missed trick is just a normal jump, so trying costs you nothing.',
        },
      ],
      line: [
        {
          section: 'The opening',
          drive:
            'Wide, flat and calm. Start your coin count here; they are lying around in handfuls.',
        },
        {
          section: 'Down into the water',
          drive:
            'The road drops you into the water on a ramp. Nothing clever to do but hold your line — then trick as the nose lifts, not as you land. Early feels wrong and lands right.',
        },
        {
          section: 'The loop and the submarines',
          drive:
            'One trick per ramp. Press as the nose lifts, not as you land — early feels wrong and lands right.',
        },
        {
          section: 'The ramp out of the loop',
          drive:
            'A right turn out of the loop leads straight onto trick ramp number two. Same press, same free speed.',
        },
        {
          section: 'The teacups and home',
          drive:
            'Trick off the edge on the way out, then the run home is wide and forgiving. Tidy up your coins.',
        },
      ],
      hazards: [
        'None worth the word. Nothing on this track chases you or drops on you. The only thing that moves is the submarines, and they are trying to help.',
        'Which makes this the track to go to when you have had a bad race and want to enjoy yourself for four minutes.',
      ],
      timeTrial: [
        'Ghost track number two. Two ghosts is plenty — more than two and it becomes homework.',
        'Job one: ten coins by the end of lap one, without swerving for any of them.',
        'Job two: a trick off all three ramps, every lap. Into the water, out of the loop, and the glide ramp before the line. Count them out loud if it helps.',
        'Then save it and beat it. Beating your own ghost by a tenth is worth more to you than beating a stranger on the internet by a minute.',
      ],
      versus:
        'She may take the teacup cut with a mushroom and gain half a kart length. You will take three tricks and a spin off a submarine for more than that — and you will take them every lap, whether or not you got a mushroom.',
    },
    notForYou: ['The mushroom cut straight across the teacup ride.'],
    video: {
      id: '6G1HY_7W3xg',
      title: 'Mario Kart 8 — The Fastest Path: Water Park',
      channel: 'IGN Guides',
      note: 'Wii U footage again, same track. **Watch for:** the ramp down into the water, the submarines in the upside-down loop, and the glide ramp at the end. **Ignore:** the cut straight across the teacups — that is a mushroom move and it is not on your menu.',
    },
  },

  {
    id: 'sweet-sweet-canyon',
    name: 'Sweet Sweet Canyon',
    order: 3,
    blurb:
      'The prettiest of the four and the one with a genuine decision in it. The road splits, and knowing which half to take is worth more than driving either half well.',
    schematic: CANYON_SHAPE,
    callouts: [
      {
        kind: 'split',
        at: 0.29,
        side: 'in',
        label: 'Blue or pink?\ntake the quiet one',
        note: 'The course splits into two paths that spiral around each other, one blue and one pink. They are anti-gravity, so you will find yourself sideways — that is meant to happen. Pink is a whisker faster. If you can see where her kart went, go the other way: a path with nobody on it has nobody firing shells down it either.',
      },
      {
        kind: 'line',
        at: 0.52,
        side: 'in',
        label: 'Long sweepers\nthe cup’s best corners',
        note: 'These long, lazy turns are the best place in the whole cup to try the drift from Chapter 6 — if you decided to bother with drifting at all. Nothing here requires it.',
      },
      {
        kind: 'hazard',
        at: 0.72,
        side: 'out',
        label: 'Frosting and\npiranha plants',
        note: 'Frosting looks like part of the track and is not: it is off-road, and it slows you to a crawl. The plants sit in fixed spots in their pipes and snap at whatever comes close — they cannot come and find you, so give them a kart-width and they are decoration.',
      },
      {
        kind: 'coins',
        at: 0.9,
        side: 'out',
        label: 'Coins where\nit is easy',
        note: 'Take the coins that are already in front of you and let the rest go. A coin you crossed the road for cost more than it gave you.',
      },
    ],
    deep: {
      choices: [
        {
          title: 'Blue path or pink path',
          take: 'Alone: pink. Racing her: whichever one she did not take.',
          why: 'Pink is marginally quicker, and marginal is the right word. Clean air is worth more: an empty path has no shells coming down it, no bananas dropped on it, and nobody to bump you off your line. Half a lap of peace beats a hundredth of a second of racing line.',
        },
        {
          title: 'The frosting',
          take: 'Stay on the road, always, even when the road goes the long way.',
          why: 'Frosting is off-road dressed as scenery. Your steering setting will fight you the moment you head for it, and it is right to. Cutting a corner into frosting is slower than driving round the corner properly.',
        },
      ],
      line: [
        {
          section: 'The opening',
          drive: 'Wide and calm. Pick up whatever coins are lying in the middle of the road.',
        },
        {
          section: 'The split',
          drive:
            'Decide early. Look for her kart — if you can see it, take the other path. If you cannot see her, take pink.',
        },
        {
          section: 'The long sweepers',
          drive:
            'One long turn, one steady input. If you are drifting: hold it, wait for blue sparks, let go. If you are not: just hold a clean arc, which is what Kendahl would do.',
        },
        {
          section: 'The donut section',
          drive: 'Round the outside, on the road. The gap in the middle is not for us.',
        },
        {
          section: 'The run to the line',
          drive: 'Tidy and boring. Nothing here needs to be brave.',
        },
      ],
      hazards: [
        'Piranha plants: fixed spots, in their pipes. They snap at whatever comes close and they cannot chase you — give them a kart-width and they are decoration.',
        'Frosting: off-road, everywhere, and it does not look like it. If the surface changes colour under you, you are losing time.',
        'Nothing else. Nothing on this track is different this race than it was last race.',
      ],
      timeTrial: [
        'Not a ghost track — two ghosts is enough, and they are Stadium and Water Park.',
        'Use this one for exactly one job: three quiet laps holding a drift through the long corners, watching for blue sparks.',
        'If you skipped Chapter 6, skip this entirely. Nothing on this track is required, and pretending otherwise would be the first time this plan wasted your evening.',
      ],
      versus:
        'This is the track where the plan wins on knowledge alone. She picks a path by habit; you pick a path by looking at where she is. Take the other one and half the race becomes a Time Trial you happen to be winning.',
    },
    notForYou: ['The gap jump through the donut hole.', 'Corner cuts across the frosting.'],
    video: {
      id: 'POAHr786Rzw',
      title: 'Mario Kart 8 — The Fastest Path: Sweet Sweet Canyon',
      channel: 'IGN Guides',
      note: 'Wii U footage, identical layout. **Watch for:** where the two paths split and rejoin. **Ignore:** the donut jump and every corner cut over the frosting — they need a mushroom and they need you off the road.',
    },
  },

  {
    id: 'thwomp-ruins',
    name: 'Thwomp Ruins',
    order: 4,
    blurb:
      'The biggest knowledge edge in the cup, and the best joke in the plan: the thwomps pound on a fixed rhythm. She dodges them by reacting. You will not have to react, because you will already know.',
    schematic: THWOMP_SHAPE,
    callouts: [
      {
        kind: 'split',
        at: 0.24,
        side: 'in',
        label: 'Wall or floor?\ntake the empty one',
        note: 'The road offers a wall route and a floor route. The wall is a touch quicker; being on your own is quicker still. Look before you commit and take whichever one nobody else wanted.',
      },
      {
        kind: 'hazard',
        at: 0.42,
        side: 'out',
        label: 'Thwomps\nsame rhythm, every lap',
        note: 'They pound up and down on a fixed cycle. Not random, not reacting to you, not different next race. Watch one for two laps and you own it for good.',
      },
      {
        kind: 'trick',
        at: 0.67,
        side: 'out',
        label: 'Take the glider,\nland on the coins',
        note: 'The glide ramp is not there on lap one — a rolling boulder knocks it into place, so it turns up from lap two. From then on take it every time: it beats both wall routes. Trick off the lip, hold still in the air, and land where the coins are.',
      },
      {
        kind: 'trick',
        at: 0.88,
        side: 'out',
        label: 'Two ramps\nbefore the line',
        note: 'The last thing before the line is a ramp into a short glide, and you land on another ramp coming out of it. Both sit right on the road, so you cannot miss them. Press the trick button at each lip and you cross the line already moving.',
      },
    ],
    deep: {
      choices: [
        {
          title: 'First split: wall or floor',
          take: 'Whichever one is empty.',
          why: 'The wall route is slightly faster and that is not the point. Being alone is the point: no bumping, no bananas, nobody braking in front of you. The rule is one glance and one decision, not a calculation.',
        },
        {
          title: 'Second section: the glider',
          take: 'Always the glider, whenever it is there.',
          why: 'It beats both of the wall routes, and it puts you down where the coins are. One thing to know: a boulder has to knock the ramp into place, so lap one goes through the water and the glider appears from lap two. From then on it is the only place in the cup where the fastest option and the easiest option are the same option.',
        },
        {
          title: 'Final turn: the tilted platform',
          take: 'Trick off the glide ramp, then off the ramp you land on.',
          why: 'A boost this close to the line carries into the next lap. It costs you one button press at each lip, both ramps are right on the road, and it cannot go wrong.',
        },
      ],
      line: [
        {
          section: 'The start',
          drive: 'Straight, then choose your side early. Early is the whole skill here.',
        },
        {
          section: 'Inside the temple',
          drive:
            'Thwomps. Do not swerve — swerving is reacting, and reacting is her game. Hold your line and arrive when the gap is open.',
        },
        {
          section: 'The glider',
          drive:
            'Trick off the lip, hands still in the air, and aim your landing at the side platforms for the coins.',
        },
        { section: 'The cave', drive: 'Nothing to do. Off the walls, keep it boring.' },
        {
          section: 'The final turn',
          drive: 'Up the tilted platform, trick, land, line. Then start the next lap already fast.',
        },
      ],
      hazards: [
        'Thwomps, on a fixed cycle, in fixed places. This is the memorisation jackpot of the entire cup.',
        'How to learn them: one solo race, and you watch one thwomp — just one — for two laps. Count it. Up, down, up, down. Then it is a metronome instead of a monster.',
        'She is dodging them fresh every lap, all four laps, in every race you have ever played. You are about to stop doing that, permanently.',
      ],
      timeTrial: [
        'Not a ghost track, but worth three quiet laps.',
        'The job is not the time. The job is to watch the thwomps with nobody else on the track and get their rhythm into your hands.',
        'Then take the glider three times in a row and land on the coins. That is the lap you want on race night.',
      ],
      versus:
        'Fourth race of the cup, so this is usually where it is decided. She has spent three races reacting; you have spent three races knowing. On this track, that gap is at its widest — take the empty path, take the glider, and stay boring.',
    },
    notForYou: [
      'The fallen pillar that cuts the turn before the last glide ramp.',
      'The off-road ramp just past the finish line.',
    ],
    video: {
      id: 'mY4KhGWlG9A',
      title: 'Mario Kart 8 — The Fastest Path: Thwomp Ruins',
      channel: 'IGN Guides',
      note: 'Wii U footage, same ruins. **Watch for:** the two routes at the first split, and the glider. **Ignore:** the gap jumps. Also ignore how fast he takes the thwomps — he is reacting, you are going to be remembering.',
    },
  },
];

export function getTrack(id: string): MushroomTrack | undefined {
  return TRACKS.find((track) => track.id === id);
}

/** The two tracks the plan sends her to for Time Trials (decision 2026-08-06). */
export const GHOST_TRACKS = ['Mario Kart Stadium', 'Water Park'];
