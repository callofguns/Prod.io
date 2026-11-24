import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
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
import { BeatMaker } from './daw/BeatMaker';
import { LearnPanel } from './LearnPanel';
import { GearStore } from './GearStore';
import { TutorialGuide } from './TutorialGuide';
import { BeatReport } from './BeatReport';
import { Meter } from './components/Meter';
import { Joystick } from './Joystick';
import { PORTRAIT_PHONE, isTouch, onMediaChange } from '../app/device';

const SPEED_KEYS: Record<string, Speed> = { Digit1: 1, Digit2: 2, Digit3: 4 };

function TransportBar({ session, innerRef }: { session: Session; innerRef: { current: HTMLDivElement | null } }) {
  const { sim } = session;
  useSimEvents(sim, ['minute', 'speedChanged', 'cashChanged', 'needsChanged']);
  const needs = sim.state.needs;
  const { totalMinutes, speed, paused } = sim.state.clock;
  const t = toCalendar(totalMinutes);
  const clock = `${t.weekday.toUpperCase()} ${formatClock(t)}`;
  const date = `DAY ${t.day} · ${t.month.toUpperCase()} ${pad2(t.date)} ${t.year}`;

  return (
    <div class="transport chassis screws interactive" ref={innerRef}>
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

/** What you can use right here. Press E, or tap it. */
function Prompt({ session }: { session: Session }) {
  useBridge(session.bridge);
  const { bridge, sim } = session;
  const prompt = bridge.prompt;
  if (!prompt || bridge.actionsFor) return null;
  return (
    <button
      class="prompt chassis interactive"
      key={prompt.id}
      onClick={() => {
        if (!sim.state.clock.paused && !sim.activity.isBusy()) bridge.openActions(prompt.id);
      }}
    >
      <span class="cap key-only">E</span>
      {prompt.label}
    </button>
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

function Hints({ innerRef, joystick }: { innerRef: { current: HTMLDivElement | null }; joystick: boolean }) {
  if (isTouch()) {
    return (
      <div class="hints touch" ref={innerRef} aria-hidden="true">
        <span>{joystick ? 'Drag the stick to walk' : 'Tap the ground to walk'}</span>
        <span>Tap things to use them</span>
      </div>
    );
  }
  return (
    <div class="hints" ref={innerRef} aria-hidden="true">
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

type Menu = 'none' | 'pause' | 'settings' | 'daw' | 'learn' | 'report' | 'gear';
/** Full-screen panels that handle their own keys. */
const SELF_KEYED: Menu[] = ['daw', 'learn', 'report', 'gear'];

export function Hud({ session, onQuitToTitle }: { session: Session; onQuitToTitle: () => void }) {
  const [debugOpen, setDebugOpen] = useState(false);
  const [menu, setMenuState] = useState<Menu>('none');
  const [prefs, setPrefs] = useState(settings.get());
  const showHints = prefs.showHints;
  const transportRef = useRef<HTMLDivElement | null>(null);
  const hintsRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<Menu>('none');
  const [phoneApp, setPhoneApp] = useState<AppId | null>(null);
  const phoneRef = useRef<AppId | null>(null);
  const setPhone = (app: AppId | null) => {
    phoneRef.current = app;
    setPhoneApp(app);
    session.bridge.setUi({ phoneApp: app });
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
    session.bridge.setUi({ menu: next, ...(next === 'daw' ? {} : { daw: null }) });
  };

  const quit = async () => {
    await session.autosaver.saveNow();
    session.stop();
    onQuitToTitle();
  };

  useEffect(() => settings.subscribe(setPrefs), []);

  // Tell the world camera how much of the screen the HUD covers.
  useLayoutEffect(() => {
    const measure = () => {
      const top = transportRef.current ? transportRef.current.getBoundingClientRect().bottom + 6 : 0;
      const hints = hintsRef.current?.getBoundingClientRect();
      // Hints only reserve space when they sit along the bottom (on phones they move to the top-left).
      const bottom = hints && hints.height > 0 && hints.top > window.innerHeight / 2 ? Math.max(0, window.innerHeight - hints.top + 4) : 0;
      session.bridge.setHudInsets(Math.round(top), Math.round(bottom));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (transportRef.current) ro.observe(transportRef.current);
    if (hintsRef.current) ro.observe(hintsRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [session, showHints]);

  // Turning a phone upright shows the rotate notice; pause the game behind it.
  useEffect(() => onMediaChange(PORTRAIT_PHONE, (portrait) => {
    if (portrait && menuRef.current === 'none') setMenu('pause');
  }), [session]);
  const [reportBeatId, setReportBeatId] = useState<number | null>(null);
  useEffect(() => {
    const { events } = session.sim;
    const offs = [
      events.on('studioRequested', () => {
        setPhone(null);
        setMenu('daw');
      }),
      events.on('learnRequested', () => {
        setPhone(null);
        setMenu('learn');
      }),
      events.on('shopRequested', () => {
        setPhone(null);
        setMenu('gear');
      }),
      events.on('beatFinished', ({ beat }) => {
        setReportBeatId(beat.id);
        setMenu('report');
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [session]);
  const reportBeat = session.sim.state.studio.beats.find((b) => b.id === reportBeatId) ?? null;
  /** Starting work from a panel runs the clock, so don't restore an earlier pause. */
  const closeIntoWork = () => {
    wasPaused.current = false;
    setMenu('none');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (SELF_KEYED.includes(menuRef.current)) return; // these panels handle their own keys
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
      // In the beat maker the clock is already stopped; nothing to do.
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
      <TransportBar session={session} innerRef={transportRef} />
      <div class="corner-keys interactive">
        <button class="key menu-button" aria-label="Pause menu (Esc)" title="Pause menu (Esc)" onClick={() => setMenu('pause')}>
          <MenuGlyph />
        </button>
        {prefs.devTools && (
          <button class="key debug-button" aria-pressed={debugOpen} aria-label="Debug panel" title="Debug panel (`)" onClick={() => setDebugOpen((o) => !o)}>
            DBG
          </button>
        )}
      </div>
      <button data-tut="phone-button" class="key phone-button interactive" aria-label={`Phone (P)${unread ? `, ${unread} unread` : ''}`}
        title="Phone (P)" onClick={() => setPhone(phoneApp ? null : 'home')}>
        <PhoneGlyph />
        {unread > 0 && <span class="phone-badge">{unread}</span>}
      </button>
      {phoneApp && menu === 'none' && (
        <Phone sim={session.sim} app={phoneApp} onOpenApp={setPhone} onClose={() => setPhone(null)}
          onError={(msg) => session.bridge.toast(msg, 'bad')} />
      )}
      <Toasts session={session} />
      {menu !== 'pause' && menu !== 'settings' && <TutorialGuide session={session} />}
      {menu === 'none' && <Prompt session={session} />}
      {menu === 'none' && <ActionMenu session={session} />}
      <SleepOverlay session={session} />
      {showHints && <Hints innerRef={hintsRef} joystick={prefs.joystick} />}
      {prefs.joystick && menu === 'none' && !phoneApp && <Joystick bridge={session.bridge} />}
      {debugOpen && menu === 'none' && <DebugPanel session={session} onQuitToTitle={onQuitToTitle} onClose={() => setDebugOpen(false)} />}
      {menu === 'daw' && (
        <div class="backdrop daw-backdrop interactive">
          <BeatMaker
            session={session}
            onClose={() => setMenu('none')}
            onFinished={closeIntoWork}
          />
        </div>
      )}
      {menu === 'learn' && (
        <div class="backdrop interactive" onClick={(e) => e.target === e.currentTarget && setMenu('none')}>
          <LearnPanel session={session} onClose={() => setMenu('none')} onStarted={closeIntoWork} />
        </div>
      )}
      {menu === 'gear' && (
        <div class="backdrop interactive" onClick={(e) => e.target === e.currentTarget && setMenu('none')}>
          <GearStore session={session} onClose={() => setMenu('none')} />
        </div>
      )}
      {menu === 'report' && reportBeat && (
        <div class="backdrop interactive">
          <BeatReport beat={reportBeat} onClose={() => setMenu('none')} />
        </div>
      )}
      {(menu === 'pause' || menu === 'settings') && (
        <div class="backdrop interactive" onClick={(e) => e.target === e.currentTarget && setMenu(menu === 'settings' ? 'pause' : 'none')}>
          {menu === 'pause' && (
            <PauseMenu session={session} onResume={() => setMenu('none')} onSettings={() => setMenu('settings')} onQuit={quit}
              onTutorial={() => { session.tutorial.begin(); setMenu('none'); }} />
          )}
          {menu === 'settings' && (
            <SettingsPanel onClose={() => setMenu('pause')} saveData={{ exportState: async () => session.sim.state }} />
          )}
        </div>
      )}
    </>
  );
}
