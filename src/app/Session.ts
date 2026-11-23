import type Phaser from 'phaser';
import { Simulation } from '../sim/Simulation';
import type { GameState } from '../sim/core/state';
import { AutoSaver } from '../save/AutoSaver';
import { createGame } from '../game/createGame';
import { ViewBridge } from './ViewBridge';

/** One running playthrough: simulation + autosave + Phaser world + view bridge. */
export class Session {
  readonly sim: Simulation;
  readonly bridge = new ViewBridge();
  readonly autosaver: AutoSaver;
  private game: Phaser.Game | null = null;

  constructor(state: GameState) {
    this.sim = new Simulation(state);
    this.autosaver = new AutoSaver(this.sim, (msg) => this.bridge.toast(msg, 'bad'));
    this.bridge.onInteract = (id) => this.bridge.openActions(this.bridge.actionsFor === id ? null : id);
    this.sim.events.on('notice', ({ text, tone }) => this.bridge.toast(text, tone));
    this.sim.events.on('messageReceived', ({ message }) => this.bridge.toast(`New message from ${message.from}. Press P to read.`));
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
