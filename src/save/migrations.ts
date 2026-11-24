import { STATE_VERSION, type GameState } from '../sim/core/state';
import { DEFAULT_LOOK_CHOICE } from '../content/looks';
import { backgroundById, startingSkills } from '../content/backgrounds';
import { CREDIT, NEEDS, STARTING_FRIDGE } from '../content/living';

/**
 * migrations[n] upgrades a save from version n to n + 1. When GameState
 * changes shape, bump STATE_VERSION and add a step here so old saves still load.
 */
const migrations: Record<number, (save: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 -> v2: character creation. Pre-v2 saves become a self-taught producer with the default look.
  1: (save) => {
    const player = save.player as Record<string, unknown>;
    const bg = backgroundById('selfTaught');
    return {
      ...save,
      player: { ...player, background: bg.id, look: { ...DEFAULT_LOOK_CHOICE }, skills: startingSkills(bg) },
      finance: { debts: [] },
    };
  },
  // v2 -> v3: bank ledger and phone inbox. The ledger starts from the current balance.
  2: (save) => {
    const player = save.player as { cash: number };
    const clock = save.clock as { totalMinutes: number };
    const finance = save.finance as Record<string, unknown>;
    return {
      ...save,
      finance: {
        ...finance,
        ledger: [{
          id: 1, minute: clock.totalMinutes, amount: player.cash, description: 'Balance carried over',
          category: 'opening', balanceAfter: player.cash,
        }],
        nextTransactionId: 2,
      },
      inbox: { messages: [], nextMessageId: 1 },
    };
  },
  // v3 -> v4: needs, fridge, activity, credit score and debt kinds.
  3: (save) => {
    const finance = save.finance as { debts: Array<Record<string, unknown>> } & Record<string, unknown>;
    const player = save.player as { background?: string };
    return {
      ...save,
      finance: {
        ...finance,
        debts: finance.debts.map((d) => ({ kind: 'student', ...d })),
        credit: CREDIT.start[player.background ?? ''] ?? 650,
      },
      needs: { ...NEEDS.start },
      home: { fridge: { ...STARTING_FRIDGE }, deliveries: [], nextDeliveryId: 1 },
      activity: null,
    };
  },
  // v4 -> v5: the beat maker's studio (draft and finished beats).
  4: (save) => ({ ...save, studio: { draft: null, beats: [], nextBeatId: 1 } }),
};

export class SaveVersionError extends Error {}

export function migrate(raw: unknown): GameState {
  if (typeof raw !== 'object' || raw === null || typeof (raw as { version?: unknown }).version !== 'number') {
    throw new SaveVersionError('The save file is damaged: it has no version number.');
  }
  let save = raw as Record<string, unknown> & { version: number };
  if (save.version > STATE_VERSION) {
    throw new SaveVersionError(
      `This save was made by a newer version of Prod.io (save v${save.version}, game v${STATE_VERSION}).`,
    );
  }
  while (save.version < STATE_VERSION) {
    const step = migrations[save.version];
    if (!step) throw new SaveVersionError(`No upgrade path from save version ${save.version}.`);
    save = { ...step(save), version: save.version + 1 } as typeof save;
  }
  return save as unknown as GameState;
}
