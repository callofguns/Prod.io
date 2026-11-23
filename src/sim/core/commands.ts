import type { Cents } from './money';
import type { Facing } from './state';
import type { Speed } from './time';

/**
 * Every action the view can ask the simulation to perform. The view never
 * mutates state directly; it dispatches one of these and the owning system
 * validates and applies it.
 */
export interface SimCommands {
  setSpeed: { speed: Speed };
  setPaused: { paused: boolean };
  togglePause: Record<string, never>;
  setPlayerLocation: { area: string; x: number; y: number; facing: Facing };
  markMessageRead: { id: number };
  debugAddCash: { amount: Cents };
  debugSkipMinutes: { minutes: number };
}

export type SimCommandName = keyof SimCommands;
export type CommandResult = { ok: true } | { ok: false; error: string };
export type CommandHandler<K extends SimCommandName> = (payload: SimCommands[K]) => CommandResult;

export const ok: CommandResult = { ok: true };
export const fail = (error: string): CommandResult => ({ ok: false, error });
