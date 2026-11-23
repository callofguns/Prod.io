import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/sim/Simulation';
import { createNewGameState, DEFAULT_SETUP } from '../src/sim/core/state';
import { dollars } from '../src/sim/core/money';
import { MINUTES_PER_DAY, MINUTES_PER_HOUR, toCalendar } from '../src/sim/core/time';
import { LOAN, NEEDS, RENT, SLEEP_TIME_SCALE, monthlyPayment } from '../src/content/living';
import { nextClockHour } from '../src/sim/systems/ActivitySystem';

const newSim = (background: 'selfTaught' | 'dropout' | 'clubDj' = 'selfTaught') =>
  new Simulation(createNewGameState(11, { ...DEFAULT_SETUP, background }));
const skip = (sim: Simulation, minutes: number) => sim.dispatch('debugSkipMinutes', { minutes });

describe('needs', () => {
  it('drain while awake', () => {
    const sim = newSim();
    const { energy, food } = sim.state.needs;
    skip(sim, 2 * MINUTES_PER_HOUR);
    expect(sim.state.needs.energy).toBeLessThan(energy);
    expect(sim.state.needs.food).toBeLessThan(food);
  });

  it('pass out at zero energy and sleep where they stand', () => {
    const sim = newSim();
    sim.state.needs.energy = 0.05;
    skip(sim, 1);
    expect(sim.state.activity).toMatchObject({ kind: 'sleeping', inBed: false });
  });
});

describe('sleep', () => {
  it('finds the next clock hour', () => {
    expect(nextClockHour(8 * 60, 7)).toBe(MINUTES_PER_DAY + 7 * 60);
    expect(nextClockHour(5 * 60, 7)).toBe(7 * 60);
  });

  it('refuses when wide awake', () => {
    const sim = newSim();
    sim.state.needs.energy = NEEDS.wideAwake;
    expect(sim.dispatch('startSleep', { plan: { kind: 'for', minutes: 120 } }).ok).toBe(false);
  });

  it('fast-forwards time, restores energy and wakes at the planned time', () => {
    const sim = newSim();
    sim.state.needs.energy = 20;
    const start = sim.state.clock.totalMinutes;
    expect(sim.dispatch('startSleep', { plan: { kind: 'for', minutes: 8 * 60 } }).ok).toBe(true);
    // One real second covers SLEEP_TIME_SCALE game minutes.
    sim.update(1000);
    expect(sim.state.clock.totalMinutes).toBe(start + SLEEP_TIME_SCALE);
    skip(sim, 8 * 60 - SLEEP_TIME_SCALE);
    expect(sim.state.activity).toBeNull();
    expect(sim.state.clock.totalMinutes).toBe(start + 8 * 60);
    expect(sim.state.needs.energy).toBe(100);
  });
});

describe('food', () => {
  it('cooking uses groceries, fills you up and takes 30 minutes', () => {
    const sim = newSim();
    sim.state.needs.food = 30;
    const groceries = sim.state.home.fridge.groceries;
    const t = sim.state.clock.totalMinutes;
    expect(sim.dispatch('eat', { meal: 'cook' }).ok).toBe(true);
    expect(sim.state.home.fridge.groceries).toBe(groceries - 1);
    expect(sim.state.needs.food).toBeGreaterThan(75);
    expect(sim.state.clock.totalMinutes).toBe(t + 30);
  });

  it('orders delivery, charges the card and fills the fridge on arrival', () => {
    const sim = newSim();
    const cash = sim.state.player.cash;
    expect(sim.dispatch('orderDelivery', { itemId: 'pizza' }).ok).toBe(true);
    expect(sim.state.player.cash).toBe(cash - dollars(24.6));
    expect(sim.state.home.fridge.takeout).toBe(0);
    skip(sim, 60);
    expect(sim.state.home.fridge.takeout).toBe(2);
  });

  it('declines orders you cannot afford', () => {
    const sim = newSim();
    sim.state.player.cash = 500;
    expect(sim.dispatch('orderDelivery', { itemId: 'burger' }).ok).toBe(false);
  });

  it('lists disabled actions with a reason', () => {
    const sim = newSim();
    sim.state.home.fridge.takeout = 0;
    const takeout = sim.actions.list('fridge').find((a) => a.id === 'takeout');
    expect(takeout?.disabled).toMatch(/No takeout/);
  });
});

