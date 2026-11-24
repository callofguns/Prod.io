import type { Cents } from './money';
import type { CalendarTime } from './time';
import type { Activity, Beat, Debt, Message, NeedsState } from './state';
import type { FridgeItem } from '../../content/living';
import type { SkillId, Skills } from '../../content/skills';

/**
 * Every event the simulation can announce. Add new events here so that
 * emitters and listeners stay type-checked.
 */
export interface SimEvents {
  minute: { totalMinutes: number };
  hour: { totalMinutes: number; time: CalendarTime };
  dayStarted: { totalMinutes: number; time: CalendarTime };
  weekStarted: { totalMinutes: number; time: CalendarTime };
  monthStarted: { totalMinutes: number; time: CalendarTime };
  speedChanged: { speed: number; paused: boolean };
  cashChanged: { cash: Cents; delta: Cents; reason: string };
  notice: { text: string; tone: 'info' | 'good' | 'bad' };
  messageReceived: { message: Message };
  inboxChanged: { unread: number };
  needsChanged: { needs: NeedsState };
  activityChanged: { activity: Activity | null; woke?: { inBed: boolean; minutes: number } };
  fridgeChanged: { fridge: Record<FridgeItem, number> };
  debtsChanged: { debts: Debt[]; credit: number };
  beatFinished: { beat: Beat };
  /** The player chose "Make a beat" at the computer. */
  studioRequested: Record<string, never>;
  /** The player chose "Study" at the computer. */
  learnRequested: Record<string, never>;
  skillsChanged: { skills: Skills };
  skillLevelUp: { skill: SkillId; level: number };
  learningChanged: Record<string, never>;
}

export type SimEventName = keyof SimEvents;
type Listener<K extends SimEventName> = (payload: SimEvents[K]) => void;

export class EventBus {
  private listeners = new Map<SimEventName, Set<(payload: never) => void>>();

  on<K extends SimEventName>(name: K, listener: Listener<K>): () => void {
    let set = this.listeners.get(name);
    if (!set) this.listeners.set(name, (set = new Set()));
    const fn = listener as (payload: never) => void;
    set.add(fn);
    return () => void set.delete(fn);
  }

  emit<K extends SimEventName>(name: K, payload: SimEvents[K]): void {
    const set = this.listeners.get(name);
    if (!set) return;
    for (const listener of [...set]) (listener as Listener<K>)(payload);
  }
}
