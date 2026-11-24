import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/sim/Simulation';
import { createNewGameState, DEFAULT_SETUP, STATE_VERSION } from '../src/sim/core/state';
import { createRng, pick } from '../src/sim/core/rng';
import { dollars } from '../src/sim/core/money';
import { MINUTES_PER_DAY } from '../src/sim/core/time';
import { defaultSettings, GENRES, starterPattern, type GenreId } from '../src/content/music';
import { DEMAND, EXCLUSIVES, LEASES, PLANS } from '../src/content/beathub';
import { TRENDS } from '../src/content/trends';
import { advanceTrends, initialTrends } from '../src/sim/trends';
import { migrate } from '../src/save/migrations';
import { playerPattern } from './helpers/playerPattern';

const newSim = (seed = 21) => new Simulation(createNewGameState(seed, DEFAULT_SETUP));
const skip = (sim: Simulation, minutes: number) => sim.dispatch('debugSkipMinutes', { minutes });

function makeBeat(sim: Simulation, genre: GenreId = 'trap', seed = 1) {
  sim.state.needs = { energy: 100, food: 100, mood: 70 };
  sim.dispatch('saveDraft', { settings: defaultSettings(genre), pattern: playerPattern(genre, createRng(seed)) });
  const r = sim.dispatch('finishBeat', { title: `Beat ${seed}` });
  if (!r.ok) throw new Error(r.error);
  skip(sim, sim.state.activity!.until - sim.state.clock.totalMinutes);
  return sim.state.studio.beats.at(-1)!;
}

describe('listing', () => {
  it('lists, unlists and keeps the original upload date', () => {
    const sim = newSim();
    const beat = makeBeat(sim);
    expect(sim.dispatch('listBeat', { beatId: beat.id }).ok).toBe(true);
    expect(sim.dispatch('listBeat', { beatId: beat.id }).ok).toBe(false);
    const listedAt = sim.beathub.listing(beat.id)!.listedAt;
    skip(sim, 60);
    sim.dispatch('unlistBeat', { beatId: beat.id });
    sim.dispatch('listBeat', { beatId: beat.id });
    expect(sim.beathub.listing(beat.id)!.listedAt).toBe(listedAt);
  });

  it('caps the Free plan at 10 listings and Pro removes the cap', () => {
    const sim = newSim();
    sim.economy.record(dollars(1000), 'Gift', 'income');
    for (let i = 0; i < 11; i++) makeBeat(sim, 'trap', i + 1);
    const ids = sim.state.studio.beats.map((b) => b.id);
    ids.slice(0, 10).forEach((id) => expect(sim.dispatch('listBeat', { beatId: id }).ok).toBe(true));
    expect(sim.dispatch('listBeat', { beatId: ids[10]! }).ok).toBe(false);
    expect(sim.dispatch('upgradePlan', {}).ok).toBe(true);
    expect(sim.dispatch('listBeat', { beatId: ids[10]! }).ok).toBe(true);
  });
});

describe('pricing', () => {
  it('uses store-wide prices unless a beat overrides them', () => {
    const sim = newSim();
    const beat = makeBeat(sim);
    sim.dispatch('listBeat', { beatId: beat.id });
    const l = sim.beathub.listing(beat.id)!;
    expect(sim.beathub.price(l, 'mp3')).toBe(LEASES.mp3.reference);
    expect(sim.dispatch('setDefaultPrice', { tier: 'mp3', price: dollars(24.99) }).ok).toBe(true);
    expect(sim.beathub.price(l, 'mp3')).toBe(dollars(24.99));
    expect(sim.dispatch('setBeatPrice', { beatId: beat.id, tier: 'mp3', price: dollars(39.99) }).ok).toBe(true);
    expect(sim.beathub.price(l, 'mp3')).toBe(dollars(39.99));
    expect(sim.dispatch('setBeatPrice', { beatId: beat.id, tier: 'mp3', price: dollars(41) }).ok).toBe(false);
    sim.dispatch('resetBeatPrices', { beatId: beat.id });
    expect(sim.beathub.price(l, 'mp3')).toBe(dollars(24.99));
  });

  it('sells less at much higher prices, and revenue peaks near what buyers expect', () => {
    const f = (p: number) => DEMAND.priceFactor(p, 100);
    expect(f(200)).toBeLessThan(f(100));
    const revenue = (p: number) => p * f(p);
    expect(revenue(100)).toBeGreaterThan(revenue(60));
    expect(revenue(100)).toBeGreaterThan(revenue(160));
  });
});

