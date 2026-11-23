import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/sim/Simulation';
import { createNewGameState } from '../src/sim/core/state';
import { MINUTES_PER_DAY, START_MINUTE, toCalendar } from '../src/sim/core/time';
import { MAX_MINUTES_PER_UPDATE } from '../src/sim/systems/ClockSystem';

const newSim = () => new Simulation(createNewGameState(42));

describe('clock', () => {
  it('starts on Monday 4 Jan 2027 at 08:00', () => {
    const t = toCalendar(START_MINUTE);
    expect([t.weekday, t.month, t.date, t.year, t.hour, t.minute, t.day]).toEqual(['Mon', 'Jan', 4, 2027, 8, 0, 1]);
  });

  it('advances one game minute per real second at 1x, scaled by speed', () => {
    const sim = newSim();
    sim.update(3000);
    expect(sim.state.clock.totalMinutes).toBe(START_MINUTE + 3);
    sim.dispatch('setSpeed', { speed: 4 });
    sim.update(1000);
    expect(sim.state.clock.totalMinutes).toBe(START_MINUTE + 7);
  });

  it('carries partial seconds between updates', () => {
    const sim = newSim();
    sim.update(600);
    sim.update(600);
    expect(sim.state.clock.totalMinutes).toBe(START_MINUTE + 1);
  });

  it('does not advance while paused', () => {
    const sim = newSim();
    sim.dispatch('togglePause', {});
    sim.update(10_000);
    expect(sim.state.clock.totalMinutes).toBe(START_MINUTE);
  });

  it('caps a single huge update instead of freezing', () => {
    const sim = newSim();
    sim.update(60 * 60 * 1000);
    expect(sim.state.clock.totalMinutes).toBe(START_MINUTE + MAX_MINUTES_PER_UPDATE);
  });

  it('fires hour, day, week and month events at the right boundaries', () => {
    const sim = newSim();
    const seen = { hour: 0, day: 0, week: 0, month: 0 };
    sim.events.on('hour', () => seen.hour++);
    sim.events.on('dayStarted', () => seen.day++);
    sim.events.on('weekStarted', () => seen.week++);
    sim.events.on('monthStarted', () => seen.month++);
    // From Mon Jan 4 08:00 to Mon Feb 1 08:00: 28 days.
    sim.dispatch('debugSkipMinutes', { minutes: 28 * MINUTES_PER_DAY });
    expect(seen).toEqual({ hour: 28 * 24, day: 28, week: 4, month: 1 });
  });

  it('rejects unsupported speeds', () => {
    const sim = newSim();
    // @ts-expect-error testing runtime validation
    expect(sim.dispatch('setSpeed', { speed: 3 }).ok).toBe(false);
  });
});
