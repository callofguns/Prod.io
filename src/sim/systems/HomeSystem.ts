import type { Simulation, System } from '../Simulation';
import { fail, ok, type CommandResult } from '../core/commands';
import { DELIVERY_MENU, DELIVERY_MINUTES, MEALS, type FridgeItem } from '../../content/living';
import { BRANDS } from '../../content/brands';
import { formatMoney } from '../core/money';
import { nextInt } from '../core/rng';

export type Meal = 'cook' | 'snack' | 'takeout' | 'energyDrink';

const NEEDS_ITEM: Record<Meal, FridgeItem> = {
  cook: 'groceries',
  snack: 'groceries',
  takeout: 'takeout',
  energyDrink: 'energyDrinks',
};

const DONE: Record<Meal, string> = {
  cook: 'You cooked a meal',
  snack: 'You had a snack',
  takeout: 'You ate takeout',
  energyDrink: 'You drank an energy drink',
};

/** The fridge, cooking and eating, and DashBite deliveries. */
export class HomeSystem implements System {
  readonly id = 'home';

  constructor(private sim: Simulation) {
    sim.handle('eat', ({ meal }) => this.eat(meal));
    sim.handle('orderDelivery', ({ itemId }) => this.order(itemId));
    sim.events.on('minute', ({ totalMinutes }) => this.deliver(totalMinutes));
  }

  /** Why a meal can't be had right now, or null if it can. */
  blocker(meal: Meal): string | null {
    const item = NEEDS_ITEM[meal];
    if (this.sim.state.home.fridge[item] <= 0) {
      return item === 'groceries' ? 'No groceries. Order some on DashBite.' : item === 'takeout' ? 'No takeout in the fridge.' : 'No energy drinks left.';
    }
    if (meal === 'energyDrink') return this.sim.state.needs.energy >= 95 ? "You're already wired." : null;
    return this.sim.state.needs.food >= 95 ? "You're full." : null;
  }

  private eat(meal: Meal): CommandResult {
    if (this.sim.activity.isBusy()) return fail('You are busy.');
    const reason = this.blocker(meal);
    if (reason) return fail(reason);
    const fridge = this.sim.state.home.fridge;
    fridge[NEEDS_ITEM[meal]] -= 1;
    const m = MEALS[meal];
    this.sim.needs.change({ food: 'food' in m ? m.food : 0, energy: 'energy' in m ? m.energy : 0, mood: m.mood });
    this.sim.events.emit('fridgeChanged', { fridge });
    this.sim.clock.skip(m.minutes);
    this.sim.events.emit('notice', { text: `${DONE[meal]} (${m.minutes} min)`, tone: 'info' });
    return ok;
  }

  private order(itemId: string): CommandResult {
    const item = DELIVERY_MENU.find((i) => i.id === itemId);
    if (!item) return fail(`Unknown item ${itemId}`);
    if (this.sim.state.player.cash < item.price) {
      return fail(`Card declined. ${item.name} costs ${formatMoney(item.price)}.`);
    }
    this.sim.economy.record(-item.price, `${BRANDS.delivery}: ${item.name}`, 'food');
    const home = this.sim.state.home;
    const now = this.sim.state.clock.totalMinutes;
    home.deliveries.push({
      id: home.nextDeliveryId++,
      arrivesAt: now + nextInt(this.sim.state.rng, DELIVERY_MINUTES.min, DELIVERY_MINUTES.max),
      description: item.name,
      adds: { ...item.adds },
    });
    this.sim.events.emit('fridgeChanged', { fridge: home.fridge });
    return ok;
  }

  private deliver(now: number): void {
    const home = this.sim.state.home;
    if (home.deliveries.length === 0) return;
    const arrived = home.deliveries.filter((d) => d.arrivesAt <= now);
    if (arrived.length === 0) return;
    home.deliveries = home.deliveries.filter((d) => d.arrivesAt > now);
    for (const d of arrived) {
      for (const [item, qty] of Object.entries(d.adds) as [FridgeItem, number][]) home.fridge[item] += qty;
      this.sim.events.emit('notice', { text: `${BRANDS.delivery}: ${d.description} delivered to your fridge.`, tone: 'good' });
    }
    this.sim.events.emit('fridgeChanged', { fridge: home.fridge });
  }
}
