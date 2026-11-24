import type { Simulation, System } from '../Simulation';
import { fail, ok, type CommandResult } from '../core/commands';
import { formatMoney } from '../core/money';
import { nextFloat, pick } from '../core/rng';
import { MINUTES_PER_DAY, MINUTES_PER_HOUR, toCalendar } from '../core/time';
import type { Beat, SocialPost, Video } from '../core/state';
import { BRANDS } from '../../content/brands';
import { GENRES } from '../../content/music';
import { COMMENTS, INSTASNAP, TYPE_ARTISTS, VIEWTUBE, artistBuzz, audienceFactor, socialQuality } from '../../content/social';

export type Source = 'instasnap' | 'viewtube';

/**
 * InstaSnap and ViewTube. When you post, the system decides how far the post
 * will go (from the beat's quality, your audience, trends and some luck); the
 * numbers then fill in hour by hour, and link clicks become BeatHub visits.
 */
export class SocialSystem implements System {
  readonly id = 'social';

  constructor(private sim: Simulation) {
    sim.handle('postSnippet', ({ beatId }) => this.post(beatId));
    sim.handle('boostPost', ({ postId, tier }) => this.boost(postId, tier));
    sim.handle('uploadVideo', ({ beatId, tag }) => this.upload(beatId, tag));
    sim.events.on('hour', ({ totalMinutes }) => this.hourly(totalMinutes));
    sim.events.on('monthStarted', () => this.payout());
  }

  private get insta() {
    return this.sim.state.social.insta;
  }

  private get tube() {
    return this.sim.state.social.tube;
  }

  private rand(lo: number, hi: number): number {
    return lo + (hi - lo) * nextFloat(this.sim.state.rng);
  }

  private beat(id: number): Beat | undefined {
    return this.sim.state.studio.beats.find((b) => b.id === id);
  }

  /** Followers plus subscribers. */
  audience(): number {
    return this.insta.followers + this.tube.subscribers;
  }

  /** BeatHub traffic multiplier from your audience. */
  storeBoost(): number {
    return audienceFactor(this.audience());
  }

  watchHours(): number {
    return Math.floor(this.tube.watchMinutes / 60);
  }

  // ---------- Type-beat tags ----------

  /** How much search traffic a type-beat tag gets this week (1 = average). */
  tagHeat(tag: string, beatGenre?: string): number {
    const i = TYPE_ARTISTS.findIndex((a) => a.name === tag);
    if (i < 0) return 0.5;
    const artist = TYPE_ARTISTS[i]!;
    const week = Math.floor(this.sim.state.clock.totalMinutes / (7 * MINUTES_PER_DAY));
    const heat = artist.fame * artistBuzz(i, week) * this.sim.trends.popularity(artist.genre);
    return beatGenre && beatGenre !== artist.genre ? heat * VIEWTUBE.offGenreTag : heat;
  }

  tags(): { name: string; genre: string; heat: number }[] {
    return TYPE_ARTISTS.map((a) => ({ name: a.name, genre: a.genre, heat: this.tagHeat(a.name) }));
  }

  // ---------- InstaSnap ----------

  postBlocker(beatId: number): string | null {
    if (!this.beat(beatId)) return 'Unknown beat.';
    if (this.sim.activity.isBusy()) return 'You are busy.';
    return null;
  }

  private post(beatId: number): CommandResult {
    const blocked = this.postBlocker(beatId);
    if (blocked) return fail(blocked);
    const beat = this.beat(beatId)!;
    const now = this.sim.state.clock.totalMinutes;
    const q = socialQuality(beat.quality.score);
    const recent = this.insta.posts.filter((p) => now - p.at < MINUTES_PER_DAY).length;
    const fatigue = Math.pow(INSTASNAP.fatigue, recent);
    const repeat = this.insta.posts.some((p) => p.beatId === beatId) ? 0.4 : 1;
    const marketing = 1 + this.sim.state.player.skills.marketing / 100;
    const fromFollowers = this.insta.followers * INSTASNAP.followerReach * fatigue;
    const explore = INSTASNAP.explore * Math.pow(q, 1.2) * fatigue * repeat * marketing * this.rand(0.7, 1.3);
    const reach = fromFollowers + explore;
    const post: SocialPost = {
      id: this.insta.nextPostId++, beatId, at: now,
      target: {
        reach: Math.round(reach),
        likes: Math.round(reach * INSTASNAP.likeRate(q)),
        follows: Math.round(explore * INSTASNAP.followRate * Math.min(2.5, q)),
        clicks: Math.round(reach * INSTASNAP.clickRate * Math.sqrt(Math.min(2.5, q))),
      },
      reach: 0, likes: 0, follows: 0, clicks: 0, boost: null, boostDone: { reach: 0, follows: 0, clicks: 0 }, paid: { spent: 0, reach: 0 },
    };
    this.insta.posts.push(post);
    if (this.insta.posts.length > 200) this.insta.posts.shift();
    this.sim.skills.gain('marketing', INSTASNAP.skillXp);
    this.sim.clock.skip(INSTASNAP.postMinutes);
    this.sim.events.emit('notice', { text: `Posted a snippet of "${beat.title}" on ${BRANDS.social}.`, tone: 'good' });
    return this.changed();
  }

