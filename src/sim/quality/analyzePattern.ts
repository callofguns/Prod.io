import {
  DRUM_LANES, GENRES, INSTRUMENTS, SCALES, starterPattern, type BeatSettings, type GenreId, type Pattern,
} from '../../content/music';
import { GENRE_STYLES, PART_WEIGHTS, PARTS, type Part } from '../../content/quality';

/**
 * Judges the composition: what the player programmed, against the genre's
 * conventions. Pure function of the beat; skills are applied later in rateBeat.
 */
export interface Analysis {
  /** 0-100 per part, from the pattern alone. */
  composition: Record<Part, number>;
  /** Problems, most costly first, deduplicated. */
  tips: string[];
  /** What already works, best first. */
  highlights: string[];
}

const hitsOf = (row: number[]) => row.reduce<number[]>((acc, v, i) => (v > 0 ? [...acc, i] : acc), []);
const clamp = (v: number) => Math.max(0, Math.min(100, v));
const pct = (v: number) => `${Math.round(v * 100)}%`;
const instrumentName = (id: string) => INSTRUMENTS.find((i) => i.id === id)?.name.toLowerCase() ?? id;

/** Every active cell of a pattern as a string, for similarity checks. */
function cells(p: Pattern): Set<string> {
  const out = new Set<string>();
  for (const lane of DRUM_LANES) p.drums[lane].forEach((v, i) => v > 0 && out.add(`${lane}:${i}:${v}`));
  p.bass.forEach((d, i) => d >= 0 && out.add(`bass:${i}:${d}:${p.glide[i] ? 1 : 0}`));
  p.melody.forEach((notes, i) => notes.forEach((d) => out.add(`mel:${i}:${d}`)));
  return out;
}

const jaccard = (a: Set<string>, b: Set<string>) => {
  if (a.size === 0 && b.size === 0) return 1;
  let shared = 0;
  for (const c of a) if (b.has(c)) shared++;
  return shared / (a.size + b.size - shared);
};

/** 0-1 overlap between two beats' patterns. */
export function beatSimilarity(a: Pattern, b: Pattern): number {
  return jaccard(cells(a), cells(b));
}

/** 0-1 overlap with the closest stock starter groove (any genre). */
export function starterSimilarity(p: Pattern): number {
  const mine = cells(p);
  if (mine.size === 0) return 0;
  let best = 0;
  for (const g of Object.keys(GENRES) as GenreId[]) best = Math.max(best, jaccard(mine, cells(starterPattern(g))));
  return best;
}

/** Straight eighth-note hats with nothing else: the opposite of drill's skippy hats. */
const straightEighths = (hat: number[]) => hat.every((v, i) => (i % 2 === 0 ? v === 1 : v === 0));

