/**
 * Every sound in the beat maker is synthesized here with the Web Audio API.
 * Each voice is a small graph started at an exact audio-clock time.
 */
import type { DrumLane, InstrumentId } from '../content/music';

let noise: AudioBuffer | null = null;

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise = buf;
  return buf;
}

function noiseSource(ctx: BaseAudioContext, t: number, dur: number): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur);
  return src;
}

function envGain(ctx: BaseAudioContext, t: number, peak: number, attack: number, decay: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

export const mtof = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// ---------- Drums ----------

function kick(ctx: BaseAudioContext, out: AudioNode, t: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.12);
  const g = envGain(ctx, t, 1, 0.002, 0.45);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.5);
  // Beater click
  const click = noiseSource(ctx, t, 0.01);
  const cg = envGain(ctx, t, 0.3, 0.001, 0.01);
  click.connect(cg).connect(out);
}

function snare(ctx: BaseAudioContext, out: AudioNode, t: number): void {
  const n = noiseSource(ctx, t, 0.25);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1400;
  n.connect(hp).connect(envGain(ctx, t, 0.55, 0.002, 0.2)).connect(out);
  const tone = ctx.createOscillator();
  tone.type = 'triangle';
  tone.frequency.setValueAtTime(220, t);
  tone.frequency.exponentialRampToValueAtTime(160, t + 0.08);
  tone.connect(envGain(ctx, t, 0.5, 0.002, 0.1)).connect(out);
  tone.start(t);
  tone.stop(t + 0.15);
}

function clap(ctx: BaseAudioContext, out: AudioNode, t: number): void {
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1300;
  bp.Q.value = 0.9;
  bp.connect(out);
  [0, 0.011, 0.022].forEach((offset, i) => {
    const n = noiseSource(ctx, t + offset, i === 2 ? 0.2 : 0.02);
    n.connect(envGain(ctx, t + offset, 0.8, 0.001, i === 2 ? 0.16 : 0.012)).connect(bp);
  });
}

export interface HatVoice {
  gain: GainNode;
}

function hat(ctx: BaseAudioContext, out: AudioNode, t: number, open: boolean, level = 1): HatVoice {
  const n = noiseSource(ctx, t, open ? 0.5 : 0.08);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7500;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 10000;
  bp.Q.value = 0.6;
  const g = envGain(ctx, t, (open ? 0.35 : 0.3) * level, 0.001, open ? 0.35 : 0.045);
  n.connect(hp).connect(bp).connect(g).connect(out);
  return { gain: g };
}

function perc(ctx: BaseAudioContext, out: AudioNode, t: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1050, t);
  osc.frequency.exponentialRampToValueAtTime(700, t + 0.05);
  osc.connect(envGain(ctx, t, 0.45, 0.001, 0.07)).connect(out);
  osc.start(t);
  osc.stop(t + 0.1);
}

export function playDrum(ctx: BaseAudioContext, out: AudioNode, lane: DrumLane, t: number, level = 1): HatVoice | null {
  switch (lane) {
    case 'kick': kick(ctx, out, t); return null;
    case 'snare': snare(ctx, out, t); return null;
    case 'clap': clap(ctx, out, t); return null;
    case 'hat': return hat(ctx, out, t, false, level);
    case 'openHat': return hat(ctx, out, t, true, level);
    case 'perc': perc(ctx, out, t); return null;
  }
}

// ---------- 808 ----------

let saturationCurve: Float32Array<ArrayBuffer> | null = null;
function saturation(): Float32Array<ArrayBuffer> {
  if (saturationCurve) return saturationCurve;
  const n = 1024;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(2.2 * x);
  }
  saturationCurve = curve;
  return curve;
}

export interface BassVoice {
  osc: OscillatorNode;
  gain: GainNode;
  freq: number;
}

/** Monophonic 808: a new note cuts the previous one; glide slides the pitch in from it. */
export function play808(
  ctx: BaseAudioContext, out: AudioNode, midi: number, t: number, prev: BassVoice | null, glide: boolean,
): BassVoice {
  const freq = mtof(midi);
  if (prev) {
    prev.gain.gain.cancelScheduledValues(t);
    prev.gain.gain.setTargetAtTime(0.0001, t, 0.012);
    prev.osc.stop(t + 0.1);
  }
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  if (glide && prev) {
    osc.frequency.setValueAtTime(prev.freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.09);
  } else {
    osc.frequency.setValueAtTime(freq * 1.6, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
  }
  const shaper = ctx.createWaveShaper();
  shaper.curve = saturation();
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.75, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  osc.connect(shaper).connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 1.9);
  return { osc, gain: g, freq };
}

// ---------- Melodic instruments ----------

/** How many 16th steps each instrument's notes last. */
export const NOTE_STEPS: Record<InstrumentId, number> = { keys: 2, pluck: 1.5, bell: 3, pad: 4 };

export function playNote(ctx: BaseAudioContext, out: AudioNode, instrument: InstrumentId, midi: number, t: number, dur: number): void {
  const freq = mtof(midi);
  const end = t + dur;
  switch (instrument) {
    case 'keys': {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.3);
      g.gain.setTargetAtTime(0.0001, end, 0.08);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      lp.connect(g).connect(out);
      for (const [type, mul, level] of [['triangle', 1, 1], ['sine', 2, 0.35]] as const) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq * mul;
        const og = ctx.createGain();
        og.gain.value = level;
        o.connect(og).connect(lp);
        o.start(t);
        o.stop(end + 0.5);
      }
      return;
    }
    case 'pluck': {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 4;
      lp.frequency.setValueAtTime(4200, t);
      lp.frequency.exponentialRampToValueAtTime(500, t + 0.18);
      const g = envGain(ctx, t, 0.2, 0.003, Math.max(0.15, dur));
      o.connect(lp).connect(g).connect(out);
      o.start(t);
      o.stop(end + 0.3);
      return;
    }
    case 'bell': {
      const carrier = ctx.createOscillator();
      carrier.frequency.value = freq;
      const mod = ctx.createOscillator();
      mod.frequency.value = freq * 3.5;
      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(freq * 2.2, t);
      modGain.gain.exponentialRampToValueAtTime(freq * 0.05, t + 0.6);
      mod.connect(modGain).connect(carrier.frequency);
      const g = envGain(ctx, t, 0.2, 0.002, Math.max(0.6, dur * 1.6));
      carrier.connect(g).connect(out);
      carrier.start(t);
      mod.start(t);
      carrier.stop(end + 1.2);
      mod.stop(end + 1.2);
      return;
    }
    case 'pad': {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1300;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.18);
      g.gain.setTargetAtTime(0.0001, end, 0.25);
      lp.connect(g).connect(out);
      for (const detune of [-9, 0, 8]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freq;
        o.detune.value = detune;
        o.connect(lp);
        o.start(t);
        o.stop(end + 1.5);
      }
      return;
    }
  }
}
