import { Fragment } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Session } from '../../app/Session';
import { settings as prefs } from '../../app/settings';
import { BeatEngine } from '../../audio/BeatEngine';
import {
  BASS_BASE, BPM_LIMITS, DRUM_LANES, DRUM_LANE_NAMES, GENRES, INSTRUMENTS, MAX_ROLL, MELODY_BASE, NOTE_NAMES,
  ROLL_ROWS, SCALES, STEPS, defaultSettings, degreeToMidi, emptyPattern, keyLabel, noteName, starterPattern,
  type BeatSettings, type GenreId, type Pattern, type ScaleId,
} from '../../content/music';
import { Lcd } from '../components/Lcd';
import { Library } from './Library';
import { BeatReport } from '../BeatReport';
import type { Beat } from '../../sim/core/state';

type Page = 'drums' | 'bass' | 'melody' | 'library';
const PAGES: { id: Page; name: string }[] = [
  { id: 'drums', name: 'Drums' },
  { id: 'bass', name: '808' },
  { id: 'melody', name: 'Melody' },
  { id: 'library', name: 'Library' },
];
const ROWS_TOP_DOWN = Array.from({ length: ROLL_ROWS }, (_, i) => ROLL_ROWS - 1 - i);
const STEP_INDEXES = Array.from({ length: STEPS }, (_, i) => i);

