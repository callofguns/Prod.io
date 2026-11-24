import type { Simulation } from '../../sim/Simulation';
import { backgroundById } from '../../content/backgrounds';
import { courseById } from '../../content/learning';
import { SKILLS } from '../../content/skills';
import { gradeFor } from '../../content/quality';
import { useSimEvents } from '../hooks/useSim';

/** Who you are: background, skills (with progress to the next level) and courses. */
export function ProfileApp({ sim }: { sim: Simulation }) {
  useSimEvents(sim, ['skillsChanged', 'learningChanged', 'beatFinished']);
  const { player, learning, studio } = sim.state;
  const best = studio.beats.reduce<number | null>((m, b) => (m === null || b.quality.score > m ? b.quality.score : m), null);

  return (
    <div class="app">
      <section>
        <p class="app-label">{backgroundById(player.background).name}</p>
        <p class="profile-name">{player.alias}</p>
        <p class="app-empty">
          {player.name} · {studio.beats.length} beat{studio.beats.length === 1 ? '' : 's'} made
          {best !== null && ` · best ${best} (${gradeFor(best).grade})`}
        </p>
      </section>

      <section>
        <h3 class="app-heading">Skills</h3>
        <ul class="rows">
          {SKILLS.map((s) => {
            const v = player.skills[s.id];
            return (
              <li key={s.id} class="row skill-row">
                <span class="row-main">
                  <span class="row-title">{s.name}</span>
                  <span class="skill-track" role="meter" aria-label={`${s.name} level`}
                    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(v)}>
                    <span style={{ width: `${Math.round(v)}%` }} />
                  </span>
                </span>
                <span class="skill-level">{Math.floor(v)}</span>
              </li>
            );
          })}
        </ul>
        <p class="app-empty">Skills go from 0 to 100 and rise more slowly the higher they get. Study at your computer to speed things up.</p>
      </section>

      {learning.courses.length > 0 && (
        <section>
          <h3 class="app-heading">Courses</h3>
          <ul class="rows">
            {learning.courses.map((c) => {
              const course = courseById(c.id)!;
              return (
                <li key={c.id} class="row">
                  <span class="row-main"><span class="row-title">{course.name}</span></span>
                  <span class="row-time">{c.sessionsDone >= course.sessions ? 'Completed' : `${c.sessionsDone}/${course.sessions}`}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
