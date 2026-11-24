import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/sim/Simulation';
import { createNewGameState, DEFAULT_SETUP } from '../src/sim/core/state';
import { createRng, pick } from '../src/sim/core/rng';
import { dollars } from '../src/sim/core/money';
import { MINUTES_PER_DAY } from '../src/sim/core/time';
import { defaultSettings, GENRES, type GenreId } from '../src/content/music';
import { INSTASNAP, TYPE_ARTISTS, VIEWTUBE } from '../src/content/social';
import { playerPattern } from './helpers/playerPattern';

const newSim = (seed = 11) => new Simulation(createNewGameState(seed, DEFAULT_SETUP));
const skip = (sim: Simulation, minutes: number) => sim.dispatch('debugSkipMinutes', { minutes });

function makeBeat(sim: Simulation, genre: GenreId = 'trap', seed = 1) {
  sim.state.needs = { energy: 100, food: 100, mood: 70 };
  sim.dispatch('saveDraft', { settings: defaultSettings(genre), pattern: playerPattern(genre, createRng(seed)) });
  const r = sim.dispatch('finishBeat', { title: `Beat ${seed}` });
  if (!r.ok) throw new Error(r.error);
  skip(sim, sim.state.activity!.until - sim.state.clock.totalMinutes);
  return sim.state.studio.beats.at(-1)!;
}

describe('InstaSnap', () => {
  it('a snippet fills in over a few days, gains followers and sends BeatHub plays', () => {
    const sim = newSim();
    const beat = makeBeat(sim);
    sim.dispatch('listBeat', { beatId: beat.id });
    const followers = sim.state.social.insta.followers;
    const plays = sim.beathub.listing(beat.id)!.plays;
    const t = sim.state.clock.totalMinutes;
    expect(sim.dispatch('postSnippet', { beatId: beat.id }).ok).toBe(true);
    expect(sim.state.clock.totalMinutes).toBe(t + INSTASNAP.postMinutes);
    const post = sim.state.social.insta.posts[0]!;
    expect(post.target.reach).toBeGreaterThan(0);
    skip(sim, 4 * MINUTES_PER_DAY);
    expect(post.reach).toBe(post.target.reach);
    expect(post.likes).toBe(post.target.likes);
    expect(sim.state.social.insta.followers).toBe(followers + post.target.follows);
    expect(sim.beathub.listing(beat.id)!.plays).toBeGreaterThanOrEqual(plays + post.target.clicks);
  });

  it('posting again the same day reaches fewer people', () => {
    const sim = newSim();
    const a = makeBeat(sim, 'trap', 1);
    sim.dispatch('postSnippet', { beatId: a.id });
    sim.dispatch('postSnippet', { beatId: a.id });
    sim.dispatch('postSnippet', { beatId: a.id });
    const [p1, , p3] = sim.state.social.insta.posts;
    expect(p3!.target.reach).toBeLessThan(p1!.target.reach);
  });

  it('a paid boost costs money and brings reach, followers and clicks over its days', () => {
    const sim = newSim();
    const beat = makeBeat(sim);
    sim.dispatch('postSnippet', { beatId: beat.id });
    const post = sim.state.social.insta.posts[0]!;
    const cash = sim.state.player.cash;
    expect(sim.dispatch('boostPost', { postId: post.id, tier: 1 }).ok).toBe(true);
    expect(sim.state.player.cash).toBe(cash - INSTASNAP.boosts[1].price);
    expect(sim.dispatch('boostPost', { postId: post.id, tier: 0 }).ok).toBe(false); // already running
    skip(sim, (INSTASNAP.boosts[1].days + 1) * MINUTES_PER_DAY);
    expect(post.boostDone.reach).toBe(post.boost!.reach);
    expect(post.boost!.reach).toBeGreaterThan(2000);
    // A second boost later adds to what the first one delivered.
    expect(sim.dispatch('boostPost', { postId: post.id, tier: 0 }).ok).toBe(true);
    expect(post.paid.reach).toBeGreaterThan(2000);
    expect(post.paid.spent).toBe(INSTASNAP.boosts[1].price + INSTASNAP.boosts[0].price);
  });
});

