import type { Cents } from './money';
import type { Facing } from './state';
import type { Speed } from './time';
import type { SleepPlan } from '../systems/ActivitySystem';
import type { Meal } from '../systems/HomeSystem';
import type { BeatSettings, Pattern } from '../../content/music';
import type { SkillId } from '../../content/skills';
import type { LeaseTier } from '../../content/beathub';
import type { TravelMode } from '../../content/city';
import type { Destination, Shop } from '../systems/CitySystem';

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
  listBeat: { beatId: number };
  unlistBeat: { beatId: number };
  setDefaultPrice: { tier: LeaseTier; price: Cents };
  setBeatPrice: { beatId: number; tier: LeaseTier; price: Cents };
  resetBeatPrices: { beatId: number };
  promoteBeat: { beatId: number; days: number };
  upgradePlan: Record<string, never>;
  cancelPro: Record<string, never>;
  resumePro: Record<string, never>;
  acceptOffer: { offerId: number };
  declineOffer: { offerId: number };
  counterOffer: { offerId: number; raise: number };
  travel: { to: Destination; mode: TravelMode };
  buyShopItem: { shop: Shop; itemId: string };
  buyGear: { itemId: string };
  subscribeLoops: Record<string, never>;
  cancelLoops: Record<string, never>;
  resumeLoops: Record<string, never>;
  buyCredits: Record<string, never>;
  buyLoop: { loopId: string };
  postSnippet: { beatId: number };
  boostPost: { postId: number; tier: number };
  uploadVideo: { beatId: number; tag: string };
  setTutorial: { status: 'offered' | 'active' | 'off'; step: number; baseline: Record<string, number>; finished?: boolean };
  debugSpawnOffer: Record<string, never>;
  debugAddAudience: { followers: number; subscribers: number };
  debugGoTo: { area: string };
  debugAddBeats: { count: number };
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
