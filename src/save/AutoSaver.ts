import type { Simulation } from '../sim/Simulation';
import { writeMirror, writeSave } from './SaveStore';

/** Saves at the start of every in-game day and whenever the page is hidden or closed. */
export class AutoSaver {
  private disposers: Array<() => void> = [];
  lastSavedAt: number | null = null;

  constructor(private sim: Simulation, private onError: (message: string) => void) {}

  start(): void {
    this.disposers.push(this.sim.events.on('dayStarted', () => void this.saveNow()));
    const onHide = () => {
      if (document.visibilityState === 'hidden') this.saveSync();
    };
    const onPageHide = () => this.saveSync();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    this.disposers.push(
      () => document.removeEventListener('visibilitychange', onHide),
      () => window.removeEventListener('pagehide', onPageHide),
    );
  }

  async saveNow(): Promise<void> {
    try {
      await writeSave(this.sim.state);
      this.lastSavedAt = Date.now();
    } catch (err) {
      this.onError(`Autosave failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  saveSync(): void {
    writeMirror(this.sim.state);
    this.lastSavedAt = Date.now();
  }

  stop(): void {
    this.disposers.forEach((d) => d());
    this.disposers = [];
  }
}
