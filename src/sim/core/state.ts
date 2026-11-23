import type { Cents } from './money';
import { createRng, type RngState } from './rng';
import { START_MINUTE, type Speed } from './time';
import { BACKGROUNDS, backgroundById, startingSkills, type Background, type StartingDebt } from '../../content/backgrounds';
import { DEFAULT_LOOK_CHOICE, type LookChoice } from '../../content/looks';
import type { Skills } from '../../content/skills';

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
  finance: FinanceState;
}

export type Debt = StartingDebt;

export interface FinanceState {
  debts: Debt[];
}

export interface PlayerState {
  name: string;
  alias: string;
  background: Background['id'];
  look: LookChoice;
  skills: Skills;
  cash: Cents;
  location: { area: string; x: number; y: number; facing: Facing };
}

export type Facing = 'up' | 'down' | 'left' | 'right';

export const STATE_VERSION = 2;

/** Choices made on the character creation screen. */
export interface NewGameSetup {
  name: string;
  alias: string;
  look: LookChoice;
  background: Background['id'];
}

export const DEFAULT_SETUP: NewGameSetup = {
  name: 'Player',
  alias: 'Prod.',
  look: DEFAULT_LOOK_CHOICE,
  background: BACKGROUNDS[0]!.id,
};

export function createNewGameState(seed: number, setup: NewGameSetup = DEFAULT_SETUP, now = new Date()): GameState {
  const bg = backgroundById(setup.background);
  return {
    version: STATE_VERSION,
    createdAt: now.toISOString(),
    rng: createRng(seed),
    clock: { totalMinutes: START_MINUTE, speed: 1, paused: false },
    player: {
      name: setup.name,
      alias: setup.alias,
      background: bg.id,
      look: { ...setup.look },
      skills: startingSkills(bg),
      cash: bg.cash,
      location: { area: 'apartment', x: -1, y: -1, facing: 'down' },
    },
    finance: { debts: bg.debts.map((d) => ({ ...d })) },
  };
}
