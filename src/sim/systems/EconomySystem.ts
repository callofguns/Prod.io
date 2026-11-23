import type { Simulation, System } from '../Simulation';
import type { Cents } from '../core/money';
import { LEDGER_LIMIT, type Transaction, type TransactionCategory } from '../core/state';
import { MINUTES_PER_DAY } from '../core/time';

/**
 * Owns the player's cash. Milestone 1 grows this into a proper ledger with
 * rent, purchases and income; for now it only applies and announces changes.
 */
export class EconomySystem implements System {
  readonly id = 'economy';

  constructor(private sim: Simulation) {}

  get cash(): Cents {
    return this.sim.state.player.cash;
  }

  /** Moves money in (positive) or out (negative) of the player's account and records it. */
  record(amount: Cents, description: string, category: TransactionCategory): Transaction {
    if (!Number.isInteger(amount)) throw new Error(`Cash changes must be whole cents, got ${amount}`);
    const { player, finance, clock } = this.sim.state;
    player.cash += amount;
    const tx: Transaction = {
      id: finance.nextTransactionId++,
      minute: clock.totalMinutes,
      amount,
      description,
      category,
      balanceAfter: player.cash,
    };
    finance.ledger.push(tx);
    if (finance.ledger.length > LEDGER_LIMIT) finance.ledger.splice(0, finance.ledger.length - LEDGER_LIMIT);
    this.sim.events.emit('cashChanged', { cash: player.cash, delta: amount, reason: description });
    return tx;
  }

  totalDebt(): Cents {
    return this.sim.state.finance.debts.reduce((sum, d) => sum + d.balance, 0);
  }

  /** Money in and out over the last `days` in-game days. */
  flow(days: number): { income: Cents; spending: Cents } {
    const since = this.sim.state.clock.totalMinutes - days * MINUTES_PER_DAY;
    let income = 0;
    let spending = 0;
    for (const tx of this.sim.state.finance.ledger) {
      if (tx.minute <= since || tx.category === 'opening') continue;
      if (tx.amount > 0) income += tx.amount;
      else spending -= tx.amount;
    }
    return { income, spending };
  }
}
