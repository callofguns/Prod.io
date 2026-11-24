import type { Simulation, System } from '../Simulation';
import { fail, type CommandResult } from '../core/commands';
import { NEEDS } from '../../content/living';
import type { SleepPlan } from './ActivitySystem';
import type { Meal } from './HomeSystem';

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
        };
      case 'door':
        return { leave: { label: 'Leave the apartment', check: () => 'The city opens in Milestone 2.', run: () => fail('Not yet') } };
      default:
        return {};
    }
  }
}
