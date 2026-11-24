import type { Simulation, System } from '../Simulation';
import { NEEDS } from '../../content/living';
import { PRODUCTION } from '../../content/production';
import { TUTORIAL } from '../../content/learning';
import type { NeedsState } from '../core/state';

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Energy, food and mood: drain over time, recover from sleep and meals, and shape productivity. */
export class NeedsSystem implements System {
  readonly id = 'needs';

  constructor(private sim: Simulation) {
    sim.events.on('minute', () => this.tick());
    sim.events.on('hour', () => this.driftMood());
  }

  get needs(): NeedsState {
    return this.sim.state.needs;
  }

  change(delta: Partial<NeedsState>): void {
    const n = this.needs;
    if (delta.energy) n.energy = clamp(n.energy + delta.energy);
    if (delta.food) n.food = clamp(n.food + delta.food);
    if (delta.mood) n.mood = clamp(n.mood + delta.mood);
    this.sim.events.emit('needsChanged', { needs: n });
  }

  /** Multiplier for work speed and quality, 0.4-1.1. Used by production from update 4. */
  productivity(): number {
    const { energy, food, mood } = this.needs;
    const e = energy < NEEDS.lowThreshold ? 0.6 : 1;
    const f = food < NEEDS.lowThreshold ? 0.8 : 1;
    const m = 0.85 + (mood / 100) * 0.25;
    return Math.max(0.4, e * f * m);
  }

  moodTarget(): number {
    const { energy, food } = this.needs;
    let target = NEEDS.moodBaseline;
    if (food < NEEDS.lowThreshold) target -= NEEDS.moodPenalty.hungry;
    if (energy < NEEDS.lowThreshold) target -= NEEDS.moodPenalty.exhausted;
    if (this.sim.state.finance.debts.some((d) => d.kind === 'overdue')) target -= NEEDS.moodPenalty.overdueBills;
    return target;
  }

  private tick(): void {
    const n = this.needs;
    const asleep = this.sim.state.activity?.kind === 'sleeping';
    if (asleep) {
      n.energy = clamp(n.energy + NEEDS.energyGainAsleep);
      n.food = clamp(n.food - NEEDS.foodDrainAsleep);
    } else {
      const kind = this.sim.state.activity?.kind;
      const work = kind === 'producing' ? PRODUCTION.energyFactor : kind === 'studying' ? TUTORIAL.energyFactor : 1;
      const factor = (n.food <= 0 ? NEEDS.starvingEnergyFactor : 1) * work;
      n.energy = clamp(n.energy - NEEDS.energyDrainAwake * factor);
      n.food = clamp(n.food - NEEDS.foodDrainAwake);
      if (n.energy <= 0) this.sim.activity.passOut();
    }
  }

  private driftMood(): void {
    const n = this.needs;
    const target = this.moodTarget();
    const step = Math.min(NEEDS.moodPerHour, Math.abs(target - n.mood));
    n.mood = clamp(n.mood + Math.sign(target - n.mood) * step);
    this.sim.events.emit('needsChanged', { needs: n });
  }
}
