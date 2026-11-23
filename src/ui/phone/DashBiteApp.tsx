import { useState } from 'preact/hooks';
import type { Simulation } from '../../sim/Simulation';
import { DELIVERY_MENU } from '../../content/living';
import { formatMoney } from '../../sim/core/money';
import { formatClock, toCalendar } from '../../sim/core/time';
import { useSimEvents } from '../hooks/useSim';

export function DashBiteApp({ sim, onError }: { sim: Simulation; onError: (msg: string) => void }) {
  useSimEvents(sim, ['fridgeChanged', 'cashChanged', 'minute']);
  const [tab, setTab] = useState<'groceries' | 'takeout'>('groceries');
  const { fridge, deliveries } = sim.state.home;
  const items = DELIVERY_MENU.filter((i) => i.kind === tab);

  return (
    <div class="app">
      <div class="tabs" role="tablist">
        {(['groceries', 'takeout'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} class="tab" onClick={() => setTab(t)}>
            {t === 'groceries' ? 'Groceries' : 'Takeout'}
          </button>
        ))}
      </div>

      <ul class="rows">
        {items.map((item) => (
          <li key={item.id} class="row">
            <span class="row-main">
              <span class="row-title">{item.name}</span>
              <span class="row-sub">{item.detail}</span>
            </span>
            <button
              class="order"
              onClick={() => {
                const r = sim.dispatch('orderDelivery', { itemId: item.id });
                if (!r.ok) onError(r.error);
              }}
            >
              {formatMoney(item.price)}
            </button>
          </li>
        ))}
      </ul>
      <p class="app-empty">Prices include delivery and fees. Orders arrive in 30 to 50 minutes.</p>

      <section>
        <h3 class="app-heading">On the way</h3>
        {deliveries.length === 0 ? (
          <p class="app-empty">Nothing ordered.</p>
        ) : (
          <ul class="rows">
            {deliveries.map((d) => (
              <li key={d.id} class="row">
                <span class="row-main"><span class="row-title">{d.description}</span></span>
                <span class="row-time">Arrives {formatClock(toCalendar(d.arrivesAt))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 class="app-heading">In your fridge</h3>
        <p class="fridge-line">
          <span><strong>{fridge.groceries}</strong> grocery portions</span>
          <span><strong>{fridge.takeout}</strong> takeout</span>
          <span><strong>{fridge.energyDrinks}</strong> energy drinks</span>
        </p>
      </section>
    </div>
  );
}
