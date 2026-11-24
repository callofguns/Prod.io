import type { Simulation } from '../sim/Simulation';
import type { ViewBridge } from './ViewBridge';
import { isTouch } from './device';
import { TUTORIAL_STEPS, snapshot, type StepContext, type TutorialStep } from './tutorialSteps';

/**
 * Runs Mo's tutorial: watches the game and the UI, ticks steps off when the
 * player does them, and tells the world which object to point at. Progress
 * is saved in the game state through the `setTutorial` command.
 */
export class Tutorial {
  private timer: number | null = null;

  constructor(private sim: Simulation, private bridge: ViewBridge) {}

  start(): void {
    this.timer = window.setInterval(() => this.check(), 250);
    this.bridge.subscribe(() => this.check());
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  get status() {
    return this.sim.state.tutorial.status;
  }

  get index(): number {
    return this.sim.state.tutorial.step;
  }

  get total(): number {
    return TUTORIAL_STEPS.length;
  }

  step(): TutorialStep | null {
    return this.status === 'active' ? TUTORIAL_STEPS[this.index] ?? null : null;
  }

  context(): StepContext {
    return { sim: this.sim, ui: this.bridge.ui, base: this.sim.state.tutorial.baseline, touch: isTouch() };
  }

  /** Begin (or replay) from the first step. */
  begin(): void {
    this.go(0);
  }

  /** Stop for good (it stays in the pause menu). */
  skip(): void {
    this.sim.dispatch('setTutorial', { status: 'off', step: 0, baseline: {} });
    this.bridge.tutorialTarget = null;
  }

  next(): void {
    if (this.status !== 'active') return;
    const last = this.index >= TUTORIAL_STEPS.length - 1;
    if (last) {
      this.sim.dispatch('setTutorial', { status: 'off', step: 0, baseline: {}, finished: true });
      this.bridge.tutorialTarget = null;
      return;
    }
    this.go(this.index + 1);
  }

  /** Whether Next can be pressed now (steps without `done`). */
  canContinue(): boolean {
    const s = this.step();
    if (!s) return false;
    return !s.ready || s.ready(this.context());
  }

  private go(index: number): void {
    this.sim.dispatch('setTutorial', { status: 'active', step: index, baseline: snapshot(this.sim) });
    this.check();
  }

  private check(): void {
    const s = this.step();
    if (!s) {
      this.bridge.tutorialTarget = null;
      return;
    }
    const ctx = this.context();
    this.bridge.tutorialTarget = s.world?.(ctx) ?? null;
    if (s.done?.(ctx)) this.next();
  }
}
