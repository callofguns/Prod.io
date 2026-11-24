/**
 * Generates a plausible, genre-conventional pattern with variety. Used by the
 * debug panel's "Add 5 beats" button and by economy tests.
 */
import { nextFloat, nextInt, pick, type RngState } from '../core/rng';
import { emptyPattern, type GenreId, type Pattern } from '../../content/music';

const row = (hits: number[], v = 1) => Array.from({ length: 16 }, (_, i) => (hits.includes(i) ? v : 0));

/** An engaged player's beat for tests: follows genre conventions with variety. */
export function playerPattern(g: GenreId, r: RngState): Pattern {
  const p = emptyPattern();
  const some = (opts: number[], n: number) => [...opts].sort(() => nextFloat(r) - 0.5).slice(0, n);
  const half = g === 'trap' || g === 'drill';
  p.drums.kick = row([0, ...some(half ? [3, 6, 7, 10, 11, 14] : [6, 7, 10, 14], 2)]);
  if (g === 'pop') p.drums.kick = row([0, 4, 8, 12]);
  if (half) p.drums.clap = row([8]); else p.drums.snare = row([4, 12]);
  if (g === 'drill') p.drums.perc = row([some([11, 15], 1)[0]!]);
  p.drums.hat = g === 'drill' ? row([0, 3, 6, 8, 10, 13]) : row([0, 2, 4, 6, 8, 10, 12, 14]);
  if (g === 'trap') p.drums.hat[pick(r, [6, 14, 12])] = nextInt(r, 2, 4);
  p.drums.openHat = row(nextFloat(r) < 0.5 ? [pick(r, [7, 15])] : []);
  for (const k of [0, ...p.drums.kick.map((v, i) => (v ? i : -1)).filter((i) => i > 0)]) p.bass[k] = k === 0 ? 0 : pick(r, [0, 3, 4, 5]);
  const bassSteps = p.bass.map((d, i) => (d >= 0 ? i : -1)).filter((i) => i > 0);
  if (bassSteps.length && g !== 'rnb' && g !== 'pop') p.glide[pick(r, bassSteps)] = true;
  const n = nextInt(r, 5, 8);
  const steps = some([0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14], n);
  for (const s of steps) p.melody[s] = [pick(r, [0, 2, 4, 7, 2, 4, 5, 3])];
  if (g === 'rnb' || g === 'pop') { p.melody[0] = [0, 2, 4]; p.melody[8] = [3, 5, 7]; }
  p.instrument = g === 'trap' ? pick(r, ['bell', 'pluck']) : g === 'drill' ? 'pluck' : g === 'rnb' ? pick(r, ['keys', 'pad']) : 'keys';
  return p;
}

