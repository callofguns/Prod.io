import type { Simulation, System } from '../Simulation';
import { fail, ok } from '../core/commands';
import { NEEDS, SLEEP_TIME_SCALE } from '../../content/living';
import { MINUTES_PER_DAY, MINUTES_PER_HOUR } from '../core/time';

export type SleepPlan = { kind: 'until'; hour: number } | { kind: 'for'; minutes: number };

/** Next occurrence of `hour`:00 strictly after `now`. */
export function nextClockHour(now: number, hour: number): number {
  const dayStart = now - (now % MINUTES_PER_DAY);
  const today = dayStart + hour * MINUTES_PER_HOUR;
  return today > now ? today : today + MINUTES_PER_DAY;
}

/** Long actions that take the player out of control for a while (for now: sleeping). */
export class ActivitySystem implements System {
  readonly id = 'activity';

  constructor(private sim: Simulation) {
    sim.handle('startSleep', ({ plan }) => {
      if (sim.state.activity) return fail('You are busy.');
      if (sim.state.needs.energy >= NEEDS.wideAwake) return fail("You're wide awake.");
      const now = sim.state.clock.totalMinutes;
      const until = plan.kind === 'until' ? nextClockHour(now, plan.hour) : now + plan.minutes;
      this.sleep(until, true);
      return ok;
    });
    sim.handle('wakeUp', () => {
      if (sim.state.activity?.kind !== 'sleeping') return fail('You are not asleep.');
      this.wake();
      return ok;
    });
    sim.events.on('minute', ({ totalMinutes }) => {
      const a = sim.state.activity;
      if (a?.kind === 'sleeping' && totalMinutes >= a.until) this.wake();
    });
  }

  /** Game minutes per real second while busy, or null to use the normal speed. */
  timeScale(): number | null {
    return this.sim.state.activity?.kind === 'sleeping' ? SLEEP_TIME_SCALE : null;
  }

  isBusy(): boolean {
    return this.sim.state.activity !== null;
  }

  passOut(): void {
    if (this.sim.state.activity) return;
    this.sim.needs.change({ mood: -NEEDS.passOutMoodHit });
    this.sim.events.emit('notice', { text: 'You passed out from exhaustion.', tone: 'bad' });
    this.sleep(this.sim.state.clock.totalMinutes + NEEDS.passOutMinutes, false);
  }

  private sleep(until: number, inBed: boolean): void {
    this.sim.state.activity = { kind: 'sleeping', startedAt: this.sim.state.clock.totalMinutes, until, inBed };
    this.sim.events.emit('activityChanged', { activity: this.sim.state.activity });
  }

  private wake(): void {
    const a = this.sim.state.activity;
    if (a?.kind !== 'sleeping') return;
    const slept = this.sim.state.clock.totalMinutes - a.startedAt;
    this.sim.state.activity = null;
    if (a.inBed && slept >= NEEDS.goodSleepMinutes) this.sim.needs.change({ mood: NEEDS.goodSleepMood });
    const h = Math.floor(slept / 60);
    const m = slept % 60;
    this.sim.events.emit('notice', { text: `You slept ${h} h ${m} min.`, tone: 'info' });
    this.sim.events.emit('activityChanged', { activity: null, woke: { inBed: a.inBed, minutes: slept } });
  }
}
