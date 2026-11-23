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
