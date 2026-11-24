import { STATE_VERSION, type GameState } from '../sim/core/state';
import { toCalendar } from '../sim/core/time';
import { migrate, SaveVersionError } from './migrations';

/**
 * Save files you can export and import: a backup, or a way to move your
 * game between Safari and the installed home-screen app (iOS keeps their
 * storage separate).
 */
export interface SaveFile {
  app: 'prod.io';
  exportedAt: string;
  version: number;
  state: GameState;
}

export function toSaveFile(state: GameState, now = new Date()): string {
  const file: SaveFile = { app: 'prod.io', exportedAt: now.toISOString(), version: STATE_VERSION, state };
  return JSON.stringify(file);
}

/** Parses and upgrades an imported save, or throws with a reason the player can read. */
export function fromSaveFile(text: string): GameState {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new SaveVersionError("That file isn't a Prod.io save.");
  }
  const file = data as Partial<SaveFile>;
  if (file?.app !== 'prod.io' || typeof file.state !== 'object' || file.state === null) {
    throw new SaveVersionError("That file isn't a Prod.io save.");
  }
  return migrate(file.state);
}

export function saveFileName(state: GameState, now = new Date()): string {
  const alias = state.player.alias.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'producer';
  const day = toCalendar(state.clock.totalMinutes).day;
  return `prodio-${alias}-day${day}-${now.toISOString().slice(0, 10)}.json`;
}

/** One line describing a save, for confirmations. */
export function describeSave(state: GameState): string {
  return `${state.player.alias}, day ${toCalendar(state.clock.totalMinutes).day}`;
}
