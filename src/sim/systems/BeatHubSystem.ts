import type { Simulation, System } from '../Simulation';
import { fail, ok, type CommandResult } from '../core/commands';
import { formatMoney, type Cents } from '../core/money';
import { nextFloat, nextInt, pick } from '../core/rng';
import { MINUTES_PER_DAY, toCalendar, type CalendarTime } from '../core/time';
import type { Beat, DayStat, Listing, Offer } from '../core/state';
import { BRANDS } from '../../content/brands';
import { GENRES } from '../../content/music';
import {
  DEMAND, EXCLUSIVES, HISTORY_DAYS, LEASES, LEASE_TIERS, PLANS, PROMOTIONS, RAPPER_NAMES, RAPPER_PREFIXES,
  SALES_LIMIT, SINGER_FIRST, SINGER_LAST, SKILL_XP, type LeaseTier,
} from '../../content/beathub';
import { beatSimilarity, starterSimilarity } from '../quality/analyzePattern';

const round25 = (c: Cents) => Math.round(c / 2500) * 2500;

/** Knuth's Poisson sampler; fine for the small means used here. */
function poisson(mean: number, rand: () => number): number {
  if (mean <= 0) return 0;
  const limit = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > limit && k < 50);
  return k - 1;
}

/**
 * BeatHub: listing beats, lease sales driven by quality, trends, price,
 * uniqueness and reputation, exclusive offers you negotiate, Free/Pro plans
 * and paid promotion. Runs hourly.
 */
export class BeatHubSystem implements System {
  readonly id = 'beathub';
  /** beatId → uniqueness factor among your active listings; rebuilt when listings change. */
  private uniqueness: Map<number, number> | null = null;

  constructor(private sim: Simulation) {
    sim.handle('listBeat', ({ beatId }) => this.list(beatId));
    sim.handle('unlistBeat', ({ beatId }) => this.unlist(beatId));
    sim.handle('setDefaultPrice', ({ tier, price }) => {
      if (!LEASES[tier]?.steps.includes(price)) return fail('Pick one of the listed prices.');
      this.store.defaultPrices[tier] = price;
      return this.changed();
    });
    sim.handle('setBeatPrice', ({ beatId, tier, price }) => {
      const l = this.listing(beatId);
      if (!l) return fail('That beat is not on BeatHub.');
      if (!LEASES[tier]?.steps.includes(price)) return fail('Pick one of the listed prices.');
      if (price === this.store.defaultPrices[tier]) delete l.prices[tier];
      else l.prices[tier] = price;
      return this.changed();
    });
    sim.handle('resetBeatPrices', ({ beatId }) => {
      const l = this.listing(beatId);
      if (!l) return fail('That beat is not on BeatHub.');
      l.prices = {};
      return this.changed();
    });
    sim.handle('promoteBeat', ({ beatId, days }) => this.promote(beatId, days));
    sim.handle('upgradePlan', () => this.upgrade());
    sim.handle('cancelPro', () => {
      if (this.store.plan !== 'pro') return fail('You are on the Free plan.');
      this.store.proCancelled = true;
      return this.changed();
    });
    sim.handle('resumePro', () => {
      if (this.store.plan !== 'pro') return fail('You are on the Free plan.');
      this.store.proCancelled = false;
      return this.changed();
    });
    sim.handle('acceptOffer', ({ offerId }) => this.accept(offerId));
    sim.handle('declineOffer', ({ offerId }) => {
      const o = this.offer(offerId);
      if (!o || o.status !== 'open') return fail('That offer is no longer open.');
      o.status = 'declined';
      sim.events.emit('offersChanged', {});
      return ok;
    });
    sim.handle('counterOffer', ({ offerId, raise }) => this.counter(offerId, raise));
    sim.handle('debugSpawnOffer', () => {
      const best = this.active().map((l) => this.beat(l.beatId)!).sort((a, b) => b.quality.score - a.quality.score)[0];
      if (!best) return fail('List a beat on BeatHub first.');
      this.spawnOffer(best);
      return ok;
    });
    sim.events.on('hour', ({ time, totalMinutes }) => this.hourly(time, totalMinutes));
  }