  private boost(postId: number, tier: number): CommandResult {
    const post = this.insta.posts.find((p) => p.id === postId);
    const option = INSTASNAP.boosts[tier];
    if (!post || !option) return fail('Unknown post.');
    const now = this.sim.state.clock.totalMinutes;
    if (post.boost && post.boost.until > now) return fail('This post is already boosted.');
    if (this.sim.state.player.cash < option.price) return fail(`Card declined. The boost costs ${formatMoney(option.price)}.`);
    const beat = this.beat(post.beatId);
    const q = socialQuality(beat?.quality.score ?? 50);
    this.sim.economy.record(-option.price, `${BRANDS.social} boost: "${beat?.title ?? 'post'}"`, 'marketing');
    const reach = Math.round((option.price / 100) * INSTASNAP.reachPerDollar * this.rand(0.85, 1.15));
    // Bank what the last boost delivered, then start the new one.
    post.paid = { spent: post.paid.spent + option.price, reach: post.paid.reach + post.boostDone.reach };
    post.boostDone = { reach: 0, follows: 0, clicks: 0 };
    post.boost = {
      reach,
      follows: Math.round(reach * INSTASNAP.followRate * Math.min(2.5, q) * INSTASNAP.boostFollowFactor),
      clicks: Math.round(reach * INSTASNAP.clickRate * INSTASNAP.boostClickFactor),
      from: now, until: now + option.days * MINUTES_PER_DAY,
    };
    this.sim.skills.gain('marketing', INSTASNAP.skillXp);
    return this.changed();
  }

  // ---------- ViewTube ----------

  uploadBlocker(beatId: number): string | null {
    if (!this.beat(beatId)) return 'Unknown beat.';
    if (this.tube.videos.some((v) => v.beatId === beatId)) return 'Already on your channel.';
    if (this.sim.activity.isBusy()) return 'You are busy.';
    return null;
  }

  videoTitle(beat: Beat, tag: string): string {
    return `${tag} Type Beat - "${beat.title}"`;
  }

  private upload(beatId: number, tag: string): CommandResult {
    const blocked = this.uploadBlocker(beatId);
    if (blocked) return fail(blocked);
    if (!TYPE_ARTISTS.some((a) => a.name === tag)) return fail('Pick an artist tag.');
    const beat = this.beat(beatId)!;
    const now = this.sim.state.clock.totalMinutes;
    const q = socialQuality(beat.quality.score);
    const subs = this.tube.subscribers;
    const heat = this.tagHeat(tag, beat.settings.genre);
    const marketing = 1 + this.sim.state.player.skills.marketing / 200;
    const discovery = VIEWTUBE.discovery * Math.pow(q, 1.2) * heat * (1 + Math.log10(1 + subs) * VIEWTUBE.channelBoost) * marketing * this.rand(0.6, 1.4);
    const fromSubs = subs * VIEWTUBE.subscriberReach * Math.min(1.5, Math.sqrt(q));
    const viral = nextFloat(this.sim.state.rng) < VIEWTUBE.viralChance * Math.min(3, q);
    const views = Math.round((discovery + fromSubs) * (viral ? this.rand(VIEWTUBE.viralMultiplier.min, VIEWTUBE.viralMultiplier.max) : 1));
    const pool = beat.quality.score >= 70 ? COMMENTS.good : beat.quality.score >= 55 ? COMMENTS.ok : COMMENTS.weak;
    const video: Video = {
      id: this.tube.nextVideoId++, beatId, title: this.videoTitle(beat, tag), tag, at: now, viral,
      target: {
        views,
        likes: Math.round(views * VIEWTUBE.likeRate * Math.sqrt(Math.min(2.5, q))),
        subs: Math.round(views * VIEWTUBE.subscribeRate * Math.min(2.5, q)),
        clicks: Math.round(views * VIEWTUBE.clickRate),
      },
      views: 0, likes: 0, subs: 0, clicks: 0, comment: pick(this.sim.state.rng, pool),
    };
    this.tube.videos.push(video);
    this.sim.skills.gain('marketing', VIEWTUBE.skillXp);
    this.sim.clock.skip(VIEWTUBE.uploadMinutes);
    this.sim.events.emit('notice', { text: `Uploaded "${video.title}" to ${BRANDS.video}.`, tone: 'good' });
    return this.changed();
  }

  // ---------- Hourly ----------

