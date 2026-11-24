import { MELODY_BASE, STEPS, degreeToMidi, type ScaleId } from '../content/music';
import type { LoopDef } from '../content/loops';
import { NOTE_STEPS, playNote } from './synths';
import { audioContext } from './BeatEngine';

let current: { gain: GainNode; timer: number } | null = null;

/** Plays a LoopVault loop twice through (A minor, 140 BPM unless told otherwise). Returns the length in ms. */
export function previewLoop(loop: LoopDef, volume: number, key = 9, scale: ScaleId = 'minor', bpm = loop.genre === 'rnb' ? 80 : loop.genre === 'pop' ? 110 : 140): number {
  stopLoopPreview();
  const ctx = audioContext();
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(ctx.destination);
  const step = 60 / bpm / 4;
  const start = ctx.currentTime + 0.05;
  for (let rep = 0; rep < 2; rep++) {
    for (let s = 0; s < STEPS; s++) {
      for (const d of loop.notes[s] ?? []) {
        const midi = degreeToMidi(d, key, scale, MELODY_BASE + loop.octave * 12);
        playNote(ctx, gain, loop.instrument, midi, start + (rep * STEPS + s) * step, step * NOTE_STEPS[loop.instrument]);
      }
    }
  }
  const ms = Math.round((2 * STEPS * step + 0.6) * 1000);
  current = { gain, timer: window.setTimeout(() => stopLoopPreview(), ms) };
  return ms;
}

export function stopLoopPreview(): void {
  if (!current) return;
  window.clearTimeout(current.timer);
  const ctx = audioContext();
  current.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
  const g = current.gain;
  window.setTimeout(() => g.disconnect(), 300);
  current = null;
}