  private get store() {
    return this.sim.state.beathub;
  }

  // ---------- Queries ----------

  beat(beatId: number): Beat | undefined {
    return this.sim.state.studio.beats.find((b) => b.id === beatId);
  }

  listing(beatId: number): Listing | undefined {
    return this.store.listings.find((l) => l.beatId === beatId);
  }

  active(): Listing[] {
    return this.store.listings.filter((l) => l.status === 'listed');
  }

  offer(id: number): Offer | undefined {
    return this.store.offers.find((o) => o.id === id);
  }

  plan() {
    return PLANS[this.store.plan];
  }

  price(listing: Listing, tier: LeaseTier): Cents {
    return listing.prices[tier] ?? this.store.defaultPrices[tier];
  }

  reputation(): number {
    return DEMAND.reputation(this.store.leaseSales);
  }

  /** Why a beat can't be listed right now, or null. */
  listBlocker(beatId: number): string | null {
    const beat = this.beat(beatId);
    if (!beat) return 'Unknown beat.';
    const l = this.listing(beatId);
    if (l?.status === 'soldExclusive') return 'You sold the exclusive rights to this beat.';
    if (l?.status === 'listed') return 'Already listed.';
    if (this.active().length >= this.plan().maxListings) {
      return `The ${this.plan().name} plan lists up to ${this.plan().maxListings} beats. Unlist one or go Pro.`;
    }
    return null;
  }

  /** Sum of the last `days` days of store history. */
  totals(days: number): Omit<DayStat, 'day'> {
    const today = toCalendar(this.sim.state.clock.totalMinutes).day;
    return this.store.history
      .filter((d) => d.day > today - days)
      .reduce((t, d) => ({ plays: t.plays + d.plays, sales: t.sales + d.sales, revenue: t.revenue + d.revenue }), { plays: 0, sales: 0, revenue: 0 });
  }

  /** Daily stats for the last `days` days (oldest first, zeros for quiet days). */
  recentDays(days: number): DayStat[] {
    const today = toCalendar(this.sim.state.clock.totalMinutes).day;
    return Array.from({ length: days }, (_, i) => {
      const day = today - days + 1 + i;
      return this.store.history.find((d) => d.day === day) ?? { day, plays: 0, sales: 0, revenue: 0 };
    }).filter((d) => d.day >= 1);
  }

  /** Relative buyer interest for a listing: what the UI shows instead of numbers. */
  interest(beatId: number): 'High' | 'Medium' | 'Low' {
    const actives = this.active();
    const l = this.listing(beatId);
    const beat = this.beat(beatId);
    if (!l || !beat || actives.length === 0) return 'Low';
    const now = this.sim.state.clock.totalMinutes;
    const mine = this.weight(l, beat, now);
    const ref = this.weightFor(60, beat, now, l);
    return mine >= ref * 1.4 ? 'High' : mine >= ref * 0.7 ? 'Medium' : 'Low';
  }

  // ---------- Listing ----------

  private list(beatId: number): CommandResult {
    const blocked = this.listBlocker(beatId);
    if (blocked) return fail(blocked);
    const now = this.sim.state.clock.totalMinutes;
    const existing = this.listing(beatId);
    if (existing) {
      existing.status = 'listed'; // keeps its original upload date, so re-listing doesn't refresh it
    } else {
      this.store.listings.push({
        beatId, listedAt: now, prices: {}, plays: 0, sales: 0, revenue: 0, promotedUntil: null, status: 'listed', soldTo: null,
      });
    }
    this.sim.skills.gain('marketing', SKILL_XP.listing);
    this.uniqueness = null;
    return this.changed();
  }

  private unlist(beatId: number): CommandResult {
    const l = this.listing(beatId);
    if (l?.status !== 'listed') return fail('That beat is not listed.');
    l.status = 'unlisted';
    this.uniqueness = null;
    return this.changed();
  }

