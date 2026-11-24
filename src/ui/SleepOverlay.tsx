import type { Session } from '../app/Session';
import { formatClock, toCalendar } from '../sim/core/time';
import { useSimEvents } from './hooks/useSim';
import { Lcd } from './components/Lcd';
import { Meter } from './components/Meter';

/** Shown while the player sleeps: the clock races ahead until wake-up time. */
export function SleepOverlay({ session }: { session: Session }) {
  const { sim } = session;
  useSimEvents(sim, ['minute', 'activityChanged']);
  const a = sim.state.activity;
  if (!a) return null;
  const now = toCalendar(sim.state.clock.totalMinutes);
  const until = toCalendar(a.until);

  if (a.kind === 'studying') {
    const progress = Math.min(1, (sim.state.clock.totalMinutes - a.startedAt) / Math.max(1, a.until - a.startedAt));
    return (
      <div class="sleep producing interactive">
        <div class="sleep-unit chassis screws">
          <p class="silk">Studying</p>
          <p class="study-label">{a.label}</p>
          <Lcd text={`${formatClock(now)} > ${formatClock(until)}`} class="sleep-lcd" label={`Studying until ${formatClock(until)}`} />
          <Meter label="Progress" value={progress * 100} low={0} />
          <Meter label="Energy" value={sim.state.needs.energy} />
          <p class="menu-note">Taking notes and practising. Time is fast-forwarding.</p>
        </div>
      </div>
    );
  }

  if (a.kind === 'producing') {
    const progress = Math.min(1, (sim.state.clock.totalMinutes - a.startedAt) / Math.max(1, a.until - a.startedAt));
    return (
      <div class="sleep producing interactive">
        <div class="sleep-unit chassis screws">
          <p class="silk">Finishing "{a.beatTitle}"</p>
          <Lcd text={`${formatClock(now)} > ${formatClock(until)}`} class="sleep-lcd" label={`Working until ${formatClock(until)}`} />
          <Meter label="Progress" value={progress * 100} low={0} />
          <Meter label="Energy" value={sim.state.needs.energy} />
          <p class="menu-note">Arranging, mixing and bouncing. Time is fast-forwarding.</p>
        </div>
      </div>
    );
  }

  return (
    <div class="sleep interactive">
      <div class="sleep-unit chassis screws">
        <p class="silk">{a.inBed ? 'Sleeping' : 'Passed out'}</p>
        <Lcd text={`${formatClock(now)} > ${formatClock(until)}`} class="sleep-lcd" label={`Sleeping until ${formatClock(until)}`} />
        <Meter label="Energy" value={sim.state.needs.energy} />
        <button class="key wide" onClick={() => sim.dispatch('wakeUp', {})}>Wake up now</button>
      </div>
    </div>
  );
}
