import type { Simulation, System } from '../Simulation';
import { fail, ok } from '../core/commands';
import type { Message } from '../core/state';

/** The phone's inbox: other systems send messages, the player reads them. */
export class MessageSystem implements System {
  readonly id = 'messages';

  constructor(private sim: Simulation) {
    sim.handle('markMessageRead', ({ id }) => {
      const msg = sim.state.inbox.messages.find((m) => m.id === id);
      if (!msg) return fail(`No message ${id}`);
      if (!msg.read) {
        msg.read = true;
        sim.events.emit('inboxChanged', { unread: this.unreadCount() });
      }
      return ok;
    });
  }

  send(from: string, subject: string, body: string): Message {
    const { inbox, clock } = this.sim.state;
    const message: Message = { id: inbox.nextMessageId++, minute: clock.totalMinutes, from, subject, body, read: false };
    inbox.messages.push(message);
    this.sim.events.emit('messageReceived', { message });
    this.sim.events.emit('inboxChanged', { unread: this.unreadCount() });
    return message;
  }

  unreadCount(): number {
    return this.sim.state.inbox.messages.reduce((n, m) => n + (m.read ? 0 : 1), 0);
  }
}
