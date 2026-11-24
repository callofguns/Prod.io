import type Phaser from 'phaser';
import { Simulation } from '../sim/Simulation';
import type { GameState } from '../sim/core/state';
import { AutoSaver } from '../save/AutoSaver';
import { createGame } from '../game/createGame';
import { ViewBridge } from './ViewBridge';
import { SKILLS } from '../content/skills';
import { BRANDS } from '../content/brands';
import { LEASES } from '../content/beathub';
import { formatMoney } from '../sim/core/money';

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
    this.sim.events.on('skillLevelUp', ({ skill, level }) => {
      const name = SKILLS.find((s) => s.id === skill)?.name ?? skill;
      this.bridge.toast(`${name} is now ${level}.`, 'good');
    });
    this.sim.events.on('beatSold', ({ sale, beatTitle, net }) => {
      const what = sale.tier === 'exclusive' ? 'Exclusive rights' : LEASES[sale.tier].name;
      const via = sale.via === 'viewtube' ? ` via ${BRANDS.video}` : sale.via === 'instasnap' ? ` via ${BRANDS.social}` : '';
      this.bridge.toast(`${BRANDS.beatStore}: ${what} of "${beatTitle}" sold to ${sale.buyer}${via} (+${formatMoney(net)})`, 'good');
    });
    this.sim.events.on('offerReceived', ({ offer, beatTitle }) => {
      this.bridge.toast(`Exclusive offer: ${formatMoney(offer.amount)} for "${beatTitle}". Open ${BRANDS.beatStore} to answer.`, 'good');
    });
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
