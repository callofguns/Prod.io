import type { Simulation, System } from '../Simulation';
import { fail, ok } from '../core/commands';
import { MINUTES_PER_DAY, MINUTES_PER_HOUR, REAL_MS_PER_GAME_MINUTE, SPEEDS, toCalendar } from '../core/time';

/** Never simulate more than this many minutes in one frame (prevents freezes after a long tab sleep). */
export const MAX_MINUTES_PER_UPDATE = 120;

export class ClockSystem implements System {
  readonly id = 'clock';
  private accumulatorMs = 0;

  constructor(private sim: Simulation) {
    sim.handle('setSpeed', ({ speed }) => {
      if (!SPEEDS.includes(speed)) return fail(`Unsupported speed ${speed}`);
      sim.state.clock.speed = speed;
      sim.state.clock.paused = false;
      this.announceSpeed();
      return ok;
    });
    sim.handle('setPaused', ({ paused }) => {
      sim.state.clock.paused = paused;
      this.announceSpeed();
      return ok;
    });
    sim.handle('togglePause', () => {
      sim.state.clock.paused = !sim.state.clock.paused;
      this.announceSpeed();
      return ok;
    });
  }

  advance(realMs: number): void {
    const clock = this.sim.state.clock;
    if (clock.paused || realMs <= 0) return;
    this.accumulatorMs += realMs * clock.speed;
    let steps = Math.floor(this.accumulatorMs / REAL_MS_PER_GAME_MINUTE);
    this.accumulatorMs -= steps * REAL_MS_PER_GAME_MINUTE;
    if (steps > MAX_MINUTES_PER_UPDATE) {
      steps = MAX_MINUTES_PER_UPDATE;
      this.accumulatorMs = 0;
    }
    for (let i = 0; i < steps; i++) this.stepMinute();
  }

  /** Jump forward, still firing every tick so all systems stay consistent. */
  skip(minutes: number): void {
    for (let i = 0; i < minutes; i++) this.stepMinute();
  }

  private stepMinute(): void {
    const clock = this.sim.state.clock;
    clock.totalMinutes += 1;
    const total = clock.totalMinutes;
    const events = this.sim.events;
    events.emit('minute', { totalMinutes: total });
    if (total % MINUTES_PER_HOUR !== 0) return;

    const time = toCalendar(total);
    events.emit('hour', { totalMinutes: total, time });
    if (total % MINUTES_PER_DAY !== 0) return;

    events.emit('dayStarted', { totalMinutes: total, time });
    if (time.weekdayIndex === 1) events.emit('weekStarted', { totalMinutes: total, time });
    if (time.date === 1) events.emit('monthStarted', { totalMinutes: total, time });
  }

  private announceSpeed(): void {
    const { speed, paused } = this.sim.state.clock;
    this.sim.events.emit('speedChanged', { speed, paused });
  }
}
