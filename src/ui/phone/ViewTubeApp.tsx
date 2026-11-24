import { useState } from 'preact/hooks';
import type { Simulation } from '../../sim/Simulation';
import type { Beat } from '../../sim/core/state';
import { VIEWTUBE } from '../../content/social';
import { GENRES } from '../../content/music';
import { formatMoney } from '../../sim/core/money';
import { useSimEvents } from '../hooks/useSim';
import { ago, compact } from './InstaSnapApp';

const heatLabel = (h: number) => (h >= 1.3 ? 'Hot' : h >= 0.9 ? 'Steady' : 'Quiet');

function Progress({ label, value, goal }: { label: string; value: number; goal: number }) {
  const pct = Math.min(100, (value / goal) * 100);
  return (
    <div class="tube-progress">
      <span class="row-sub">{label}: <strong>{compact(Math.floor(value))}</strong> / {compact(goal)}</span>
      <span class="skill-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.floor(value)}>
        <span style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

function Upload({ sim, beat, onDone, onError }: { sim: Simulation; beat: Beat; onDone: () => void; onError: (m: string) => void }) {
  const suggested = sim.social.suggestedTag(beat);
  const [tag, setTag] = useState(suggested);
  const tags = sim.social.tags().sort((a, b) => Number(b.genre === beat.settings.genre) - Number(a.genre === beat.settings.genre) || b.heat - a.heat);
  return (
    <section>
      <h3 class="app-heading">Upload "{beat.title}"</h3>
      <p class="app-empty">Pick the artist your beat sounds like. People search for "[artist] type beat". Tags from {GENRES[beat.settings.genre].name} fit this beat.</p>
      <ul class="rows">
        {tags.map((t) => {
          const fits = t.genre === beat.settings.genre;
          return (
            <li key={t.name}>
              <button class="row row-button tube-tag" aria-pressed={tag === t.name} onClick={() => setTag(t.name)}>
                <span class="tube-radio" aria-hidden="true">{tag === t.name ? '●' : '○'}</span>
                <span class="row-main">
                  <span class="row-title">{t.name}</span>
                  <span class="row-sub">{GENRES[t.genre as keyof typeof GENRES].name} · {fits ? heatLabel(t.heat) : 'wrong genre, few views'}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p class="app-empty">Title: {sim.social.videoTitle(beat, tag)}</p>
      <div class="loan-amounts">
        <button class="order" onClick={() => {
          const r = sim.dispatch('uploadVideo', { beatId: beat.id, tag });
          if (!r.ok) onError(r.error);
          else onDone();
        }}>Upload · {VIEWTUBE.uploadMinutes} min</button>
        <button class="link-button" onClick={onDone}>Cancel</button>
      </div>
    </section>
  );
}

/** ViewTube: a type-beat channel. Uploads bring views, subscribers and BeatHub buyers; ads pay once you're a partner. */
export function ViewTubeApp({ sim, onError }: { sim: Simulation; onError: (msg: string) => void }) {
  useSimEvents(sim, ['socialChanged', 'beatFinished', 'hour']);
  const [picking, setPicking] = useState(false);
  const [beatId, setBeatId] = useState<number | null>(null);
  const tube = sim.state.social.tube;
  const now = sim.state.clock.totalMinutes;
  const beats = [...sim.state.studio.beats].reverse().filter((b) => !tube.videos.some((v) => v.beatId === b.id));
  const uploading = beatId !== null ? sim.state.studio.beats.find((b) => b.id === beatId) : undefined;
  const { partner } = VIEWTUBE;

  if (uploading) return <div class="app"><Upload sim={sim} beat={uploading} onError={onError} onDone={() => { setBeatId(null); setPicking(false); }} /></div>;

  return (
    <div class="app">
      <section>
        <div class="tiles">
          <div class="tile"><span class="tile-label">Subscribers</span><span class="tile-value">{compact(tube.subscribers)}</span></div>
          <div class="tile"><span class="tile-label">Views</span><span class="tile-value">{compact(tube.totalViews)}</span></div>
          <div class="tile"><span class="tile-label">Watch hours</span><span class="tile-value">{compact(sim.social.watchHours())}</span></div>
        </div>
      </section>

      <section>
        <h3 class="app-heading">Monetization</h3>
        {tube.partner === 'approved' ? (
          <p class="app-empty">
            Partner Program: ads are on. This month so far: <strong>{formatMoney(Math.floor(tube.unpaid))}</strong> (paid on the 1st once it
            reaches {formatMoney(VIEWTUBE.payoutThreshold)}). Paid so far: {formatMoney(tube.paidTotal)}.
          </p>
        ) : tube.partner === 'review' ? (
          <p class="app-empty">Your Partner Program application is being reviewed.</p>
        ) : (
          <>
            <Progress label="Subscribers" value={tube.subscribers} goal={partner.subscribers} />
            <Progress label="Watch hours" value={sim.social.watchHours()} goal={partner.watchHours} />
            <p class="app-empty">Reach both to apply for ads. Until then your channel earns through the BeatHub link in each video.</p>
          </>
        )}
      </section>

      {!picking ? (
        <button class="order wide-order" onClick={() => setPicking(true)} disabled={beats.length === 0}>
          {sim.state.studio.beats.length === 0 ? 'Make a beat to upload' : beats.length === 0 ? 'Every beat is uploaded' : 'Upload a type beat'}
        </button>
      ) : (
        <section>
          <h3 class="app-heading">Upload which beat? <button class="link-button" onClick={() => setPicking(false)}>Cancel</button></h3>
          <ul class="rows">
            {beats.slice(0, 12).map((b) => (
              <li key={b.id} class="row">
                <span class={`grade grade-${b.quality.grade} mini`}>{b.quality.grade}</span>
                <span class="row-main">
                  <span class="row-title">{b.title}</span>
                  <span class="row-sub">{GENRES[b.settings.genre].name} · score {b.quality.score}</span>
                </span>
                <button class="order" onClick={() => setBeatId(b.id)}>Choose</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 class="app-heading">Videos</h3>
        {tube.videos.length === 0 ? <p class="app-empty">No uploads yet. Videos keep getting found through search for months.</p> : (
          <ul class="rows">
            {[...tube.videos].reverse().slice(0, 25).map((v) => (
              <li key={v.id} class="row tube-video">
                <span class="tube-thumb" aria-hidden="true">▶</span>
                <span class="row-main">
                  <span class="row-title">{v.title} {v.viral && <span class="badge">Trending</span>}</span>
                  <span class="row-sub">{compact(v.views)} views · {compact(v.likes)} likes · +{v.subs} subs · {v.clicks} store visits · {ago(v.at, now)}</span>
                  {v.views > 30 && <span class="row-sub tube-comment">"{v.comment}"</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
