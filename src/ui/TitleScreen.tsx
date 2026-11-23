import { useEffect, useState } from 'preact/hooks';
import { readSave, type SaveRecord } from '../save/SaveStore';
import { formatMoney } from '../sim/core/money';
import { formatClock, toCalendar } from '../sim/core/time';
import type { GameState } from '../sim/core/state';
import { Lcd } from './components/Lcd';
import { SettingsPanel } from './SettingsPanel';
import { APP_VERSION } from '../version';

type Load = { status: 'loading' } | { status: 'ready'; save: SaveRecord | null } | { status: 'error'; message: string };

function describe(save: SaveRecord): string {
  const t = toCalendar(save.state.clock.totalMinutes);
  const when = new Date(save.savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  return `Day ${t.day}, ${t.weekday} ${formatClock(t)} · ${formatMoney(save.state.player.cash)} · saved ${when}`;
}

interface Props {
  onContinue: (state: GameState) => void;
  onNewGame: () => void;
}

export function TitleScreen({ onContinue, onNewGame }: Props) {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [confirming, setConfirming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    readSave()
      .then((save) => setLoad({ status: 'ready', save }))
      .catch((err: unknown) => setLoad({ status: 'error', message: err instanceof Error ? err.message : String(err) }));
  }, []);

  const save = load.status === 'ready' ? load.save : null;
  const hasBlockingSave = save !== null || load.status === 'error';


  return (
    <div class="screen">
      <main class="title-unit chassis screws">
        <p class="silk">Prod.io · {APP_VERSION}</p>
        <Lcd text="PROD.IO" class="hero" label="Prod.io" />
        <h1 class="tagline">Bedroom beats to a music empire.</h1>
        <p class="lede">
          Early beta. Start in a one-room apartment with a laptop and a little cash. New parts of
          the game arrive one update at a time.
        </p>

        {!confirming && (
          <div class="actions">
            {save && (
              <button class="key wide" autoFocus onClick={() => onContinue(save.state)}>
                Continue
              </button>
            )}
            <button
              class={`key wide ${save ? 'light' : ''}`}
              disabled={load.status === 'loading'}
              onClick={() => (hasBlockingSave ? setConfirming(true) : onNewGame())}
            >
              New game
            </button>
            <button class="key wide light" onClick={() => setShowSettings(true)}>Settings</button>
          </div>
        )}

        {save && !confirming && <p class="save-info">{describe(save)}</p>}
        {load.status === 'error' && <p class="error">{load.message}</p>}

        {confirming && (
          <div class="confirm">
            <p>
              A new game replaces your current save{save ? ` (Day ${toCalendar(save.state.clock.totalMinutes).day})` : ''} as
              soon as you create your character. Prod.io keeps one save per playthrough, so this can't be undone.
            </p>
            <div class="actions">
              <button class="key wide danger" onClick={onNewGame}>Start a new game</button>
              <button class="key wide light" autoFocus onClick={() => setConfirming(false)}>Keep my save</button>
            </div>
          </div>
        )}
      </main>
      {showSettings && (
        <div class="backdrop interactive" onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}>
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </div>
      )}
    </div>
  );
}