  private promote(beatId: number, days: number): CommandResult {
    const l = this.listing(beatId);
    const promo = PROMOTIONS.find((p) => p.days === days);
    if (!promo) return fail('Unknown promotion.');
    if (l?.status !== 'listed') return fail('List the beat before promoting it.');
    if (this.sim.state.player.cash < promo.price) return fail(`Card declined. Promotion costs ${formatMoney(promo.price)}.`);
    const now = this.sim.state.clock.totalMinutes;
    this.sim.economy.record(-promo.price, `${BRANDS.beatStore} promotion: ${this.beat(beatId)!.title} (${days} days)`, 'marketing');
    l.promotedUntil = Math.max(now, l.promotedUntil ?? 0) + days * MINUTES_PER_DAY;
    this.sim.skills.gain('marketing', SKILL_XP.promotion);
    return this.changed();
  }

  // ---------- Plans ----------

  private upgrade(): CommandResult {
    if (this.store.plan === 'pro') return fail('You are already on Pro.');
    const price = PLANS.pro.price;
    if (this.sim.state.player.cash < price) return fail(`Card declined. Pro costs ${formatMoney(price)} a month.`);
    this.sim.economy.record(-price, `${BRANDS.beatStore} Pro plan`, 'subscription');
    this.store.plan = 'pro';
    this.store.proCancelled = false;
    this.store.proRenewsAt = this.sim.state.clock.totalMinutes + PLANS.pro.periodDays * MINUTES_PER_DAY;
    return this.changed();
  }

  private renew(now: number): void {
    if (this.store.plan !== 'pro' || this.store.proRenewsAt === null || now < this.store.proRenewsAt) return;
    if (this.store.proCancelled) return this.downgrade('Your Pro plan has ended. You are back on the Free plan.');
    if (this.sim.state.player.cash < PLANS.pro.price) return this.downgrade("Your Pro renewal payment didn't go through, so you're back on the Free plan.");
    this.sim.economy.record(-PLANS.pro.price, `${BRANDS.beatStore} Pro plan`, 'subscription');
    this.store.proRenewsAt += PLANS.pro.periodDays * MINUTES_PER_DAY;
    this.changed();
  }

  private downgrade(reason: string): void {
    this.store.plan = 'free';
    this.store.proRenewsAt = null;
    this.store.proCancelled = false;
    const limit = PLANS.free.maxListings;
    const actives = this.active().sort((a, b) => this.beat(b.beatId)!.quality.score - this.beat(a.beatId)!.quality.score);
    const removed = actives.slice(limit);
    removed.forEach((l) => (l.status = 'unlisted'));
    this.uniqueness = null;
    const extra = removed.length ? ` The Free plan lists ${limit} beats, so your ${removed.length} lowest-rated listing${removed.length === 1 ? ' was' : 's were'} unlisted.` : '';
    this.sim.messages.send(BRANDS.beatStore, 'Your plan changed', reason + extra);
    this.changed();
  }

  // ---------- Demand ----------

  private uniquenessOf(beatId: number): number {
    if (!this.uniqueness) {
      const actives = this.active().map((l) => this.beat(l.beatId)!);
      this.uniqueness = new Map(actives.map((b) => {
        let max = starterSimilarity(b.pattern);
        for (const other of actives) if (other.id !== b.id) max = Math.max(max, beatSimilarity(b.pattern, other.pattern));
        const penalty = Math.max(0, Math.min(1, (max - 0.4) / 0.6));
        return [b.id, 1 - (1 - DEMAND.uniquenessFloor) * penalty];
      }));
    }
    return this.uniqueness.get(beatId) ?? 1;
  }

  private qualityFactor(score: number): number {
    return Math.max(0.05, Math.pow(score / DEMAND.qualityPivot, DEMAND.qualityExponent));
  }

  private trendFactor(beat: Beat): number {
    const { genre, bpm } = beat.settings;
    return this.sim.trends.popularity(genre) * this.sim.trends.bpmFit(genre, bpm);
  }

