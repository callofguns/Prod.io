import type { Simulation } from '../sim/Simulation';
import type { UiState } from './ViewBridge';
import { BRANDS } from '../content/brands';
import { RENT } from '../content/living';
import { formatMoney } from '../sim/core/money';

/**
 * Mo's tutorial, one step at a time. A step with `done` finishes by itself
 * when the player does the thing; a step without it shows a Next button
 * (held back until `ready`, if given). `highlight` lists CSS selectors to
 * ring on screen; `world` names an object the world scene points an arrow at.
 */
export interface StepContext {
  sim: Simulation;
  ui: UiState;
  /** Counts taken when the step began (see `snapshot`). */
  base: Record<string, number>;
  touch: boolean;
}

export interface TutorialStep {
  id: string;
  section: 'Basics' | 'First beat' | 'BeatHub' | 'Outside' | 'Social' | 'Done';
  text: (ctx: StepContext) => string;
  highlight?: (ctx: StepContext) => string[];
  world?: (ctx: StepContext) => string | null;
  done?: (ctx: StepContext) => boolean;
  ready?: (ctx: StepContext) => boolean;
}

const tut = (id: string) => `[data-tut="${id}"]`;

/** Counts a step compares against: what changed since it started. */
export function snapshot(sim: Simulation): Record<string, number> {
  const loc = sim.state.player.location;
  return {
    beats: sim.state.studio.beats.length,
    listed: sim.beathub.active().length,
    posts: sim.state.social.insta.posts.length,
    videos: sim.state.social.tube.videos.length,
    x: loc.x,
    y: loc.y,
  };
}

/** Highlights the way to a phone app: the phone button, the app icon, then things inside it. */
function phonePath(ui: UiState, app: string, inside: string[]): string[] {
  if (ui.phoneApp === null) return [tut('phone-button')];
  if (ui.phoneApp === 'home') return [tut(`app-${app}`)];
  if (ui.phoneApp !== app) return ['.app-back'];
  return inside;
}

const daw = (ctx: StepContext) => (ctx.ui.menu === 'daw' ? ctx.ui.daw : null);
/** Beat-maker steps: point at the computer if the beat maker got closed. */
const atComputer = (ctx: StepContext) => (ctx.ui.menu === 'daw' ? null : 'computer');
const pageFirst = (ctx: StepContext, page: string, then: string[]) => {
  const d = daw(ctx);
  if (!d) return [];
  return d.page === page ? then : [tut(`page-${page}`)];
};
const hits = (row: number[] | undefined) => (row ?? []).filter((v) => v > 0).length;

