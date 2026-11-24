import { GENRES, type GenreId } from '../content/music';
import { TRENDS } from '../content/trends';
import { nextFloat, type RngState } from './core/rng';

export interface GenreTrend {
  popularity: number;
  previous: number;
  /** The tempo buyers want most right now. */
  hotBpm: number;
}

export interface TrendState {
  genres: Record<GenreId, GenreTrend>;
}

const clampPop = (v: number) => Math.max(TRENDS.min, Math.min(TRENDS.max, v));

/** Starting trends for a new game (seeded, so every playthrough differs). */
export function initialTrends(rng: RngState): TrendState {
  const genres = {} as Record<GenreId, GenreTrend>;
  for (const id of Object.keys(GENRES) as GenreId[]) {
    const { min, max } = GENRES[id].bpm;
    const popularity = clampPop(TRENDS.start[id] + (nextFloat(rng) * 2 - 1) * TRENDS.startNoise);
    genres[id] = { popularity, previous: popularity, hotBpm: Math.round(min + nextFloat(rng) * (max - min)) };
  }
  return { genres };
}

/** One week of drift: mean reversion, noise, the odd viral jump, and tempo drift. */
export function advanceTrends(state: TrendState, rng: RngState): void {
  for (const id of Object.keys(state.genres) as GenreId[]) {
    const g = state.genres[id];
    g.previous = g.popularity;
    let next = g.popularity + TRENDS.reversion * (1 - g.popularity) + (nextFloat(rng) * 2 - 1) * TRENDS.weeklyNoise;
    if (nextFloat(rng) < TRENDS.viralChance) next += TRENDS.viralJump;
    g.popularity = clampPop(next);
    const { min, max } = GENRES[id].bpm;
    g.hotBpm = Math.max(min, Math.min(max, Math.round(g.hotBpm + (nextFloat(rng) * 2 - 1) * TRENDS.bpmDrift)));
  }
}