  /** Per-tier demand at this listing's prices. */
  private tierFactors(listing: Listing, score: number): Record<LeaseTier, number> {
    const premium = DEMAND.premium(score, this.sim.state.player.skills.business);
    const out = {} as Record<LeaseTier, number>;
    for (const t of LEASE_TIERS) out[t] = LEASES[t].share * DEMAND.priceFactor(this.price(listing, t), LEASES[t].reference * premium);
    return out;
  }

  private weightFor(score: number, beat: Beat, now: number, listing: Listing): number {
    const tiers = this.tierFactors(listing, score);
    const price = LEASE_TIERS.reduce((s, t) => s + tiers[t], 0);
    const promo = (listing.promotedUntil ?? 0) > now ? DEMAND.promotionMultiplier : 1;
    const fresh = DEMAND.freshness((now - listing.listedAt) / MINUTES_PER_DAY);
    return this.qualityFactor(score) * this.trendFactor(beat) * this.uniquenessOf(beat.id) * price * promo * fresh;
  }

  private weight(listing: Listing, beat: Beat, now: number): number {
    return this.weightFor(beat.quality.score, beat, now, listing);
  }

  private today(day: number): DayStat {
    const last = this.store.history.at(-1);
    if (last?.day === day) return last;
    const fresh = { day, plays: 0, sales: 0, revenue: 0 };
    this.store.history.push(fresh);
    if (this.store.history.length > HISTORY_DAYS) this.store.history.shift();
    return fresh;
  }

  private hourly(time: CalendarTime, now: number): void {
    this.renew(now);
    this.resolveOffers(now);
    const actives = this.active();
    if (actives.length > 0) {
      const rng = this.sim.state.rng;
      const rand = () => nextFloat(rng);
      const entries = actives.map((l) => ({ l, beat: this.beat(l.beatId)!, w: 0 }));
      entries.forEach((e) => (e.w = this.weight(e.l, e.beat, now)));
      const total = entries.reduce((s, e) => s + e.w, 0);
      if (total > 0) {
        const marketing = DEMAND.marketing(this.sim.state.player.skills.marketing);
        const daily = DEMAND.base * Math.pow(total, DEMAND.catalogExponent) * this.reputation() * marketing;
        const hourFactor = DEMAND.hourWeight(time.hour) / 24;
        const stat = this.today(time.day);
        for (const { l, beat, w } of entries) {
          const lambda = daily * (w / total) * hourFactor;
          const plays = poisson(lambda / DEMAND.conversion(beat.quality.score), rand);
          l.plays += plays;
          stat.plays += plays;
          if (rand() < lambda) this.sellLease(l, beat, time);
        }
        this.maybeOffer(entries.map((e) => e.beat), time.hour);
      }
    }
    if (time.weekdayIndex === 1 && time.hour === 9 && time.day > 1) this.weeklySummary();
  }

  private buyerFor(beat: Beat): string {
    const rng = this.sim.state.rng;
    if (beat.settings.genre === 'trap' || beat.settings.genre === 'drill') {
      const prefix = pick(rng, RAPPER_PREFIXES);
      const name = pick(rng, RAPPER_NAMES);
      return prefix ? `${prefix} ${name}` : name;
    }
    return `${pick(rng, SINGER_FIRST)} ${pick(rng, SINGER_LAST)}`;
  }

  private sellLease(listing: Listing, beat: Beat, time: CalendarTime): void {
    const rng = this.sim.state.rng;
    const tiers = this.tierFactors(listing, beat.quality.score);
    const sum = LEASE_TIERS.reduce((s, t) => s + tiers[t], 0);
    let roll = nextFloat(rng) * sum;
    const tier = LEASE_TIERS.find((t) => (roll -= tiers[t]) < 0) ?? 'mp3';
    const gross = this.price(listing, tier);
    const buyer = this.buyerFor(beat);
    this.recordSale(listing, beat, tier, buyer, gross, time.day);
    this.store.leaseSales += 1;
  }

