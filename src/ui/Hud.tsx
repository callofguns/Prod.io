import { useEffect, useRef, useState } from 'preact/hooks';
import type { Session } from '../app/Session';
import { formatMoney } from '../sim/core/money';
import { SPEEDS, formatClock, pad2, toCalendar, type Speed } from '../sim/core/time';
import { useBridge, useSimEvents } from './hooks/useSim';
import { Lcd } from './components/Lcd';
import { MenuGlyph, PauseGlyph, PhoneGlyph, PlayGlyph } from './components/Glyphs';
import { DebugPanel } from './DebugPanel';
import { PauseMenu } from './PauseMenu';
import { SettingsPanel } from './SettingsPanel';
import { settings } from '../app/settings';
import { Phone, type AppId } from './phone/Phone';
import { ActionMenu, performAction } from './ActionMenu';
import { SleepOverlay } from './SleepOverlay';
import { Meter } from './components/Meter';

const SPEED_KEYS: Record<string, Speed> = { Digit1: 1, Digit2: 2, Digit3: 4 };

function TransportBar({ session }: { session: Session }) {
  const { sim } = session;
  useSimEvents(sim, ['minute', 'speedChanged', 'cashChanged', 'needsChanged']);
  const needs = sim.state.needs;
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
        <p class="silk">Levels</p>
        <div class="levels">
          <Meter label="Energy" value={needs.energy} />
          <Meter label="Food" value={needs.food} />
          <Meter label="Mood" value={needs.mood} />
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
  if (!prompt || session.bridge.actionsFor) return null;
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
      <span><span class="cap">P</span> Phone</span>
      <span><span class="cap">Esc</span> Menu</span>
      <span><span class="cap">`</span> Debug</span>
    </div>
  );
}

type Menu = 'none' | 'pause' | 'settings';

export function Hud({ session, onQuitToTitle }: { session: Session; onQuitToTitle: () => void }) {
  const [debugOpen, setDebugOpen] = useState(false);
  const [menu, setMenuState] = useState<Menu>('none');
  const [showHints, setShowHints] = useState(settings.get().showHints);
  const menuRef = useRef<Menu>('none');
  const [phoneApp, setPhoneApp] = useState<AppId | null>(null);
  const phoneRef = useRef<AppId | null>(null);
  const setPhone = (app: AppId | null) => {
    phoneRef.current = app;
    setPhoneApp(app);
  };
  useSimEvents(session.sim, ['inboxChanged']);
  const unread = session.sim.messages.unreadCount();
  /** Whether the clock was already paused before the menu opened, so Resume restores it. */
  const wasPaused = useRef(false);

  const setMenu = (next: Menu) => {
    const { sim } = session;
    if (menuRef.current === 'none' && next !== 'none') {
      wasPaused.current = sim.state.clock.paused;
      sim.dispatch('setPaused', { paused: true });
    } else if (menuRef.current !== 'none' && next === 'none') {
      sim.dispatch('setPaused', { paused: wasPaused.current });
    }
    menuRef.current = next;
    setMenuState(next);
  };

  const quit = async () => {
    await session.autosaver.saveNow();
    session.stop();
    onQuitToTitle();
  };

  useEffect(() => settings.subscribe((s) => setShowHints(s.showHints)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const actionsFor = session.bridge.actionsFor;
      if (actionsFor && menuRef.current === 'none') {
        if (e.code === 'Escape') {
          e.preventDefault();
          session.bridge.openActions(null);
          return;
        }
        const n = /^Digit([1-9])$/.exec(e.code)?.[1];
        if (n) {
          const option = session.sim.actions.list(actionsFor)[Number(n) - 1];
          if (option && !option.disabled) performAction(session, actionsFor, option.id);
          return;
        }
      }
      if (e.code === 'Escape' && phoneRef.current && menuRef.current === 'none') {
        e.preventDefault();
        setPhone(null);
        return;
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        setMenu(menuRef.current === 'settings' ? 'pause' : menuRef.current === 'pause' ? 'none' : 'pause');
        return;
      }
      if (menuRef.current !== 'none') return;
      const onButton = e.target instanceof HTMLButtonElement;
      if (e.code === 'Space' && !onButton) {
        e.preventDefault();
        session.sim.dispatch('togglePause', {});
      } else if (e.code in SPEED_KEYS) {
        session.sim.dispatch('setSpeed', { speed: SPEED_KEYS[e.code]! });
      } else if (e.code === 'Backquote') {
        setDebugOpen((open) => !open);
      } else if (e.code === 'KeyP') {
        setPhone(phoneRef.current ? null : 'home');
      }
    };
    // A mouse click leaves focus on the button, which would swallow Space.
    // Drop that focus after pointer clicks; keyboard focus is untouched.
    const onPointerUp = () => {
      const el = document.activeElement;
      if (el instanceof HTMLButtonElement) el.blur();
    };
    const onBlur = () => {
      if (settings.get().pauseOnBlur && menuRef.current === 'none') setMenu('pause');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('blur', onBlur);
    };
    // setMenu only touches refs and stable setters.
  }, [session]);

  return (
    <>
      <TransportBar session={session} />
      <button class="key menu-button interactive" aria-label="Pause menu (Esc)" title="Pause menu (Esc)" onClick={() => setMenu('pause')}>
        <MenuGlyph />
      </button>
      <button class="key phone-button interactive" aria-label={`Phone (P)${unread ? `, ${unread} unread` : ''}`}
        title="Phone (P)" onClick={() => setPhone(phoneApp ? null : 'home')}>
        <PhoneGlyph />
        {unread > 0 && <span class="phone-badge">{unread}</span>}
      </button>
      {phoneApp && menu === 'none' && (
        <Phone sim={session.sim} app={phoneApp} onOpenApp={setPhone} onClose={() => setPhone(null)}
          onError={(msg) => session.bridge.toast(msg, 'bad')} />
      )}
      <Toasts session={session} />
      {menu === 'none' && <Prompt session={session} />}
      {menu === 'none' && <ActionMenu session={session} />}
      <SleepOverlay session={session} />
      {showHints && <Hints />}
      {debugOpen && menu === 'none' && <DebugPanel session={session} onQuitToTitle={onQuitToTitle} onClose={() => setDebugOpen(false)} />}
      {menu !== 'none' && (
        <div class="backdrop interactive" onClick={(e) => e.target === e.currentTarget && setMenu(menu === 'settings' ? 'pause' : 'none')}>
          {menu === 'pause' && (
            <PauseMenu session={session} onResume={() => setMenu('none')} onSettings={() => setMenu('settings')} onQuit={quit} />
          )}
          {menu === 'settings' && <SettingsPanel onClose={() => setMenu('pause')} />}
        </div>
      )}
    </>
  );
}
