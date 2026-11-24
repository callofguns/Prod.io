import { dollars } from '../sim/core/money';
import { MINUTES_PER_DAY } from '../sim/core/time';
import type { GenreId, InstrumentId } from './music';

/**
 * LoopVault (a Splice parody): a monthly plan gives credits, loops cost
 * credits, and a bought loop can fill the beat maker's loop slot. Popular
 * loops get overused by other producers, which makes beats built on them
 * less unique on BeatHub. See docs/GAME_DESIGN.md §4.4.
 */

export const LOOP_PLAN = {
  name: 'Sounds',
  price: dollars(9.99),
  periodDays: 30,
  credits: 25,
  /** Unused credits roll over while you're subscribed, up to this many. */
  maxCredits: 75,
} as const;

/** One-off credit pack (needs an active plan, like the real thing). */
export const CREDIT_PACK = { credits: 10, price: dollars(5.99) } as const;

export interface LoopDef {
  id: string;
  name: string;
  genre: GenreId;
  mood: string;
  instrument: InstrumentId;
  /** Octave shift from the melody roll (-1, 0 or 1). */
  octave: number;
  /** 0-100: how good the loop is. */
  quality: number;
  credits: number;
  /** 0-1: how quickly other producers wear it out. */
  popularity: number;
  /** Game day it appears on LoopVault (1 = from the start). */
  releaseDay: number;
  /** 16 steps of scale degrees (0-7), played in the beat's key and scale. */
  notes: number[][];
}

const n = (steps: Record<number, number[]>) => Array.from({ length: 16 }, (_, i) => steps[i] ?? []);

const BASE_LOOPS: LoopDef[] = [
  { id: 'lv-night-bells', name: 'Night Bells', genre: 'trap', mood: 'Dark', instrument: 'bell', octave: 0, quality: 72, credits: 5, popularity: 0.8, releaseDay: 1,
    notes: n({ 0: [4], 2: [3], 4: [2], 6: [3], 8: [4], 10: [5], 12: [4], 14: [2] }) },
  { id: 'lv-glass-keys', name: 'Glass Keys', genre: 'trap', mood: 'Sad', instrument: 'keys', octave: 0, quality: 64, credits: 3, popularity: 0.55, releaseDay: 1,
    notes: n({ 0: [0, 2, 4], 6: [5], 8: [3, 5, 0], 14: [2] }) },
  { id: 'lv-sirens', name: 'Rooftop Sirens', genre: 'trap', mood: 'Hype', instrument: 'pluck', octave: 1, quality: 58, credits: 3, popularity: 0.35, releaseDay: 1,
    notes: n({ 0: [7], 3: [6], 6: [4], 8: [7], 11: [6], 13: [4], 14: [3] }) },
  { id: 'lv-slide-choir', name: 'Slide Choir', genre: 'drill', mood: 'Menacing', instrument: 'pad', octave: 0, quality: 74, credits: 6, popularity: 0.75, releaseDay: 1,
    notes: n({ 0: [0, 2], 4: [1, 3], 8: [0, 2], 12: [6, 1] }) },
  { id: 'lv-dark-pluck', name: 'Estate Pluck', genre: 'drill', mood: 'Dark', instrument: 'pluck', octave: 0, quality: 61, credits: 3, popularity: 0.45, releaseDay: 1,
    notes: n({ 0: [0], 3: [2], 5: [1], 8: [0], 11: [4], 13: [3] }) },
  { id: 'lv-velvet', name: 'Velvet Rhodes', genre: 'rnb', mood: 'Smooth', instrument: 'keys', octave: 0, quality: 76, credits: 6, popularity: 0.7, releaseDay: 1,
    notes: n({ 0: [0, 2, 4], 3: [6], 6: [5, 0, 2], 10: [4], 12: [3, 5, 0] }) },
  { id: 'lv-late-pad', name: 'Late Night Pad', genre: 'rnb', mood: 'Dreamy', instrument: 'pad', octave: 0, quality: 63, credits: 4, popularity: 0.4, releaseDay: 1,
    notes: n({ 0: [0, 2, 4], 8: [5, 0, 2] }) },
  { id: 'lv-sunny-pluck', name: 'Sunny Pluck', genre: 'pop', mood: 'Happy', instrument: 'pluck', octave: 1, quality: 68, credits: 4, popularity: 0.65, releaseDay: 1,
    notes: n({ 0: [0], 2: [2], 4: [4], 6: [2], 8: [5], 10: [4], 12: [2], 14: [1] }) },
  { id: 'lv-arena', name: 'Arena Chords', genre: 'pop', mood: 'Uplifting', instrument: 'keys', octave: 0, quality: 57, credits: 3, popularity: 0.3, releaseDay: 1,
    notes: n({ 0: [0, 2, 4], 4: [0, 2, 4], 8: [3, 5, 0], 12: [4, 6, 1] }) },
  { id: 'lv-music-box', name: 'Haunted Music Box', genre: 'trap', mood: 'Eerie', instrument: 'bell', octave: 1, quality: 81, credits: 8, popularity: 0.9, releaseDay: 1,
    notes: n({ 0: [4], 1: [5], 2: [4], 4: [2], 6: [1], 8: [4], 9: [5], 10: [4], 12: [7], 14: [6] }) },
];

