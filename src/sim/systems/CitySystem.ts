import type { Simulation, System } from '../Simulation';
import { fail, ok, type CommandResult } from '../core/commands';
import { formatMoney, type Cents } from '../core/money';
import { nextInt } from '../core/rng';
import { MINUTES_PER_DAY, pad2, toCalendar } from '../core/time';
import type { Facing } from '../core/state';
import {
  AREAS, ARRIVAL_SPAWN, CAFE_ITEMS, DISTRICTS, GROCERY_ITEMS, TRANSIT, TRAVEL_MODE_NAMES, isAreaId,
  type AreaId, type DistrictId, type ShopItem, type TravelMode,
} from '../../content/city';
import { BRANDS } from '../../content/brands';
import type { FridgeItem } from '../../content/living';

export type Destination = DistrictId | 'home';
export type Shop = 'grocery' | 'cafe';

const SHOP_ITEMS: Record<Shop, ShopItem[]> = { grocery: GROCERY_ITEMS, cafe: CAFE_ITEMS };
const SHOP_NAMES: Record<Shop, string> = { grocery: BRANDS.grocery, cafe: BRANDS.cafe };

/**
 * Where you are in Bayport and how you get around: entering and leaving
 * buildings, shop opening hours, bus, rideshare and walking between
 * districts, and buying things at the corner store and café.
 */
export class CitySystem implements System {
  readonly id = 'city';

  constructor(private sim: Simulation) {
    sim.handle('travel', ({ to, mode }) => this.travel(to, mode));
    sim.handle('buyShopItem', ({ shop, itemId }) => this.buy(shop, itemId));
    sim.events.on('minute', ({ totalMinutes }) => {
      const a = sim.state.activity;
      if (a?.kind === 'traveling' && totalMinutes >= a.until) this.arrive();
    });
    sim.events.on('hour', ({ totalMinutes }) => this.closeShops(totalMinutes));
  }

  // ---------- Where am I ----------

  area(): AreaId {
    const a = this.sim.state.player.location.area;
    return isAreaId(a) ? a : 'apartment';
  }

  district(): DistrictId {
    return AREAS[this.area()].district;
  }

  /** Puts the player in an area at a named spawn point; the view switches scenes. */
  moveTo(area: AreaId, spawn: string, facing: Facing = 'down'): void {
    this.sim.state.player.location = { area, x: -1, y: -1, facing, spawn };
    this.sim.events.emit('areaChanged', { area, spawn });
  }

  isOpen(area: AreaId, minute = this.sim.state.clock.totalMinutes): boolean {
    const hours = AREAS[area].hours;
    if (!hours) return true;
    const h = toCalendar(minute).hour;
    return h >= hours.open && h < hours.close;
  }

  hoursLabel(area: AreaId): string {
    const hours = AREAS[area].hours;
    return hours ? `${pad2(hours.open)}:00–${pad2(hours.close % 24)}:00` : 'Always open';
  }

  /** Why you can't go into a building right now, or null. */
  enterBlocker(area: AreaId): string | null {
    if (this.isOpen(area)) return null;
    return `Closed. Open ${this.hoursLabel(area)}.`;
  }

  enter(area: AreaId): CommandResult {
    const blocked = this.enterBlocker(area);
    if (blocked) return fail(blocked);
    this.moveTo(area, 'door', 'up');
    return ok;
  }

  leave(): CommandResult {
    const exit = AREAS[this.area()].exitTo;
    if (!exit) return fail('There is no way out here.');
    this.moveTo(exit.area, exit.spawn, 'down');
    return ok;
  }

  private closeShops(now: number): void {
    const area = this.area();
    if (!AREAS[area].hours || this.isOpen(area, now) || this.sim.activity.isBusy()) return;
    this.leave();
    this.sim.events.emit('notice', { text: `${AREAS[area].name} is closing. You head back outside.`, tone: 'info' });
  }

  // ---------- Getting around ----------

  /** Minutes until the next bus leaves, or null when buses aren't running. */
  nextBus(now = this.sim.state.clock.totalMinutes): number | null {
    const { headway, firstHour, lastHour } = TRANSIT.bus;
    const dayStart = now - (now % MINUTES_PER_DAY);
    const minuteOfDay = now - dayStart;
    const first = firstHour * 60;
    const last = lastHour * 60 - headway;
    if (minuteOfDay > last) return dayStart + MINUTES_PER_DAY + first - now; // first bus tomorrow
    if (minuteOfDay < first) return first - minuteOfDay;
    return (headway - (minuteOfDay % headway)) % headway;
  }

  rideFare(now = this.sim.state.clock.totalMinutes): Cents {
    const { base, perTrip, surge } = TRANSIT.ride;
    return Math.round(((base + perTrip) * surge(toCalendar(now).hour)) / 25) * 25;
  }

