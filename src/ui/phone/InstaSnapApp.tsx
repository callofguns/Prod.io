import { useState } from 'preact/hooks';
import type { Simulation } from '../../sim/Simulation';
import type { SocialPost } from '../../sim/core/state';
import { INSTASNAP } from '../../content/social';
import { formatMoney } from '../../sim/core/money';
import { MINUTES_PER_DAY, MINUTES_PER_HOUR } from '../../sim/core/time';
import { useSimEvents } from '../hooks/useSim';

export const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.0', '')}M` : n >= 10_000 ? `${(n / 1000).toFixed(1).replace('.0', '')}K` : n.toLocaleString('en-US');

export const ago = (minute: number, now: number) => {
  const m = now - minute;
  if (m < MINUTES_PER_HOUR) return `${Math.max(1, m)} min ago`;
  if (m < MINUTES_PER_DAY) return `${Math.floor(m / MINUTES_PER_HOUR)} h ago`;
  return `${Math.floor(m / MINUTES_PER_DAY)} d ago`;
};

type Run = (r: { ok: true } | { ok: false; error: string }) => boolean;

function PostCard({ sim, post, run }: { sim: Simulation; post: SocialPost; run: Run }) {
  const [boosting, setBoosting] = useState(false);
  const now = sim.state.clock.totalMinutes;
  const beat = sim.state.studio.beats.find((b) => b.id === post.beatId);
  const boostActive = !!post.boost && post.boost.until > now;
  const paidReach = post.paid.reach + post.boostDone.reach;
  return (
    <li class="snap-post">
      <div class="snap-cover" aria-hidden="true"><span>{beat?.quality.grade ?? '?'}</span></div>
      <div class="snap-body">
        <p class="row-title">"{beat?.title ?? 'Beat'}" snippet</p>
        <p class="row-sub">{ago(post.at, now)} · {compact(post.reach + paidReach)} reached · {compact(post.likes)} likes</p>
        <p class="row-sub">+{post.follows + post.boostDone.follows} followers · {post.clicks + post.boostDone.clicks} link taps</p>
        {post.paid.spent > 0 && (
          <p class="row-sub">{boostActive ? 'Boost running' : 'Boosted'} · {formatMoney(post.paid.spent)} spent · {compact(paidReach)} paid reach</p>
        )}
        {!boostActive && !boosting && <button class="link-button" onClick={() => setBoosting(true)}>Boost post</button>}
        {boosting && (
          <div class="loan-amounts">
            {INSTASNAP.boosts.map((b, i) => (
              <button key={i} class="order" onClick={() => { if (run(sim.dispatch('boostPost', { postId: post.id, tier: i }))) setBoosting(false); }}>
                {formatMoney(b.price).replace('.00', '')} · {b.days} d
              </button>
            ))}
            <button class="link-button" onClick={() => setBoosting(false)}>Cancel</button>
          </div>
        )}
      </div>
    </li>
  );
}

/** InstaSnap: post beat snippets, watch them spread, pay to boost them. */
export function InstaSnapApp({ sim, onError }: { sim: Simulation; onError: (msg: string) => void }) {
  useSimEvents(sim, ['socialChanged', 'cashChanged', 'beatFinished', 'hour']);
  const [picking, setPicking] = useState(false);
  const { insta } = sim.state.social;
  const run: Run = (r) => {
    if (!r.ok) onError(r.error);
    return r.ok;
  };
  const beats = [...sim.state.studio.beats].reverse();
  const posts = [...insta.posts].reverse();
  const alias = sim.state.player.alias;

  return (
    <div class="app">
      <section class="snap-profile">
        <div class="snap-avatar" aria-hidden="true">{alias.slice(0, 1).toUpperCase()}</div>
        <div>
          <p class="row-title">@{alias.toLowerCase().replace(/[^a-z0-9_.]/g, '')}</p>
          <p class="row-sub"><strong>{compact(insta.followers)}</strong> followers · <strong>{insta.posts.length}</strong> posts</p>
        </div>
      </section>

      {!picking ? (
        <button data-tut="snap-new" class="order wide-order" onClick={() => setPicking(true)} disabled={beats.length === 0}>
          {beats.length === 0 ? 'Make a beat to post a snippet' : 'New snippet post'}
        </button>
      ) : (
        <section>
          <h3 class="app-heading">Post a snippet of… <button class="link-button" onClick={() => setPicking(false)}>Cancel</button></h3>
          <ul class="rows">
            {beats.slice(0, 12).map((b) => (
              <li key={b.id} class="row">
                <span class={`grade grade-${b.quality.grade} mini`}>{b.quality.grade}</span>
                <span class="row-main">
                  <span class="row-title">{b.title}</span>
                  <span class="row-sub">score {b.quality.score}{insta.posts.some((p) => p.beatId === b.id) ? ' · posted before' : ''}</span>
                </span>
                <button data-tut="snap-post" class="order" onClick={() => { if (run(sim.dispatch('postSnippet', { beatId: b.id }))) setPicking(false); }}>Post</button>
              </li>
            ))}
          </ul>
          <p class="app-empty">Takes {INSTASNAP.postMinutes} minutes. Better beats reach more people. More than one post a day reaches fewer.</p>
        </section>
      )}

      <section>
        <h3 class="app-heading">Your posts</h3>
        {posts.length === 0 ? <p class="app-empty">No posts yet. Snippets bring listeners to your BeatHub store through the link in your bio.</p> : (
          <ul class="snap-feed">{posts.slice(0, 20).map((p) => <PostCard key={p.id} sim={sim} post={p} run={run} />)}</ul>
        )}
      </section>
    </div>
  );
}
