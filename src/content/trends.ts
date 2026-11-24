import type { GenreId } from './music';

/**
 * Genre trends: popularity drifts week to week (mean-reverting random walk
 * with occasional viral jumps), and each genre has a popular tempo. BeatHub
 * shows the direction, not the numbers. See docs/GAME_DESIGN.md §7.3.
 */
export const TRENDS = {
  start: { trap: 1.2, drill: 1.05, rnb: 0.95, pop: 0.9 } as Record<GenreId, number>,
  startNoise: 0.15,
  min: 0.5,
  max: 1.7,
  /** Pull back toward 1.0 each week. */
  reversion: 0.2,
  weeklyNoise: 0.15,
  viralChance: 0.05,
  viralJump: 0.35,
  /** How far the popular tempo moves each week (BPM). */
  bpmDrift: 4,
  /** Within this many BPM of the popular tempo, a beat gets the tempo bonus. */
  bpmWindow: 6,
  bpmBonus: 1.12,
} as const;

export type TrendLabel = 'Hot' | 'Rising' | 'Steady' | 'Cooling';

export function trendLabel(popularity: number, previous: number): TrendLabel {
  if (popularity >= 1.3) return 'Hot';
  if (popularity - previous >= 0.08) return 'Rising';
  if (popularity - previous <= -0.08) return 'Cooling';
  return 'Steady';
}
