import type { Simulation, System } from '../Simulation';
import { fail, ok } from '../core/commands';

/** Cheats for playtesting. Reachable only from the debug panel. */
export class DebugSystem implements System {
  readonly id = 'debug';

  constructor(sim: Simulation) {
    sim.handle('debugAddCash', ({ amount }) => {
      if (!Number.isInteger(amount)) return fail('Amount must be whole cents');
      sim.economy.record(amount, 'Debug cash', 'debug');
      return ok;
    });
    sim.handle('debugSetNeeds', (needs) => {
      Object.assign(sim.state.needs, needs);
      sim.events.emit('needsChanged', { needs: sim.state.needs });
      return ok;
    });
    sim.handle('debugBoostSkills', ({ amount }) => {
      const skills = sim.state.player.skills;
      for (const id of Object.keys(skills) as (keyof typeof skills)[]) skills[id] = Math.max(0, Math.min(100, skills[id] + amount));
      sim.events.emit('skillsChanged', { skills });
      return ok;
    });
    sim.handle('debugSkipMinutes', ({ minutes }) => {
      if (!Number.isInteger(minutes) || minutes < 1) return fail('Minutes must be a positive whole number');
      sim.clock.skip(minutes);
      return ok;
    });
  }
}
