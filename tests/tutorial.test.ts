import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/sim/Simulation';
import { createNewGameState, DEFAULT_SETUP, STATE_VERSION } from '../src/sim/core/state';
import { createRng } from '../src/sim/core/rng';
import { defaultSettings, emptyPattern } from '../src/content/music';
import { ViewBridge } from '../src/app/ViewBridge';
import { Tutorial } from '../src/app/Tutorial';
import { TUTORIAL_STEPS } from '../src/app/tutorialSteps';
import { MENTOR } from '../src/content/tutorial';
import { migrate } from '../src/save/migrations';
import { playerPattern } from './helpers/playerPattern';

function setup() {
  const sim = new Simulation(createNewGameState(5, DEFAULT_SETUP));
  const bridge = new ViewBridge();
  sim.state.player.location = { area: 'apartment', x: 152, y: 124, facing: 'down' };
  const tutorial = new Tutorial(sim, bridge);
  bridge.subscribe(() => (tutorial as unknown as { check: () => void }).check());
  return { sim, bridge, tutorial };
}

const id = (t: Tutorial) => t.step()?.id;

describe('tutorial', () => {
  it('is offered on a new game, and old saves are not offered it', () => {
    expect(createNewGameState(1).tutorial.status).toBe('offered');
    const v8 = { ...createNewGameState(1), version: 8 } as unknown as Record<string, unknown>;
    delete v8.tutorial;
    const migrated = migrate(v8);
    expect(migrated.version).toBe(STATE_VERSION);
    expect(migrated.tutorial.status).toBe('off');
  });

  it('can be skipped and replayed', () => {
    const { tutorial } = setup();
    tutorial.skip();
    expect(tutorial.status).toBe('off');
    tutorial.begin();
    expect(id(tutorial)).toBe('welcome');
  });

  it('walks through every step when the player does each thing', () => {
    const { sim, bridge, tutorial } = setup();
    tutorial.begin();
    const seen: string[] = [];
    const record = () => { if (id(tutorial) && seen.at(-1) !== id(tutorial)) seen.push(id(tutorial)!); };
    const next = () => { record(); tutorial.next(); record(); };
    const ui = (patch: Parameters<ViewBridge['setUi']>[0]) => { record(); bridge.setUi(patch); record(); };

    next(); // welcome
    sim.state.player.location.x += 40; ui({});
    next(); // transport
    next(); // levels
    ui({ phoneApp: 'home' }); // phone
    next(); // phone tour
    ui({ phoneApp: null });

    // First beat, built the way Mo asks.
    const settings = defaultSettings('trap');
    const pattern = emptyPattern();
    const daw = () => ({ page: 'drums', playing: false, settings, pattern, everPlayed: false });
    ui({ menu: 'daw', daw: daw() });
    expect(tutorial.canContinue()).toBe(true); // trap is the default genre
    next(); // genre
    pattern.drums.kick = pattern.drums.kick.map((_, i) => ([0, 7, 10].includes(i) ? 1 : 0)); ui({ daw: daw() });
    pattern.drums.clap[8] = 1; ui({ daw: daw() });
    pattern.drums.hat = pattern.drums.hat.map((_, i) => (i % 2 === 0 ? 1 : 0)); ui({ daw: daw() });
    pattern.drums.hat[14] = 3; ui({ daw: daw() });
    pattern.bass[0] = 0; pattern.bass[7] = 0; ui({ daw: { ...daw(), page: 'bass' } });
    pattern.melody[0] = [4]; pattern.melody[3] = [3]; pattern.melody[6] = [2]; pattern.melody[8] = [4]; ui({ daw: { ...daw(), page: 'melody' } });
    ui({ daw: { ...daw(), playing: true, everPlayed: true } });
    expect(id(tutorial)).toBe('finish');
    sim.dispatch('saveDraft', { settings, pattern });
    sim.dispatch('finishBeat', { title: 'First' });
    sim.dispatch('debugSkipMinutes', { minutes: sim.state.activity!.until - sim.state.clock.totalMinutes });
    ui({ menu: 'report', daw: null });
    next(); // report
    ui({ menu: 'none' });

    // BeatHub.
    ui({ phoneApp: 'beathub' });
    sim.dispatch('listBeat', { beatId: sim.state.studio.beats[0]!.id }); ui({});
    next(); // hub tour
    ui({ phoneApp: null });

    // Outside.
    expect(bridge.tutorialTarget).toBe('door');
    sim.dispatch('performAction', { objectId: 'door', actionId: 'leave' }); ui({});
    next(); // Kwik Mart
    expect(bridge.tutorialTarget).toBe('busStop');
    sim.dispatch('travel', { to: 'midtown', mode: 'ride' });
    sim.dispatch('debugSkipMinutes', { minutes: sim.state.activity!.until - sim.state.clock.totalMinutes });
    ui({});
    expect(bridge.tutorialTarget).toBe('gearStoreDoor');
    ui({ menu: 'gear' });
    next(); // gear tour
    ui({ menu: 'none' });

    // Social.
    sim.dispatch('postSnippet', { beatId: sim.state.studio.beats[0]!.id }); ui({});
    sim.dispatch('uploadVideo', { beatId: sim.state.studio.beats[0]!.id, tag: 'Lil Vexx' }); ui({});
    expect(id(tutorial)).toBe('done');
    next();

    expect(seen).toEqual(TUTORIAL_STEPS.map((s) => s.id));
    expect(tutorial.status).toBe('off');
    expect(sim.state.inbox.messages.at(-1)!.from).toBe(MENTOR.name);
    expect(bridge.tutorialTarget).toBeNull();
  });

  it('does not count beats made before the step started', () => {
    const { sim, bridge, tutorial } = setup();
    sim.dispatch('saveDraft', { settings: defaultSettings('trap'), pattern: playerPattern('trap', createRng(1)) });
    sim.dispatch('finishBeat', { title: 'Old' });
    sim.dispatch('debugSkipMinutes', { minutes: sim.state.activity!.until - sim.state.clock.totalMinutes });
    tutorial.begin();
    const finish = TUTORIAL_STEPS.findIndex((s) => s.id === 'finish');
    sim.dispatch('setTutorial', { status: 'active', step: finish, baseline: { beats: 1, listed: 0, posts: 0, videos: 0, x: 0, y: 0 } });
    bridge.setUi({});
    expect(tutorial.step()?.id).toBe('finish');
  });
});
