import { useState } from 'preact/hooks';
import type { Simulation } from '../../../sim/Simulation';
import type { Beat, Listing, Offer } from '../../../sim/core/state';
import { formatMoney } from '../../../sim/core/money';
import { MINUTES_PER_DAY, formatClock, toCalendar } from '../../../sim/core/time';
import { EXCLUSIVES, LEASES, LEASE_TIERS, PLANS, PROMOTIONS } from '../../../content/beathub';
import { GENRES, keyLabel } from '../../../content/music';
import { useSimEvents } from '../../hooks/useSim';
import { RevenueChart } from './RevenueChart';
import { PriceStepper } from './PriceStepper';

type Tab = 'store' | 'offers' | 'trends' | 'account';
type Run = (r: { ok: true } | { ok: false; error: string }) => boolean;

const compact = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(1).replace('.0', '')}K` : n.toLocaleString('en-US'));
const until = (minute: number, now: number) => {
  const h = Math.max(0, Math.round((minute - now) / 60));
  return h >= 24 ? `${Math.round(h / 24)} d` : `${h} h`;
};

function Grade({ beat }: { beat: Beat }) {
  return <span class={`grade grade-${beat.quality.grade} mini`} aria-label={`Grade ${beat.quality.grade}`}>{beat.quality.grade}</span>;
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div class="tile">
      <span class="tile-label">{label}</span>
      <span class="tile-value">{value}</span>
    </div>
  );
}

// ---------- Store ----------

function StoreTab({ sim, onOpen, run }: { sim: Simulation; onOpen: (beatId: number) => void; run: Run }) {
  const hub = sim.beathub;
  const store = sim.state.beathub;
  const week = hub.totals(7);
  const plan = hub.plan();
  const now = sim.state.clock.totalMinutes;
  const active = hub.active();
  const beats = sim.state.studio.beats;
  const listable = beats.filter((b) => {
    const l = hub.listing(b.id);
    return !l || l.status === 'unlisted';
  }).reverse();
  const sold = store.listings.filter((l) => l.status === 'soldExclusive');

  return (
    <div class="app">
      <section>
        <div class="tiles" role="group" aria-label="Last 7 days">
          <Tile label="Plays" value={compact(week.plays)} />
          <Tile label="Sales" value={compact(week.sales)} />
          <Tile label="Earned" value={formatMoney(week.revenue).replace('.00', '')} />
        </div>
        <p class="app-empty tiles-note">Last 7 days · {plan.name} plan{plan.fee ? ` · BeatHub keeps ${Math.round(plan.fee * 100)}%` : ' · you keep 100%'}</p>
      </section>

      <RevenueChart points={hub.recentDays(14)} todayDay={toCalendar(now).day} />

      <section>
        <h3 class="app-heading">Listed · {active.length}{Number.isFinite(plan.maxListings) ? ` of ${plan.maxListings}` : ''}</h3>
        {active.length === 0 ? <p class="app-empty">Nothing listed yet. Pick a finished beat below.</p> : (
          <ul class="rows">
            {active.map((l) => {
              const beat = hub.beat(l.beatId)!;
              return (
                <li key={l.beatId}>
                  <button class="row row-button" onClick={() => onOpen(l.beatId)}>
                    <Grade beat={beat} />
                    <span class="row-main">
                      <span class="row-title">{beat.title}</span>
                      <span class="row-sub">{compact(l.plays)} plays · {l.sales} sales · {formatMoney(l.revenue)}</span>
                    </span>
                    {(l.promotedUntil ?? 0) > now && <span class="badge">Promoted</span>}
                    <span class="row-time">›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 class="app-heading">Ready to list</h3>
        {listable.length === 0 ? <p class="app-empty">Finish beats at your computer and they'll show up here.</p> : (
          <ul class="rows">
            {listable.map((b) => {
              const blocked = hub.listBlocker(b.id);
              return (
                <li key={b.id} class="row">
                  <Grade beat={b} />
                  <span class="row-main">
                    <span class="row-title">{b.title}</span>
                    <span class="row-sub">{GENRES[b.settings.genre].name} · {b.settings.bpm} BPM · score {b.quality.score}</span>
                  </span>
                  <button class="order" disabled={!!blocked} title={blocked ?? undefined}
                    onClick={() => run(sim.dispatch('listBeat', { beatId: b.id }))}>List</button>
                </li>
              );
            })}
          </ul>
        )}
        {active.length >= plan.maxListings && <p class="app-empty">The Free plan lists up to {PLANS.free.maxListings} beats. Unlist one, or go Pro under Account.</p>}
      </section>

      {sold.length > 0 && (
        <section>
          <h3 class="app-heading">Sold exclusively</h3>
          <ul class="rows">
            {sold.map((l) => (
              <li key={l.beatId} class="row">
                <span class="row-main">
                  <span class="row-title">{hub.beat(l.beatId)!.title}</span>
                  <span class="row-sub">to {l.soldTo}</span>
                </span>
                <span class="row-amount in">{formatMoney(l.revenue)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ListingDetail({ sim, beatId, onBack, run }: { sim: Simulation; beatId: number; onBack: () => void; run: Run }) {
  const hub = sim.beathub;
  const beat = hub.beat(beatId)!;
  const l = hub.listing(beatId) as Listing;
  const now = sim.state.clock.totalMinutes;
  const promoted = (l.promotedUntil ?? 0) > now;
  const listedDays = Math.floor((now - l.listedAt) / MINUTES_PER_DAY);

  return (
    <div class="app">
      <button class="app-back" onClick={onBack}>‹ Store</button>
      <section>
        <div class="detail-head">
          <Grade beat={beat} />
          <div>
            <p class="detail-title">{beat.title}</p>
            <p class="app-empty">{GENRES[beat.settings.genre].name} · {beat.settings.bpm} BPM · {keyLabel(beat.settings)}</p>
          </div>
        </div>
        <div class="tiles">
          <Tile label="Plays" value={compact(l.plays)} />
          <Tile label="Sales" value={String(l.sales)} />
          <Tile label="Earned" value={formatMoney(l.revenue).replace('.00', '')} />
        </div>
        <p class="app-empty tiles-note">
          {l.status === 'listed' ? `Listed ${listedDays === 0 ? 'today' : `${listedDays} day${listedDays === 1 ? '' : 's'} ago`} · buyer interest ${hub.interest(beatId).toLowerCase()}` : 'Not listed'}
        </p>
      </section>

      <section>
        <h3 class="app-heading">Prices for this beat</h3>
        <ul class="rows">
          {LEASE_TIERS.map((t) => (
            <li key={t} class="row price-row">
              <span class="row-main">
                <span class="row-title">{LEASES[t].name}</span>
                <span class="row-sub">{LEASES[t].terms}</span>
              </span>
              <PriceStepper label={LEASES[t].name} value={hub.price(l, t)} steps={LEASES[t].steps} custom={l.prices[t] !== undefined}
                onChange={(price) => run(sim.dispatch('setBeatPrice', { beatId, tier: t, price }))} />
            </li>
          ))}
        </ul>
        <p class="app-empty">Better beats can charge more. Exclusive rights are sold through offers.</p>
        {Object.keys(l.prices).length > 0 && (
          <button class="link-button" onClick={() => run(sim.dispatch('resetBeatPrices', { beatId }))}>Use store-wide prices</button>
        )}
      </section>

      {l.status === 'listed' && (
        <section>
          <h3 class="app-heading">Promote</h3>
          <p class="app-empty">
            {promoted
              ? `Promoted for another ${until(l.promotedUntil!, now)}. Buying more adds days.`
              : 'BeatHub features your beat to more buyers: about three times the plays while it runs.'}
          </p>
          <div class="loan-amounts">
            {PROMOTIONS.map((p) => (
              <button key={p.days} class="order" onClick={() => run(sim.dispatch('promoteBeat', { beatId, days: p.days }))}>
                {p.days} days · {formatMoney(p.price).replace('.00', '')}
              </button>
            ))}
          </div>
        </section>
      )}

      {l.status === 'listed' && (
        <button class="link-button danger-link" onClick={() => { if (run(sim.dispatch('unlistBeat', { beatId }))) onBack(); }}>
          Unlist this beat
        </button>
      )}
    </div>
  );
}

// ---------- Offers ----------

function OfferCard({ sim, offer, run }: { sim: Simulation; offer: Offer; run: Run }) {
  const [countering, setCountering] = useState(false);
  const hub = sim.beathub;
  const beat = hub.beat(offer.beatId);
  const now = sim.state.clock.totalMinutes;
  const fee = Math.round(offer.amount * hub.plan().fee);

  return (
    <li class="offer">
      <p class="message-from">{offer.buyer}</p>
      <p class="offer-amount">{formatMoney(offer.amount)}</p>
      <p class="app-empty">
        Exclusive rights to "{beat?.title}" · {offer.status === 'countered'
          ? `you asked for ${formatMoney(offer.counter!)}; waiting for a reply`
          : `expires in ${until(offer.expiresAt, now)}`}
        {fee > 0 && offer.status === 'open' && ` · you'd receive ${formatMoney(offer.amount - fee)} after the Free plan fee`}
      </p>
      {offer.status === 'open' && !countering && (
        <div class="offer-actions">
          <button class="order" onClick={() => run(sim.dispatch('acceptOffer', { offerId: offer.id }))}>Accept</button>
          <button class="ghost" disabled={offer.counter !== null} title={offer.counter !== null ? 'You can only counter once.' : undefined}
            onClick={() => setCountering(true)}>Counter</button>
          <button class="ghost" onClick={() => run(sim.dispatch('declineOffer', { offerId: offer.id }))}>Decline</button>
        </div>
      )}
      {countering && (
        <div class="counter">
          <p class="app-empty">Ask for more. The higher you go, the more likely they walk; your Business skill helps.</p>
          <div class="offer-actions">
            {EXCLUSIVES.counterSteps.map((raise) => {
              const amount = hub.counterAmount(offer, raise);
              return (
                <button key={raise} class="order" onClick={() => { run(sim.dispatch('counterOffer', { offerId: offer.id, raise })); setCountering(false); }}>
                  {formatMoney(amount).replace('.00', '')}
                  <span class="odds">{Math.round(hub.counterOdds(offer, amount) * 100)}% likely</span>
                </button>
              );
            })}
            <button class="ghost" onClick={() => setCountering(false)}>Cancel</button>
          </div>
        </div>
      )}
    </li>
  );
}

