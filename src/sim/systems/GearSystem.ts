import type { Simulation, System } from '../Simulation';
import { fail, ok, type CommandResult } from '../core/commands';
import { formatMoney } from '../core/money';
import { BRANDS } from '../../content/brands';
import { GEAR, GEAR_BASE_FACTOR, GEAR_MAX_FACTOR, GEAR_SLOTS, gearById, type GearItem, type GearSlot } from '../../content/gear';

/** Studio gear: what you own, buying it at the store, and how it changes beats. */
export class GearSystem implements System {
  readonly id = 'gear';

  constructor(private sim: Simulation) {
    sim.handle('buyGear', ({ itemId }) => this.buy(itemId));
  }

  owns(id: string): boolean {
    return this.sim.state.gear.owned.includes(id);
  }

  /** The best item you own in each slot (null if you have nothing there). */
  setup(): Record<GearSlot, GearItem | null> {
    const out = {} as Record<GearSlot, GearItem | null>;
    for (const slot of GEAR_SLOTS) {
      const mine = GEAR.filter((g) => g.slot === slot && this.owns(g.id));
      out[slot] = mine.sort((a, b) => b.price - a.price)[0] ?? null;
    }
    return out;
  }

  /** Multiplies beat scores: 0.95 with the starter setup, rising with better gear. */
  qualityFactor(): number {
    const bonus = Object.values(this.setup()).reduce((s, g) => s + (g?.quality ?? 0), 0);
    return Math.min(GEAR_MAX_FACTOR, GEAR_BASE_FACTOR + bonus);
  }

  /** Multiplies how long a beat takes (1 with the starter setup). */
  speedFactor(): number {
    return Object.values(this.setup()).reduce((s, g) => s * (g?.speed ?? 1), 1);
  }

  /** Why an item can't be bought right now, or null. */
  blocker(item: GearItem): string | null {
    if (item.price === 0) return 'Starter gear.';
    if (this.owns(item.id)) return 'You own this.';
    const best = this.setup()[item.slot];
    if (best && best.price > item.price) return `Your ${best.name.toLowerCase()} is better.`;
    if (item.requires && !this.owns(item.requires)) return `Needs the ${gearById(item.requires)?.name.toLowerCase() ?? 'other gear'} first.`;
    return null;
  }

  private buy(itemId: string): CommandResult {
    const item = gearById(itemId);
    if (!item) return fail('Unknown item.');
    if (this.sim.city.area() !== 'gearStore') return fail(`Gear is sold at ${BRANDS.gearStore} in Midtown.`);
    if (!this.sim.city.isOpen('gearStore')) return fail('The store is closed.');
    const blocked = this.blocker(item);
    if (blocked) return fail(blocked);
    if (this.sim.state.player.cash < item.price) return fail(`Card declined. ${item.name} costs ${formatMoney(item.price)}.`);
    this.sim.economy.record(-item.price, `${BRANDS.gearStore}: ${item.name}`, 'gear');
    this.sim.state.gear.owned.push(item.id);
    this.sim.needs.change({ mood: 5 });
    this.sim.events.emit('gearChanged', {});
    this.sim.events.emit('notice', { text: `You bought the ${item.name}. It's set up at your desk.`, tone: 'good' });
    return ok;
  }
}