const GENRE_ORDER: GenreId[] = ['trap', 'drill', 'rnb', 'pop'];
const INSTRUMENTS: InstrumentId[] = ['keys', 'pluck', 'bell', 'pad'];
const MOODS = ['Dark', 'Sad', 'Hype', 'Dreamy', 'Smooth', 'Eerie', 'Bouncy', 'Cold', 'Warm', 'Epic'];
const WORD_A = ['Neon', 'Velvet', 'Frozen', 'Lucid', 'Paper', 'Silver', 'Midnight', 'Broken', 'Golden', 'Hollow', 'Satin', 'Static', 'Crystal', 'Lunar', 'Smoke'];
const WORD_B = ['Bells', 'Keys', 'Strings', 'Choir', 'Pluck', 'Harp', 'Flute', 'Organ', 'Lullaby', 'Chimes', 'Dreams', 'Waves', 'Motel', 'Skyline', 'Prayer'];

/** Small deterministic generator so every player sees the same LoopVault drops. */
function hashRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Three new loops drop every Monday (game week 2 onward). */
export const DROPS_PER_WEEK = 3;

function weeklyDrop(week: number, i: number): LoopDef {
  const r = hashRng(week * 7919 + i * 104729 + 17);
  const pickOf = <T>(list: readonly T[]) => list[Math.floor(r() * list.length)]!;
  const genre = GENRE_ORDER[(week + i) % GENRE_ORDER.length]!;
  const quality = Math.round(52 + r() * 36);
  const notes: number[][] = Array.from({ length: 16 }, () => []);
  const density = genre === 'rnb' ? 0.25 : genre === 'pop' ? 0.4 : 0.45;
  let degree = Math.floor(r() * 5);
  for (let s = 0; s < 16; s++) {
    if (s % 4 === 0 || r() < density) {
      degree = Math.max(0, Math.min(7, degree + Math.floor(r() * 5) - 2));
      notes[s] = s % 8 === 0 && r() < 0.5 ? [degree, (degree + 2) % 8] : [degree];
    }
  }
  return {
    id: `lv-w${week}-${i}`,
    name: `${pickOf(WORD_A)} ${pickOf(WORD_B)}`,
    genre,
    mood: pickOf(MOODS),
    instrument: pickOf(INSTRUMENTS),
    octave: r() < 0.3 ? 1 : 0,
    quality,
    credits: Math.max(2, Math.round((quality - 40) / 6)),
    popularity: Math.min(0.95, 0.2 + r() * 0.5 + (quality - 60) / 100),
    releaseDay: (week - 1) * 7 + 1,
    notes,
  };
}

/** Every loop released up to and including game day `day`, newest first. */
export function loopsUpTo(day: number): LoopDef[] {
  const weeks = Math.floor((day - 1) / 7) + 1;
  const drops: LoopDef[] = [];
  for (let w = 2; w <= weeks; w++) for (let i = 0; i < DROPS_PER_WEEK; i++) drops.push(weeklyDrop(w, i));
  return [...drops.reverse(), ...BASE_LOOPS];
}

export function loopById(id: string): LoopDef | undefined {
  const base = BASE_LOOPS.find((l) => l.id === id);
  if (base) return base;
  const m = /^lv-w(\d+)-(\d+)$/.exec(id);
  if (!m) return undefined;
  const week = Number(m[1]);
  const i = Number(m[2]);
  return week >= 2 && i < DROPS_PER_WEEK ? weeklyDrop(week, i) : undefined;
}

/** 0-1: how worn out a loop is at a game minute (popular loops wear out over a few weeks). */
export function loopOveruse(loop: LoopDef, minute: number): number {
  const ageDays = Math.max(0, minute / MINUTES_PER_DAY + 1 - loop.releaseDay);
  // Base loops have been on the store for a while before the game starts.
  const head = loop.releaseDay === 1 ? 20 : 0;
  return loop.popularity * (1 - Math.exp(-(ageDays + head) / 21));
}

/** How a loop changes a beat's rating: its quality blends into the melody part. */
export const LOOP_RATING = {
  /** Melody part = (1 - share) × your melody + share × loop quality. */
  melodyShare: 0.55,
  /** A loop from another genre hurts genre fit by this many points. */
  offGenrePenalty: 10,
  /** BeatHub uniqueness × (1 - overusePenalty × overuse). */
  overusePenalty: 0.45,
} as const;
