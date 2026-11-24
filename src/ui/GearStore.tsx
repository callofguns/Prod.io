import { useEffect } from 'preact/hooks';
import type { Session } from '../app/Session';
import { BRANDS } from '../content/brands';
import { GEAR, GEAR_SLOTS, GEAR_SLOT_NAMES } from '../content/gear';
import { formatMoney } from '../sim/core/money';
import { useSimEvents } from './hooks/useSim';

const pct = (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n * 1000) / 10}%`;

/** Noise Depot's catalog, opened at the sales counter. */
export function GearStore({ session, onClose }: { session: Session; onClose: () => void }) {
  const { sim, bridge } = session;
  useSimEvents(sim, ['gearChanged', 'cashChanged']);
  const gear = sim.gear;
  const setup = gear.setup();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const quality = gear.qualityFactor();
  const speed = gear.speedFactor();

  return (
    <section class="menu learn gear-store chassis screws interactive" role="dialog" aria-modal="true" aria-labelledby="gear-title">
      <p class="silk">{BRANDS.gearStore} · Midtown</p>
      <h2 id="gear-title" class="menu-title">Studio gear</h2>
      <div class="gear-summary">
        <span><strong>Beat quality</strong> ×{quality.toFixed(3)}</span>
        <span><strong>Time per beat</strong> {Math.round(speed * 100)}%</span>
        <span class="menu-note">Each slot uses the best item you own. Gear is set up at your desk right away.</span>
      </div>

      {GEAR_SLOTS.map((slot) => {
        const items = GEAR.filter((g) => g.slot === slot && g.price > 0);
        const current = setup[slot];
        return (
          <div key={slot} class="gear-slot">
            <p class="silk menu-group">
              {GEAR_SLOT_NAMES[slot]} · <span class="gear-current">yours: {current ? current.name : 'none'}</span>
            </p>
            <ul class="courses">
              {items.map((item) => {
                const owned = gear.owns(item.id);
                const blocked = gear.blocker(item);
                const perks = [
                  item.quality ? `quality ${pct(item.quality / 0.95)}` : null,
                  item.speed < 1 ? `beats ${Math.round((1 - item.speed) * 100)}% faster` : null,
                ].filter(Boolean).join(' · ');
                return (
                  <li key={item.id} class={`course ${owned ? 'owned' : ''}`}>
                    <div class="course-main">
                      <span class="course-name">{item.name}</span>
                      <span class="course-meta">{perks}</span>
                      <span class="course-blurb">{item.blurb}</span>
                    </div>
                    <div class="course-side">
                      {owned ? <span class="course-done">Owned</span> : (
                        <button class="key wide" disabled={!!blocked} title={blocked ?? undefined}
                          onClick={() => {
                            const r = sim.dispatch('buyGear', { itemId: item.id });
                            if (!r.ok) bridge.toast(r.error, 'bad');
                          }}>
                          {formatMoney(item.price)}
                        </button>
                      )}
                      {!owned && blocked && <span class="course-progress">{blocked}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <div class="menu-actions">
        <span class="menu-note">Balance {formatMoney(sim.state.player.cash)}</span>
        <button class="key wide" autoFocus onClick={onClose}>Close <span class="cap">Esc</span></button>
      </div>
    </section>
  );
}
