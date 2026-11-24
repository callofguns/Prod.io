import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/sim/Simulation';
import { createNewGameState, DEFAULT_SETUP } from '../src/sim/core/state';
import { defaultSettings, emptyPattern, starterPattern, degreeToMidi, GENRES } from '../src/content/music';
import { PRODUCTION } from '../src/content/production';

const newSim = () => new Simulation(createNewGameState(5, DEFAULT_SETUP));

describe('music theory helpers', () => {
  it('maps scale degrees to MIDI notes', () => {
    // A minor from C4: A4 = 69, octave above = 81
    expect(degreeToMidi(0, 9, 'minor', 60)).toBe(69);
    expect(degreeToMidi(2, 9, 'minor', 60)).toBe(72); // C5
    expect(degreeToMidi(7, 9, 'minor', 60)).toBe(81);
  });

  it('gives every genre a starter groove with content', () => {
    const sim = newSim();
    for (const g of Object.keys(GENRES) as (keyof typeof GENRES)[]) {
      expect(sim.studio.hasPlayableContent(starterPattern(g))).toBe(true);
    }
  });
});

describe('studio', () => {
  it('saves a draft and rejects malformed ones', () => {
    const sim = newSim();
    expect(sim.dispatch('saveDraft', { settings: defaultSettings('rnb'), pattern: starterPattern('rnb') }).ok).toBe(true);
    expect(sim.state.studio.draft?.settings.genre).toBe('rnb');
    const bad = emptyPattern();
    bad.drums.hat[0] = 9;
    expect(sim.dispatch('saveDraft', { settings: defaultSettings(), pattern: bad }).ok).toBe(false);
    expect(sim.dispatch('saveDraft', { settings: { ...defaultSettings(), bpm: 300 }, pattern: emptyPattern() }).ok).toBe(false);
  });

  it('refuses to finish an empty or untitled beat', () => {
    const sim = newSim();
    sim.dispatch('saveDraft', { settings: defaultSettings(), pattern: emptyPattern() });
    expect(sim.dispatch('finishBeat', { title: 'Nothing' }).ok).toBe(false);
    sim.dispatch('saveDraft', { settings: defaultSettings(), pattern: starterPattern('trap') });
    expect(sim.dispatch('finishBeat', { title: '   ' }).ok).toBe(false);
  });

  it('refuses when too tired', () => {
    const sim = newSim();
    sim.dispatch('saveDraft', { settings: defaultSettings(), pattern: starterPattern('trap') });
    sim.state.needs.energy = PRODUCTION.minEnergy - 1;
    expect(sim.dispatch('finishBeat', { title: 'Late night' }).ok).toBe(false);
  });

  it('finishing takes in-game hours, costs energy and adds the beat to the library', () => {
    const sim = newSim();
    sim.dispatch('saveDraft', { settings: defaultSettings(), pattern: starterPattern('trap') });
    const minutes = sim.studio.workMinutes();
    expect(minutes).toBeGreaterThan(180);
    const energy = sim.state.needs.energy;
    const start = sim.state.clock.totalMinutes;
    expect(sim.dispatch('finishBeat', { title: 'First Light' }).ok).toBe(true);
    expect(sim.state.activity?.kind).toBe('producing');
    sim.dispatch('debugSkipMinutes', { minutes });
    expect(sim.state.activity).toBeNull();
    expect(sim.state.studio.beats).toHaveLength(1);
    expect(sim.state.studio.beats[0]).toMatchObject({ title: 'First Light', workMinutes: minutes });
    expect(sim.state.studio.draft).toBeNull();
    expect(sim.state.clock.totalMinutes).toBe(start + minutes);
    expect(energy - sim.state.needs.energy).toBeGreaterThan(minutes * (100 / (17 * 60)) * 1.5);
  });

  it('skilled producers work faster', () => {
    const novice = newSim();
    const pro = newSim();
    pro.state.player.skills = { ...pro.state.player.skills, drums: 80, melody: 80, mixing: 80 };
    expect(pro.studio.workMinutes()).toBeLessThan(novice.studio.workMinutes());
  });
});
