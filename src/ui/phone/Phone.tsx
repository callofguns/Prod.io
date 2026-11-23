import type { ComponentChildren } from 'preact';
import type { Simulation } from '../../sim/Simulation';
import { BRANDS } from '../../content/brands';
import { formatClock, toCalendar } from '../../sim/core/time';
import { useSimEvents } from '../hooks/useSim';
import { BankApp } from './BankApp';
import { MessagesApp } from './MessagesApp';

export type AppId = 'home' | 'bank' | 'messages';

const APPS: { id: Exclude<AppId, 'home'>; name: string; glyph: ComponentChildren }[] = [
  {
    id: 'bank',
    name: 'Bank',
    glyph: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 8v2h18V8zM5 11h3v7H5zm5.5 0h3v7h-3zM16 11h3v7h-3zM3 19h18v2H3z" /></svg>,
  },
  {
    id: 'messages',
    name: 'Messages',
    glyph: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v13H8l-5 4z" /></svg>,
  },
];

interface Props {
  sim: Simulation;
  app: AppId;
  onOpenApp: (app: AppId) => void;
  onClose: () => void;
}

export function Phone({ sim, app, onOpenApp, onClose }: Props) {
  useSimEvents(sim, ['minute', 'inboxChanged']);
  const t = toCalendar(sim.state.clock.totalMinutes);
  const unread = sim.messages.unreadCount();
  const current = APPS.find((a) => a.id === app);

  return (
    <aside class="phone interactive" aria-label="Phone">
      <div class="phone-screen">
        <div class="phone-status">
          <span>{BRANDS.carrier}</span>
          <span class="phone-clock">{formatClock(t)}</span>
        </div>
        <header class="phone-bar">
          {current ? (
            <>
              <button class="app-back" onClick={() => onOpenApp('home')}>‹ Home</button>
              <h2 class="phone-title">{current.name}</h2>
            </>
          ) : (
            <h2 class="phone-title">{t.weekday} {t.month} {t.date}</h2>
          )}
        </header>
        <div class="phone-body">
          {app === 'home' && (
            <div class="home-grid">
              {APPS.map((a) => (
                <button key={a.id} class="app-icon" onClick={() => onOpenApp(a.id)}>
                  <span class="app-tile">
                    {a.glyph}
                    {a.id === 'messages' && unread > 0 && <span class="app-badge">{unread}</span>}
                  </span>
                  {a.name}
                </button>
              ))}
            </div>
          )}
          {app === 'bank' && <BankApp sim={sim} />}
          {app === 'messages' && <MessagesApp sim={sim} />}
        </div>
      </div>
      <button class="phone-home" aria-label="Close phone (P)" title="Close phone (P)" onClick={onClose} />
    </aside>
  );
}
