import type { Cents } from './money';
import { createRng, type RngState } from './rng';
import { START_MINUTE, type Speed } from './time';
import { STARTING_CASH } from '../../content/balance';

/**
 * The entire saveable game. Plain data only (no class instances or functions)
 * so it can be serialised as JSON and migrated between versions.
 */
export interface GameState {
  version: number;
  createdAt: string;
  rng: RngState;
  clock: {
    totalMinutes: number;
    speed: Speed;
    paused: boolean;
  };
  player: PlayerState;
}

export interface PlayerState {
  name: string;
  alias: string;
  cash: Cents;
  location: { area: string; x: number; y: number; facing: Facing };
}

export type Facing = 'up' | 'down' | 'left' | 'right';

export const STATE_VERSION = 1;

export function createNewGameState(seed: number, now = new Date()): GameState {
  return {
    version: STATE_VERSION,
    createdAt: now.toISOString(),
    rng: createRng(seed),
    clock: { totalMinutes: START_MINUTE, speed: 1, paused: false },
    player: {
      name: 'Player',
      alias: 'Prod.',
      cash: STARTING_CASH,
      location: { area: 'apartment', x: -1, y: -1, facing: 'down' },
    },
  };
}
