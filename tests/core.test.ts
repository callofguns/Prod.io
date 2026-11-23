import { describe, expect, it } from 'vitest';
import { createRng, nextFloat, nextInt } from '../src/sim/core/rng';
import { dollars, formatMoney } from '../src/sim/core/money';
import { Simulation } from '../src/sim/Simulation';
import { createNewGameState } from '../src/sim/core/state';

describe('rng', () => {
  it('is deterministic for a seed and resumable from saved state', () => {
    const a = createRng(7);
    const first = [nextFloat(a), nextFloat(a)];
    const b = createRng(7);
    expect([nextFloat(b), nextFloat(b)]).toEqual(first);
    const copy = structuredClone(a);
    expect(nextInt(copy, 0, 1000)).toBe(nextInt(a, 0, 1000));
  });

  it('keeps nextInt inside bounds', () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const n = nextInt(rng, 3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });
});

describe('money', () => {
  it('stores cents and formats as dollars', () => {
    expect(dollars(19.99)).toBe(1999);
    expect(formatMoney(dollars(1250))).toBe('$1,250.00');
    expect(formatMoney(-500)).toBe('-$5.00');
  });
});

describe('commands', () => {
  it('applies cash changes and announces them', () => {
    const sim = new Simulation(createNewGameState(1));
    const start = sim.state.player.cash;
    let announced = 0;
    sim.events.on('cashChanged', ({ delta }) => (announced = delta));
    expect(sim.dispatch('debugAddCash', { amount: dollars(100) }).ok).toBe(true);
    expect(sim.state.player.cash).toBe(start + 10_000);
    expect(announced).toBe(10_000);
  });

  it('rejects fractional cents', () => {
    const sim = new Simulation(createNewGameState(1));
    expect(sim.dispatch('debugAddCash', { amount: 0.5 }).ok).toBe(false);
  });

  it('survives a headless year without breaking state', () => {
    const sim = new Simulation(createNewGameState(99));
    sim.dispatch('debugSkipMinutes', { minutes: 365 * 24 * 60 });
    expect(Number.isFinite(sim.state.player.cash)).toBe(true);
    expect(JSON.parse(JSON.stringify(sim.state))).toEqual(sim.state);
  });
});
