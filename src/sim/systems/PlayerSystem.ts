import type { Simulation, System } from '../Simulation';
import { fail, ok } from '../core/commands';
import { MENTOR, MENTOR_WRAP_UP } from '../../content/tutorial';

/** Owns player identity and where they are. Needs and skills join in Milestone 1. */
export class PlayerSystem implements System {
  readonly id = 'player';

  constructor(sim: Simulation) {
    sim.handle('setPlayerLocation', (loc) => {
      sim.state.player.location = { ...loc };
      return ok;
    });
    // The tutorial's progress is saved with the game; the view decides when steps are done.
    sim.handle('setTutorial', ({ status, step, baseline, finished }) => {
      if (!Number.isInteger(step) || step < 0) return fail('Bad tutorial step');
      sim.state.tutorial = { status, step, baseline: { ...baseline } };
      if (finished) sim.messages.send(MENTOR.name, MENTOR_WRAP_UP.subject, MENTOR_WRAP_UP.body);
      sim.events.emit('tutorialChanged', {});
      return ok;
    });
  }
}
