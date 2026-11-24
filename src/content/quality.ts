import type { GenreId, InstrumentId, ScaleId } from './music';
import type { SkillId } from './skills';

/**
 * How beats are rated. A beat's score blends what you programmed (composition)
 * with how well you can execute it (skills). The owner chose "skills first":
 * skills dominate and the pattern nudges the result. See docs/GAME_DESIGN.md §4.2.
 */

export const PARTS = ['drums', 'bass', 'melody', 'mix', 'genre'] as const;
export type Part = (typeof PARTS)[number];
export const PART_NAMES: Record<Part, string> = {
  drums: 'Drums',
  bass: '808',
  melody: 'Melody',
  mix: 'Mix',
  genre: 'Genre fit',
};

/** Share of each part that comes from the pattern; the rest comes from skills. */
export const COMPOSITION_SHARE = 0.3;

/**
 * Execution from a skill level (0-100). Even a beginner's work is listenable,
 * so execution starts at 30 and reaches 100 at max skill.
 */
export const execution = (skill: number) => 30 + 70 * Math.pow(Math.max(0, Math.min(100, skill)) / 100, 0.8);

/** Which skills drive each part, as weights that sum to 1. */
export const PART_SKILLS: Record<Part, Partial<Record<SkillId, number>>> = {
  drums: { drums: 0.7, soundDesign: 0.3 },
  bass: { soundDesign: 0.5, mixing: 0.3, drums: 0.2 },
  melody: { melody: 0.8, soundDesign: 0.2 },
  mix: { mixing: 0.7, mastering: 0.3 },
  genre: { drums: 0.35, melody: 0.35, soundDesign: 0.3 },
};

/** How much each part counts toward the final score, by genre. */
export const PART_WEIGHTS: Record<GenreId, Record<Part, number>> = {
  trap: { drums: 0.3, bass: 0.25, melody: 0.2, mix: 0.1, genre: 0.15 },
  drill: { drums: 0.3, bass: 0.25, melody: 0.2, mix: 0.1, genre: 0.15 },
  rnb: { drums: 0.2, bass: 0.15, melody: 0.35, mix: 0.15, genre: 0.15 },
  pop: { drums: 0.25, bass: 0.15, melody: 0.3, mix: 0.15, genre: 0.15 },
};

/** Your gear until the gear store opens in Milestone 2. Caps the score a little. */
export const STARTER_GEAR = { name: 'Old laptop and earbuds', factor: 0.95 } as const;

/** Score multiplier from productivity (0.4-1.1), clamped. */
export const needsFactor = (productivity: number) => Math.max(0.88, Math.min(1.02, 0.8 + 0.2 * productivity));

/** Session-to-session variation: every session is a little different. */
export const VARIANCE = 3;

export const GRADES = [
  { grade: 'S', min: 92, label: 'Hit-ready' },
  { grade: 'A', min: 82, label: 'Great' },
  { grade: 'B', min: 70, label: 'Solid' },
  { grade: 'C', min: 55, label: 'Decent' },
  { grade: 'D', min: 40, label: 'Demo' },
  { grade: 'F', min: 0, label: 'Rough' },
] as const;
export type Grade = (typeof GRADES)[number]['grade'];

export function gradeFor(score: number): (typeof GRADES)[number] {
  return GRADES.find((g) => score >= g.min) ?? GRADES[GRADES.length - 1]!;
}

/** What each genre expects. Steps are 0-15 (step 1 in the UI is index 0). */
export interface GenreStyle {
  /** Where the main snare or clap belongs. */
  backbeat: number[];
  backbeatTip: string;
  hatRange: [number, number];
  hatRolls: 'expected' | 'optional' | 'rare';
  /** Drill hats skip around rather than running straight eighths. */
  brokenHats?: boolean;
  /** Drill needs at least one off-grid snare/clap/perc. */
  syncopatedSnare?: boolean;
  /** Pop loves four on the floor. */
  fourOnFloor?: boolean;
  bass: 'required' | 'optional';
  /** Fraction of 808 notes that should land with a kick. */
  bassKickLock: number;
  slides: 'expected' | 'nice' | 'rare';
  melodyNotes: [number, number];
  chords: 'expected' | 'optional' | 'rare';
  instruments: InstrumentId[];
  scales: ScaleId[];
  swing: [number, number];
}

export const GENRE_STYLES: Record<GenreId, GenreStyle> = {
  trap: {
    backbeat: [8],
    backbeatTip: 'Put the snare or clap on step 9 (beat 3) for the half-time trap bounce.',
    hatRange: [6, 16],
    hatRolls: 'expected',
    bass: 'required',
    bassKickLock: 0.5,
    slides: 'nice',
    melodyNotes: [4, 14],
    chords: 'rare',
    instruments: ['bell', 'pluck', 'keys'],
    scales: ['minor', 'harmonicMinor', 'phrygian'],
    swing: [0, 0.1],
  },
  drill: {
    backbeat: [8],
    backbeatTip: 'Drill snares hit on step 9 (beat 3); build the rest around it.',
    hatRange: [4, 12],
    hatRolls: 'optional',
    brokenHats: true,
    syncopatedSnare: true,
    bass: 'required',
    bassKickLock: 0.4,
    slides: 'expected',
    melodyNotes: [3, 12],
    chords: 'optional',
    instruments: ['pluck', 'bell', 'pad'],
    scales: ['harmonicMinor', 'minor', 'phrygian'],
    swing: [0.05, 0.2],
  },
  rnb: {
    backbeat: [4, 12],
    backbeatTip: 'Put the snare or clap on steps 5 and 13 (beats 2 and 4).',
    hatRange: [4, 16],
    hatRolls: 'rare',
    bass: 'optional',
    bassKickLock: 0.3,
    slides: 'rare',
    melodyNotes: [4, 18],
    chords: 'expected',
    instruments: ['keys', 'pad'],
    scales: ['minor', 'major'],
    swing: [0.15, 0.4],
  },
  pop: {
    backbeat: [4, 12],
    backbeatTip: 'Put the snare or clap on steps 5 and 13 (beats 2 and 4).',
    hatRange: [4, 16],
    hatRolls: 'rare',
    fourOnFloor: true,
    bass: 'optional',
    bassKickLock: 0.3,
    slides: 'rare',
    melodyNotes: [4, 18],
    chords: 'expected',
    instruments: ['keys', 'pluck'],
    scales: ['major', 'minor'],
    swing: [0, 0.1],
  },
};
