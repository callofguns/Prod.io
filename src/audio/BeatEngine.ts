import {
  BASS_BASE, DRUM_LANES, MELODY_BASE, STEPS, degreeToMidi, type BeatSettings, type DrumLane, type Pattern,
} from '../content/music';
import { NOTE_STEPS, play808, playDrum, playNote, type BassVoice, type HatVoice } from './synths';
import { loopById } from '../content/loops';

/** One AudioContext for the whole game, created on the first user gesture. */
let sharedCtx: AudioContext | null = null;
export function audioContext(): AudioContext {
  sharedCtx ??= new AudioContext({ latencyHint: 'interactive' });
  if (sharedCtx.state === 'suspended') void sharedCtx.resume();
  return sharedCtx;
}

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;

/**
 * Plays a looping 16-step pattern with a lookahead scheduler (Web Audio clock
 * for timing, a JS timer only for queueing). Settings and pattern can change
 * while it plays.
 */
export class BeatEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: { drums: GainNode; bass: GainNode; melody: GainNode; loop: GainNode } | null = null;
  private timer: number | null = null;
  private raf: number | null = null;
  private nextStep = 0;
  private nextTime = 0;
  private queue: { step: number; time: number }[] = [];
  private bassVoice: BassVoice | null = null;
  private openHat: HatVoice | null = null;
  private volume = 0.8;

  onStep: (step: number | null) => void = () => {};

  constructor(private settings: BeatSettings, private pattern: Pattern) {}

  get playing(): boolean {
    return this.timer !== null;
  }

  update(settings: BeatSettings, pattern: Pattern): void {
    this.settings = settings;
    this.pattern = pattern;
    this.applyLevels();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  play(): void {
    if (this.playing) return;
    const ctx = this.ensureGraph();
    this.nextStep = 0;
    this.nextTime = ctx.currentTime + 0.06;
    this.timer = window.setInterval(() => this.schedule(), LOOKAHEAD_MS);
    this.schedule();
    const tick = () => {
      const now = ctx.currentTime;
      let current: number | null = null;
      while (this.queue.length && this.queue[0]!.time <= now) current = this.queue.shift()!.step;
      if (current !== null) this.onStep(current);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.timer = null;
    this.raf = null;
    this.queue = [];
    if (this.ctx && this.bassVoice) {
      this.bassVoice.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bassVoice.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.02);
    }
    this.bassVoice = null;
    this.onStep(null);
  }

  /** Plays one sound right away, for feedback when a pad is pressed. */
  previewDrum(lane: DrumLane): void {
    const ctx = this.ensureGraph();
    playDrum(ctx, this.buses!.drums, lane, ctx.currentTime + 0.005);
  }

  previewBass(degree: number): void {
    const ctx = this.ensureGraph();
    const midi = degreeToMidi(degree, this.settings.key, this.settings.scale, BASS_BASE);
    const v = play808(ctx, this.buses!.bass, midi, ctx.currentTime + 0.005, null, false);
    v.gain.gain.setTargetAtTime(0.0001, ctx.currentTime + 0.35, 0.05);
  }

  previewNote(degree: number): void {
    const ctx = this.ensureGraph();
    const midi = degreeToMidi(degree, this.settings.key, this.settings.scale, MELODY_BASE);
    playNote(ctx, this.buses!.melody, this.pattern.instrument, midi, ctx.currentTime + 0.005, 0.3);
  }

  dispose(): void {
    this.stop();
    this.master?.disconnect();
    this.master = null;
    this.buses = null;
  }

  private ensureGraph(): AudioContext {
    const ctx = (this.ctx ??= audioContext());
    if (!this.master) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.ratio.value = 4;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(comp).connect(ctx.destination);
      this.buses = { drums: ctx.createGain(), bass: ctx.createGain(), melody: ctx.createGain(), loop: ctx.createGain() };
      Object.values(this.buses).forEach((b) => b.connect(this.master!));
      this.applyLevels();
    }
    return ctx;
  }

  private applyLevels(): void {
    if (!this.buses) return;
    const l = this.pattern.levels;
    this.buses.drums.gain.value = l.drums;
    this.buses.bass.gain.value = l.bass;
    this.buses.melody.gain.value = l.melody;
    this.buses.loop.gain.value = l.loop ?? 0.6;
  }

  private stepSeconds(): number {
    return 60 / this.settings.bpm / 4;
  }

  private schedule(): void {
    const ctx = this.ctx!;
    while (this.nextTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const step = this.nextStep;
      const swing = step % 2 === 1 ? this.settings.swing * this.stepSeconds() * 0.5 : 0;
      this.playStep(step, this.nextTime + swing);
      this.queue.push({ step, time: this.nextTime + swing });
      this.nextTime += this.stepSeconds();
      this.nextStep = (step + 1) % STEPS;
    }
  }

  private playStep(step: number, t: number): void {
    const ctx = this.ctx!;
    const { drums, bass, melody } = this.buses!;
    const p = this.pattern;
    const s = this.settings;
    const dur = this.stepSeconds();

    for (const lane of DRUM_LANES) {
      const hits = p.drums[lane][step] ?? 0;
      if (hits <= 0) continue;
      for (let i = 0; i < hits; i++) {
        const at = t + (i * dur) / hits;
        // A closed hat chokes a ringing open hat, like on a real drum machine.
        if (lane === 'hat' && this.openHat) {
          this.openHat.gain.gain.cancelScheduledValues(at);
          this.openHat.gain.gain.setTargetAtTime(0.0001, at, 0.01);
          this.openHat = null;
        }
        const voice = playDrum(ctx, drums, lane, at, i === 0 ? 1 : 0.75);
        if (lane === 'openHat') this.openHat = voice;
      }
    }

    const degree = p.bass[step] ?? -1;
    if (degree >= 0) {
      const midi = degreeToMidi(degree, s.key, s.scale, BASS_BASE);
      this.bassVoice = play808(ctx, bass, midi, t, this.bassVoice, p.glide[step] ?? false);
    }

    for (const d of p.melody[step] ?? []) {
      const midi = degreeToMidi(d, s.key, s.scale, MELODY_BASE);
      playNote(ctx, melody, p.instrument, midi, t, dur * NOTE_STEPS[p.instrument]);
    }

    // The LoopVault loop, played in the beat's key and scale.
    const loop = p.loopId ? loopById(p.loopId) : undefined;
    if (loop) {
      for (const d of loop.notes[step] ?? []) {
        const midi = degreeToMidi(d, s.key, s.scale, MELODY_BASE + loop.octave * 12);
        playNote(ctx, this.buses!.loop, loop.instrument, midi, t, dur * NOTE_STEPS[loop.instrument]);
      }
    }
  }
}
