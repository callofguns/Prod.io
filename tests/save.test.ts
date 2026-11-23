import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createNewGameState, STATE_VERSION } from '../src/sim/core/state';
import { deleteSave, readSave, writeSave } from '../src/save/SaveStore';
import { migrate, SaveVersionError } from '../src/save/migrations';

describe('save', () => {
  it('round-trips the single autosave through IndexedDB', async () => {
    const state = createNewGameState(5);
    state.player.cash = 4242;
    await writeSave(state);
    const loaded = await readSave();
    expect(loaded?.state).toEqual(state);
    await deleteSave();
    expect(await readSave()).toBeNull();
  });

  it('refuses saves from a newer game version', () => {
    expect(() => migrate({ version: STATE_VERSION + 1 })).toThrow(SaveVersionError);
  });

  it('refuses damaged saves', () => {
    expect(() => migrate({ nope: true })).toThrow(SaveVersionError);
  });
});

describe('migrations', () => {
  it('upgrades a v1 save to the current version with character defaults', () => {
    const v1 = {
      version: 1,
      createdAt: '2026-11-23T00:00:00.000Z',
      rng: { seed: 1, state: 1 },
      clock: { totalMinutes: 600, speed: 1, paused: false },
      player: { name: 'Player', alias: 'Prod.', cash: 125000, location: { area: 'apartment', x: 10, y: 20, facing: 'down' } },
    };
    const state = migrate(v1);
    expect(state.version).toBe(STATE_VERSION);
    expect(state.player.cash).toBe(125000);
    expect(state.player.background).toBe('selfTaught');
    expect(state.player.skills.drums).toBe(18);
    expect(state.finance.debts).toEqual([]);
    expect(state.finance.ledger[0]).toMatchObject({ amount: 125000, balanceAfter: 125000 });
    expect(state.inbox.messages).toEqual([]);
  });
});