export function analyzePattern(settings: BeatSettings, p: Pattern): Analysis {
  const style = GENRE_STYLES[settings.genre];
  const genre = GENRES[settings.genre];
  const weights = PART_WEIGHTS[settings.genre];
  const issues = new Map<string, number>();
  const highlights: { text: string; weight: number }[] = [];

  /** Returns a deduction and records the tip with its cost to the final score. */
  const scorer = (part: Part) => {
    let score = 100;
    return {
      lose(points: number, tip: string) {
        score -= points;
        issues.set(tip, (issues.get(tip) ?? 0) + points * weights[part]);
      },
      add(points: number) {
        score += points;
      },
      set(value: number) {
        score = value;
      },
      get value() {
        return clamp(score);
      },
    };
  };

  const d = p.drums;
  const kicks = hitsOf(d.kick);
  const backbeatHits = [...new Set([...hitsOf(d.snare), ...hitsOf(d.clap)])];
  const backbeatMissing = style.backbeat.some((s) => !backbeatHits.includes(s));
  const drumHits = DRUM_LANES.reduce((n, l) => n + hitsOf(d[l]).length, 0);

  // ---------- Drums ----------
  const drums = scorer('drums');
  if (drumHits === 0) {
    drums.set(0);
    issues.set('Add drums: start with a kick on step 1 and a snare or clap.', 100 * weights.drums);
  } else {
    drums.set(92);
    if (kicks.length === 0) drums.lose(35, 'Add a kick drum, starting with one on step 1.');
    else {
      if (!kicks.includes(0)) drums.lose(10, 'Start the bar with a kick on step 1.');
      if (kicks.length > 7) drums.lose(10, 'Too many kicks crowd the 808. Try 2 to 5.');
    }
    if (style.fourOnFloor && ![0, 4, 8, 12].every((k) => kicks.includes(k))) {
      drums.lose(8, 'Pop often uses four on the floor: kicks on steps 1, 5, 9 and 13.');
    }
    if (backbeatMissing) drums.lose(25, style.backbeatTip);
    const extras = backbeatHits.filter((s) => !style.backbeat.includes(s));
    if (style.syncopatedSnare) {
      const offGrid = [...extras, ...hitsOf(d.perc)].filter((s) => s % 4 !== 0);
      if (offGrid.length === 0) drums.lose(15, 'Drill snares also land off the beat: add a snare or perc on step 12 or 16.');
    } else if (extras.length > 3) {
      drums.lose(10, 'Too many extra snares and claps. Keep the backbeat clear.');
    }
    const hats = hitsOf(d.hat);
    const rolls = d.hat.filter((v) => v > 1).length;
    if (hats.length === 0) drums.lose(20, 'Add hi-hats to keep the groove moving.');
    else {
      if (hats.length < style.hatRange[0]) drums.lose(10, `Your hi-hats are sparse. ${genre.name} usually has ${style.hatRange[0]} or more.`);
      if (hats.length > style.hatRange[1]) drums.lose(8, 'Your hi-hats are too busy; leave a few gaps.');
      if (style.hatRolls === 'expected' && rolls === 0) drums.lose(12, 'Trap hi-hats roll: click a lit hi-hat pad again for ×2, ×3 or ×4.');
      if (style.hatRolls === 'rare' && rolls > 1) drums.lose(6, `Hi-hat rolls are rare in ${genre.name}; use one at most.`);
      if (style.brokenHats && straightEighths(d.hat)) drums.lose(10, 'Drill hi-hats skip around. Leave gaps instead of straight eighth notes.');
    }
    if (DRUM_LANES.filter((l) => hitsOf(d[l]).length > 12).length >= 3) {
      drums.lose(20, 'The drums are cluttered. Not every lane needs every step.');
    }
    if (hitsOf(d.openHat).some((s) => (d.hat[s] ?? 0) > 0)) drums.lose(4, 'An open hat and a closed hat on the same step cancel each other out.');
    const candy = hitsOf(d.perc).length + hitsOf(d.openHat).length;
    if (candy >= 1 && candy <= 5) drums.add(8);
    if (drums.value >= 85) highlights.push({ text: `A tight drum groove that sounds like ${genre.name}.`, weight: weights.drums });
  }

  // ---------- 808 ----------
  const bass = scorer('bass');
  const bassSteps = p.bass.reduce<number[]>((acc, deg, i) => (deg >= 0 ? [...acc, i] : acc), []);
  if (bassSteps.length === 0) {
    if (style.bass === 'required') {
      bass.set(15);
      issues.set(`${genre.name} lives on the 808. Add notes on the 808 page, starting on the bottom row at step 1.`, 85 * weights.bass);
    } else {
      bass.set(60);
      issues.set('A bassline would add weight. Try a few notes on the 808 page.', 40 * weights.bass);
    }
  } else {
    if (![0, 7].includes(p.bass[bassSteps[0]!]!)) bass.lose(12, 'Start the 808 on the root note (the bottom row) to anchor the key.');
    const locked = bassSteps.filter((i) => (d.kick[i] ?? 0) > 0).length / bassSteps.length;
    if (locked < style.bassKickLock) bass.lose(15, 'Line up more 808 notes with your kicks so they hit together.');
    const slides = bassSteps.filter((i, n) => n > 0 && p.glide[i]).length;
    if (style.slides === 'expected' && slides === 0) bass.lose(15, 'Drill 808s slide: turn on Slide under at least one note after the first.');
    if (style.slides === 'nice' && slides === 0) bass.lose(5, 'A slide or two gives the 808 movement.');
    if (style.slides === 'rare' && slides > 1) bass.lose(6, `Slides are rare in ${genre.name}; keep one at most.`);
    if (bassSteps.length > 8) bass.lose(15, 'The 808 is too busy; give its notes room to ring.');
    if (bassSteps.length >= 4 && new Set(bassSteps.map((i) => p.bass[i])).size === 1) {
      bass.lose(6, 'Move the 808 to a second note now and then to follow the melody.');
    }
    if (bass.value >= 85) highlights.push({ text: 'Your 808 locks in with the kick.', weight: weights.bass });
  }

  // ---------- Melody ----------
  const melody = scorer('melody');
  const notes = p.melody.flat();
  if (notes.length === 0) {
    melody.set(30);
    issues.set('Add a melody on the Melody page; it is what makes a beat memorable.', 70 * weights.melody);
  } else {
    const [minNotes, maxNotes] = style.melodyNotes;
    if (notes.length < minNotes) melody.lose(15, `The melody only has ${notes.length} note${notes.length === 1 ? '' : 's'}. Try a few more.`);
    if (notes.length > maxNotes) melody.lose(12, 'The melody is busy; leave space between phrases.');
    if (new Set(notes).size < 3) melody.lose(12, 'Use at least three different notes for a stronger hook (try the 3rd and 5th rows from the bottom).');
    const chordTones = notes.filter((n) => [0, 2, 4, 7].includes(n)).length / notes.length;
    if (chordTones < 0.5) melody.lose(10, 'Lean on the 1st, 3rd and 5th rows from the bottom; they are the strongest notes in your key.');
    const chordSteps = p.melody.filter((n) => n.length >= 3).length;
    if (style.chords === 'expected' && chordSteps === 0) {
      melody.lose(15, `Stack three notes on one step to play a chord; ${genre.name} leans on chords.`);
    }
    if (style.chords === 'rare' && chordSteps > 3) melody.lose(8, `Lots of chords can muddy ${genre.name}; try single-note melodies.`);
    const clashes = p.melody.filter((n) => n.some((x) => n.includes(x + 1))).length;
    if (clashes > 0) melody.lose(Math.min(10, clashes * 4), 'Notes on neighbouring rows clash when played together.');
    if (!style.instruments.includes(p.instrument)) {
      melody.lose(10, `A ${instrumentName(style.instruments[0]!)} usually suits ${genre.name} better than a ${instrumentName(p.instrument)}.`);
    }
    if (melody.value >= 85) highlights.push({ text: 'A catchy, musical melody.', weight: weights.melody });
  }

  // ---------- Mix (levels) ----------
  const mix = scorer('mix');
  const L = p.levels;
  if (drumHits > 0 && L.drums < 0.6) mix.lose(15, 'The drums are too quiet; push the drum level up.');
  if (drumHits > 0 && L.drums > 0.98) mix.lose(5, 'The drums are maxed out; leave a little headroom.');
  if (bassSteps.length > 0 && L.bass < 0.5) mix.lose(12, 'The 808 is too quiet to feel.');
  if (bassSteps.length > 0 && L.bass > 0.95) mix.lose(8, 'The 808 is so loud it will distort.');
  if (notes.length > 0 && L.melody < 0.3) mix.lose(10, 'The melody is too quiet to hear.');
  if (notes.length > 0 && drumHits > 0 && L.melody > L.drums + 0.15) mix.lose(12, 'The melody is drowning out the drums. Bring it down.');
  if (drumHits === 0 && bassSteps.length === 0 && notes.length === 0) mix.set(0);
  if (mix.value >= 90 && drumHits > 0) highlights.push({ text: 'Balanced levels between drums, 808 and melody.', weight: weights.mix });

  // ---------- Genre fit ----------
  const fit = scorer('genre');
  const { min, max } = genre.bpm;
  if (settings.bpm < min) fit.lose(Math.min(40, (min - settings.bpm) * 2), `${genre.name} usually sits at ${min}-${max} BPM.`);
  if (settings.bpm > max) fit.lose(Math.min(40, (settings.bpm - max) * 2), `${genre.name} usually sits at ${min}-${max} BPM.`);
  if (!style.scales.includes(settings.scale)) {
    const names = style.scales.slice(0, 2).map((s) => SCALES[s].name.toLowerCase()).join(' or ');
    fit.lose(15, `${genre.name} usually uses a ${names} scale.`);
  }
  if (settings.swing < style.swing[0] - 1e-6) fit.lose(10, `${genre.name} grooves swing: try ${pct(style.swing[0])} to ${pct(style.swing[1])}.`);
  if (settings.swing > style.swing[1] + 1e-6) fit.lose(10, `That is a lot of swing for ${genre.name}; try ${pct(style.swing[0])} to ${pct(style.swing[1])}.`);
  if (drumHits > 0 && backbeatMissing) fit.lose(20, style.backbeatTip);
  if (fit.value >= 95) highlights.push({ text: `Right tempo, key and feel for ${genre.name}.`, weight: weights.genre });

  // A stock starter groove is generic: it only counts as your own once you change it.
  const similarity = starterSimilarity(p);
  if (similarity >= 0.6) {
    const heavy = similarity >= 0.85;
    const tip = heavy
      ? 'This is almost the stock starter groove. Change the drums, 808 and melody to make it your own.'
      : 'This is still close to a stock starter groove. Change more of it to stand out.';
    drums.lose(heavy ? 20 : 8, tip);
    bass.lose(heavy ? 15 : 6, tip);
    melody.lose(heavy ? 20 : 8, tip);
  }

  const composition = { drums: drums.value, bass: bass.value, melody: melody.value, mix: mix.value, genre: fit.value };
  for (const part of PARTS) composition[part] = Math.round(composition[part]);

  return {
    composition,
    tips: [...issues.entries()].sort((a, b) => b[1] - a[1]).map(([tip]) => tip),
    highlights: highlights.sort((a, b) => b.weight - a.weight).map((h) => h.text),
  };
}