function OffersTab({ sim, run }: { sim: Simulation; run: Run }) {
  useSimEvents(sim, ['offersChanged', 'hour']);
  const offers = sim.state.beathub.offers;
  const open = offers.filter((o) => o.status === 'open' || o.status === 'countered').reverse();
  const past = offers.filter((o) => !(o.status === 'open' || o.status === 'countered')).slice(-8).reverse();
  const label: Record<string, string> = { accepted: 'Sold', declined: 'Declined', expired: 'Expired', passed: 'They passed', closed: 'Closed' };
  return (
    <div class="app">
      <p class="app-empty">Artists who love one of your better beats (score {EXCLUSIVES.minScore}+) may offer to buy it outright. The beat leaves your store; earlier leases stay valid.</p>
      {open.length === 0 ? <p class="app-empty">No open offers right now.</p> : (
        <ul class="offers">{open.map((o) => <OfferCard key={o.id} sim={sim} offer={o} run={run} />)}</ul>
      )}
      {past.length > 0 && (
        <section>
          <h3 class="app-heading">Earlier offers</h3>
          <ul class="rows">
            {past.map((o) => (
              <li key={o.id} class="row">
                <span class="row-main">
                  <span class="row-title">{o.buyer}</span>
                  <span class="row-sub">"{sim.beathub.beat(o.beatId)?.title}" · {formatMoney(o.counter && o.status === 'accepted' ? o.counter : o.amount)}</span>
                </span>
                <span class="row-time">{label[o.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ---------- Trends ----------

function TrendsTab({ sim }: { sim: Simulation }) {
  useSimEvents(sim, ['trendsChanged']);
  const view = sim.trends.view();
  const arrow = { up: '▲', down: '▼', flat: '▬' } as const;
  return (
    <div class="app">
      <p class="app-empty">What buyers on BeatHub are into this week, most popular first. Updated every Monday.</p>
      <ol class="trend-list">
        {view.map((t) => (
          <li key={t.genre} class="trend">
            <span class="trend-name">{GENRES[t.genre].name}</span>
            <span class={`trend-label ${t.label.toLowerCase()}`}><span aria-hidden="true">{arrow[t.direction]}</span> {t.label}</span>
            <span class="trend-bpm">Popular tempo: around {t.hotBpm} BPM</span>
          </li>
        ))}
      </ol>
      <p class="app-empty">Beats in a popular genre, near its popular tempo, get more plays and sales.</p>
    </div>
  );
}

// ---------- Account ----------

function AccountTab({ sim, run }: { sim: Simulation; run: Run }) {
  const store = sim.state.beathub;
  const now = sim.state.clock.totalMinutes;
  const renews = store.proRenewsAt ? toCalendar(store.proRenewsAt) : null;
  return (
    <div class="app">
      <section class="plan-card">
        <p class="app-label">Your plan</p>
        <p class="detail-title">{PLANS[store.plan].name}</p>
        {store.plan === 'free' ? (
          <>
            <p class="app-empty">BeatHub keeps 30% of each sale. List up to {PLANS.free.maxListings} beats.</p>
            <p class="app-empty"><strong>Pro, {formatMoney(PLANS.pro.price)} a month:</strong> keep 100% of sales and list as many beats as you like.</p>
            <button class="order" onClick={() => run(sim.dispatch('upgradePlan', {}))}>Go Pro · {formatMoney(PLANS.pro.price)}</button>
          </>
        ) : (
          <>
            <p class="app-empty">
              You keep 100% of sales; no listing limit. {store.proCancelled
                ? `Ends ${renews!.weekday} ${renews!.month} ${renews!.date} (in ${until(store.proRenewsAt!, now)}), then back to Free.`
                : `Renews ${renews!.weekday} ${renews!.month} ${renews!.date}, ${formatClock(renews!)} for ${formatMoney(PLANS.pro.price)}.`}
            </p>
            {store.proCancelled
              ? <button class="order" onClick={() => run(sim.dispatch('resumePro', {}))}>Keep Pro</button>
              : <button class="ghost" onClick={() => run(sim.dispatch('cancelPro', {}))}>Cancel Pro</button>}
          </>
        )}
      </section>

      <section>
        <h3 class="app-heading">Store-wide prices</h3>
        <ul class="rows">
          {LEASE_TIERS.map((t) => (
            <li key={t} class="row price-row">
              <span class="row-main">
                <span class="row-title">{LEASES[t].name}</span>
                <span class="row-sub">{LEASES[t].terms}</span>
              </span>
              <PriceStepper label={LEASES[t].name} value={store.defaultPrices[t]} steps={LEASES[t].steps}
                onChange={(price) => run(sim.dispatch('setDefaultPrice', { tier: t, price }))} />
            </li>
          ))}
        </ul>
        <p class="app-empty">Used by every listing unless you set a price on the beat itself. Buyers expect about {formatMoney(LEASES.mp3.reference)} for an MP3 lease of an average beat.</p>
      </section>
    </div>
  );
}

// ---------- App ----------

export function BeatHubApp({ sim, onError }: { sim: Simulation; onError: (message: string) => void }) {
  useSimEvents(sim, ['beathubChanged', 'beatSold', 'offersChanged', 'beatFinished', 'cashChanged', 'hour']);
  const [tab, setTab] = useState<Tab>('store');
  const [detail, setDetail] = useState<number | null>(null);
  const openOffers = sim.state.beathub.offers.filter((o) => o.status === 'open').length;
  const run: Run = (r) => {
    if (!r.ok) onError(r.error);
    return r.ok;
  };

  if (detail !== null && sim.beathub.listing(detail)) {
    return <ListingDetail sim={sim} beatId={detail} onBack={() => setDetail(null)} run={run} />;
  }

  const tabs: { id: Tab; name: string }[] = [
    { id: 'store', name: 'Store' },
    { id: 'offers', name: openOffers ? `Offers (${openOffers})` : 'Offers' },
    { id: 'trends', name: 'Trends' },
    { id: 'account', name: 'Account' },
  ];
  return (
    <div class="app">
      <div class="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} class="tab" onClick={() => setTab(t.id)}>{t.name}</button>
        ))}
      </div>
      {tab === 'store' && <StoreTab sim={sim} onOpen={setDetail} run={run} />}
      {tab === 'offers' && <OffersTab sim={sim} run={run} />}
      {tab === 'trends' && <TrendsTab sim={sim} />}
      {tab === 'account' && <AccountTab sim={sim} run={run} />}
    </div>
  );
}
