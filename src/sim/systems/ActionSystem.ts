import type { Simulation, System } from '../Simulation';
import { fail, type CommandResult } from '../core/commands';
import { formatMoney } from '../core/money';
import { AREAS, DISTRICTS, DOORS, TRANSIT, type DistrictId } from '../../content/city';
import { NEEDS } from '../../content/living';
import { BRANDS } from '../../content/brands';
import type { SleepPlan } from './ActivitySystem';
import type { Meal } from './HomeSystem';

const TITLES: Record<string, string> = {
  bed: 'Bed',
  fridge: 'Fridge',
  stove: 'Stove',
  computer: 'Computer',
  door: 'Front door',
  exit: 'Door',
  homeDoor: 'Your building',
  busStop: 'Bus stop',
  toMidtown: 'Road to Midtown',
  toEastside: 'Road to Eastside',
  groceryCounter: 'Checkout',
  cafeCounter: 'Counter',
  gearCounter: 'Sales counter',
};

export interface ActionOption {
  id: string;
  label: string;
  detail?: string;
  /** Present when the action can't be used right now, explaining why. */
  disabled?: string;
}

interface Def {
  label: string;
  detail?: string;
  check: () => string | null;
  run: () => CommandResult;
}

/**
 * What the player can do with each object in the world. The view asks for the
 * options when the player presses E, then performs one by id.
 */
export class ActionSystem implements System {
  readonly id = 'actions';

  constructor(private sim: Simulation) {
    sim.handle('performAction', ({ objectId, actionId }) => {
      const def = this.defs(objectId)[actionId];
      if (!def) return fail(`Nothing called ${actionId} on ${objectId}`);
      const blocked = def.check();
      if (blocked) return fail(blocked);
      return def.run();
    });
  }

  list(objectId: string): ActionOption[] {
    return Object.entries(this.defs(objectId)).map(([id, d]) => {
      const disabled = d.check();
      return { id, label: d.label, detail: d.detail, ...(disabled ? { disabled } : {}) };
    });
  }

  private defs(objectId: string): Record<string, Def> {
    const sim = this.sim;
    const fridge = sim.state.home.fridge;
    const free = () => (sim.activity.isBusy() ? 'You are busy.' : null);
    const awake = () => (sim.state.needs.energy >= NEEDS.wideAwake ? "You're wide awake." : null);
    const sleep = (plan: SleepPlan): Def['run'] => () => sim.dispatch('startSleep', { plan });
    const meal = (m: Meal): Pick<Def, 'check' | 'run'> => ({ check: () => sim.home.blocker(m), run: () => sim.dispatch('eat', { meal: m }) });

    switch (objectId) {
      case 'bed':
        return {
          until7: { label: 'Sleep until 7:00', check: awake, run: sleep({ kind: 'until', hour: 7 }) },
          until9: { label: 'Sleep until 9:00', check: awake, run: sleep({ kind: 'until', hour: 9 }) },
          eight: { label: 'Sleep 8 hours', check: awake, run: sleep({ kind: 'for', minutes: 8 * 60 }) },
          nap: { label: 'Nap 2 hours', check: awake, run: sleep({ kind: 'for', minutes: 2 * 60 }) },
        };
      case 'fridge':
        return {
          takeout: { label: 'Eat takeout', detail: `${fridge.takeout} in the fridge · 20 min`, ...meal('takeout') },
          snack: { label: 'Grab a snack', detail: `Uses 1 of ${fridge.groceries} grocery portions · 10 min`, ...meal('snack') },
          energyDrink: { label: 'Drink an energy drink', detail: `${fridge.energyDrinks} left · +25 energy`, ...meal('energyDrink') },
        };
      case 'stove':
        return {
          cook: { label: 'Cook a meal', detail: `Uses 1 of ${fridge.groceries} grocery portions · 30 min`, ...meal('cook') },
        };
      case 'computer':
        return {
          produce: {
            label: sim.state.studio.draft ? 'Keep working on your beat' : 'Make a beat',
            detail: `${sim.state.studio.beats.length} finished beat${sim.state.studio.beats.length === 1 ? '' : 's'} in your library`,
            check: () => sim.studio.blocker(),
            run: () => {
              sim.events.emit('studioRequested', {});
              return { ok: true };
            },
          },
          study: {
            label: 'Study',
            detail: `Free ${BRANDS.video} tutorials or ${BRANDS.courses} courses`,
            check: () => (sim.activity.isBusy() ? 'You are busy.' : null),
            run: () => {
              sim.events.emit('learnRequested', {});
              return { ok: true };
            },
          },
        };
      case 'door':
        return { leave: { label: 'Go outside', detail: `${DISTRICTS.eastside.name} street`, check: free, run: () => sim.city.leave() } };
      case 'exit':
        return { leave: { label: 'Go outside', check: free, run: () => sim.city.leave() } };
      case 'homeDoor':
        return { enter: { label: 'Go home', detail: 'Your studio apartment', check: free, run: () => sim.city.enter('apartment') } };
      case 'groceryDoor':
      case 'gearStoreDoor':
      case 'cafeDoor': {
        const area = DOORS[objectId]!;
        return {
          enter: {
            label: `Go into ${AREAS[area].name}`,
            detail: `Open ${sim.city.hoursLabel(area)}`,
            check: () => free() ?? sim.city.enterBlocker(area),
            run: () => sim.city.enter(area),
          },
        };
      }
      case 'busStop': {
        const to: DistrictId = sim.city.district() === 'eastside' ? 'midtown' : 'eastside';
        const q = sim.city.quote(to, 'bus');
        return {
          bus: {
            label: `Take the bus to ${DISTRICTS[to].name}`,
            detail: 'error' in q ? undefined : `${formatMoney(q.price)} · next bus in ${sim.city.nextBus()} min · about ${q.minutes} min total`,
            check: () => ('error' in q ? q.error : null),
            run: () => sim.dispatch('travel', { to, mode: 'bus' }),
          },
        };
      }
      case 'toMidtown':
      case 'toEastside': {
        const to: DistrictId = objectId === 'toMidtown' ? 'midtown' : 'eastside';
        return {
          walk: {
            label: `Walk to ${DISTRICTS[to].name}`,
            detail: `${TRANSIT.walk.minutes} min · free · a little tiring`,
            check: () => free() ?? (sim.state.needs.energy < 10 ? 'Too tired to walk that far.' : null),
            run: () => sim.dispatch('travel', { to, mode: 'walk' }),
          },
        };
      }
      case 'groceryCounter':
      case 'cafeCounter': {
        const shop = objectId === 'groceryCounter' ? 'grocery' : 'cafe';
        return Object.fromEntries(sim.city.items(shop).map((item) => [item.id, {
          label: `${item.name} · ${formatMoney(item.price)}`,
          detail: item.detail,
          check: () => free() ?? (sim.state.player.cash < item.price ? 'Not enough money.' : null),
          run: () => sim.dispatch('buyShopItem', { shop, itemId: item.id }),
        }]));
      }
      case 'gearCounter':
        return {
          browse: {
            label: 'Browse gear',
            detail: 'Computers, headphones, speakers, keyboards',
            check: free,
            run: () => {
              sim.events.emit('shopRequested', { shop: 'gear' });
              return { ok: true };
            },
          },
        };
      default:
        return {};
    }
  }

  /** Display name for an object's menu. */
  title(objectId: string): string {
    const area = DOORS[objectId];
    if (area) return AREAS[area].name;
    return TITLES[objectId] ?? objectId;
  }
}
