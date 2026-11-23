import type Phaser from 'phaser';
import { Simulation } from '../sim/Simulation';
import type { GameState } from '../sim/core/state';
import { AutoSaver } from '../save/AutoSaver';
import { createGame } from '../game/createGame';
import { ViewBridge } from './ViewBridge';

/** What each apartment object does until its feature is built. */
const NOT_YET: Record<string, string> = {
  bed: 'Sleeping arrives in Milestone 1.',
  computer: 'Making beats arrives in Milestone 1.',
  stove: 'Cooking arrives in Milestone 1.',
  fridge: 'Food arrives in Milestone 1.',
  door: 'The city opens in Milestone 2.',
};

/** One running playthrough: simulation + autosave + Phaser world + view bridge. */
export class Session {
  readonly sim: Simulation;
  readonly bridge = new ViewBridge();
  readonly autosaver: AutoSaver;
  private game: Phaser.Game | null = null;

  constructor(state: GameState) {
    this.sim = new Simulation(state);
    this.autosaver = new AutoSaver(this.sim, (msg) => this.bridge.toast(msg, 'bad'));
    this.bridge.onInteract = (id) => this.bridge.toast(NOT_YET[id] ?? 'Nothing to do here yet.');
    this.sim.events.on('notice', ({ text, tone }) => this.bridge.toast(text, tone));
  }

  start(container: HTMLElement): void {
    this.game = createGame(container, { sim: this.sim, bridge: this.bridge });
    this.autosaver.start();
  }

  stop(): void {
    this.autosaver.stop();
    this.game?.destroy(true);
    this.game = null;
  }
}
