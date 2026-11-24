import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/sim/Simulation';
import { createNewGameState, DEFAULT_SETUP } from '../src/sim/core/state';
import { defaultSettings, starterPattern } from '../src/content/music';
import { COURSES, TUTORIAL, learnRate } from '../src/content/learning';
import { migrate } from '../src/save/migrations';

const newSim = () => new Simulation(createNewGameState(9, DEFAULT_SETUP));

function finishBeat(sim: Simulation, genre: 'trap' | 'drill' | 'rnb' | 'pop' = 'trap') {
  sim.state.needs = { energy: 100, food: 100, mood: 70 };
  sim.dispatch('saveDraft', { settings: defaultSettings(genre), pattern: starterPattern(genre) });
  const r = sim.dispatch('finishBeat', { title: 'Practice' });
  if (!r.ok) throw new Error(r.error);
  sim.dispatch('debugSkipMinutes', { minutes: sim.state.activity!.until - sim.state.clock.totalMinutes });
  return sim.state.studio.beats.at(-1)!;
}

describe('practice XP', () => {
  it('rates the beat and grows the skills you used', () => {
    const sim = newSim();
    const before = { ...sim.state.player.skills };
    const beat = finishBeat(sim);
    expect(beat.quality.score).toBeGreaterThan(30);
    expect(beat.quality.grade).toBeTruthy();
    expect(sim.state.player.skills.drums).toBeGreaterThan(before.drums);
    expect(sim.state.player.skills.mixing).toBeGreaterThan(before.mixing);
    expect(beat.xp.drums).toBeGreaterThan(0);
  });

  it('has diminishing returns', () => {
    expect(learnRate(0)).toBe(1);
    expect(learnRate(80)).toBeLessThan(learnRate(40));
    const low = newSim();
    const high = newSim();
    high.state.player.skills.drums = 70;
    expect(low.skills.gain('drums', 1)).toBeGreaterThan(high.skills.gain('drums', 1));
  });

  it('takes many beats to get good (no instant mastery)', () => {
    const sim = newSim();
    for (let i = 0; i < 40; i++) finishBeat(sim, (['trap', 'drill', 'rnb', 'pop'] as const)[i % 4]);
    const drums = sim.state.player.skills.drums;
    expect(drums).toBeGreaterThan(30);
    expect(drums).toBeLessThan(60);
  });

  it('announces level-ups', () => {
    const sim = newSim();
    sim.state.player.skills.mixing = 6.99;
    let level = 0;
    sim.events.on('skillLevelUp', (e) => { if (e.skill === 'mixing') level = e.level; });
    sim.skills.gain('mixing', 1);
    expect(level).toBe(7);
  });
});

describe('tutorials', () => {
  it('take an hour and teach a little', () => {
    const sim = newSim();
    const before = sim.state.player.skills.mastering;
    expect(sim.dispatch('startTutorial', { skill: 'mastering' }).ok).toBe(true);
    expect(sim.state.activity?.kind).toBe('studying');
    sim.dispatch('debugSkipMinutes', { minutes: TUTORIAL.minutes });
    expect(sim.state.activity).toBeNull();
    expect(sim.state.player.skills.mastering).toBeGreaterThan(before);
  });

  it('stop helping past the cap', () => {
    const sim = newSim();
    sim.state.player.skills.mixing = TUTORIAL.maxSkill;
    expect(sim.dispatch('startTutorial', { skill: 'mixing' }).ok).toBe(false);
  });
});

describe('courses', () => {
  it('must be bought, cost money and run session by session', () => {
    const sim = newSim();
    const course = COURSES.find((c) => c.id === 'mixing-essentials')!;
    expect(sim.dispatch('startCourseSession', { courseId: course.id }).ok).toBe(false);
    const cash = sim.state.player.cash;
    expect(sim.dispatch('buyCourse', { courseId: course.id }).ok).toBe(true);
    expect(sim.state.player.cash).toBe(cash - course.price);
    expect(sim.dispatch('buyCourse', { courseId: course.id }).ok).toBe(false);
    const before = sim.state.player.skills.mixing;
    for (let i = 0; i < course.sessions; i++) {
      sim.state.needs.energy = 100;
      expect(sim.dispatch('startCourseSession', { courseId: course.id }).ok).toBe(true);
      sim.dispatch('debugSkipMinutes', { minutes: course.sessionMinutes });
    }
    expect(sim.state.player.skills.mixing - before).toBeGreaterThan(5);
    expect(sim.state.learning.courses[0]!.sessionsDone).toBe(course.sessions);
    expect(sim.dispatch('startCourseSession', { courseId: course.id }).ok).toBe(false);
    expect(sim.state.inbox.messages.at(-1)!.subject).toMatch(/Course complete/);
  });

  it('declines when you cannot afford it', () => {
    const sim = newSim();
    sim.state.player.cash = 1000;
    expect(sim.dispatch('buyCourse', { courseId: 'pro-mixing' }).ok).toBe(false);
  });
});

describe('save upgrade to v6', () => {
  it('rates beats made before ratings existed', () => {
    const state = createNewGameState(1, DEFAULT_SETUP) as unknown as Record<string, unknown>;
    const v5 = {
      ...state,
      version: 5,
      studio: {
        draft: null,
        nextBeatId: 2,
        beats: [{ id: 1, title: 'Old', settings: defaultSettings('trap'), pattern: starterPattern('trap'), createdAt: 500, workMinutes: 240 }],
      },
    };
    delete (v5 as Record<string, unknown>).learning;
    const migrated = migrate(v5);
    expect(migrated.studio.beats[0]!.quality.score).toBeGreaterThan(0);
    expect(migrated.learning.courses).toEqual([]);
  });
});
