import type { Simulation, System } from '../Simulation';
import { ok } from '../core/commands';

/** Owns player identity and where they are. Needs and skills join in Milestone 1. */
export class PlayerSystem implements System {
  readonly id = 'player';

  constructor(sim: Simulation) {
    sim.handle('setPlayerLocation', (loc) => {
      sim.state.player.location = { ...loc };
      return ok;
    });
  }
}