export const TUTORIAL_STEPS: TutorialStep[] = [
  // ---------- Basics ----------
  {
    id: 'welcome',
    section: 'Basics',
    text: ({ sim }) =>
      `Yo ${sim.state.player.alias}! I'm Mo. I've been making beats on Eastside for twenty years. ` +
      "I'll show you how this works: your first beat, selling it, and getting around. Takes about ten minutes.",
  },
  {
    id: 'walk',
    section: 'Basics',
    text: ({ touch }) => (touch
      ? 'First, move around. Tap anywhere on the floor and you walk there.'
      : 'First, move around. Walk with WASD or the arrow keys.'),
    done: ({ sim, base }) => {
      const loc = sim.state.player.location;
      return base.x! >= 0 && Math.hypot(loc.x - base.x!, loc.y - base.y!) > 20;
    },
  },
  {
    id: 'transport',
    section: 'Basics',
    text: ({ touch }) =>
      'Up top: the time, your money, and the speed keys. Time runs while you play, one game minute per second. ' +
      (touch ? 'Tap pause to stop the clock, or the arrows to speed it up.' : 'Space pauses; 1, 2 and 3 set the speed.'),
    highlight: () => ['.transport'],
  },
  {
    id: 'levels',
    section: 'Basics',
    text: () =>
      'Watch these three. Energy: sleep in your bed. Food: eat from the fridge or cook. Mood drops when you are hungry, ' +
      "tired or behind on bills. Low levels make your beats worse, and at zero energy you pass out.",
    highlight: () => ['.levels'],
  },
  {
    id: 'phone',
    section: 'Basics',
    text: ({ touch }) => `Now your phone. ${touch ? 'Tap the phone button' : 'Press P or click the phone button'} to open it.`,
    highlight: () => [tut('phone-button')],
    done: ({ ui }) => ui.phoneApp !== null,
  },
  {
    id: 'phone-tour',
    section: 'Basics',
    text: () =>
      `Everything runs through here. Bank shows your money; rent is ${formatMoney(RENT.weekly)} every Monday starting next week. ` +
      `${BRANDS.delivery} delivers food to your fridge. Messages is where people reach you.`,
    highlight: ({ ui }) => (ui.phoneApp ? ['.phone'] : [tut('phone-button')]),
  },

  // ---------- First beat ----------
  {
    id: 'computer',
    section: 'First beat',
    text: ({ touch }) => `Time to make a beat. ${touch ? 'Tap your computer' : 'Walk to your computer, press E'} and choose "Make a beat".`,
    world: atComputer,
    done: ({ ui }) => ui.menu === 'daw',
  },
  {
    id: 'genre',
    section: 'First beat',
    text: () =>
      "This is your beat maker: 16 steps, one bar, on a loop. We're making trap. It lives around 130-165 BPM " +
      'and feels half-time. Make sure Trap is lit.',
    highlight: (ctx) => (daw(ctx) ? [tut('genre-trap')] : []),
    world: atComputer,
    ready: (ctx) => daw(ctx)?.settings.genre === 'trap',
  },
  {
    id: 'kick',
    section: 'First beat',
    text: () => 'Drums first. Put a kick on step 1, the start of the bar, and two more later on, like steps 8 and 11. The kick is your punch.',
    highlight: (ctx) => pageFirst(ctx, 'drums', [0, 7, 10].filter((i) => !daw(ctx)!.pattern.drums.kick[i]).map((i) => tut(`pad-kick-${i}`))),
    world: atComputer,
    done: (ctx) => {
      const k = daw(ctx)?.pattern.drums.kick;
      return !!k && (k[0] ?? 0) > 0 && hits(k) >= 3;
    },
  },
  {
    id: 'clap',
    section: 'First beat',
    text: () => 'Now the clap on step 9, the middle of the bar. Trap claps land there; that is the half-time feel.',
    highlight: (ctx) => pageFirst(ctx, 'drums', [tut('pad-clap-8')]),
    world: atComputer,
    done: (ctx) => (daw(ctx)?.pattern.drums.clap[8] ?? 0) > 0,
  },
  {
    id: 'hats',
    section: 'First beat',
    text: () => 'Hi-hats keep it moving. Fill every other step: 1, 3, 5, 7 and so on (eight hats).',
    highlight: (ctx) => pageFirst(ctx, 'drums', [0, 2, 4, 6, 8, 10, 12, 14].filter((i) => !daw(ctx)!.pattern.drums.hat[i]).map((i) => tut(`pad-hat-${i}`))),
    world: atComputer,
    done: (ctx) => hits(daw(ctx)?.pattern.drums.hat) >= 8,
  },
  {
    id: 'roll',
    section: 'First beat',
    text: () => 'Trap trick: click a lit hi-hat again to turn it into a roll (×2, ×3, ×4). Try the one on step 15.',
    highlight: (ctx) => pageFirst(ctx, 'drums', [tut('pad-hat-14')]),
    world: atComputer,
    done: (ctx) => (daw(ctx)?.pattern.drums.hat ?? []).some((v) => v >= 2),
  },
  {
    id: '808',
    section: 'First beat',
    text: () =>
      'Now the 808, the bass. Open the 808 page and put notes on the bottom row, where your kicks are: step 1 and step 8. ' +
      'Bass and kick hitting together sounds huge.',
    highlight: (ctx) => pageFirst(ctx, 'bass', [0, 7].filter((i) => daw(ctx)!.pattern.bass[i] !== 0).map((i) => tut(`bass-0-${i}`))),
    world: atComputer,
    done: (ctx) => {
      const b = daw(ctx)?.pattern.bass;
      return !!b && (b[0] ?? -1) >= 0 && b.filter((d) => d >= 0).length >= 2;
    },
  },
  {
    id: 'melody',
    section: 'First beat',
    text: () =>
      'Last, a melody. On the Melody page add at least four notes; every row is in your key, so nothing sounds wrong. ' +
      'Pick Bell on the right for that dark trap sound.',
    highlight: (ctx) => pageFirst(ctx, 'melody', [[4, 0], [3, 3], [2, 6], [4, 8], [5, 11]].filter(([d, i]) => !daw(ctx)!.pattern.melody[i!]?.includes(d!)).map(([d, i]) => tut(`mel-${d}-${i}`))),
    world: atComputer,
    done: (ctx) => (daw(ctx)?.pattern.melody ?? []).reduce((n, step) => n + step.length, 0) >= 4,
  },
  {
    id: 'play',
    section: 'First beat',
    text: ({ touch }) => `Listen to it. ${touch ? 'Tap Play' : 'Press Play (or Space)'}. Change anything you like while it loops.`,
    highlight: (ctx) => (daw(ctx) ? [tut('daw-play')] : []),
    world: atComputer,
    done: (ctx) => !!daw(ctx)?.everPlayed,
  },
  {
    id: 'finish',
    section: 'First beat',
    text: () =>
      'Sounds good. Press Finish beat and give it a name. Finishing takes a few hours of game time (it fast-forwards) and uses energy: ' +
      'arranging, mixing, bouncing.',
    highlight: (ctx) => (daw(ctx) ? [tut('daw-finish'), '.daw-dialog'] : []),
    world: (ctx) => (ctx.ui.menu === 'daw' || ctx.sim.state.activity ? null : 'computer'),
    done: ({ sim, base }) => sim.state.studio.beats.length > base.beats!,
  },
  {
    id: 'report',
    section: 'First beat',
    text: () =>
      'Your rating. Every beat gets a score and a grade, a breakdown by part, tips and skill XP. Early on your skills matter ' +
      'more than the pattern, so your first beats will be rough. That is normal; every beat makes you better. ' +
      'And since you followed my recipe, it sounds like a stock groove. Next time, change things up and make it yours.',
    highlight: ({ ui }) => (ui.menu === 'report' ? ['.report'] : []),
  },

  // ---------- BeatHub ----------
  {
    id: 'open-beathub',
    section: 'BeatHub',
    text: () => `Let's sell it. Open your phone and go to ${BRANDS.beatStore}.`,
    highlight: ({ ui }) => (ui.menu === 'none' ? phonePath(ui, 'beathub', []) : []),
    done: ({ ui }) => ui.phoneApp === 'beathub',
  },
  {
    id: 'list',
    section: 'BeatHub',
    text: () => 'Tap List next to your new beat. Artists browse the store and lease beats they like.',
    highlight: ({ ui }) => phonePath(ui, 'beathub', [tut('hub-list')]),
    done: ({ sim, base }) => sim.beathub.active().length > base.listed!,
  },
  {
    id: 'hub-tour',
    section: 'BeatHub',
    text: () =>
      'Sales come in over hours and days, mostly in the evening. Better beats and trending genres sell more. ' +
      'The Free plan keeps 30% of each sale; Pro costs $19.99 a month and you keep it all. Sometimes an artist ' +
      'offers to buy a beat outright: that is an exclusive.',
    highlight: ({ ui }) => (ui.phoneApp ? ['.phone'] : []),
  },

  // ---------- Outside ----------
  {
    id: 'go-out',
    section: 'Outside',
    text: () => 'Get some air. Walk to your front door and go outside.',
    world: ({ sim }) => (sim.city.area() === 'apartment' ? 'door' : null),
    done: ({ sim }) => sim.city.area() !== 'apartment',
  },
  {
    id: 'kwik',
    section: 'Outside',
    text: () =>
      `This is Eastside. ${BRANDS.grocery} sells groceries cheaper than ${BRANDS.delivery}, and they go straight into your fridge. ` +
      'Open 7:00 to 23:00.',
    world: ({ sim }) => (sim.city.area() === 'eastside' ? 'groceryDoor' : null),
  },
  {
    id: 'bus',
    section: 'Outside',
    text: () =>
      'Now head to Midtown. Take the bus from the stop ($2.75, every 15 minutes), book a Ryda in Maps, or walk east (40 minutes).',
    world: ({ sim }) => (sim.city.area() === 'eastside' ? 'busStop' : sim.city.area() === 'apartment' ? 'door' : null),
    done: ({ sim }) => sim.city.district() === 'midtown',
  },
  {
    id: 'gear',
    section: 'Outside',
    text: ({ sim }) =>
      `${BRANDS.gearStore} is the music store. Go in and browse at the counter. ` +
      (sim.city.isOpen('gearStore') ? '' : "It's closed right now (open 10:00-20:00); come back later or skip this step."),
    world: ({ sim }) => (sim.city.area() === 'midtown' ? 'gearStoreDoor' : sim.city.area() === 'gearStore' ? 'gearCounter' : null),
    done: ({ ui }) => ui.menu === 'gear',
  },
  {
    id: 'gear-tour',
    section: 'Outside',
    text: () =>
      'Better gear raises every beat score and makes beats faster. Studio headphones ($99) are the best first buy. ' +
      "Don't spend your rent money on it.",
    highlight: ({ ui }) => (ui.menu === 'gear' ? ['.gear-summary'] : []),
  },

  // ---------- Social ----------
  {
    id: 'instasnap',
    section: 'Social',
    text: () =>
      `Now get people to hear it. Open ${BRANDS.social} and post a snippet of your beat. Followers tap the link in your bio and land on your store.`,
    highlight: ({ ui }) => (ui.menu === 'none' ? phonePath(ui, 'instasnap', [tut('snap-new'), tut('snap-post')]) : []),
    done: ({ sim, base }) => sim.state.social.insta.posts.length > base.posts!,
  },
  {
    id: 'viewtube',
    section: 'Social',
    text: () =>
      `Last one: upload it to ${BRANDS.video} as a type beat. Pick an artist your beat sounds like; people search "[artist] type beat". ` +
      'Videos keep getting found for months.',
    highlight: ({ ui }) => (ui.menu === 'none' ? phonePath(ui, 'viewtube', [tut('tube-new'), tut('tube-choose'), tut('tube-upload')]) : []),
    done: ({ sim, base }) => sim.state.social.tube.videos.length > base.videos!,
  },

  // ---------- Done ----------
  {
    id: 'done',
    section: 'Done',
    text: () =>
      "That's the whole loop: make beats, list them, post them, pay rent, upgrade. I sent you a message with the routine. " +
      'Go make something.',
  },
];
