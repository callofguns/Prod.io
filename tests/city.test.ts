import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/sim/Simulation';
import { createNewGameState, DEFAULT_SETUP, STATE_VERSION } from '../src/sim/core/state';
import { createRng } from '../src/sim/core/rng';
import { dollars } from '../src/sim/core/money';
import { MINUTES_PER_DAY, toCalendar } from '../src/sim/core/time';
import { defaultSettings } from '../src/content/music';
import { TRANSIT } from '../src/content/city';
import { GEAR_BASE_FACTOR, gearById } from '../src/content/gear';
import { LOOP_PLAN, loopById, loopOveruse, loopsUpTo } from '../src/content/loops';
import { rateBeat } from '../src/sim/quality/rateBeat';
import { migrate } from '../src/save/migrations';
import { playerPattern } from './helpers/playerPattern';

const newSim = (seed = 7) => new Simulation(createNewGameState(seed, DEFAULT_SETUP));
const skip = (sim: Simulation, minutes: number) => sim.dispatch('debugSkipMinutes', { minutes });
/** Skip to the next time the clock reads `hour`:00. */
function skipTo(sim: Simulation, hour: number) {
  const now = sim.state.clock.totalMinutes;
  const t = toCalendar(now);
  let target = now - t.hour * 60 - t.minute + hour * 60;
  if (target <= now) target += MINUTES_PER_DAY;
  skip(sim, target - now);
}
const finishTrip = (sim: Simulation) => skip(sim, sim.state.activity!.until - sim.state.clock.totalMinutes);
const act = (sim: Simulation, objectId: string, actionId: string) => sim.dispatch('performAction', { objectId, actionId });

describe('getting around Bayport', () => {
  it('leaves the apartment onto the Eastside street and comes back in', () => {
    const sim = newSim();
    expect(sim.city.area()).toBe('apartment');
    expect(act(sim, 'door', 'leave').ok).toBe(true);
    expect(sim.city.area()).toBe('eastside');
    expect(sim.state.player.location.spawn).toBe('home');
    expect(act(sim, 'homeDoor', 'enter').ok).toBe(true);
    expect(sim.city.area()).toBe('apartment');
  });

  it('takes the bus: waits for the next bus, pays the fare, arrives at the stop', () => {
    const sim = newSim();
    act(sim, 'door', 'leave');
    skip(sim, 7); // 08:07, next bus at 08:15
    expect(sim.city.nextBus()).toBe(8);
    const cash = sim.state.player.cash;
    expect(act(sim, 'busStop', 'bus').ok).toBe(true);
    expect(sim.state.player.cash).toBe(cash - TRANSIT.bus.fare);
    expect(sim.state.activity?.kind).toBe('traveling');
    expect(sim.activity.timeScale()).toBeGreaterThan(1);
    finishTrip(sim);
    expect(sim.state.activity).toBeNull();
    expect(sim.city.area()).toBe('midtown');
    expect(sim.state.player.location.spawn).toBe('busStop');
    expect(sim.state.clock.totalMinutes - (8 * 60 + 7)).toBe(8 + TRANSIT.bus.rideMinutes);
  });

  it('has no buses after midnight until 6:00', () => {
    const sim = newSim();
    act(sim, 'door', 'leave');
    skipTo(sim, 1);
    expect(sim.city.nextBus()).toBe(5 * 60);
  });

  it('walks between districts for free but it costs energy', () => {
    const sim = newSim();
    act(sim, 'door', 'leave');
    const energy = sim.state.needs.energy;
    expect(act(sim, 'toMidtown', 'walk').ok).toBe(true);
    expect(sim.state.needs.energy).toBeLessThanOrEqual(energy - TRANSIT.walk.energy);
    finishTrip(sim);
    expect(sim.city.area()).toBe('midtown');
    expect(sim.state.player.location.spawn).toBe('edge');
  });

  it('books a ride from anywhere, with evening surge, and can drop you home', () => {
    const sim = newSim();
    expect(sim.dispatch('travel', { to: 'home', mode: 'ride' }).ok).toBe(false); // already home
    const day = sim.city.rideFare();
    skipTo(sim, 18);
    expect(sim.city.rideFare()).toBeGreaterThan(day);
    expect(sim.dispatch('travel', { to: 'midtown', mode: 'ride' }).ok).toBe(true);
    finishTrip(sim);
    expect(sim.city.area()).toBe('midtown');
    expect(sim.dispatch('travel', { to: 'home', mode: 'ride' }).ok).toBe(true);
    finishTrip(sim);
    expect(sim.city.area()).toBe('apartment');
  });

  it('the bus only runs from a street, and not to where you already are', () => {
    const sim = newSim();
    expect(sim.dispatch('travel', { to: 'midtown', mode: 'bus' }).ok).toBe(false);
    act(sim, 'door', 'leave');
    expect(sim.dispatch('travel', { to: 'eastside', mode: 'bus' }).ok).toBe(false);
  });
});

