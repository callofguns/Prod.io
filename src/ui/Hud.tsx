import { useEffect, useState } from 'preact/hooks';
import type { Session } from '../app/Session';
import { formatMoney } from '../sim/core/money';
import { SPEEDS, formatClock, pad2, toCalendar, type Speed } from '../sim/core/time';
import { useBridge, useSimEvents } from './hooks/useSim';
import { Lcd } from './components/Lcd';
import { PauseGlyph, PlayGlyph } from './components/Glyphs';
import { DebugPanel } from './DebugPanel';

const SPEED_KEYS: Record<string, Speed> = { Digit1: 1, Digit2: 2, Digit3: 4 };

function TransportBar({ session }: { session: Session }) {
  const { sim } = session;
  useSimEvents(sim, ['minute', 'speedChanged', 'cashChanged']);
  const { totalMinutes, speed, paused } = sim.state.clock;
  const t = toCalendar(totalMinutes);
  const clock = `${t.weekday.toUpperCase()} ${formatClock(t)}`;
  const date = `DAY ${t.day} · ${t.month.toUpperCase()} ${pad2(t.date)} ${t.year}`;

  return (
    <div class="transport chassis screws interactive">
      <div class="group">
        <p class="silk">Time</p>
        <Lcd text={clock} label="Time" class={`clock ${paused ? 'paused' : ''}`}>
          <div class="lcd-sub">{date}</div>
        </Lcd>
      </div>
      <div class="group">
        <p class="silk">Speed</p>
        <div class="keys">
          <button
            class="key rec"
            aria-pressed={paused}
            aria-label="Pause (Space)"
            title="Pause (Space)"
            onClick={() => sim.dispatch('togglePause', {})}
          >
            <span class="led" />
            <PauseGlyph />
          </button>
          {SPEEDS.map((s, i) => (
            <button
              key={s}
              class="key"
              aria-pressed={!paused && speed === s}
              aria-label={`Play at ${s}x speed (${i + 1})`}
              title={`${s}x speed (${i + 1})`}
              onClick={() => sim.dispatch('setSpeed', { speed: s })}
            >
              <span class="led" />
              <PlayGlyph count={i + 1} />
            </button>
          ))}
        </div>
      </div>
      <div class="group">
        <p class="silk">Balance</p>
        <Lcd text={formatMoney(sim.state.player.cash)} label="Balance" class="cash" />
      </div>
    </div>
  );
}

function Prompt({ session }: { session: Session }) {
  useBridge(session.bridge);
  const prompt = session.bridge.prompt;
  if (!prompt) return null;
  return (
    <div class="prompt chassis" key={prompt.id}>
      <span class="cap">E</span>
      {prompt.label}
    </div>
  );
}

function Toasts({ session }: { session: Session }) {
  useBridge(session.bridge);
  return (
    <div class="toasts" aria-live="polite">
      {session.bridge.toasts.map((t) => (
        <div key={t.id} class={`toast lcd ${t.tone}`}>{t.text}</div>
      ))}
    </div>
  );
}

function Hints() {
  return (
    <div class="hints" aria-hidden="true">
      <span><span class="cap">WASD</span> Walk</span>
      <span><span class="cap">E</span> Interact</span>
      <span><span class="cap">Space</span> Pause</span>
      <span><span class="cap">1</span><span class="cap">2</span><span class="cap">3</span> Speed</span>
      <span><span class="cap">`</span> Debug</span>
    </div>
  );
}

export function Hud({ session, onQuitToTitle }: { session: Session; onQuitToTitle: () => void }) {
  const [debugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const onButton = e.target instanceof HTMLButtonElement;
      if (e.code === 'Space' && !onButton) {
        e.preventDefault();
        session.sim.dispatch('togglePause', {});
      } else if (e.code in SPEED_KEYS) {
        session.sim.dispatch('setSpeed', { speed: SPEED_KEYS[e.code]! });
      } else if (e.code === 'Backquote') {
        setDebugOpen((open) => !open);
      }
    };
    // A mouse click leaves focus on the button, which would swallow Space.
    // Drop that focus after pointer clicks; keyboard focus is untouched.
    const onPointerUp = () => {
      const el = document.activeElement;
      if (el instanceof HTMLButtonElement) el.blur();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [session]);

  return (
    <>
      <TransportBar session={session} />
      <Toasts session={session} />
      <Prompt session={session} />
      <Hints />
      {debugOpen && <DebugPanel session={session} onQuitToTitle={onQuitToTitle} onClose={() => setDebugOpen(false)} />}
    </>
  );
}
