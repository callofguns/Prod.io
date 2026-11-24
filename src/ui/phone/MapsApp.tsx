import type { Simulation } from '../../sim/Simulation';
import { AREAS, DISTRICTS, TRANSIT, type AreaId, type DistrictId } from '../../content/city';
import { BRANDS } from '../../content/brands';
import { formatMoney } from '../../sim/core/money';
import { useSimEvents } from '../hooks/useSim';
import type { Destination } from '../../sim/systems/CitySystem';

const PLACES: { area: AreaId; what: string }[] = [
  { area: 'apartment', what: 'Home · your studio apartment' },
  { area: 'grocery', what: 'Corner store · groceries, energy drinks' },
  { area: 'gearStore', what: 'Music gear · computers, headphones, speakers' },
  { area: 'cafe', what: 'Coffee and food' },
];

/** Where things are in Bayport, opening hours, and booking a Ryda. */
export function MapsApp({ sim, onError, onClose }: { sim: Simulation; onError: (msg: string) => void; onClose: () => void }) {
  useSimEvents(sim, ['minute', 'areaChanged', 'cashChanged', 'activityChanged']);
  const city = sim.city;
  const here = city.area();
  const destinations: { id: Destination; name: string }[] = [
    { id: 'home', name: 'Home' },
    ...(Object.keys(DISTRICTS) as DistrictId[]).map((d) => ({ id: d, name: DISTRICTS[d].name })),
  ];

  return (
    <div class="app">
      <section>
        <p class="app-label">You are in</p>
        <p class="maps-here">{AREAS[here].name}{AREAS[here].outdoors ? '' : ` · ${DISTRICTS[AREAS[here].district].name}`}</p>
      </section>

      <section>
        <h3 class="app-heading">{BRANDS.rideshare} · get a ride</h3>
        <ul class="rows">
          {destinations.map((d) => {
            const q = city.quote(d.id, 'ride');
            return (
              <li key={d.id} class="row">
                <span class="row-main">
                  <span class="row-title">{d.name}</span>
                  <span class="row-sub">{'error' in q ? q.error : `About ${q.minutes} min, pickup included`}</span>
                </span>
                <button class="order" disabled={'error' in q}
                  onClick={() => {
                    const r = sim.dispatch('travel', { to: d.id, mode: 'ride' });
                    if (!r.ok) onError(r.error);
                    else onClose();
                  }}>
                  {'error' in q ? '—' : formatMoney(q.price)}
                </button>
              </li>
            );
          })}
        </ul>
        <p class="app-empty">
          Cheaper: the {BRANDS.transit} bus is {formatMoney(TRANSIT.bus.fare)}, every {TRANSIT.bus.headway} minutes from 6:00 until midnight,
          from the stop on each street. Walking between Eastside and Midtown takes {TRANSIT.walk.minutes} minutes.
        </p>
      </section>

      <section>
        <h3 class="app-heading">Places</h3>
        <ul class="rows">
          {PLACES.map((p) => {
            const open = city.isOpen(p.area);
            const hasHours = !!AREAS[p.area].hours;
            return (
              <li key={p.area} class="row">
                <span class="row-main">
                  <span class="row-title">{AREAS[p.area].name}</span>
                  <span class="row-sub">{p.what} · {DISTRICTS[AREAS[p.area].district].name}</span>
                </span>
                <span class={`row-time ${hasHours ? (open ? 'is-open' : 'is-closed') : ''}`}>
                  {hasHours ? `${open ? 'Open' : 'Closed'} · ${city.hoursLabel(p.area)}` : ''}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