describe('ViewTube', () => {
  it('uploads a type beat once, and views, subscribers and watch time build up', () => {
    const sim = newSim();
    const beat = makeBeat(sim);
    const tag = sim.social.suggestedTag(beat);
    expect(TYPE_ARTISTS.find((a) => a.name === tag)!.genre).toBe('trap');
    expect(sim.dispatch('uploadVideo', { beatId: beat.id, tag }).ok).toBe(true);
    expect(sim.dispatch('uploadVideo', { beatId: beat.id, tag }).ok).toBe(false);
    const v = sim.state.social.tube.videos[0]!;
    expect(v.title).toContain('Type Beat');
    skip(sim, 2 * MINUTES_PER_DAY);
    const early = v.views;
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(v.target.views);
    skip(sim, VIEWTUBE.activeDays * MINUTES_PER_DAY);
    expect(v.views).toBe(v.target.views);
    expect(sim.state.social.tube.subscribers).toBe(v.target.subs);
    expect(sim.state.social.tube.watchMinutes).toBeCloseTo(v.views * VIEWTUBE.watchMinutes);
  });

  it('an off-genre tag gets much less search traffic', () => {
    const sim = newSim();
    const trapTag = TYPE_ARTISTS.find((a) => a.genre === 'trap')!.name;
    expect(sim.social.tagHeat(trapTag, 'rnb')).toBeLessThan(sim.social.tagHeat(trapTag, 'trap'));
  });

  it('joins the Partner Program at 1,000 subscribers and 4,000 watch hours, then pays monthly', () => {
    const sim = newSim();
    const beat = makeBeat(sim);
    sim.dispatch('debugAddAudience', { followers: 0, subscribers: 1000 });
    sim.state.social.tube.watchMinutes = 4000 * 60;
    skip(sim, 60);
    expect(sim.state.social.tube.partner).toBe('review');
    skip(sim, VIEWTUBE.partner.reviewDays * MINUTES_PER_DAY + 60);
    expect(sim.state.social.tube.partner).toBe('approved');
    // A big video during the month earns ad money, paid on the 1st.
    if (sim.state.activity?.kind === 'sleeping') sim.dispatch('wakeUp', {});
    sim.dispatch('uploadVideo', { beatId: beat.id, tag: sim.social.suggestedTag(beat) });
    const v = sim.state.social.tube.videos[0]!;
    v.target.views = 200_000;
    const income = () => sim.state.finance.ledger.filter((t) => t.description.includes('ad revenue')).length;
    skip(sim, 40 * MINUTES_PER_DAY);
    expect(income()).toBe(1);
    expect(sim.state.social.tube.paidTotal).toBeGreaterThanOrEqual(dollars(100));
  });
});

describe('social economy sanity', () => {
  /** Lease income over 6 weeks for a steady producer, with or without social media. */
  function sixWeeks(seed: number, social: boolean): number {
    const sim = newSim(seed);
    const r = createRng(100 + seed);
    const genres = Object.keys(GENRES) as GenreId[];
    let lease = 0;
    sim.events.on('beatSold', ({ sale, net }) => { if (sale.tier !== 'exclusive') lease += net; });
    for (let day = 1; day <= 42; day++) {
      const dayStart = sim.state.clock.totalMinutes;
      for (let i = 0; i < (day % 2 ? 2 : 3); i++) {
        sim.state.needs = { energy: 100, food: 100, mood: 70 };
        const g = pick(r, genres);
        sim.dispatch('saveDraft', { settings: defaultSettings(g), pattern: playerPattern(g, r) });
        sim.dispatch('finishBeat', { title: 'x' });
        skip(sim, sim.state.activity!.until - sim.state.clock.totalMinutes);
        const beat = sim.state.studio.beats.at(-1)!;
        sim.dispatch('listBeat', { beatId: beat.id });
        if (social) {
          if (i === 0) sim.dispatch('postSnippet', { beatId: beat.id });
          sim.dispatch('uploadVideo', { beatId: beat.id, tag: sim.social.suggestedTag(beat) });
        }
      }
      if (day === 8) sim.dispatch('upgradePlan', {});
      skip(sim, dayStart + MINUTES_PER_DAY - sim.state.clock.totalMinutes);
    }
    expect(Number.isFinite(sim.state.social.tube.totalViews)).toBe(true);
    return lease;
  }

  it('posting and uploading helps sales clearly, but does not explode them', { timeout: 60000 }, () => {
    const withSocial = sixWeeks(3, true);
    const without = sixWeeks(3, false);
    expect(withSocial / without).toBeGreaterThan(1.15);
    expect(withSocial / without).toBeLessThan(2.6);
  });
});
