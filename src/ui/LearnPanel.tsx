import { useEffect } from 'preact/hooks';
import type { Session } from '../app/Session';
import { BRANDS } from '../content/brands';
import { TUTORIAL } from '../content/learning';
import { SKILLS } from '../content/skills';
import { formatMoney } from '../sim/core/money';
import { useSimEvents } from './hooks/useSim';

interface Props {
  session: Session;
  onClose: () => void;
  /** Called after a tutorial or course session starts. */
  onStarted: () => void;
}

/** Study at the computer: free tutorials (up to a basic level) and paid courses. */
export function LearnPanel({ session, onClose, onStarted }: Props) {
  const { sim, bridge } = session;
  useSimEvents(sim, ['learningChanged', 'cashChanged', 'skillsChanged']);
  const skills = sim.state.player.skills;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const run = (result: { ok: true } | { ok: false; error: string }, started = true) => {
    if (!result.ok) bridge.toast(result.error, 'bad');
    else if (started) onStarted();
  };

  return (
    <section class="menu learn chassis screws interactive" role="dialog" aria-modal="true" aria-labelledby="learn-title">
      <p class="silk">Computer · Study</p>
      <h2 id="learn-title" class="menu-title">Learn</h2>

      <p class="silk menu-group">Free tutorials · {BRANDS.video}</p>
      <p class="menu-note">One hour each. Good for the basics; they stop helping once a skill reaches {TUTORIAL.maxSkill}.</p>
      <ul class="learn-skills">
        {SKILLS.map((s) => {
          const blocked = sim.skills.tutorialBlocker(s.id);
          return (
            <li key={s.id} class="learn-skill">
              <span class="learn-skill-name">{s.name}</span>
              <span class="learn-level">{Math.floor(skills[s.id])}</span>
              <button class="key wide" disabled={!!blocked} title={blocked ?? undefined}
                onClick={() => run(sim.dispatch('startTutorial', { skill: s.id }))}>
                {skills[s.id] >= TUTORIAL.maxSkill ? 'Maxed' : `Watch · +${sim.skills.tutorialGain(s.id).toFixed(1)}`}
              </button>
            </li>
          );
        })}
      </ul>

      <p class="silk menu-group">Courses · {BRANDS.courses}</p>
      <p class="menu-note">Paid once, then taken in 2-hour sessions whenever you like. Above a course's level range it teaches a quarter as much.</p>
      <ul class="courses">
        {sim.skills.catalogue().map((c) => {
          const owned = sim.skills.owned(c.id);
          const done = owned && owned.sessionsDone >= c.sessions;
          const skillName = SKILLS.find((s) => s.id === c.skill)!.name;
          return (
            <li key={c.id} class={`course ${owned ? 'owned' : ''}`}>
              <div class="course-main">
                <span class="course-name">{c.name}</span>
                <span class="course-meta">{skillName} · levels {c.minSkill}-{c.maxSkill} · {c.sessions} sessions</span>
                <span class="course-blurb">{c.blurb}</span>
              </div>
              <div class="course-side">
                {owned && <span class="course-progress">{owned.sessionsDone}/{c.sessions} done</span>}
                {!owned && (
                  <button class="key wide" onClick={() => run(sim.dispatch('buyCourse', { courseId: c.id }), false)}>
                    Buy · {formatMoney(c.price)}
                  </button>
                )}
                {owned && !done && (
                  <button class="key wide" onClick={() => run(sim.dispatch('startCourseSession', { courseId: c.id }))}>
                    Session · +{sim.skills.courseGain(c).toFixed(1)}
                  </button>
                )}
                {done && <span class="course-done">Completed</span>}
              </div>
            </li>
          );
        })}
      </ul>

      <div class="menu-actions">
        <span class="menu-note">Balance {formatMoney(sim.state.player.cash)}</span>
        <button class="key wide" autoFocus onClick={onClose}>Close <span class="cap">Esc</span></button>
      </div>
    </section>
  );
}
