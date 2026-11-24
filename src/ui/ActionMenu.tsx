import type { Session } from '../app/Session';
import { useBridge, useSimEvents } from './hooks/useSim';

const TITLES: Record<string, string> = {
  bed: 'Bed',
  fridge: 'Fridge',
  stove: 'Stove',
  computer: 'Computer',
  door: 'Front door',
};

/** Choices for the object the player pressed E on. Number keys pick an option. */
export function ActionMenu({ session }: { session: Session }) {
  const { sim, bridge } = session;
  useBridge(bridge);
  useSimEvents(sim, ['fridgeChanged', 'needsChanged', 'hour']);
  const objectId = bridge.actionsFor;
  if (!objectId) return null;
  const options = sim.actions.list(objectId);

  return (
    <div class="action-menu chassis interactive" role="menu" aria-label={TITLES[objectId] ?? objectId}>
      <div class="action-head">
        <p class="silk">{TITLES[objectId] ?? objectId}</p>
        <button class="action-close" aria-label="Close" onClick={() => bridge.openActions(null)}>×</button>
      </div>
      {options.map((o, i) => (
        <button
          key={o.id}
          class="action"
          role="menuitem"
          disabled={!!o.disabled}
          onClick={() => performAction(session, objectId, o.id)}
        >
          <span class="cap key-only">{i + 1}</span>
          <span class="action-text">
            <span class="action-label">{o.label}</span>
            <span class="action-detail">{o.disabled ?? o.detail ?? ''}</span>
          </span>
        </button>
      ))}
      <p class="action-hint key-only"><span class="cap">Esc</span> Close</p>
    </div>
  );
}

export function performAction(session: Session, objectId: string, actionId: string): void {
  const result = session.sim.dispatch('performAction', { objectId, actionId });
  session.bridge.openActions(null);
  if (!result.ok) session.bridge.toast(result.error, 'bad');
}
