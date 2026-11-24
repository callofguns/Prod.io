import type { Simulation, System } from '../Simulation';
import { fail, ok, type CommandResult } from '../core/commands';
import { formatMoney } from '../core/money';
import { MINUTES_PER_DAY, toCalendar } from '../core/time';
import { BRANDS } from '../../content/brands';
import { CREDIT_PACK, LOOP_PLAN, loopById, loopOveruse, loopsUpTo, type LoopDef } from '../../content/loops';

/** LoopVault: the credits plan, buying loops, and how worn out each loop is. */
export class LoopSystem implements System {
  readonly id = 'loops';

  constructor(private sim: Simulation) {
    sim.handle('subscribeLoops', () => this.subscribe());
    sim.handle('cancelLoops', () => {
      if (!this.store.subscribed) return fail('You are not subscribed.');
      this.store.cancelled = true;
      return this.changed();
    });
    sim.handle('resumeLoops', () => {
      if (!this.store.subscribed) return fail('You are not subscribed.');
      this.store.cancelled = false;
      return this.changed();
    });
    sim.handle('buyCredits', () => this.buyCredits());
    sim.handle('buyLoop', ({ loopId }) => this.buy(loopId));
    sim.events.on('hour', ({ totalMinutes }) => this.renew(totalMinutes));
  }

  private get store() {
    return this.sim.state.loops;
  }

  catalog(): LoopDef[] {
    return loopsUpTo(toCalendar(this.sim.state.clock.totalMinutes).day);
  }

  owned(): LoopDef[] {
    return this.store.owned.map(loopById).filter((l): l is LoopDef => !!l);
  }

  owns(loopId: string): boolean {
    return this.store.owned.includes(loopId);
  }

  overuse(loopId: string | null | undefined): number {
    const loop = loopId ? loopById(loopId) : undefined;
    return loop ? loopOveruse(loop, this.sim.state.clock.totalMinutes) : 0;
  }

  private subscribe(): CommandResult {
    if (this.store.subscribed) return fail('You are already subscribed.');
    if (this.sim.state.player.cash < LOOP_PLAN.price) return fail(`Card declined. The plan costs ${formatMoney(LOOP_PLAN.price)} a month.`);
    this.sim.economy.record(-LOOP_PLAN.price, `${BRANDS.loopStore} ${LOOP_PLAN.name} plan`, 'subscription');
    Object.assign(this.store, {
      subscribed: true, cancelled: false,
      renewsAt: this.sim.state.clock.totalMinutes + LOOP_PLAN.periodDays * MINUTES_PER_DAY,
      credits: Math.min(LOOP_PLAN.maxCredits, this.store.credits + LOOP_PLAN.credits),
    });
    return this.changed();
  }

  private renew(now: number): void {
    const s = this.store;
    if (!s.subscribed || s.renewsAt === null || now < s.renewsAt) return;
    const end = (why: string) => {
      Object.assign(s, { subscribed: false, cancelled: false, renewsAt: null, credits: 0 });
      this.sim.messages.send(BRANDS.loopStore, 'Your plan ended', `${why} Unused credits expired. Loops you bought are yours to keep.`);
      this.changed();
    };
    if (s.cancelled) return end('Your Sounds plan has ended.');
    if (this.sim.state.player.cash < LOOP_PLAN.price) return end("Your renewal payment didn't go through.");
    this.sim.economy.record(-LOOP_PLAN.price, `${BRANDS.loopStore} ${LOOP_PLAN.name} plan`, 'subscription');
    s.renewsAt += LOOP_PLAN.periodDays * MINUTES_PER_DAY;
    s.credits = Math.min(LOOP_PLAN.maxCredits, s.credits + LOOP_PLAN.credits);
    this.changed();
  }

  private buyCredits(): CommandResult {
    if (!this.store.subscribed) return fail('Credit packs need an active plan.');
    if (this.sim.state.player.cash < CREDIT_PACK.price) return fail(`Card declined. A credit pack costs ${formatMoney(CREDIT_PACK.price)}.`);
    this.sim.economy.record(-CREDIT_PACK.price, `${BRANDS.loopStore} credit pack`, 'subscription');
    this.store.credits += CREDIT_PACK.credits;
    return this.changed();
  }

  private buy(loopId: string): CommandResult {
    const loop = this.catalog().find((l) => l.id === loopId);
    if (!loop) return fail('That loop is not on LoopVault.');
    if (this.owns(loopId)) return fail('You already own this loop.');
    if (!this.store.subscribed) return fail('Subscribe to get credits first.');
    if (this.store.credits < loop.credits) return fail(`You need ${loop.credits} credits.`);
    this.store.credits -= loop.credits;
    this.store.owned.push(loopId);
    return this.changed();
  }

  private changed(): CommandResult {
    this.sim.events.emit('loopsChanged', {});
    return ok;
  }
}
