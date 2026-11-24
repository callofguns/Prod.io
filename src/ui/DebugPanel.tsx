import { useState } from 'preact/hooks';
import type { Session } from '../app/Session';
import { dollars, formatMoney } from '../sim/core/money';
import { MINUTES_PER_DAY, START_MINUTE, formatClock, toCalendar } from '../sim/core/time';
import { deleteSave } from '../save/SaveStore';
import { useSimEvents } from './hooks/useSim';
import { backgroundById } from '../content/backgrounds';

function savedAgo(ts: number | null): string {
  if (ts === null) return 'Not this session';
  const s = Math.round((Date.now() - ts) / 1000);
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`;
}

interface Props {
  session: Session;
  onClose: () => void;
  onQuitToTitle: () => void;
}

/** Playtest cheats. Toggled with the backtick key. */
export function DebugPanel({ session, onClose, onQuitToTitle }: Props) {
  const { sim, autosaver, bridge } = session;
  useSimEvents(sim, ['minute', 'cashChanged', 'speedChanged', 'needsChanged']);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { state } = sim;
  const t = toCalendar(state.clock.totalMinutes);
  const loc = state.player.location;

  const addCash = (amount: number) => sim.dispatch('debugAddCash', { amount: dollars(amount) });
  const skipToMorning = () => {
    const minuteOfDay = state.clock.totalMinutes % MINUTES_PER_DAY;
    const wait = (START_MINUTE - minuteOfDay + MINUTES_PER_DAY) % MINUTES_PER_DAY || MINUTES_PER_DAY;
    sim.dispatch('debugSkipMinutes', { minutes: wait });
  };

  return (
    <aside class="debug chassis screws interactive" aria-label="Debug panel">
      <h2>
        Debug <button class="key light wide" onClick={onClose}>Close</button>
      </h2>

      <section>
        <p class="silk">Money</p>
        <div class="row">
          <button class="key wide" onClick={() => addCash(100)}>+$100</button>
          <button class="key wide" onClick={() => addCash(1_000)}>+$1,000</button>
          <button class="key wide" onClick={() => addCash(10_000)}>+$10,000</button>
        </div>
      </section>

      <section>
        <p class="silk">Time</p>
        <div class="row">
          <button class="key wide" onClick={() => sim.dispatch('debugSkipMinutes', { minutes: 60 })}>Skip 1 hour</button>
          <button class="key wide" onClick={skipToMorning}>Skip to 8:00</button>
          <button class="key wide" onClick={() => sim.dispatch('debugSkipMinutes', { minutes: 7 * MINUTES_PER_DAY })}>Skip 1 week</button>
        </div>
      </section>

      <section>
        <p class="silk">Needs</p>
        <div class="row">
          <button class="key wide" onClick={() => sim.dispatch('debugSetNeeds', { energy: 15 })}>Tired</button>
          <button class="key wide" onClick={() => sim.dispatch('debugSetNeeds', { food: 10 })}>Hungry</button>
          <button class="key wide" onClick={() => sim.dispatch('debugSetNeeds', { energy: 100, food: 100, mood: 100 })}>Refill</button>
        </div>
      </section>

      <section>
        <p class="silk">Skills</p>
        <div class="row">
          <button class="key wide" onClick={() => sim.dispatch('debugBoostSkills', { amount: 10 })}>All skills +10</button>
          <button class="key wide" onClick={() => sim.dispatch('debugBoostSkills', { amount: -10 })}>All skills −10</button>
        </div>
      </section>

      <section>
        <p class="silk">BeatHub</p>
        <div class="row">
          <button class="key wide" onClick={() => {
            const r = sim.dispatch('debugSpawnOffer', {});
            if (!r.ok) bridge.toast(r.error, 'bad');
          }}>Exclusive offer</button>
          <button class="key wide" onClick={() => sim.dispatch('debugAddBeats', { count: 5 })}>Add 5 beats</button>
        </div>
      </section>

      <section>
        <p class="silk">Save</p>
        <div class="row">
          <button
            class="key wide"
            onClick={async () => {
              await autosaver.saveNow();
              bridge.toast('Game saved.', 'good');
            }}
          >
            Save now
          </button>
          {confirmDelete ? (
            <button
              class="key wide danger"
              onClick={async () => {
                session.stop();
                await deleteSave();
                onQuitToTitle();
              }}
            >
              Confirm delete
            </button>
          ) : (
            <button class="key wide" onClick={() => setConfirmDelete(true)}>Delete save</button>
          )}
        </div>
      </section>

      <section>
        <p class="silk">State</p>
        <dl>
          <dt>Producer</dt><dd>{state.player.alias} ({state.player.name})</dd>
          <dt>Background</dt><dd>{backgroundById(state.player.background).name}</dd>
          <dt>Debt</dt><dd>{formatMoney(state.finance.debts.reduce((sum, d) => sum + d.balance, 0))}</dd>
          <dt>Needs</dt><dd>E {Math.round(state.needs.energy)} · F {Math.round(state.needs.food)} · M {Math.round(state.needs.mood)}</dd>
          <dt>Credit</dt><dd>{state.finance.credit}</dd>
          <dt>Day</dt><dd>{t.day} · {formatClock(t)}</dd>
          <dt>Game minute</dt><dd>{state.clock.totalMinutes}</dd>
          <dt>Cash</dt><dd>{formatMoney(state.player.cash)}</dd>
          <dt>Position</dt><dd>{loc.area} {loc.x},{loc.y}</dd>
          <dt>Seed</dt><dd>{state.rng.seed}</dd>
          <dt>Last saved</dt><dd>{savedAgo(autosaver.lastSavedAt)}</dd>
        </dl>
      </section>
    </aside>
  );
}
