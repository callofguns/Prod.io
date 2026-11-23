import type { Simulation, System } from '../Simulation';
import type { Cents } from '../core/money';

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

  adjust(delta: Cents, reason: string): void {
    if (!Number.isInteger(delta)) throw new Error(`Cash changes must be whole cents, got ${delta}`);
    const player = this.sim.state.player;
    player.cash += delta;
    this.sim.events.emit('cashChanged', { cash: player.cash, delta, reason });
  }
}