  private hourly(now: number): void {
    let changed = false;
    for (const p of this.insta.posts) changed = this.tickPost(p, now) || changed;
    for (const v of this.tube.videos) changed = this.tickVideo(v, now) || changed;
    changed = this.checkPartner(now) || changed;
    if (changed) this.sim.events.emit('socialChanged', {});
  }

  private tickPost(p: SocialPost, now: number): boolean {
    const ageHours = (now - p.at) / MINUTES_PER_HOUR;
    let follows = 0;
    let clicks = 0;
    if (ageHours <= INSTASNAP.activeHours + 1) {
      const frac = ageHours >= INSTASNAP.activeHours ? 1 : INSTASNAP.curve(ageHours);
      const next = (k: keyof SocialPost['target']) => Math.round(p.target[k] * frac);
      follows += next('follows') - p.follows;
      clicks += next('clicks') - p.clicks;
      p.reach = next('reach');
      p.likes = next('likes');
      p.follows = next('follows');
      p.clicks = next('clicks');
    }
    const b = p.boost;
    if (b && now <= b.until + MINUTES_PER_HOUR) {
      const frac = Math.min(1, (now - b.from) / Math.max(1, b.until - b.from));
      const d = p.boostDone;
      const nf = Math.round(b.follows * frac);
      const nc = Math.round(b.clicks * frac);
      follows += nf - d.follows;
      clicks += nc - d.clicks;
      p.boostDone = { reach: Math.round(b.reach * frac), follows: nf, clicks: nc };
    }
    this.insta.followers += follows;
    if (clicks > 0) this.sim.beathub.externalVisits(p.beatId, clicks, 'instasnap');
    return ageHours <= INSTASNAP.activeHours + 1 || (b !== null && now <= b.until + MINUTES_PER_HOUR);
  }

  private tickVideo(v: Video, now: number): boolean {
    const ageDays = (now - v.at) / MINUTES_PER_DAY;
    if (ageDays > VIEWTUBE.activeDays + 1) return false;
    const frac = ageDays >= VIEWTUBE.activeDays ? 1 : Math.max(0, VIEWTUBE.curve(ageDays));
    const next = (k: keyof Video['target']) => Math.max(v[k], Math.round(v.target[k] * frac));
    const views = next('views') - v.views;
    const subs = next('subs') - v.subs;
    const clicks = next('clicks') - v.clicks;
    v.likes = next('likes');
    if (views === 0 && subs === 0 && clicks === 0) return false;
    v.views += views;
    v.subs += subs;
    v.clicks += clicks;
    const t = this.tube;
    t.subscribers += subs;
    t.totalViews += views;
    t.watchMinutes += views * VIEWTUBE.watchMinutes;
    if (t.partner === 'approved') t.unpaid += (views * VIEWTUBE.rpm) / 1000;
    if (clicks > 0) this.sim.beathub.externalVisits(v.beatId, clicks, 'viewtube');
    return true;
  }

  private checkPartner(now: number): boolean {
    const t = this.tube;
    const { subscribers, watchHours, reviewDays } = VIEWTUBE.partner;
    if (t.partner === 'none' && t.subscribers >= subscribers && this.watchHours() >= watchHours) {
      t.partner = 'review';
      t.partnerAt = now + reviewDays * MINUTES_PER_DAY;
      this.sim.messages.send(BRANDS.video, 'Partner Program: application received',
        `Your channel passed ${subscribers.toLocaleString('en-US')} subscribers and ${watchHours.toLocaleString('en-US')} watch hours. We're reviewing it now; it usually takes a few days.`);
      return true;
    }
    if (t.partner === 'review' && t.partnerAt !== null && now >= t.partnerAt) {
      t.partner = 'approved';
      this.sim.messages.send(BRANDS.video, "You're in the Partner Program",
        `Ads are now on for your videos. Earnings are paid at the start of each month once they reach ${formatMoney(VIEWTUBE.payoutThreshold)}.`);
      return true;
    }
    return false;
  }

  private payout(): void {
    const t = this.tube;
    if (t.unpaid < VIEWTUBE.payoutThreshold) return;
    const amount = Math.floor(t.unpaid);
    t.unpaid -= amount;
    t.paidTotal += amount;
    const month = toCalendar(this.sim.state.clock.totalMinutes - 1).month;
    this.sim.economy.record(amount, `${BRANDS.video} ad revenue (${month})`, 'income');
    this.changed();
  }

  /** The genre whose tags fit a beat best, for suggestions. */
  suggestedTag(beat: Beat): string {
    const fits = TYPE_ARTISTS.filter((a) => a.genre === beat.settings.genre);
    return [...fits].sort((a, b) => this.tagHeat(b.name) - this.tagHeat(a.name))[0]?.name ?? TYPE_ARTISTS[0]!.name;
  }

  genreName(genre: string): string {
    return GENRES[genre as keyof typeof GENRES]?.name ?? genre;
  }

  private changed(): CommandResult {
    this.sim.events.emit('socialChanged', {});
    return ok;
  }
}