describe('sales', () => {
  it('sells leases over time, pays out after the plan fee and records stats', () => {
    const sim = newSim();
    for (let i = 0; i < 6; i++) sim.dispatch('listBeat', { beatId: makeBeat(sim, pick(createRng(i), Object.keys(GENRES) as GenreId[]), i + 1).id });
    skip(sim, 14 * MINUTES_PER_DAY);
    const sales = sim.state.beathub.sales.filter((s) => s.tier !== 'exclusive');
    expect(sales.length).toBeGreaterThan(0);
    const s = sales[0]!;
    expect(s.fee).toBe(Math.round(s.gross * PLANS.free.fee));
    expect(sim.state.finance.ledger.some((t) => t.description.startsWith('BeatHub: '))).toBe(true);
    const totals = sim.beathub.totals(30);
    expect(totals.plays).toBeGreaterThan(totals.sales);
  });

  it('promotion costs money and boosts plays', () => {
    const base = newSim(5);
    const promoted = newSim(5);
    for (const sim of [base, promoted]) {
      sim.economy.record(dollars(500), 'Gift', 'income');
      sim.dispatch('listBeat', { beatId: makeBeat(sim, 'trap', 3).id });
    }
    const cash = promoted.state.player.cash;
    expect(promoted.dispatch('promoteBeat', { beatId: 1, days: 7 }).ok).toBe(true);
    expect(promoted.state.player.cash).toBe(cash - dollars(60));
    skip(base, 7 * MINUTES_PER_DAY);
    skip(promoted, 7 * MINUTES_PER_DAY);
    expect(promoted.beathub.listing(1)!.plays).toBeGreaterThan(base.beathub.listing(1)!.plays);
  });

  it('similar beats split buyers (uniqueness)', () => {
    const sim = newSim();
    sim.economy.record(dollars(500), 'Gift', 'income');
    sim.state.needs = { energy: 100, food: 100, mood: 70 };
    for (let i = 0; i < 2; i++) {
      sim.dispatch('saveDraft', { settings: defaultSettings('trap'), pattern: starterPattern('trap') });
      sim.dispatch('finishBeat', { title: `Copy ${i}` });
      skip(sim, sim.state.activity!.until - sim.state.clock.totalMinutes);
      sim.dispatch('listBeat', { beatId: sim.state.studio.beats.at(-1)!.id });
    }
    expect(sim.beathub.interest(1)).toBe('Low');
  });
});

describe('exclusive offers', () => {
  function withOffer() {
    const sim = newSim();
    const beat = makeBeat(sim);
    sim.dispatch('listBeat', { beatId: beat.id });
    expect(sim.dispatch('debugSpawnOffer', {}).ok).toBe(true);
    return { sim, beat, offer: sim.state.beathub.offers[0]! };
  }

  it('arrive as phone messages and can be accepted', () => {
    const { sim, beat, offer } = withOffer();
    expect(sim.state.inbox.messages.at(-1)!.subject).toMatch(/Exclusive offer/);
    const cash = sim.state.player.cash;
    expect(sim.dispatch('acceptOffer', { offerId: offer.id }).ok).toBe(true);
    expect(sim.state.player.cash).toBe(cash + offer.amount - Math.round(offer.amount * PLANS.free.fee));
    expect(sim.beathub.listing(beat.id)!.status).toBe('soldExclusive');
    expect(sim.dispatch('listBeat', { beatId: beat.id }).ok).toBe(false);
  });

  it('can be declined, and expire after 48 hours', () => {
    const { sim, offer } = withOffer();
    expect(sim.dispatch('declineOffer', { offerId: offer.id }).ok).toBe(true);
    const second = withOffer();
    skip(second.sim, EXCLUSIVES.expiresMinutes + 60);
    expect(second.sim.state.beathub.offers[0]!.status).toBe('expired');
  });

  it('take one counter, which the artist answers within hours', () => {
    const { sim, offer } = withOffer();
    expect(sim.dispatch('counterOffer', { offerId: offer.id, raise: 0.25 }).ok).toBe(true);
    expect(sim.state.beathub.offers[0]!.status).toBe('countered');
    expect(sim.dispatch('acceptOffer', { offerId: offer.id }).ok).toBe(false);
    skip(sim, EXCLUSIVES.replyMinutes.max + 60);
    expect(['accepted', 'passed', 'open']).toContain(sim.state.beathub.offers[0]!.status);
    expect(sim.dispatch('counterOffer', { offerId: offer.id, raise: 0.1 }).ok).toBe(false);
  });

  it('counters land more often with Business skill', () => {
    const { sim, offer } = withOffer();
    const counter = sim.beathub.counterAmount(offer, 0.25);
    const novice = sim.beathub.counterOdds(offer, counter);
    sim.state.player.skills.business = 80;
    expect(sim.beathub.counterOdds(offer, counter)).toBeGreaterThan(novice);
  });
});

