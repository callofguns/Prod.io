import type { Session } from '../app/Session';
import { backgroundById } from '../content/backgrounds';
import { formatClock, toCalendar } from '../sim/core/time';
import { APP_VERSION } from '../version';
import { Lcd } from './components/Lcd';

interface Props {
  session: Session;
  onResume: () => void;
  onSettings: () => void;
  onQuit: () => void;
  onTutorial: () => void;
}

export function PauseMenu({ session, onResume, onSettings, onQuit, onTutorial }: Props) {
  const { state } = session.sim;
  const t = toCalendar(state.clock.totalMinutes);
  const saved = session.autosaver.lastSavedAt;
  const savedText = saved === null ? 'not yet this session' : new Date(saved).toLocaleTimeString(undefined, { timeStyle: 'short' });

  return (
    <section class="menu pause chassis screws interactive" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <p class="silk">Prod.io · {APP_VERSION}</p>
      <h2 id="pause-title" class="visually-hidden">Paused</h2>
      <Lcd text="PAUSED" class="pause-lcd" label="Game paused" />
      <p class="pause-who">
        <strong>{state.player.alias}</strong> · {backgroundById(state.player.background).name} · Day {t.day}, {t.weekday} {formatClock(t)}
      </p>

      <div class="pause-actions">
        <button class="key wide" autoFocus onClick={onResume}>Resume <span class="cap">Esc</span></button>
        <button class="key wide light" onClick={onSettings}>Settings</button>
        <button class="key wide light" onClick={onTutorial}>
          {session.sim.state.tutorial.status === 'active' ? 'Restart tutorial' : 'Play the tutorial'}
        </button>
        <button class="key wide light" onClick={onQuit}>Save and quit to title</button>
      </div>

      <p class="menu-note">Last saved {savedText}. The game also saves every morning and when you close the tab.</p>
    </section>
  );
}
