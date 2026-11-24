import { dollars } from '../sim/core/money';
import type { GenreId } from './music';

/**
 * InstaSnap (beat snippets, paid boosts) and the ViewTube type-beat channel.
 * Both send listeners to your BeatHub store. Numbers are real-world based
 * (organic reach, ad CPMs, the 1,000 subscribers / 4,000 watch hours rule)
 * and calibrated with headless runs. See docs/GAME_DESIGN.md §6.
 */

/** Quality factor shared with BeatHub: (score / 60) ^ 3. */
export const socialQuality = (score: number) => Math.max(0.05, Math.pow(score / 60, 3));

export const INSTASNAP = {
  startFollowers: { selfTaught: 64, dropout: 112, clubDj: 340 } as Record<string, number>,
  /** Share of followers who see a post. */
  followerReach: 0.22,
  /** Non-followers reached through Explore for an average (score 60) beat. */
  explore: 70,
  /** Non-followers who follow you after seeing a post, × quality factor. */
  followRate: 0.012,
  likeRate: (q: number) => 0.05 + 0.05 * Math.min(2, q),
  /** People who tap through to your BeatHub link per person reached. */
  clickRate: 0.012,
  /** Posting again within a day reaches fewer people (each extra post × this). */
  fatigue: 0.6,
  /** Engagement mostly happens in the first day: share of totals reached after `ageHours`. */
  curve: (ageHours: number) => 1 - Math.exp(-ageHours / 10),
  activeHours: 72,
  postMinutes: 20,
  /** Paid boost: people reached per dollar (around a $8 CPM), and ads convert worse. */
  boosts: [
    { price: dollars(10), days: 2 },
    { price: dollars(25), days: 3 },
    { price: dollars(50), days: 5 },
  ],
  reachPerDollar: 120,
  boostFollowFactor: 0.5,
  boostClickFactor: 0.8,
  skillXp: 0.3,
} as const;

/** Fictional artists producers name their type beats after. */
export const TYPE_ARTISTS: { name: string; genre: GenreId; fame: number }[] = [
  { name: 'Lil Vexx', genre: 'trap', fame: 1.3 },
  { name: 'Yung Saturn', genre: 'trap', fame: 1.0 },
  { name: 'Kodo Blue', genre: 'trap', fame: 0.8 },
  { name: 'OT Marlo', genre: 'drill', fame: 1.2 },
  { name: 'Shotta Cee', genre: 'drill', fame: 0.85 },
  { name: 'Amara Vale', genre: 'rnb', fame: 1.2 },
  { name: 'Dante Moon', genre: 'rnb', fame: 0.9 },
  { name: 'Coco Starling', genre: 'pop', fame: 1.25 },
  { name: 'The Hartleys', genre: 'pop', fame: 0.8 },
];

/** Deterministic weekly buzz for an artist (0.6-1.5), so tags rise and fall. */
export function artistBuzz(index: number, week: number): number {
  let s = (index * 2654435761 + week * 40503) >>> 0;
  s ^= s >>> 13;
  s = Math.imul(s, 0x5bd1e995) >>> 0;
  s ^= s >>> 15;
  return 0.6 + 0.9 * ((s >>> 0) / 4294967296);
}

export const VIEWTUBE = {
  /** Views from search and suggestions for an average beat on a fresh channel. */
  discovery: 90,
  /** Subscribers who watch a new upload. */
  subscriberReach: 0.12,
  /** Extra discovery from channel size: × (1 + log10(1 + subs) × this). */
  channelBoost: 0.35,
  /** Wrong-genre tag (e.g. a drill tag on an R&B beat) loses most of the search traffic. */
  offGenreTag: 0.3,
  subscribeRate: 0.006,
  likeRate: 0.035,
  /** Viewers who open the BeatHub link in the description. */
  clickRate: 0.015,
  /** Average watch time per view, in minutes. */
  watchMinutes: 1.9,
  /** Chance an upload gets picked up by the algorithm: × quality factor; multiplies views. */
  viralChance: 0.012,
  viralMultiplier: { min: 8, max: 25 },
  /** Share of lifetime views reached after `ageDays`: a fast first week, then a long search tail. */
  curve: (ageDays: number) => 1 - 0.7 * Math.exp(-ageDays / 2.5) - 0.3 * Math.exp(-ageDays / 45),
  activeDays: 180,
  uploadMinutes: 45,
  /** Partner Program: needs both, then a review. */
  partner: { subscribers: 1000, watchHours: 4000, reviewDays: 3 },
  /** Ad revenue per 1,000 views once monetized (type-beat RPMs are low). */
  rpm: dollars(1.3),
  /** Paid at the start of a month once earnings reach this. */
  payoutThreshold: dollars(100),
  skillXp: 0.4,
} as const;

/** Your audience lifts BeatHub traffic a little on its own: × (1 + log10(1 + audience / 100) / 5). */
export const audienceFactor = (audience: number) => 1 + Math.log10(1 + audience / 100) / 5;

/** Comments viewers leave, picked at random for flavour. */
export const COMMENTS = {
  good: ['this is crazy 🔥', 'how is this not viral', 'need this for my next drop', 'the melody 😮‍💨', 'bro cooked', 'instant save'],
  ok: ['hard', 'clean mix', 'vibe', 'not bad', 'drop more', 'decent'],
  weak: ['mid', 'the drums are off', 'mix it again bro', 'sounds like every other beat', 'could be better'],
} as const;
