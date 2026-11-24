import { describe, expect, it } from 'vitest';
import { analyzePattern, starterSimilarity } from '../src/sim/quality/analyzePattern';
import { rateBeat } from '../src/sim/quality/rateBeat';
import { defaultSettings, emptyPattern, starterPattern, type Pattern } from '../src/content/music';
import { gradeFor } from '../src/content/quality';
import { zeroSkills, type Skills } from '../src/content/skills';

const allSkills = (v: number): Skills => Object.fromEntries(Object.keys(zeroSkills()).map((k) => [k, v])) as Skills;
const row = (hits: number[], value = 1) => Array.from({ length: 16 }, (_, i) => (hits.includes(i) ? value : 0));

/** A hand-made trap beat that follows the conventions but is not the stock starter. */
function myTrap(): Pattern {
  const p = emptyPattern();
  p.drums.kick = row([0, 6, 11]);
  p.drums.clap = row([8]);
  p.drums.hat = row([0, 2, 4, 6, 8, 10, 12, 13, 14]);
  p.drums.hat[12] = 2;
  p.drums.openHat = row([15]);
  p.bass = p.bass.map((_, i) => ({ 0: 0, 6: 0, 11: 4 } as Record<number, number>)[i] ?? -1);
  p.glide[11] = true;
  p.melody = p.melody.map((_, i) => ({ 0: [0], 2: [2], 4: [4], 7: [2], 10: [3], 12: [4], 14: [7] } as Record<number, number[]>)[i] ?? []);
  p.instrument = 'bell';
  return p;
}

describe('pattern analysis', () => {
  it('rewards a conventional hand-made trap beat', () => {
    const a = analyzePattern(defaultSettings('trap'), myTrap());
    expect(Math.min(...Object.values(a.composition))).toBeGreaterThanOrEqual(80);
    expect(a.highlights.length).toBeGreaterThan(0);
  });

  it('flags a missing half-time backbeat in trap', () => {
    const p = myTrap();
    p.drums.clap = row([4, 12]);
    const a = analyzePattern(defaultSettings('trap'), p);
    expect(a.tips.some((t) => t.includes('step 9'))).toBe(true);
    expect(a.composition.drums).toBeLessThan(analyzePattern(defaultSettings('trap'), myTrap()).composition.drums);
  });

  it('expects hi-hat rolls in trap and slides in drill', () => {
    const p = myTrap();
    p.drums.hat = row([0, 2, 4, 6, 8, 10, 12, 14]);
    expect(analyzePattern(defaultSettings('trap'), p).tips.some((t) => t.includes('roll'))).toBe(true);
    const drill = starterPattern('drill');
    drill.glide = drill.glide.map(() => false);
    expect(analyzePattern(defaultSettings('drill'), drill).tips.some((t) => t.includes('Slide'))).toBe(true);
  });

  it('wants chords in R&B and a BPM in range', () => {
    const p = myTrap();
    p.instrument = 'keys';
    const a = analyzePattern({ ...defaultSettings('rnb'), bpm: 140 }, p);
    expect(a.tips.some((t) => t.includes('chord'))).toBe(true);
    expect(a.tips.some((t) => t.includes('BPM'))).toBe(true);
    expect(a.composition.genre).toBeLessThan(70);
  });

  it('penalizes a melody that drowns the drums', () => {
    const p = myTrap();
    p.levels = { drums: 0.6, bass: 0.8, melody: 1 };
    expect(analyzePattern(defaultSettings('trap'), p).composition.mix).toBeLessThan(90);
  });

  it('treats the stock starter grooves as generic', () => {
    expect(starterSimilarity(starterPattern('trap'))).toBe(1);
    expect(starterSimilarity(myTrap())).toBeLessThan(0.6);
    const stock = analyzePattern(defaultSettings('trap'), starterPattern('trap'));
    expect(stock.tips.some((t) => t.includes('starter'))).toBe(true);
  });

  it('gives an empty melody and missing 808 low scores with tips', () => {
    const p = myTrap();
    p.melody = p.melody.map(() => []);
    p.bass = p.bass.map(() => -1);
    const a = analyzePattern(defaultSettings('trap'), p);
    expect(a.composition.melody).toBeLessThanOrEqual(30);
    expect(a.composition.bass).toBeLessThanOrEqual(15);
  });
});

describe('rating (skills first)', () => {
  it('skills matter more than the pattern', () => {
    const settings = defaultSettings('trap');
    const weakPattern = (() => { const p = emptyPattern(); p.drums.kick = row([0]); return p; })();
    const novice = allSkills(10);
    const pro = allSkills(80);
    const patternGap = rateBeat(settings, myTrap(), novice, 1).score - rateBeat(settings, weakPattern, novice, 1).score;
    const skillGap = rateBeat(settings, myTrap(), pro, 1).score - rateBeat(settings, myTrap(), novice, 1).score;
    expect(skillGap).toBeGreaterThan(patternGap);
  });

  it('beginners land around C/D and experts around A', () => {
    const settings = defaultSettings('trap');
    const beginner = rateBeat(settings, myTrap(), { ...zeroSkills(), drums: 18, soundDesign: 15, melody: 8, mixing: 6, mastering: 2 }, 1);
    expect(beginner.score).toBeGreaterThanOrEqual(50);
    expect(beginner.score).toBeLessThan(65);
    expect(rateBeat(settings, myTrap(), allSkills(85), 1).grade).toMatch(/A|S/);
  });

  it('being exhausted or starving lowers the score', () => {
    const s = defaultSettings('trap');
    expect(rateBeat(s, myTrap(), allSkills(40), 0.5).score).toBeLessThan(rateBeat(s, myTrap(), allSkills(40), 1).score);
  });

  it('points at the skill holding the beat back', () => {
    const q = rateBeat(defaultSettings('rnb'), starterPattern('rnb'), { ...allSkills(60), melody: 5 }, 1);
    expect(q.skillTip).toMatch(/Melody/);
  });

  it('maps scores to grades', () => {
    expect(gradeFor(95).grade).toBe('S');
    expect(gradeFor(70).grade).toBe('B');
    expect(gradeFor(39).grade).toBe('F');
  });
});