describe('plans', () => {
  it('Pro renews monthly, can be cancelled, and falls back to Free when unpaid', () => {
    const sim = newSim();
    sim.economy.record(dollars(100), 'Gift', 'income');
    expect(sim.dispatch('upgradePlan', {}).ok).toBe(true);
    const renew = sim.state.beathub.proRenewsAt!;
    skip(sim, renew - sim.state.clock.totalMinutes + 61);
    expect(sim.state.beathub.plan).toBe('pro');
    expect(sim.state.finance.ledger.filter((t) => t.category === 'subscription')).toHaveLength(2);
    sim.dispatch('cancelPro', {});
    skip(sim, sim.state.beathub.proRenewsAt! - sim.state.clock.totalMinutes + 61);
    expect(sim.state.beathub.plan).toBe('free');
    expect(sim.state.inbox.messages.at(-1)!.subject).toBe('Your plan changed');
  });

  it('unlists the lowest-rated beats when dropping back to Free', () => {
    const sim = newSim();
    sim.economy.record(dollars(1000), 'Gift', 'income');
    sim.dispatch('upgradePlan', {});
    for (let i = 0; i < 12; i++) sim.dispatch('listBeat', { beatId: makeBeat(sim, 'trap', i + 1).id });
    sim.dispatch('cancelPro', {});
    skip(sim, sim.state.beathub.proRenewsAt! - sim.state.clock.totalMinutes + 61);
    expect(sim.beathub.active()).toHaveLength(PLANS.free.maxListings);
  });
});

describe('trends', () => {
  it('stay in range, drift weekly, and change labels', () => {
    const t = initialTrends(createRng(3));
    const r = createRng(4);
    for (let w = 0; w < 200; w++) advanceTrends(t, r);
    for (const g of Object.values(t.genres)) {
      expect(g.popularity).toBeGreaterThanOrEqual(TRENDS.min);
      expect(g.popularity).toBeLessThanOrEqual(TRENDS.max);
    }
    const sim = newSim();
    const view = sim.trends.view();
    expect(view).toHaveLength(4);
    expect(sim.trends.bpmFit('trap', sim.state.trends.genres.trap.hotBpm)).toBeGreaterThan(1);
  });
});

describe('economy sanity', () => {
  /** Week-4 lease income for a steady producer (2-3 beats a day, Pro from week 2). */
  function week4Lease(seed: number): number {
    const sim = newSim(seed);
    const r = createRng(100 + seed);
    const genres = Object.keys(GENRES) as GenreId[];
    let lease = 0;
    let weekStart = 0;
    sim.events.on('beatSold', ({ sale, net }) => { if (sale.tier !== 'exclusive') lease += net; });
    for (let day = 1; day <= 28; day++) {
      const dayStart = sim.state.clock.totalMinutes;
      for (let i = 0; i < (day % 2 ? 2 : 3); i++) {
        sim.state.needs = { energy: 100, food: 100, mood: 70 };
        const g = pick(r, genres);
        sim.dispatch('saveDraft', { settings: defaultSettings(g), pattern: playerPattern(g, r) });
        sim.dispatch('finishBeat', { title: 'x' });
        skip(sim, sim.state.activity!.until - sim.state.clock.totalMinutes);
        sim.dispatch('listBeat', { beatId: sim.state.studio.beats.at(-1)!.id });
      }
      if (day === 8) sim.dispatch('upgradePlan', {});
      skip(sim, dayStart + MINUTES_PER_DAY - sim.state.clock.totalMinutes);
      if (day === 21) weekStart = lease;
    }
    return (lease - weekStart) / 100;
  }

  it('a steady producer on Pro covers rent and food by week 4, but not a fortune', { timeout: 60000 }, () => {
    const weeks = [1, 2, 3].map(week4Lease);
    const mean = weeks.reduce((a, b) => a + b, 0) / weeks.length;
    expect(mean).toBeGreaterThan(250);
    expect(mean).toBeLessThan(1200);
  });
});

describe('save upgrade to v7', () => {
  it('adds an empty BeatHub store and trends', () => {
    const state = createNewGameState(1, DEFAULT_SETUP) as unknown as Record<string, unknown>;
    const v6: Record<string, unknown> = { ...state, version: 6 };
    delete v6.beathub;
    delete v6.trends;
    const migrated = migrate(v6);
    expect(migrated.version).toBe(STATE_VERSION);
    expect(migrated.beathub.plan).toBe('free');
    expect(Object.keys(migrated.trends.genres)).toHaveLength(4);
  });
});