describe('shops', () => {
  it('keep opening hours and send you out at closing time', () => {
    const sim = newSim();
    sim.city.moveTo('midtown', 'busStop');
    expect(act(sim, 'gearStoreDoor', 'enter').ok).toBe(false); // opens at 10
    skipTo(sim, 10);
    expect(act(sim, 'gearStoreDoor', 'enter').ok).toBe(true);
    expect(sim.city.area()).toBe('gearStore');
    skipTo(sim, 20);
    expect(sim.city.area()).toBe('midtown');
  });

  it('the corner store fills the fridge and is cheaper than delivery', () => {
    const sim = newSim();
    act(sim, 'door', 'leave');
    act(sim, 'groceryDoor', 'enter');
    const before = sim.state.home.fridge.groceries;
    const cash = sim.state.player.cash;
    expect(sim.dispatch('buyShopItem', { shop: 'grocery', itemId: 'groceries-small' }).ok).toBe(true);
    expect(sim.state.home.fridge.groceries).toBe(before + 6);
    expect(cash - sim.state.player.cash).toBeLessThan(dollars(34.8));
    expect(sim.dispatch('buyShopItem', { shop: 'cafe', itemId: 'coffee' }).ok).toBe(false); // wrong shop
  });

  it('café coffee gives energy and takes time', () => {
    const sim = newSim();
    sim.state.needs.energy = 40;
    sim.city.moveTo('cafe', 'door');
    const t = sim.state.clock.totalMinutes;
    expect(sim.dispatch('buyShopItem', { shop: 'cafe', itemId: 'coffee' }).ok).toBe(true);
    expect(sim.state.needs.energy).toBeGreaterThan(50);
    expect(sim.state.clock.totalMinutes).toBe(t + 15);
  });
});

describe('gear', () => {
  it('is bought at the gear store, lifts the quality factor and speeds up beats', () => {
    const sim = newSim();
    sim.economy.record(dollars(3000), 'Gift', 'income');
    expect(sim.gear.qualityFactor()).toBeCloseTo(GEAR_BASE_FACTOR);
    expect(sim.dispatch('buyGear', { itemId: 'headphones-studio' }).ok).toBe(false); // not in the store
    skipTo(sim, 11);
    sim.city.moveTo('gearStore', 'door');
    const minutes = sim.studio.workMinutes();
    expect(sim.dispatch('buyGear', { itemId: 'headphones-studio' }).ok).toBe(true);
    expect(sim.dispatch('buyGear', { itemId: 'headphones-studio' }).ok).toBe(false); // owned
    expect(sim.dispatch('buyGear', { itemId: 'monitors-5' }).ok).toBe(false); // needs an interface
    expect(sim.dispatch('buyGear', { itemId: 'interface-2in' }).ok).toBe(true);
    expect(sim.dispatch('buyGear', { itemId: 'monitors-5' }).ok).toBe(true);
    expect(sim.dispatch('buyGear', { itemId: 'midi-49' }).ok).toBe(true);
    expect(sim.dispatch('buyGear', { itemId: 'midi-mini' }).ok).toBe(false); // worse than what you have
    expect(sim.gear.qualityFactor()).toBeCloseTo(GEAR_BASE_FACTOR + 0.015 + 0.01 + 0.02 + 0.01);
    expect(sim.studio.workMinutes()).toBeLessThan(minutes);
  });

  it('better gear means a better score for the same beat', () => {
    const sim = newSim();
    const p = playerPattern('trap', createRng(3));
    const base = rateBeat(defaultSettings('trap'), p, sim.state.player.skills, 1, 0);
    const pro = rateBeat(defaultSettings('trap'), p, sim.state.player.skills, 1, 0, 1.08);
    expect(pro.score).toBeGreaterThan(base.score);
    expect(gearById('desktop-studio')!.speed).toBeLessThan(1);
  });
});

