import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/sim/Simulation';
import { createNewGameState, DEFAULT_SETUP, LEDGER_LIMIT } from '../src/sim/core/state';
import { dollars } from '../src/sim/core/money';
import { MINUTES_PER_DAY } from '../src/sim/core/time';

const newSim = (background: 'selfTaught' | 'dropout' | 'clubDj' = 'selfTaught') =>
  new Simulation(createNewGameState(7, { ...DEFAULT_SETUP, background }));

describe('bank ledger', () => {
  it('starts with the opening balance', () => {
    const sim = newSim();
    const [first] = sim.state.finance.ledger;
    expect(first).toMatchObject({ amount: sim.state.player.cash, category: 'opening', balanceAfter: sim.state.player.cash });
  });

  it('records every cash change with a running balance', () => {
    const sim = newSim();
    const start = sim.state.player.cash;
    sim.economy.record(dollars(-12.5), 'Takeout', 'food');
    sim.economy.record(dollars(40), 'Beat lease', 'income');
    const last = sim.state.finance.ledger.at(-1)!;
    expect(last.balanceAfter).toBe(start - 1250 + 4000);
    expect(sim.state.player.cash).toBe(last.balanceAfter);
  });

  it('sums income and spending over recent days, ignoring the opening balance', () => {
    const sim = newSim();
    sim.economy.record(dollars(-20), 'Old purchase', 'other');
    sim.dispatch('debugSkipMinutes', { minutes: 8 * MINUTES_PER_DAY });
    const before = sim.economy.flow(7); // includes the first week's rent
    sim.economy.record(dollars(-30), 'Groceries', 'food');
    sim.economy.record(dollars(100), 'Sale', 'income');
    const after = sim.economy.flow(7);
    expect(after.income - before.income).toBe(10_000);
    expect(after.spending - before.spending).toBe(3_000);
    // The $20 purchase from 8 days ago is outside the window.
    expect(sim.state.finance.ledger.filter((t) => t.description === 'Old purchase')).toHaveLength(1);
    expect(before.spending).toBe(26_500);
  });

  it('keeps the ledger bounded', () => {
    const sim = newSim();
    for (let i = 0; i < LEDGER_LIMIT + 50; i++) sim.economy.record(-1, 'Gum', 'other');
    expect(sim.state.finance.ledger.length).toBe(LEDGER_LIMIT);
  });

  it('rejects fractional cents', () => {
    expect(() => newSim().economy.record(0.5, 'x', 'other')).toThrow();
  });
});

describe('inbox', () => {
  it('starts with background-specific messages, all unread', () => {
    const dropout = newSim('dropout');
    expect(dropout.state.inbox.messages.some((m) => m.subject.includes('Student loan'))).toBe(true);
    expect(dropout.messages.unreadCount()).toBe(dropout.state.inbox.messages.length);
    expect(newSim('selfTaught').state.inbox.messages.some((m) => m.subject.includes('Student loan'))).toBe(false);
  });

  it('delivers new messages and marks them read', () => {
    const sim = newSim();
    let received = '';
    sim.events.on('messageReceived', ({ message }) => (received = message.subject));
    const msg = sim.messages.send('Landlord', 'Rent', 'Due Monday.');
    expect(received).toBe('Rent');
    const before = sim.messages.unreadCount();
    expect(sim.dispatch('markMessageRead', { id: msg.id }).ok).toBe(true);
    expect(sim.messages.unreadCount()).toBe(before - 1);
    expect(sim.dispatch('markMessageRead', { id: 9999 }).ok).toBe(false);
  });
});