  private recordSale(listing: Listing, beat: Beat, tier: LeaseTier | 'exclusive', buyer: string, gross: Cents, day: number): void {
    const fee = Math.round(gross * this.plan().fee);
    const net = gross - fee;
    const name = tier === 'exclusive' ? 'Exclusive rights' : LEASES[tier].name;
    this.sim.economy.record(net, `${BRANDS.beatStore}: ${name} · ${beat.title}${fee ? ` (after ${formatMoney(fee)} fee)` : ''}`, 'income');
    const sale = { id: this.store.nextSaleId++, minute: this.sim.state.clock.totalMinutes, beatId: beat.id, tier, buyer, gross, fee };
    this.store.sales.push(sale);
    if (this.store.sales.length > SALES_LIMIT) this.store.sales.shift();
    listing.sales += 1;
    listing.revenue += net;
    const stat = this.today(day);
    stat.sales += 1;
    stat.revenue += net;
    this.sim.events.emit('beatSold', { sale, beatTitle: beat.title, net });
  }

  // ---------- Exclusive offers ----------

  private openOffers(): Offer[] {
    return this.store.offers.filter((o) => o.status === 'open' || o.status === 'countered');
  }

  /** Store-wide chance of an exclusive offer this hour, aimed at one of your better beats. */
  private maybeOffer(listed: Beat[], hour: number): void {
    const open = this.openOffers();
    if (open.length >= EXCLUSIVES.maxOpen) return;
    const eligible = listed.filter((b) => b.quality.score >= EXCLUSIVES.minScore && !open.some((o) => o.beatId === b.id));
    if (eligible.length === 0) return;
    const weights = eligible.map((b) => Math.pow(this.qualityFactor(b.quality.score), 2) * this.trendFactor(b));
    const best = Math.max(...eligible.map((b) => this.qualityFactor(b.quality.score)));
    const perDay = EXCLUSIVES.rate * best * best * Math.sqrt(this.reputation());
    const rng = this.sim.state.rng;
    if (nextFloat(rng) >= (perDay * DEMAND.hourWeight(hour)) / 24) return;
    let roll = nextFloat(rng) * weights.reduce((a, b) => a + b, 0);
    const target = eligible.find((_, i) => (roll -= weights[i]!) < 0) ?? eligible[0]!;
    this.spawnOffer(target);
  }

  private spawnOffer(beat: Beat): void {
    const rng = this.sim.state.rng;
    const now = this.sim.state.clock.totalMinutes;
    const qf = this.qualityFactor(beat.quality.score);
    const amount = Math.max(round25(EXCLUSIVES.baseOffer * 0.75), round25(
      EXCLUSIVES.baseOffer * Math.pow(qf, 1.2) * Math.sqrt(this.trendFactor(beat)) * (0.8 + 0.4 * nextFloat(rng)),
    ));
    const offer: Offer = {
      id: this.store.nextOfferId++, beatId: beat.id, buyer: this.buyerFor(beat), amount,
      createdAt: now, expiresAt: now + EXCLUSIVES.expiresMinutes, status: 'open', counter: null, replyAt: null,
    };
    this.store.offers.push(offer);
    this.sim.messages.send(
      offer.buyer,
      `Exclusive offer: "${beat.title}"`,
      `Yo, I want "${beat.title}" exclusive for my next single. I can do ${formatMoney(amount)} for full rights. Offer's good for 48 hours. You can answer in the ${BRANDS.beatStore} app.`,
    );
    this.sim.events.emit('offerReceived', { offer, beatTitle: beat.title });
    this.sim.events.emit('offersChanged', {});
  }

  /** Chance an artist accepts a counter, from how far above their offer it is and your Business skill. */
  counterOdds(offer: Offer, counter: Cents): number {
    const raise = counter / offer.amount - 1;
    const business = this.sim.state.player.skills.business;
    return Math.max(0, Math.min(1, 1 - raise * EXCLUSIVES.counterSlope * (1 - business / 150)));
  }

  counterAmount(offer: Offer, raise: number): Cents {
    return round25(offer.amount * (1 + raise));
  }

