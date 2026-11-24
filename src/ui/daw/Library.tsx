import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Session } from '../../app/Session';
import type { Beat } from '../../sim/core/state';
import { settings as prefs } from '../../app/settings';
import { BeatEngine } from '../../audio/BeatEngine';
import { GENRES, emptyPattern, defaultSettings, keyLabel } from '../../content/music';
import { formatClock, toCalendar } from '../../sim/core/time';

/** Finished beats: listen back, or start a new beat from one. */
export function Library({ session, onUse, onReport }: {
  session: Session; onUse: (beat: Beat) => void; onReport: (beat: Beat) => void;
}) {
  const beats = [...session.sim.state.studio.beats].reverse();
  const [playingId, setPlayingId] = useState<number | null>(null);
  const engine = useMemo(() => new BeatEngine(defaultSettings(), emptyPattern()), []);

  useEffect(() => {
    engine.setVolume(prefs.get().volume);
    return () => engine.dispose();
  }, [engine]);

  const toggle = (beat: Beat) => {
    engine.stop();
    if (playingId === beat.id) {
      setPlayingId(null);
      return;
    }
    engine.update(beat.settings, beat.pattern);
    engine.play();
    setPlayingId(beat.id);
  };

  if (beats.length === 0) {
    return (
      <div class="library empty">
        <p>No finished beats yet. Build a pattern, then press <strong>Finish beat</strong> to add it here.</p>
      </div>
    );
  }

  return (
    <ul class="library" aria-label="Your beats">
      {beats.map((b) => {
        const t = toCalendar(b.createdAt);
        return (
          <li key={b.id} class="library-row">
            <button class="key" aria-pressed={playingId === b.id} aria-label={playingId === b.id ? `Stop ${b.title}` : `Play ${b.title}`} onClick={() => toggle(b)}>
              <span class="led" />{playingId === b.id ? '■' : '▶'}
            </button>
            <span class={`grade grade-${b.quality.grade} small`} aria-label={`Grade ${b.quality.grade}`}>
              <strong>{b.quality.grade}</strong><span>{b.quality.score}</span>
            </span>
            <span class="library-main">
              <span class="library-title">{b.title}</span>
              <span class="library-meta">
                {GENRES[b.settings.genre].name} · {b.settings.bpm} BPM · {keyLabel(b.settings)} · made {t.weekday} {t.month} {t.date}, {formatClock(t)}
              </span>
            </span>
            <button class="key wide light" onClick={() => { engine.stop(); setPlayingId(null); onReport(b); }}>Report</button>
            <button class="key wide light" onClick={() => { engine.stop(); setPlayingId(null); onUse(b); }}>Use as starting point</button>
          </li>
        );
      })}
    </ul>
  );
}