const fmtDuration = (m: number) => `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim();

function Stepper({ label, value, onDown, onUp }: {
  label: string; value: string; onDown: () => void; onUp: () => void;
}) {
  return (
    <div class="daw-ctl">
      <p class="silk">{label}</p>
      <div class="daw-stepper">
        <button class="key" aria-label={`Lower ${label}`} onClick={onDown}>−</button>
        <Lcd text={value} label={label} class="daw-lcd-sm" />
        <button class="key" aria-label={`Raise ${label}`} onClick={onUp}>+</button>
      </div>
    </div>
  );
}

interface Props {
  session: Session;
  onClose: () => void;
  onFinished: () => void;
}

/** The in-game beat maker: a 16-step groovebox with drums, an 808 roll and a melody roll. */
export function BeatMaker({ session, onClose, onFinished }: Props) {
  const { sim, bridge } = session;
  const draft = sim.state.studio.draft;
  const [settings, setSettings] = useState<BeatSettings>(draft?.settings ?? defaultSettings());
  const [pattern, setPattern] = useState<Pattern>(draft?.pattern ?? emptyPattern());
  const [page, setPage] = useState<Page>('drums');
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [title, setTitle] = useState('');
  const [report, setReport] = useState<Beat | null>(null);
  const engine = useMemo(() => new BeatEngine(settings, pattern), []);
  const saveTimer = useRef<number | null>(null);

  // Keep the engine and the saved draft in sync with every edit.
  useEffect(() => {
    engine.update(settings, pattern);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => sim.dispatch('saveDraft', { settings, pattern }), 400);
  }, [settings, pattern]);

  useEffect(() => {
    engine.onStep = setStep;
    engine.setVolume(prefs.get().volume);
    const off = prefs.subscribe((s) => engine.setVolume(s.volume));
    return () => {
      off();
      engine.dispose();
    };
  }, [engine]);

  const close = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    sim.dispatch('saveDraft', { settings, pattern });
    engine.stop();
    onClose();
  };

  const togglePlay = () => {
    if (engine.playing) {
      engine.stop();
      setPlaying(false);
    } else {
      engine.play();
      setPlaying(true);
    }
  };

  // Space plays/stops, Esc closes (or backs out of the finish dialog).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (report) return; // the report handles its own keys
      if (e.target instanceof HTMLInputElement) {
        if (e.code === 'Escape') setFinishing(false);
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (finishing) setFinishing(false);
        else close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const edit = (fn: (p: Pattern) => void) => setPattern((p) => {
    const next = structuredClone(p);
    fn(next);
    return next;
  });
  const setS = (patch: Partial<BeatSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const pickGenre = (genre: GenreId) => {
    const g = GENRES[genre];
    setS({ genre, bpm: Math.min(g.bpm.max, Math.max(g.bpm.min, settings.bpm)) });
  };

  const hasContent = sim.studio.hasPlayableContent(pattern);
  const work = sim.studio.workMinutes();
  const blocker = sim.studio.blocker();

  const finish = () => {
    sim.dispatch('saveDraft', { settings, pattern });
    const r = sim.dispatch('finishBeat', { title });
    if (!r.ok) {
      bridge.toast(r.error, 'bad');
      return;
    }
    engine.stop();
    onFinished();
  };

  const scaleIds = Object.keys(SCALES) as ScaleId[];
  const genre = GENRES[settings.genre];

  return (
    <section class="daw chassis screws interactive" role="dialog" aria-modal="true" aria-label="Beat maker">
      <header class="daw-head">
        <div>
          <p class="silk">Beat maker · {sim.state.player.alias}</p>
          <Lcd
            class="daw-lcd"
            text={`${genre.name.toUpperCase()} ${settings.bpm}BPM ${NOTE_NAMES[settings.key]}${settings.scale === 'major' ? '' : 'm'}`}
            label="Beat"
          />
        </div>
        <div class="daw-transport">
          <button class={`key rec ${playing ? 'live' : ''}`} aria-pressed={playing} onClick={togglePlay}>
            <span class="led" />
            {playing ? 'Stop' : 'Play'} <span class="cap">Space</span>
          </button>
          <button class="key wide light" onClick={close}>Close <span class="cap">Esc</span></button>
        </div>
      </header>

      <div class="daw-controls">
        <div class="daw-ctl">
          <p class="silk">Genre</p>
          <div class="choices" role="radiogroup" aria-label="Genre">
            {(Object.keys(GENRES) as GenreId[]).map((g) => (
              <button key={g} class="key wide" role="radio" aria-checked={settings.genre === g} aria-pressed={settings.genre === g} onClick={() => pickGenre(g)}>
                <span class="led" />{GENRES[g].name}
              </button>
            ))}
          </div>
        </div>
        <Stepper label="BPM" value={String(settings.bpm)}
          onDown={() => setS({ bpm: Math.max(BPM_LIMITS.min, settings.bpm - 1) })}
          onUp={() => setS({ bpm: Math.min(BPM_LIMITS.max, settings.bpm + 1) })} />
        <Stepper label="Swing" value={`${Math.round(settings.swing * 100)}%`}
          onDown={() => setS({ swing: Math.max(0, Math.round((settings.swing - 0.05) * 100) / 100) })}
          onUp={() => setS({ swing: Math.min(0.6, Math.round((settings.swing + 0.05) * 100) / 100) })} />
        <Stepper label="Key" value={NOTE_NAMES[settings.key]!}
          onDown={() => setS({ key: (settings.key + 11) % 12 })}
          onUp={() => setS({ key: (settings.key + 1) % 12 })} />
        <div class="daw-ctl">
          <p class="silk">Scale</p>
          <button class="key wide daw-scale" onClick={() => setS({ scale: scaleIds[(scaleIds.indexOf(settings.scale) + 1) % scaleIds.length]! })}>
            {SCALES[settings.scale].name}
          </button>
        </div>
      </div>
      <p class="daw-hint">
        {genre.name} usually sits at {genre.bpm.min}-{genre.bpm.max} BPM. Your beat is in {keyLabel(settings)}.
      </p>

      <nav class="daw-pages" role="tablist" aria-label="Beat maker pages">
        {PAGES.map((p) => (
          <button key={p.id} role="tab" aria-selected={page === p.id} aria-pressed={page === p.id} class="key wide" onClick={() => setPage(p.id)}>
            <span class="led" />{p.name}{p.id === 'library' ? ` (${sim.state.studio.beats.length})` : ''}
          </button>
        ))}
      </nav>

      {page !== 'library' && (
        <div class="daw-grid-wrap">
          <div class="daw-grid" style={{ '--steps': STEPS }}>
            <span />
            {STEP_INDEXES.map((i) => (
              <span key={i} class={`step-led ${step === i ? 'on' : ''} ${i % 4 === 0 ? 'beat' : ''}`} aria-hidden="true" />
            ))}

            {page === 'drums' && DRUM_LANES.map((lane) => (
              <Fragment key={lane}>
                <button class="lane-name" onClick={() => engine.previewDrum(lane)} title="Preview sound">{DRUM_LANE_NAMES[lane]}</button>
                {STEP_INDEXES.map((i) => {
                  const v = pattern.drums[lane][i] ?? 0;
                  return (
                    <button
                      key={`${lane}-${i}`}
                      class={`pad ${v ? 'on' : ''} ${i % 4 === 0 ? 'beat' : ''} ${step === i ? 'now' : ''}`}
                      aria-pressed={v > 0}
                      aria-label={`${DRUM_LANE_NAMES[lane]} step ${i + 1}${v > 1 ? `, roll ×${v}` : ''}`}
                      onClick={() => {
                        edit((p) => {
                          const cur = p.drums[lane][i] ?? 0;
                          p.drums[lane][i] = lane === 'hat' ? (cur >= MAX_ROLL ? 0 : cur + 1) : cur ? 0 : 1;
                        });
                        if (!v) engine.previewDrum(lane);
                      }}
                    >
                      {v > 1 ? `×${v}` : ''}
                    </button>
                  );
                })}
              </Fragment>
            ))}

            {page === 'bass' && (
              <>
                {ROWS_TOP_DOWN.map((d) => (
                  <Fragment key={`b${d}`}>
                    <button class="lane-name" onClick={() => engine.previewBass(d)}>{noteName(degreeToMidi(d, settings.key, settings.scale, BASS_BASE))}</button>
                    {STEP_INDEXES.map((i) => {
                      const on = pattern.bass[i] === d;
                      return (
                        <button key={`b${d}-${i}`} class={`pad ${on ? 'on' : ''} ${i % 4 === 0 ? 'beat' : ''} ${step === i ? 'now' : ''}`}
                          aria-pressed={on} aria-label={`808 ${noteName(degreeToMidi(d, settings.key, settings.scale, BASS_BASE))} step ${i + 1}`}
                          onClick={() => {
                            edit((p) => {
                              p.bass[i] = on ? -1 : d;
                              if (on) p.glide[i] = false;
                            });
                            if (!on) engine.previewBass(d);
                          }} />
                      );
                    })}
                  </Fragment>
                ))}
                <span class="lane-name glide-name">Slide</span>
                {STEP_INDEXES.map((i) => (
                  <button key={`g${i}`} class={`pad glide ${pattern.glide[i] ? 'on' : ''}`} disabled={(pattern.bass[i] ?? -1) < 0}
                    aria-pressed={pattern.glide[i]} aria-label={`Slide into step ${i + 1}`}
                    onClick={() => edit((p) => { p.glide[i] = !p.glide[i]; })}>{pattern.glide[i] ? '↗' : ''}</button>
                ))}
              </>
            )}

            {page === 'melody' && ROWS_TOP_DOWN.map((d) => (
              <Fragment key={`m${d}`}>
                <button class="lane-name" onClick={() => engine.previewNote(d)}>{noteName(degreeToMidi(d, settings.key, settings.scale, MELODY_BASE))}</button>
                {STEP_INDEXES.map((i) => {
                  const on = pattern.melody[i]?.includes(d) ?? false;
                  return (
                    <button key={`m${d}-${i}`} class={`pad ${on ? 'on' : ''} ${i % 4 === 0 ? 'beat' : ''} ${step === i ? 'now' : ''}`}
                      aria-pressed={on} aria-label={`Melody ${noteName(degreeToMidi(d, settings.key, settings.scale, MELODY_BASE))} step ${i + 1}`}
                      onClick={() => {
                        edit((p) => {
                          const notes = p.melody[i]!;
                          p.melody[i] = on ? notes.filter((n) => n !== d) : [...notes, d];
                        });
                        if (!on) engine.previewNote(d);
                      }} />
                  );
                })}
              </Fragment>
            ))}
          </div>

          <div class="daw-side">
            {page === 'melody' && (
              <div class="daw-ctl">
                <p class="silk">Instrument</p>
                <div class="choices vertical" role="radiogroup" aria-label="Instrument">
                  {INSTRUMENTS.map((ins) => (
                    <button key={ins.id} class="key wide" role="radio" aria-checked={pattern.instrument === ins.id} aria-pressed={pattern.instrument === ins.id}
                      onClick={() => edit((p) => { p.instrument = ins.id; })}>
                      <span class="led" />{ins.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label class="daw-ctl">
              <span class="silk">{page === 'drums' ? 'Drums' : page === 'bass' ? '808' : 'Melody'} level</span>
              <input type="range" class="fader" min={0} max={1} step={0.05}
                value={pattern.levels[page === 'drums' ? 'drums' : page === 'bass' ? 'bass' : 'melody']}
                onInput={(e) => {
                  const v = Number(e.currentTarget.value);
                  edit((p) => { p.levels[page === 'drums' ? 'drums' : page === 'bass' ? 'bass' : 'melody'] = v; });
                }} />
            </label>
            <p class="daw-tip">
              {page === 'drums' && 'Click a pad to add a hit. Click a lit hi-hat again for rolls (×2, ×3, ×4).'}
              {page === 'bass' && 'One 808 note at a time; it rings until the next one. Turn on Slide to glide into a note.'}
              {page === 'melody' && 'Stack notes on the same step to play chords. Every row is in your key.'}
            </p>
          </div>
        </div>
      )}

      {page === 'library' && <Library session={session} onReport={setReport} onUse={(beat) => {
        setSettings({ ...beat.settings });
        setPattern(structuredClone(beat.pattern));
        setPage('drums');
        bridge.toast(`Started a new beat from "${beat.title}".`);
      }} />}

      <footer class="daw-foot">
        <div class="daw-foot-left">
          <button class="key wide light" onClick={() => setPattern(starterPattern(settings.genre))}>Load {genre.name} starter</button>
          <button class="key wide light" onClick={() => setPattern(emptyPattern())}>Clear</button>
        </div>
        <p class="daw-work">
          {blocker ?? `Finishing takes about ${fmtDuration(work)} of in-game time and uses energy.`}
        </p>
        <button class="key wide" disabled={!hasContent || !!blocker} onClick={() => setFinishing(true)}>Finish beat</button>
      </footer>

      {report && (
        <div class="daw-dialog-backdrop">
          <BeatReport beat={report} onClose={() => setReport(null)} />
        </div>
      )}

      {finishing && (
        <div class="daw-dialog-backdrop">
          <form class="daw-dialog chassis" onSubmit={(e) => { e.preventDefault(); finish(); }}>
            <p class="silk">Finish beat</p>
            <label class="cc-field">
              <span class="silk">Title</span>
              <input class="lcd-input" maxLength={40} autoFocus value={title} placeholder={`e.g. ${genre.name} type beat "Night Shift"`}
                onInput={(e) => setTitle(e.currentTarget.value)} />
            </label>
            <p class="menu-note">
              You'll spend about {fmtDuration(work)} arranging and mixing. Time fast-forwards and your energy drops faster while you work.
            </p>
            <div class="menu-actions">
              <button type="button" class="key wide light" onClick={() => setFinishing(false)}>Keep editing</button>
              <button type="submit" class="key wide" disabled={!title.trim()}>Start finishing</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
