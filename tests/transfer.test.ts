import { describe, expect, it } from 'vitest';
import { createNewGameState, DEFAULT_SETUP, STATE_VERSION } from '../src/sim/core/state';
import { fromSaveFile, saveFileName, toSaveFile } from '../src/save/transfer';
import { SaveVersionError } from '../src/save/migrations';

describe('save files', () => {
  const state = createNewGameState(4, { ...DEFAULT_SETUP, alias: 'Lil Loop!' });

  it('round-trips a save', () => {
    expect(fromSaveFile(toSaveFile(state))).toEqual(state);
  });

  it('names files after the alias and day', () => {
    expect(saveFileName(state, new Date('2026-11-24T10:00:00Z'))).toBe('prodio-lil-loop-day1-2026-11-24.json');
  });

  it('rejects files that are not Prod.io saves', () => {
    expect(() => fromSaveFile('not json')).toThrow(SaveVersionError);
    expect(() => fromSaveFile(JSON.stringify({ app: 'other', state: {} }))).toThrow(SaveVersionError);
  });

  it('rejects saves from a newer version of the game', () => {
    const newer = JSON.stringify({ app: 'prod.io', version: STATE_VERSION + 1, state: { ...state, version: STATE_VERSION + 1 } });
    expect(() => fromSaveFile(newer)).toThrow(/newer version/);
  });
});
