import type { ComponentChildren } from 'preact';
import type { Simulation } from '../../sim/Simulation';
import { BRANDS } from '../../content/brands';
import { formatClock, toCalendar } from '../../sim/core/time';
import { useSimEvents } from '../hooks/useSim';
import { BankApp } from './BankApp';
import { MessagesApp } from './MessagesApp';
import { DashBiteApp } from './DashBiteApp';
import { ProfileApp } from './ProfileApp';
import { BeatHubApp } from './beathub/BeatHubApp';

export type AppId = 'home' | 'bank' | 'messages' | 'dashbite' | 'profile' | 'beathub';

const APPS: { id: Exclude<AppId, 'home'>; name: string; glyph: ComponentChildren }[] = [
  {
    id: 'beathub',
    name: BRANDS.beatStore,
    glyph: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v11.3A3.5 3.5 0 1 0 11 18.5V8h6V4z" /></svg>,
  },
  {
    id: 'bank',
    name: 'Bank',
    glyph: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 8v2h18V8zM5 11h3v7H5zm5.5 0h3v7h-3zM16 11h3v7h-3zM3 19h18v2H3z" /></svg>,
  },
  {
    id: 'dashbite',
    name: BRANDS.delivery,
    glyph: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16l-1.5 11h-13zM8 9V7a4 4 0 0 1 8 0v2h-2V7a2 2 0 0 0-4 0v2z" /></svg>,
  },
  {
    id: 'profile',
    name: 'Profile',
    glyph: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" /></svg>,
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
  onError: (message: string) => void;
}

export function Phone({ sim, app, onOpenApp, onClose, onError }: Props) {
  useSimEvents(sim, ['minute', 'inboxChanged', 'offersChanged']);
  const t = toCalendar(sim.state.clock.totalMinutes);
  const unread = sim.messages.unreadCount();
  const offers = sim.state.beathub.offers.filter((o) => o.status === 'open').length;
  const badges: Partial<Record<AppId, number>> = { messages: unread, beathub: offers };
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
                    {(badges[a.id] ?? 0) > 0 && <span class="app-badge">{badges[a.id]}</span>}
                  </span>
                  {a.name}
                </button>
              ))}
            </div>
          )}
          {app === 'bank' && <BankApp sim={sim} onError={onError} />}
          {app === 'dashbite' && <DashBiteApp sim={sim} onError={onError} />}
          {app === 'profile' && <ProfileApp sim={sim} />}
          {app === 'beathub' && <BeatHubApp sim={sim} onError={onError} />}
          {app === 'messages' && <MessagesApp sim={sim} />}
        </div>
      </div>
      <button class="phone-home" aria-label="Close phone (P)" title="Close phone (P)" onClick={onClose} />
    </aside>
  );
}
