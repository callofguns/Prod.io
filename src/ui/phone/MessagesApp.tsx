import { useState } from 'preact/hooks';
import type { Simulation } from '../../sim/Simulation';
import { useSimEvents } from '../hooks/useSim';
import { when } from './format';

export function MessagesApp({ sim }: { sim: Simulation }) {
  useSimEvents(sim, ['messageReceived', 'inboxChanged', 'hour']);
  const [openId, setOpenId] = useState<number | null>(null);
  const { messages } = sim.state.inbox;
  const now = sim.state.clock.totalMinutes;
  const open = messages.find((m) => m.id === openId);

  if (open) {
    return (
      <div class="app">
        <button class="app-back" onClick={() => setOpenId(null)}>‹ All messages</button>
        <article class="message">
          <p class="message-from">{open.from}</p>
          <h3 class="message-subject">{open.subject}</h3>
          <p class="row-sub">{when(open.minute, now)}</p>
          <p class="message-body">{open.body}</p>
        </article>
      </div>
    );
  }

  if (messages.length === 0) return <div class="app"><p class="app-empty">No messages yet.</p></div>;

  return (
    <div class="app">
      <ul class="rows">
        {[...messages].reverse().map((m) => (
          <li key={m.id}>
            <button
              class={`row row-button ${m.read ? '' : 'unread'}`}
              onClick={() => {
                sim.dispatch('markMessageRead', { id: m.id });
                setOpenId(m.id);
              }}
            >
              <span class="unread-led" aria-label={m.read ? undefined : 'Unread'} />
              <span class="row-main">
                <span class="row-title">{m.from}</span>
                <span class="row-sub">{m.subject}</span>
              </span>
              <span class="row-time">{when(m.minute, now).replace(/ · .*/, '')}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
