import type { Cents } from './money';
import type { Facing } from './state';
import type { Speed } from './time';
import type { SleepPlan } from '../systems/ActivitySystem';
import type { Meal } from '../systems/HomeSystem';
import type { BeatSettings, Pattern } from '../../content/music';
import type { SkillId } from '../../content/skills';

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
  startSleep: { plan: SleepPlan };
  wakeUp: Record<string, never>;
  eat: { meal: Meal };
  orderDelivery: { itemId: string };
  takeLoan: { amount: Cents };
  performAction: { objectId: string; actionId: string };
  saveDraft: { settings: BeatSettings; pattern: Pattern };
  discardDraft: Record<string, never>;
  finishBeat: { title: string };
  startTutorial: { skill: SkillId };
  buyCourse: { courseId: string };
  startCourseSession: { courseId: string };
  debugAddCash: { amount: Cents };
  debugSkipMinutes: { minutes: number };
  debugSetNeeds: { energy?: number; food?: number; mood?: number };
  debugBoostSkills: { amount: number };
}

export type SimCommandName = keyof SimCommands;
export type CommandResult = { ok: true } | { ok: false; error: string };
export type CommandHandler<K extends SimCommandName> = (payload: SimCommands[K]) => CommandResult;

export const ok: CommandResult = { ok: true };
export const fail = (error: string): CommandResult => ({ ok: false, error });
