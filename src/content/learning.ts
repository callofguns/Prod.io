import { dollars, type Cents } from '../sim/core/money';
import type { SkillId } from './skills';

/**
 * How skills grow: practice (finishing beats), free tutorials and paid
 * courses. Every source has diminishing returns: the higher a skill, the
 * slower it rises. See docs/GAME_DESIGN.md §3.2.
 */

/** Multiplier on all XP at a skill level: 1 at 0, about 0.47 at 40, 0.09 at 80. */
export const learnRate = (skill: number) => Math.pow(Math.max(0, 1 - skill / 100), 1.5);

/** Base XP for finishing one beat, scaled by how much of each area you used. */
export const PRACTICE = {
  drums: 1.0,
  melody: 1.0,
  soundDesign: 0.65,
  mixing: 0.75,
  mastering: 0.35,
  /** Drum hits / melody notes for full drums / melody XP. */
  fullDrumHits: 8,
  fullMelodyNotes: 6,
  /** Bonus for a genre you haven't made in your last three beats. */
  newGenreBonus: 1.15,
} as const;

/** Free tutorials on ViewTube, watched at the computer. */
export const TUTORIAL = {
  minutes: 60,
  xp: 0.8,
  /** Free tutorials stop teaching you anything past this level. */
  maxSkill: 35,
  minEnergy: 10,
  energyFactor: 1.2,
} as const;

/** Learning sessions fast-forward like producing. */
export const STUDY_TIME_SCALE = 120;

export interface Course {
  id: string;
  name: string;
  skill: SkillId;
  /** Extra skills that get a quarter of the XP. */
  also?: SkillId[];
  price: Cents;
  sessions: number;
  sessionMinutes: number;
  /** XP per session before diminishing returns. */
  xp: number;
  /** Recommended range; above `maxSkill` a session teaches only a quarter as much. */
  minSkill: number;
  maxSkill: number;
  blurb: string;
}

/** Online courses from MasterMix. Prices are in line with real producer courses. */
export const COURSES: Course[] = [
  { id: 'drums-101', name: 'Drum Programming 101', skill: 'drums', price: dollars(49), sessions: 4, sessionMinutes: 120, xp: 2.5, minSkill: 0, maxSkill: 45, blurb: 'Groove, swing, ghost notes and hi-hat rolls.' },
  { id: 'melody-chords', name: 'Melody & Chords for Producers', skill: 'melody', price: dollars(79), sessions: 5, sessionMinutes: 120, xp: 2.5, minSkill: 0, maxSkill: 55, blurb: 'Scales, chord progressions and writing hooks.' },
  { id: 'low-end', name: '808s & Low End', skill: 'soundDesign', also: ['mixing'], price: dollars(79), sessions: 4, sessionMinutes: 120, xp: 2.5, minSkill: 5, maxSkill: 60, blurb: 'Tuning, saturating and sliding 808s that hit on every speaker.' },
  { id: 'mixing-essentials', name: 'Mixing Essentials', skill: 'mixing', price: dollars(129), sessions: 5, sessionMinutes: 120, xp: 2.5, minSkill: 0, maxSkill: 60, blurb: 'Levels, EQ, compression and space.' },
  { id: 'mastering-itb', name: 'Mastering in the Box', skill: 'mastering', price: dollars(149), sessions: 4, sessionMinutes: 120, xp: 2.5, minSkill: 10, maxSkill: 65, blurb: 'Loudness, limiting and translation across systems.' },
  { id: 'business-basics', name: 'Music Business Basics', skill: 'business', price: dollars(59), sessions: 3, sessionMinutes: 120, xp: 2.5, minSkill: 0, maxSkill: 50, blurb: 'Leases, splits, publishing and getting paid.' },
  { id: 'social-for-artists', name: 'Social Media for Artists', skill: 'marketing', price: dollars(69), sessions: 4, sessionMinutes: 120, xp: 2.5, minSkill: 0, maxSkill: 50, blurb: 'Content, timing and growing an audience.' },
  { id: 'advanced-drums', name: 'Advanced Drum Design', skill: 'drums', also: ['soundDesign'], price: dollars(199), sessions: 6, sessionMinutes: 120, xp: 3.2, minSkill: 35, maxSkill: 80, blurb: 'Layering, bounce and signature patterns.' },
  { id: 'pro-mixing', name: 'Pro Mixing Masterclass', skill: 'mixing', also: ['mastering'], price: dollars(299), sessions: 8, sessionMinutes: 120, xp: 3.5, minSkill: 40, maxSkill: 90, blurb: 'How top engineers make records hit.' },
];

export const courseById = (id: string) => COURSES.find((c) => c.id === id);