  /** What a trip costs and how long it takes, or why it isn't possible. */
  quote(to: Destination, mode: TravelMode): { price: Cents; minutes: number } | { error: string } {
    const here = this.area();
    if (this.sim.activity.isBusy()) return { error: 'You are busy.' };
    if (to === 'home' && here === 'apartment') return { error: "You're already home." };
    if (to !== 'home' && this.district() === to && AREAS[here].outdoors) return { error: `You're already in ${DISTRICTS[to].name}.` };
    const target: DistrictId = to === 'home' ? 'eastside' : to;
    const crossTown = target !== this.district();
    if (mode === 'bus' || mode === 'walk') {
      if (!AREAS[here].outdoors) return { error: 'Head outside first.' };
      if (!crossTown) return { error: 'You are already in this district.' };
    }
    if (mode === 'bus') {
      const wait = this.nextBus();
      if (wait === null) return { error: 'No buses right now.' };
      return { price: TRANSIT.bus.fare, minutes: wait + TRANSIT.bus.rideMinutes };
    }
    if (mode === 'walk') return { price: 0, minutes: TRANSIT.walk.minutes };
    const ride = crossTown ? TRANSIT.ride.rideMinutes : 4;
    return { price: this.rideFare(), minutes: Math.round((TRANSIT.ride.pickupMinutes.min + TRANSIT.ride.pickupMinutes.max) / 2) + ride };
  }

  private travel(to: Destination, mode: TravelMode): CommandResult {
    const q = this.quote(to, mode);
    if ('error' in q) return fail(q.error);
    if (this.sim.state.player.cash < q.price) return fail(`Card declined. The trip costs ${formatMoney(q.price)}.`);
    let minutes = q.minutes;
    if (mode === 'ride') {
      const { min, max } = TRANSIT.ride.pickupMinutes;
      minutes = minutes - Math.round((min + max) / 2) + nextInt(this.sim.state.rng, min, max);
    }
    const where = to === 'home' ? 'home' : DISTRICTS[to].name;
    if (q.price > 0) this.sim.economy.record(-q.price, `${mode === 'bus' ? BRANDS.transit : BRANDS.rideshare}: trip to ${where}`, 'transport');
    if (mode === 'walk') this.sim.needs.change({ energy: -TRANSIT.walk.energy });
    const now = this.sim.state.clock.totalMinutes;
    const label = mode === 'walk' ? `Walking to ${where}` : mode === 'bus' ? `Bus to ${where}` : `${TRAVEL_MODE_NAMES.ride} to ${where}`;
    this.sim.state.activity = { kind: 'traveling', startedAt: now, until: now + minutes, mode, to, label };
    this.sim.state.clock.paused = false;
    this.sim.events.emit('activityChanged', { activity: this.sim.state.activity });
    return ok;
  }

  private arrive(): void {
    const a = this.sim.state.activity;
    if (a?.kind !== 'traveling') return;
    this.sim.state.activity = null;
    this.sim.events.emit('activityChanged', { activity: null });
    if (a.to === 'home') {
      // Rides drop you at the curb; bus and walking bring you to the street, then you walk in.
      if (a.mode === 'ride') this.moveTo('apartment', 'door', 'up');
      else this.moveTo('eastside', ARRIVAL_SPAWN[a.mode]);
    } else {
      this.moveTo(a.to, ARRIVAL_SPAWN[a.mode]);
    }
  }

  // ---------- Shops ----------

  items(shop: Shop): ShopItem[] {
    return SHOP_ITEMS[shop];
  }

  private buy(shop: Shop, itemId: string): CommandResult {
    const item = SHOP_ITEMS[shop].find((i) => i.id === itemId);
    if (!item) return fail('Unknown item.');
    if (this.area() !== shop) return fail(`You need to be at ${SHOP_NAMES[shop]}.`);
    if (!this.isOpen(shop)) return fail('The shop is closed.');
    if (this.sim.activity.isBusy()) return fail('You are busy.');
    if (item.consume) {
      const c = item.consume;
      if ((c.food ?? 0) > 0 && !c.energy && this.sim.state.needs.food >= 95) return fail("You're full.");
      if ((c.energy ?? 0) > 0 && !c.food && this.sim.state.needs.energy >= 95) return fail("You're already wired.");
    }
    if (this.sim.state.player.cash < item.price) return fail(`Card declined. ${item.name} costs ${formatMoney(item.price)}.`);
    this.sim.economy.record(-item.price, `${SHOP_NAMES[shop]}: ${item.name}`, 'food');
    if (item.adds) {
      const fridge = this.sim.state.home.fridge;
      for (const [k, v] of Object.entries(item.adds) as [FridgeItem, number][]) fridge[k] += v;
      this.sim.events.emit('fridgeChanged', { fridge });
      this.sim.events.emit('notice', { text: `Bought ${item.name.toLowerCase()}. It's in your fridge when you get home.`, tone: 'good' });
    }
    if (item.consume) {
      const c = item.consume;
      this.sim.needs.change({ food: c.food ?? 0, energy: c.energy ?? 0, mood: c.mood ?? 0 });
      this.sim.clock.skip(c.minutes);
      this.sim.events.emit('notice', { text: `${item.name} (${c.minutes} min)`, tone: 'info' });
    }
    return ok;
  }
}
