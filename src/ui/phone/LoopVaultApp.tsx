import { useEffect, useState } from 'preact/hooks';
import type { Simulation } from '../../sim/Simulation';
import { CREDIT_PACK, LOOP_PLAN, type LoopDef } from '../../content/loops';
import { GENRES, type GenreId } from '../../content/music';
import { formatMoney } from '../../sim/core/money';
import { formatDate, toCalendar } from '../../sim/core/time';
import { settings } from '../../app/settings';
import { previewLoop, stopLoopPreview } from '../../audio/loopPreview';
import { useSimEvents } from '../hooks/useSim';

type Filter = 'all' | 'owned' | GenreId;

const wearLabel = (overuse: number) => (overuse < 0.2 ? 'Fresh' : overuse < 0.45 ? 'Used a lot' : 'Overused');

/** LoopVault: subscribe for credits, browse and preview loops, buy them for the beat maker's loop slot. */
export function LoopVaultApp({ sim, onError }: { sim: Simulation; onError: (msg: string) => void }) {
  useSimEvents(sim, ['loopsChanged', 'cashChanged', 'dayStarted']);
  const [filter, setFilter] = useState<Filter>('all');
  const [playing, setPlaying] = useState<string | null>(null);
  const store = sim.state.loops;
  const now = sim.state.clock.totalMinutes;
  useEffect(() => () => stopLoopPreview(), []);

  const run = (r: { ok: true } | { ok: false; error: string }) => {
    if (!r.ok) onError(r.error);
  };
  const play = (loop: LoopDef) => {
    if (playing === loop.id) {
      stopLoopPreview();
      setPlaying(null);
      return;
    }
    const ms = previewLoop(loop, settings.get().volume);
    setPlaying(loop.id);
    window.setTimeout(() => setPlaying((p) => (p === loop.id ? null : p)), ms);
  };

  const catalog = sim.loops.catalog();
  const shown = filter === 'all' ? catalog : filter === 'owned' ? sim.loops.owned() : catalog.filter((l) => l.genre === filter);
  const today = toCalendar(now).day;
  const filters: { id: Filter; name: string }[] = [
    { id: 'all', name: 'New' },
    ...(Object.keys(GENRES) as GenreId[]).map((g) => ({ id: g, name: GENRES[g].name })),
    { id: 'owned', name: `Mine (${store.owned.length})` },
  ];

  return (
    <div class="app">
      <section class="vault-plan">
        <div class="tiles">
          <div class="tile"><span class="tile-label">Credits</span><span class="tile-value">{store.credits}</span></div>
          <div class="tile"><span class="tile-label">Loops</span><span class="tile-value">{store.owned.length}</span></div>
          <div class="tile"><span class="tile-label">Plan</span><span class="tile-value">{store.subscribed ? LOOP_PLAN.name : 'None'}</span></div>
        </div>
        {store.subscribed ? (
          <p class="app-empty tiles-note">
            {store.cancelled ? 'Ends' : 'Renews'} {formatDate(toCalendar(store.renewsAt!))}
            {!store.cancelled && ` · +${LOOP_PLAN.credits} credits, ${formatMoney(LOOP_PLAN.price)}`}
            {' · '}
            <button class="link-button" onClick={() => run(sim.dispatch(store.cancelled ? 'resumeLoops' : 'cancelLoops', {}))}>
              {store.cancelled ? 'Keep my plan' : 'Cancel'}
            </button>
            {' · '}
            <button class="link-button" onClick={() => run(sim.dispatch('buyCredits', {}))}>
              +{CREDIT_PACK.credits} credits for {formatMoney(CREDIT_PACK.price)}
            </button>
          </p>
        ) : (
          <div class="vault-cta">
            <p class="app-empty">
              <strong>{LOOP_PLAN.name} plan, {formatMoney(LOOP_PLAN.price)} a month:</strong> {LOOP_PLAN.credits} credits each month
              (unused ones roll over, up to {LOOP_PLAN.maxCredits}). Loops you buy are yours to keep.
            </p>
            <button class="order" onClick={() => run(sim.dispatch('subscribeLoops', {}))}>Subscribe</button>
          </div>
        )}
      </section>

      <div class="tabs vault-filters" role="tablist">
        {filters.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} class="tab" onClick={() => setFilter(f.id)}>{f.name}</button>
        ))}
      </div>

      {shown.length === 0 ? <p class="app-empty">No loops here yet.</p> : (
        <ul class="rows">
          {shown.map((loop) => {
            const owned = sim.loops.owns(loop.id);
            const wear = sim.loops.overuse(loop.id);
            const isNew = today - loop.releaseDay < 7 && loop.releaseDay > 1;
            return (
              <li key={loop.id} class="row vault-row">
                <button class="loop-play" aria-label={playing === loop.id ? `Stop ${loop.name}` : `Preview ${loop.name}`}
                  aria-pressed={playing === loop.id} onClick={() => play(loop)}>
                  {playing === loop.id ? '■' : '▶'}
                </button>
                <span class="row-main">
                  <span class="row-title">{loop.name} {isNew && <span class="badge">New</span>}</span>
                  <span class="row-sub">
                    {GENRES[loop.genre].name} · {loop.mood} · quality {loop.quality} · {wearLabel(wear)}
                  </span>
                </span>
                {owned ? <span class="row-time">Owned</span> : (
                  <button class="order" onClick={() => run(sim.dispatch('buyLoop', { loopId: loop.id }))}>
                    {loop.credits} cr
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p class="app-empty">
        Put a loop in your beat's loop slot in the beat maker: a good one lifts the melody score. Popular loops get used by lots of
        producers, so beats built on overused loops stand out less on BeatHub. New loops drop every Monday.
      </p>
    </div>
  );
}