describe('LoopVault', () => {
  it('sells a monthly plan with credits that renew and roll over, and loops cost credits', () => {
    const sim = newSim();
    expect(sim.dispatch('buyLoop', { loopId: 'lv-glass-keys' }).ok).toBe(false);
    expect(sim.dispatch('subscribeLoops', {}).ok).toBe(true);
    expect(sim.state.loops.credits).toBe(LOOP_PLAN.credits);
    expect(sim.dispatch('buyLoop', { loopId: 'lv-glass-keys' }).ok).toBe(true);
    expect(sim.state.loops.credits).toBe(LOOP_PLAN.credits - loopById('lv-glass-keys')!.credits);
    expect(sim.dispatch('buyLoop', { loopId: 'lv-glass-keys' }).ok).toBe(false);
    const credits = sim.state.loops.credits;
    skip(sim, LOOP_PLAN.periodDays * MINUTES_PER_DAY + 60);
    expect(sim.state.loops.credits).toBe(credits + LOOP_PLAN.credits);
    sim.dispatch('cancelLoops', {});
    skip(sim, LOOP_PLAN.periodDays * MINUTES_PER_DAY + 60);
    expect(sim.state.loops.subscribed).toBe(false);
    expect(sim.state.loops.credits).toBe(0);
    expect(sim.loops.owns('lv-glass-keys')).toBe(true);
  });

  it('drops new loops every week, and popular loops wear out', () => {
    expect(loopsUpTo(15).length).toBe(loopsUpTo(1).length + 6);
    const drop = loopsUpTo(8)[0]!;
    expect(loopById(drop.id)).toEqual(drop);
    const fresh = loopOveruse(drop, (drop.releaseDay - 1) * MINUTES_PER_DAY);
    const later = loopOveruse(drop, (drop.releaseDay + 40) * MINUTES_PER_DAY);
    expect(fresh).toBeLessThan(0.05);
    expect(later).toBeGreaterThan(fresh);
    expect(later).toBeLessThanOrEqual(drop.popularity);
  });

  it('a good loop lifts the melody part; one from another genre hurts genre fit', () => {
    const sim = newSim();
    const p = playerPattern('rnb', createRng(4));
    const s = defaultSettings('rnb');
    const plain = rateBeat(s, p, sim.state.player.skills, 1);
    const withLoop = rateBeat(s, { ...p, loopId: 'lv-velvet' }, sim.state.player.skills, 1);
    const offGenre = rateBeat(s, { ...p, loopId: 'lv-slide-choir' }, sim.state.player.skills, 1);
    expect(withLoop.parts.melody).toBeGreaterThan(plain.parts.melody);
    expect(withLoop.score).toBeGreaterThan(plain.score);
    expect(offGenre.parts.genre).toBeLessThan(plain.parts.genre);
  });

  it("can't put a loop you don't own in the beat maker", () => {
    const sim = newSim();
    const pattern = { ...playerPattern('trap', createRng(5)), loopId: 'lv-night-bells' };
    expect(sim.dispatch('saveDraft', { settings: defaultSettings('trap'), pattern }).ok).toBe(false);
  });
});

describe('save upgrade to v8', () => {
  it('adds starter gear, an empty LoopVault and social accounts', () => {
    const state = createNewGameState(1, DEFAULT_SETUP) as unknown as Record<string, unknown>;
    const v7: Record<string, unknown> = { ...state, version: 7 };
    delete v7.gear;
    delete v7.loops;
    delete v7.social;
    const migrated = migrate(v7);
    expect(migrated.version).toBe(STATE_VERSION);
    expect(migrated.gear.owned).toContain('laptop-old');
    expect(migrated.loops.subscribed).toBe(false);
    expect(migrated.social.insta.followers).toBeGreaterThan(0);
    expect(migrated.social.tube.subscribers).toBe(0);
  });
});
