import type { Simulation, System } from '../Simulation';
import { fail, ok, type CommandResult } from '../core/commands';
import type { Beat } from '../core/state';
import { BPM_LIMITS, DRUM_LANES, GENRES, MAX_ROLL, ROLL_ROWS, SCALES, STEPS, type BeatSettings, type Pattern } from '../../content/music';
import { PRODUCTION } from '../../content/production';
import { VARIANCE } from '../../content/quality';
import { nextInt } from '../core/rng';
import { rateBeat } from '../quality/rateBeat';

/** The beat maker: the working draft, finishing beats (which takes in-game time) and the beat library. */
export class StudioSystem implements System {
  readonly id = 'studio';

  constructor(private sim: Simulation) {
    sim.handle('saveDraft', ({ settings, pattern }) => {
      const problem = validate(settings, pattern);
      if (problem) return fail(problem);
      if (pattern.loopId && !sim.loops.owns(pattern.loopId)) return fail('You do not own that loop.');
      sim.state.studio.draft = { settings: { ...settings }, pattern: structuredClone(pattern) };
      return ok;
    });
    sim.handle('discardDraft', () => {
      sim.state.studio.draft = null;
      return ok;
    });
    sim.handle('finishBeat', ({ title }) => this.finish(title));
    sim.events.on('minute', ({ totalMinutes }) => {
      const a = sim.state.activity;
      if (a?.kind === 'producing' && totalMinutes >= a.until) this.complete();
    });
  }

  /** Why the player can't start producing right now, or null. */
  blocker(): string | null {
    if (this.sim.state.needs.energy < PRODUCTION.minEnergy) return "You're too tired to focus. Get some sleep.";
    return null;
  }

  /** In-game minutes the current player needs to finish a beat. */
  workMinutes(): number {
    const sk = this.sim.state.player.skills;
    const avg = (sk.drums + sk.melody + sk.mixing) / 3;
    const raw = (PRODUCTION.baseMinutes * (1.2 - (avg / 100) * 0.7) * this.sim.gear.speedFactor()) / this.sim.needs.productivity();
    return Math.round(raw / 5) * 5;
  }

  hasPlayableContent(pattern: Pattern): boolean {
    return DRUM_LANES.some((l) => pattern.drums[l].some((v) => v > 0)) || pattern.bass.some((d) => d >= 0) || pattern.melody.some((n) => n.length > 0);
  }

  private finish(rawTitle: string): CommandResult {
    const title = rawTitle.trim();
    if (!title) return fail('Give your beat a title.');
    if (title.length > 40) return fail('Keep the title under 40 characters.');
    if (this.sim.activity.isBusy()) return fail('You are busy.');
    const draft = this.sim.state.studio.draft;
    if (!draft) return fail('There is no beat to finish.');
    if (!this.hasPlayableContent(draft.pattern)) return fail('Your beat is empty. Add some drums or notes first.');
    const blocked = this.blocker();
    if (blocked) return fail(blocked);
    const now = this.sim.state.clock.totalMinutes;
    this.sim.state.activity = {
      kind: 'producing', startedAt: now, until: now + this.workMinutes(), beatTitle: title,
      startProductivity: this.sim.needs.productivity(),
    };
    this.sim.state.clock.paused = false;
    this.sim.events.emit('activityChanged', { activity: this.sim.state.activity });
    return ok;
  }

  private complete(): void {
    const a = this.sim.state.activity;
    const studio = this.sim.state.studio;
    if (a?.kind !== 'producing' || !studio.draft) return;
    const { settings, pattern } = studio.draft;
    // Rated with the skills you had while making it, and how you felt from start to finish.
    const productivity = (a.startProductivity + this.sim.needs.productivity()) / 2;
    const variance = nextInt(this.sim.state.rng, -VARIANCE, VARIANCE);
    const quality = rateBeat(settings, pattern, this.sim.state.player.skills, productivity, variance, this.sim.gear.qualityFactor());
    const xp = this.sim.skills.practice(pattern, settings.genre);
    const beat: Beat = {
      id: studio.nextBeatId++,
      title: a.beatTitle,
      settings: { ...settings },
      pattern: structuredClone(pattern),
      createdAt: this.sim.state.clock.totalMinutes,
      workMinutes: this.sim.state.clock.totalMinutes - a.startedAt,
      quality,
      xp,
    };
    studio.beats.push(beat);
    studio.draft = null;
    this.sim.state.activity = null;
    this.sim.needs.change({ mood: PRODUCTION.finishMood });
    this.sim.events.emit('beatFinished', { beat });
    this.sim.events.emit('activityChanged', { activity: null });
  }
}

/** Rejects malformed drafts so a bad save can't break playback. */
function validate(s: BeatSettings, p: Pattern): string | null {
  if (!(s.genre in GENRES)) return 'Unknown genre';
  if (!(s.scale in SCALES)) return 'Unknown scale';
  if (!(s.bpm >= BPM_LIMITS.min && s.bpm <= BPM_LIMITS.max)) return 'BPM out of range';
  if (!(s.swing >= 0 && s.swing <= 0.6)) return 'Swing out of range';
  if (!(Number.isInteger(s.key) && s.key >= 0 && s.key < 12)) return 'Unknown key';
  for (const lane of DRUM_LANES) {
    const steps = p.drums[lane];
    if (steps?.length !== STEPS || steps.some((v) => !Number.isInteger(v) || v < 0 || v > MAX_ROLL)) return `Bad ${lane} lane`;
  }
  if (p.bass.length !== STEPS || p.bass.some((d) => d < -1 || d >= ROLL_ROWS)) return 'Bad 808 lane';
  if (p.glide.length !== STEPS || p.melody.length !== STEPS) return 'Bad pattern length';
  if (p.melody.some((notes) => notes.some((d) => d < 0 || d >= ROLL_ROWS))) return 'Bad melody lane';
  return null;
}
