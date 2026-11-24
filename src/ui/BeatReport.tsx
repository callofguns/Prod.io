import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Beat } from '../sim/core/state';
import { settings as prefs } from '../app/settings';
import { BeatEngine } from '../audio/BeatEngine';
import { GENRES, keyLabel } from '../content/music';
import { PARTS, PART_NAMES, gradeFor } from '../content/quality';
import { SKILLS, type SkillId } from '../content/skills';
import { Lcd } from './components/Lcd';

const SEGMENTS = 20;
const hours = (m: number) => `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;

function PartRow({ name, value }: { name: string; value: number }) {
  const lit = Math.round((value / 100) * SEGMENTS);
  return (
    <div class="report-part" role="meter" aria-label={name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <span class="report-part-name">{name}</span>
      <span class={`meter-leds ${value < 40 ? 'danger' : ''}`} aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => <span key={i} class={i < lit ? 'on' : ''} />)}
      </span>
      <span class="report-part-value">{value}</span>
    </div>
  );
}

/** The verdict on a finished beat: score, breakdown, what works, what to fix, and the XP it earned. */
export function BeatReport({ beat, onClose }: { beat: Beat; onClose: () => void }) {
  const q = beat.quality;
  const grade = gradeFor(q.score);
  const [playing, setPlaying] = useState(false);
  const engine = useMemo(() => new BeatEngine(beat.settings, beat.pattern), [beat]);

  useEffect(() => {
    engine.setVolume(prefs.get().volume);
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      engine.dispose();
    };
  }, [engine]);

  const gains = Object.entries(beat.xp).filter(([, v]) => (v ?? 0) > 0) as [SkillId, number][];

  return (
    <section class="menu report chassis screws interactive" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <p class="silk">Beat report</p>
      <header class="report-head">
        <div>
          <h2 id="report-title" class="menu-title">{beat.title}</h2>
          <p class="report-meta">
            {GENRES[beat.settings.genre].name} · {beat.settings.bpm} BPM · {keyLabel(beat.settings)} · {hours(beat.workMinutes)} of work
          </p>
        </div>
        <div class="report-score">
          <Lcd text={String(q.score).padStart(2, '0')} class="report-lcd" label={`Score ${q.score} out of 100`} />
          <span class={`grade grade-${q.grade}`} aria-label={`Grade ${q.grade}, ${grade.label}`}>
            <strong>{q.grade}</strong>
            <span>{grade.label}</span>
          </span>
        </div>
      </header>

      <div class="report-parts">
        {PARTS.map((p) => <PartRow key={p} name={PART_NAMES[p]} value={q.parts[p]} />)}
      </div>

      {q.highlights.length > 0 && (
        <section>
          <p class="silk">What works</p>
          <ul class="report-list good">{q.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
        </section>
      )}
      {(q.tips.length > 0 || q.skillTip) && (
        <section>
          <p class="silk">To improve</p>
          <ul class="report-list">
            {q.tips.map((t) => <li key={t}>{t}</li>)}
            {q.skillTip && <li class="skill-tip">{q.skillTip}</li>}
          </ul>
        </section>
      )}
      {gains.length > 0 && (
        <section>
          <p class="silk">Skills improved</p>
          <ul class="xp-chips">
            {gains.map(([id, v]) => (
              <li key={id}>+{v.toFixed(1)} {SKILLS.find((s) => s.id === id)!.short}</li>
            ))}
          </ul>
        </section>
      )}

      <div class="menu-actions">
        <button class="key wide light" aria-pressed={playing} onClick={() => {
          if (engine.playing) { engine.stop(); setPlaying(false); } else { engine.play(); setPlaying(true); }
        }}>
          {playing ? 'Stop' : 'Listen'}
        </button>
        <button class="key wide" autoFocus onClick={onClose}>Done</button>
      </div>
    </section>
  );
}
