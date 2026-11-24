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
import { InstaSnapApp } from './InstaSnapApp';
import { ViewTubeApp } from './ViewTubeApp';
import { LoopVaultApp } from './LoopVaultApp';
import { MapsApp } from './MapsApp';

export type AppId = 'home' | 'bank' | 'messages' | 'dashbite' | 'profile' | 'beathub' | 'instasnap' | 'viewtube' | 'loopvault' | 'maps';

const APPS: { id: Exclude<AppId, 'home'>; name: string; glyph: ComponentChildren }[] = [
  {
    id: 'beathub',
    name: BRANDS.beatStore,
    glyph: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v11.3A3.5 3.5 0 1 0 11 18.5V8h6V4z" /></svg>,
  },
  {
    id: 'instasnap',
    name: BRANDS.social,
    glyph: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm5 3.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM17 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" /></svg>,
  },
  {
    id: 'viewtube',
    name: BRANDS.video,
    glyph: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5zM10 8.5v7l6-3.5z" /></svg>,
  },
  {
    id: 'loopvault',
    name: BRANDS.loopStore,
    glyph: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h2v6H4zm4-3h2v12H8zm4 2h2v8h-2zm4-4h2v16h-2zm4 6h2v4h-2z" /></svg>,
  },
  {
    id: 'maps',
    name: BRANDS.maps,
    glyph: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zm0 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" /></svg>,
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
                <button key={a.id} data-tut={`app-${a.id}`} class="app-icon" onClick={() => onOpenApp(a.id)}>
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
          {app === 'instasnap' && <InstaSnapApp sim={sim} onError={onError} />}
          {app === 'viewtube' && <ViewTubeApp sim={sim} onError={onError} />}
          {app === 'loopvault' && <LoopVaultApp sim={sim} onError={onError} />}
          {app === 'maps' && <MapsApp sim={sim} onError={onError} onClose={onClose} />}
        </div>
      </div>
      <button class="phone-home" aria-label="Close phone (P)" title="Close phone (P)" onClick={onClose} />
    </aside>
  );
}
