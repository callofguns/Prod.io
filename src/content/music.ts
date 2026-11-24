/**
 * Musical building blocks for the beat maker: genres, keys, scales, drum
 * lanes and melodic instruments. Launch genres per docs/GAME_DESIGN.md.
 */
export const STEPS = 16;

export const DRUM_LANES = ['kick', 'snare', 'clap', 'hat', 'openHat', 'perc'] as const;
export type DrumLane = (typeof DRUM_LANES)[number];
export const DRUM_LANE_NAMES: Record<DrumLane, string> = {
  kick: 'Kick', snare: 'Snare', clap: 'Clap', hat: 'Hi-hat', openHat: 'Open hat', perc: 'Perc',
};
/** Hi-hats can roll: a step value of 2-4 plays that many hits inside the step. */
export const MAX_ROLL = 4;

export const INSTRUMENTS = [
  { id: 'keys', name: 'Keys' },
  { id: 'pluck', name: 'Pluck' },
  { id: 'bell', name: 'Bell' },
  { id: 'pad', name: 'Pad' },
] as const;
export type InstrumentId = (typeof INSTRUMENTS)[number]['id'];

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export const SCALES = {
  minor: { name: 'Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  harmonicMinor: { name: 'Harmonic minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  phrygian: { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  major: { name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
} as const;
export type ScaleId = keyof typeof SCALES;

/** Rows in the 808 and melody rolls: scale degrees 0-7 (7 = the octave). */
export const ROLL_ROWS = 8;

/** MIDI note for a scale degree (0-7) in a key, starting at `base` (C of that octave). */
export function degreeToMidi(degree: number, key: number, scale: ScaleId, base: number): number {
  const iv = SCALES[scale].intervals;
  const octave = Math.floor(degree / iv.length);
  return base + key + octave * 12 + iv[degree % iv.length]!;
}

export const noteName = (midi: number) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

/** C2 and C4: where the 808 and melody rolls start. */
export const BASS_BASE = 36;
export const MELODY_BASE = 60;

export interface Pattern {
  drums: Record<DrumLane, number[]>;
  /** Scale degree per step, or -1 for no note. 808 notes ring until the next one. */
  bass: number[];
  /** Slide into this note from the previous one. */
  glide: boolean[];
  /** Scale degrees played on each step (chords allowed). */
  melody: number[][];
  instrument: InstrumentId;
  /** Lane volumes, 0-1 (loop is optional for beats made before LoopVault). */
  levels: { drums: number; bass: number; melody: number; loop?: number };
  /** A LoopVault loop layered over the beat, if any. */
  loopId?: string | null;
}

export interface BeatSettings {
  genre: GenreId;
  bpm: number;
  /** 0-0.6: how late the off-beat 16ths land. */
  swing: number;
  key: number;
  scale: ScaleId;
}

export const GENRES = {
  trap: { name: 'Trap', bpm: { min: 130, max: 165, default: 140 }, swing: 0, scale: 'minor' },
  drill: { name: 'Drill', bpm: { min: 138, max: 148, default: 142 }, swing: 0.1, scale: 'harmonicMinor' },
  rnb: { name: 'R&B', bpm: { min: 60, max: 100, default: 75 }, swing: 0.25, scale: 'minor' },
  pop: { name: 'Pop', bpm: { min: 95, max: 128, default: 110 }, swing: 0, scale: 'major' },
} as const satisfies Record<string, { name: string; bpm: { min: number; max: number; default: number }; swing: number; scale: ScaleId }>;
export type GenreId = keyof typeof GENRES;

export const BPM_LIMITS = { min: 60, max: 180 } as const;

const row = (hits: number[], value = 1) => Array.from({ length: STEPS }, (_, i) => (hits.includes(i) ? value : 0));

export function emptyPattern(): Pattern {
  return {
    drums: Object.fromEntries(DRUM_LANES.map((l) => [l, row([])])) as Pattern['drums'],
    bass: Array(STEPS).fill(-1),
    glide: Array(STEPS).fill(false),
    melody: Array.from({ length: STEPS }, () => []),
    instrument: 'keys',
    levels: { drums: 0.9, bass: 0.8, melody: 0.6 },
  };
}

/** A simple, genre-typical groove to start from. */
export function starterPattern(genre: GenreId): Pattern {
  const p = emptyPattern();
  const bass = (notes: Record<number, number>) => p.bass.map((_, i) => notes[i] ?? -1);
  const melody = (notes: Record<number, number[]>) => p.melody.map((_, i) => notes[i] ?? []);
  switch (genre) {
    case 'trap':
      p.drums.kick = row([0, 7, 10]);
      p.drums.clap = row([8]);
      p.drums.hat = row([0, 2, 4, 6, 8, 10, 12, 14]);
      p.drums.hat[14] = 3;
      p.drums.openHat = row([]);
      p.bass = bass({ 0: 0, 7: 0, 10: 3 });
      p.glide[10] = true;
      p.melody = melody({ 0: [4], 3: [3], 6: [2], 8: [4], 11: [5], 14: [4] });
      p.instrument = 'bell';
      break;
    case 'drill':
      p.drums.kick = row([0, 11]);
      p.drums.snare = row([8, 15]);
      p.drums.hat = row([0, 3, 6, 8, 10, 13]);
      p.drums.perc = row([5, 12]);
      p.bass = bass({ 0: 0, 3: 0, 6: 1, 11: 4 });
      p.glide[6] = true;
      p.glide[11] = true;
      p.melody = melody({ 0: [0, 2], 4: [1], 8: [0, 2], 12: [6] });
      p.instrument = 'pluck';
      break;
    case 'rnb':
      p.drums.kick = row([0, 6, 10]);
      p.drums.snare = row([4, 12]);
      p.drums.hat = row([0, 2, 4, 6, 8, 10, 12, 14]);
      p.drums.openHat = row([14]);
      p.bass = bass({ 0: 0, 6: 0, 10: 5 });
      p.melody = melody({ 0: [0, 2, 4], 8: [5, 0, 2] });
      p.instrument = 'pad';
      break;
    case 'pop':
      p.drums.kick = row([0, 4, 8, 12]);
      p.drums.clap = row([4, 12]);
      p.drums.hat = row([2, 6, 10, 14]);
      p.bass = bass({ 0: 0, 3: 0, 8: 3, 11: 4 });
      p.melody = melody({ 0: [0, 2, 4], 4: [4], 8: [3, 5, 7], 12: [4] });
      p.instrument = 'keys';
      break;
  }
  return p;
}

export function defaultSettings(genre: GenreId = 'trap'): BeatSettings {
  const g = GENRES[genre];
  return { genre, bpm: g.bpm.default, swing: g.swing, key: 9, scale: g.scale };
}

/** "A minor" */
export const keyLabel = (s: Pick<BeatSettings, 'key' | 'scale'>) => `${NOTE_NAMES[s.key]} ${SCALES[s.scale].name.toLowerCase()}`;