  private counter(offerId: number, raise: number): CommandResult {
    const o = this.offer(offerId);
    if (!o || o.status !== 'open') return fail('That offer is no longer open.');
    if (o.counter !== null) return fail('You already countered this offer once.');
    if (!(EXCLUSIVES.counterSteps as readonly number[]).includes(raise)) return fail('Unknown counter.');
    const rng = this.sim.state.rng;
    o.counter = this.counterAmount(o, raise);
    o.status = 'countered';
    o.replyAt = this.sim.state.clock.totalMinutes + nextInt(rng, EXCLUSIVES.replyMinutes.min, EXCLUSIVES.replyMinutes.max);
    this.sim.skills.gain('business', SKILL_XP.counter);
    this.sim.events.emit('offersChanged', {});
    return ok;
  }

  private accept(offerId: number): CommandResult {
    const o = this.offer(offerId);
    if (!o || o.status !== 'open') return fail(o?.status === 'countered' ? 'Wait for their reply to your counter.' : 'That offer is no longer open.');
    this.completeExclusive(o, o.amount);
    return ok;
  }

  private completeExclusive(o: Offer, amount: Cents): void {
    const beat = this.beat(o.beatId)!;
    let listing = this.listing(o.beatId);
    if (!listing) {
      listing = { beatId: beat.id, listedAt: this.sim.state.clock.totalMinutes, prices: {}, plays: 0, sales: 0, revenue: 0, promotedUntil: null, status: 'listed', soldTo: null };
      this.store.listings.push(listing);
    }
    o.status = 'accepted';
    this.recordSale(listing, beat, 'exclusive', o.buyer, amount, toCalendar(this.sim.state.clock.totalMinutes).day);
    listing.status = 'soldExclusive';
    listing.soldTo = o.buyer;
    listing.promotedUntil = null;
    for (const other of this.openOffers()) if (other.beatId === o.beatId) other.status = 'closed';
    this.uniqueness = null;
    this.sim.needs.change({ mood: 6 });
    this.sim.events.emit('offersChanged', {});
    this.changed();
  }

  private resolveOffers(now: number): void {
    const rng = this.sim.state.rng;
    let changed = false;
    for (const o of this.store.offers) {
      if (o.status === 'countered' && o.replyAt !== null && now >= o.replyAt) {
        const title = this.beat(o.beatId)?.title ?? 'your beat';
        if (nextFloat(rng) < this.counterOdds(o, o.counter!)) {
          this.sim.messages.send(o.buyer, `Re: "${title}"`, `Bet, ${formatMoney(o.counter!)} works. Sending it now.`);
          this.completeExclusive(o, o.counter!);
        } else if (nextFloat(rng) < EXCLUSIVES.walkAwayChance) {
          o.status = 'passed';
          this.sim.messages.send(o.buyer, `Re: "${title}"`, `${formatMoney(o.counter!)} is too rich for me. I'll pass.`);
        } else {
          o.status = 'open';
          o.expiresAt = Math.max(o.expiresAt, now + 12 * 60);
          this.sim.messages.send(o.buyer, `Re: "${title}"`, `Can't do ${formatMoney(o.counter!)}. My offer of ${formatMoney(o.amount)} still stands.`);
        }
        changed = true;
      } else if (o.status === 'open' && now >= o.expiresAt) {
        o.status = 'expired';
        changed = true;
      }
    }
    if (changed) this.sim.events.emit('offersChanged', {});
  }

  private weeklySummary(): void {
    if (this.store.listings.length === 0) return;
    const week = this.totals(7);
    const top = this.sim.trends.view()[0]!;
    this.sim.messages.send(
      BRANDS.beatStore,
      'Your week on BeatHub',
      `Last 7 days: ${week.plays} plays, ${week.sales} sale${week.sales === 1 ? '' : 's'}, ${formatMoney(week.revenue)} earned. ` +
        `Trending: ${GENRES[top.genre].name} is ${top.label.toLowerCase()} this week, with buyers looking for around ${top.hotBpm} BPM.`,
    );
  }

  private changed(): CommandResult {
    this.sim.events.emit('beathubChanged', {});
    return ok;
  }
}
