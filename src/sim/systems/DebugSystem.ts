import type { Simulation, System } from '../Simulation';
import { fail, ok } from '../core/commands';
import { pick } from '../core/rng';
import { GENRES, defaultSettings, type GenreId } from '../../content/music';
import { playerPattern } from '../debug/generatePattern';
import { rateBeat } from '../quality/rateBeat';
import { isAreaId } from '../../content/city';

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
    sim.handle('debugAddBeats', ({ count }) => {
      const studio = sim.state.studio;
      const rng = sim.state.rng;
      for (let i = 0; i < count; i++) {
        const genre = pick(rng, Object.keys(GENRES) as GenreId[]);
        const settings = defaultSettings(genre);
        const pattern = playerPattern(genre, rng);
        studio.beats.push({
          id: studio.nextBeatId,
          title: `Test beat ${studio.nextBeatId}`,
          settings,
          pattern,
          createdAt: sim.state.clock.totalMinutes,
          workMinutes: 0,
          quality: rateBeat(settings, pattern, sim.state.player.skills, 1),
          xp: {},
        });
        studio.nextBeatId++;
      }
      sim.events.emit('beathubChanged', {});
      return ok;
    });
    sim.handle('debugAddAudience', ({ followers, subscribers }) => {
      sim.state.social.insta.followers += Math.max(0, Math.round(followers));
      sim.state.social.tube.subscribers += Math.max(0, Math.round(subscribers));
      sim.events.emit('socialChanged', {});
      return ok;
    });
    sim.handle('debugGoTo', ({ area }) => {
      if (!isAreaId(area)) return fail('Unknown area');
      if (sim.activity.isBusy()) return fail('You are busy.');
      sim.city.moveTo(area, 'door');
      return ok;
    });
    sim.handle('debugSkipMinutes', ({ minutes }) => {
      if (!Number.isInteger(minutes) || minutes < 1) return fail('Minutes must be a positive whole number');
      sim.clock.skip(minutes);
      return ok;
    });
  }
}