describe('bills', () => {
  it('charges rent on Mondays from the second week', () => {
    const sim = newSim();
    const cash = sim.state.player.cash;
    skip(sim, 7 * MINUTES_PER_DAY + 2 * MINUTES_PER_HOUR); // to Mon Jan 11, 10:00
    const rent = sim.state.finance.ledger.filter((t) => t.category === 'rent');
    expect(rent).toHaveLength(1);
    expect(rent[0]!.amount).toBe(-RENT.weekly);
    expect(sim.state.player.cash).toBeLessThan(cash);
  });

  it('turns unpaid rent into overdue debt with a late fee, and collects it later', () => {
    const sim = newSim();
    sim.state.player.cash = 0;
    const credit = sim.state.finance.credit;
    skip(sim, 7 * MINUTES_PER_DAY + 2 * MINUTES_PER_HOUR);
    const overdue = sim.state.finance.debts.find((d) => d.kind === 'overdue');
    expect(overdue?.balance).toBe(RENT.weekly + RENT.lateFee);
    expect(sim.state.finance.credit).toBeLessThan(credit);
    sim.economy.record(dollars(1_000), 'Gift', 'income');
    skip(sim, MINUTES_PER_DAY); // next 09:00 collection
    expect(sim.state.finance.debts.find((d) => d.kind === 'overdue')).toBeUndefined();
  });

  it('collects student loan payments on the 1st with interest', () => {
    const sim = newSim('dropout');
    sim.economy.record(dollars(5_000), 'Gift', 'income');
    // Jan 4 08:00 -> Feb 1 10:00 = 28 days + 2 hours
    skip(sim, 28 * MINUTES_PER_DAY + 2 * MINUTES_PER_HOUR);
    expect(toCalendar(sim.state.clock.totalMinutes)).toMatchObject({ month: 'Feb', date: 1 });
    const loan = sim.state.finance.debts.find((d) => d.kind === 'student')!;
    const interest = Math.round((dollars(18_500) * 0.055) / 12);
    expect(loan.balance).toBe(dollars(18_500) + interest - dollars(190));
  });

  it('never ends the game: a broke year just builds debt', () => {
    const sim = newSim('dropout');
    sim.state.player.cash = 0;
    skip(sim, 365 * MINUTES_PER_DAY);
    expect(sim.state.player.cash).toBeGreaterThanOrEqual(0);
    expect(sim.state.finance.credit).toBeGreaterThanOrEqual(300);
    expect(Number.isFinite(sim.state.finance.debts.reduce((s, d) => s + d.balance, 0))).toBe(true);
  });
});

describe('loans', () => {
  it('lends within the credit limit and schedules payments', () => {
    const sim = newSim('dropout'); // credit 680 -> up to $2,500
    expect(sim.dispatch('takeLoan', { amount: dollars(5_000) }).ok).toBe(false);
    const cash = sim.state.player.cash;
    expect(sim.dispatch('takeLoan', { amount: dollars(2_500) }).ok).toBe(true);
    expect(sim.state.player.cash).toBe(cash + dollars(2_500));
    const loan = sim.state.finance.debts.find((d) => d.kind === 'personal')!;
    expect(loan.minMonthlyPayment).toBe(monthlyPayment(dollars(2_500), loan.apr, LOAN.termMonths));
    expect(sim.dispatch('takeLoan', { amount: dollars(500) }).ok).toBe(false);
  });
});
