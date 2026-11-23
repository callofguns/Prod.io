/**
 * Seeded PRNG (mulberry32). The generator state lives in GameState so that a
 * save + reload continues the exact same random sequence.
 */
export interface RngState {
  seed: number;
  state: number;
}

export function createRng(seed: number): RngState {
  return { seed: seed >>> 0, state: seed >>> 0 };
}

/** Returns a float in [0, 1) and advances the state. */
export function nextFloat(rng: RngState): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [min, max] inclusive. */
export function nextInt(rng: RngState, min: number, max: number): number {
  return min + Math.floor(nextFloat(rng) * (max - min + 1));
}

export function pick<T>(rng: RngState, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() called with an empty list');
  return items[nextInt(rng, 0, items.length - 1)] as T;
}
