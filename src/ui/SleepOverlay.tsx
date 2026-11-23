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
  if (a?.kind !== 'sleeping') return null;
  const now = toCalendar(sim.state.clock.totalMinutes);
  const until = toCalendar(a.until);

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
