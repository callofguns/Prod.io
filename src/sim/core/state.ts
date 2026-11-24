import type { Cents } from './money';
import { createRng, type RngState } from './rng';
import { START_MINUTE, type Speed } from './time';
import { BACKGROUNDS, backgroundById, startingSkills, type Background, type StartingDebt } from '../../content/backgrounds';
import { DEFAULT_LOOK_CHOICE, type LookChoice } from '../../content/looks';
import type { Skills } from '../../content/skills';
import { startingMessages } from '../../content/startingMessages';
import { CREDIT, NEEDS, STARTING_FRIDGE, type FridgeItem } from '../../content/living';
import type { BeatSettings, Pattern } from '../../content/music';

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
  inbox: InboxState;
  needs: NeedsState;
  home: HomeState;
  /** What the player is busy doing, if anything (blocks walking). */
  activity: Activity | null;
  studio: StudioState;
}

export interface Beat {
  id: number;
  title: string;
  settings: BeatSettings;
  pattern: Pattern;
  /** Game minute it was finished. */
  createdAt: number;
  /** In-game minutes of work it took. */
  workMinutes: number;
}

export interface StudioState {
  /** Work in progress in the beat maker, kept between sessions. */
  draft: { settings: BeatSettings; pattern: Pattern } | null;
  beats: Beat[];
  nextBeatId: number;
}

export interface NeedsState {
  energy: number;
  food: number;
  mood: number;
}

export interface Delivery {
  id: number;
  arrivesAt: number;
  description: string;
  adds: Partial<Record<FridgeItem, number>>;
}

export interface HomeState {
  fridge: Record<FridgeItem, number>;
  deliveries: Delivery[];
  nextDeliveryId: number;
}

export type Activity =
  | { kind: 'sleeping'; startedAt: number; until: number; inBed: boolean }
  | { kind: 'producing'; startedAt: number; until: number; beatTitle: string };

export type Debt = StartingDebt;

export type TransactionCategory = 'opening' | 'debug' | 'rent' | 'food' | 'loan' | 'fees' | 'income' | 'other';

export interface Transaction {
  id: number;
  /** Game minute when it happened. */
  minute: number;
  /** Positive = money in, negative = money out. */
  amount: Cents;
  description: string;
  category: TransactionCategory;
  balanceAfter: Cents;
}

export interface FinanceState {
  debts: Debt[];
  /** 300-850, like a FICO score. */
  credit: number;
  /** Newest last. Trimmed to the most recent LEDGER_LIMIT entries. */
  ledger: Transaction[];
  nextTransactionId: number;
}

export interface Message {
  id: number;
  minute: number;
  from: string;
  subject: string;
  body: string;
  read: boolean;
}

export interface InboxState {
  /** Newest last. */
  messages: Message[];
  nextMessageId: number;
}

export const LEDGER_LIMIT = 1000;

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

export const STATE_VERSION = 5;

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
    finance: {
      debts: bg.debts.map((d) => ({ ...d })),
      credit: CREDIT.start[bg.id] ?? 650,
      ledger: [
        { id: 1, minute: START_MINUTE, amount: bg.cash, description: 'Opening balance', category: 'opening', balanceAfter: bg.cash },
      ],
      nextTransactionId: 2,
    },
    inbox: {
      messages: startingMessages(bg).map((m, i) => ({ ...m, id: i + 1, minute: START_MINUTE, read: false })),
      nextMessageId: startingMessages(bg).length + 1,
    },
    needs: { ...NEEDS.start },
    home: { fridge: { ...STARTING_FRIDGE }, deliveries: [], nextDeliveryId: 1 },
    activity: null,
    studio: { draft: null, beats: [], nextBeatId: 1 },
  };
}
