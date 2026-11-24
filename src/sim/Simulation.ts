import { EventBus } from './core/events';
import type { CommandHandler, CommandResult, SimCommandName, SimCommands } from './core/commands';
import { fail } from './core/commands';
import type { GameState } from './core/state';
import { ClockSystem } from './systems/ClockSystem';
import { EconomySystem } from './systems/EconomySystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { DebugSystem } from './systems/DebugSystem';
import { MessageSystem } from './systems/MessageSystem';
import { NeedsSystem } from './systems/NeedsSystem';
import { ActivitySystem } from './systems/ActivitySystem';
import { HomeSystem } from './systems/HomeSystem';
import { BillsSystem } from './systems/BillsSystem';
import { ActionSystem } from './systems/ActionSystem';
import { StudioSystem } from './systems/StudioSystem';

/** A system owns one slice of the game rules. */
export interface System {
  readonly id: string;
}

/**
 * The simulation root. Holds the state, the event bus, the command registry
 * and all systems. It has no knowledge of Phaser or the DOM.
 */
export class Simulation {
  readonly events = new EventBus();
  private handlers: { [K in SimCommandName]?: CommandHandler<K> } = {};

  readonly clock: ClockSystem;
  readonly economy: EconomySystem;
  readonly player: PlayerSystem;
  readonly messages: MessageSystem;
  readonly needs: NeedsSystem;
  readonly activity: ActivitySystem;
  readonly home: HomeSystem;
  readonly bills: BillsSystem;
  readonly actions: ActionSystem;
  readonly studio: StudioSystem;

  constructor(public state: GameState) {
    this.clock = new ClockSystem(this);
    this.economy = new EconomySystem(this);
    this.player = new PlayerSystem(this);
    this.messages = new MessageSystem(this);
    this.needs = new NeedsSystem(this);
    this.activity = new ActivitySystem(this);
    this.home = new HomeSystem(this);
    this.bills = new BillsSystem(this);
    this.actions = new ActionSystem(this);
    this.studio = new StudioSystem(this);
    new DebugSystem(this);
  }

  handle<K extends SimCommandName>(name: K, handler: CommandHandler<K>): void {
    if (this.handlers[name]) throw new Error(`Command "${name}" already has a handler`);
    (this.handlers as Record<K, CommandHandler<K>>)[name] = handler;
  }

  dispatch<K extends SimCommandName>(name: K, payload: SimCommands[K]): CommandResult {
    const handler = this.handlers[name] as CommandHandler<K> | undefined;
    if (!handler) return fail(`No handler for command "${name}"`);
    return handler(payload);
  }

  /** Advance the simulation by real elapsed milliseconds. */
  update(realMs: number): void {
    this.clock.advance(realMs);
  }
}
