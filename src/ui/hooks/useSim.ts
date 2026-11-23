import { useEffect, useState } from 'preact/hooks';
import type { Simulation } from '../../sim/Simulation';
import type { SimEventName } from '../../sim/core/events';
import type { ViewBridge } from '../../app/ViewBridge';

/** Re-renders the component whenever any of the given simulation events fire. */
export function useSimEvents(sim: Simulation, names: SimEventName[]): void {
  const [, bump] = useState(0);
  useEffect(() => {
    const offs = names.map((n) => sim.events.on(n, () => bump((v) => v + 1)));
    return () => offs.forEach((off) => off());
  }, [sim, names.join()]);
}

/** Re-renders the component whenever the view bridge changes. */
export function useBridge(bridge: ViewBridge): void {
  const [, bump] = useState(0);
  useEffect(() => bridge.subscribe(() => bump((v) => v + 1)), [bridge]);
}
