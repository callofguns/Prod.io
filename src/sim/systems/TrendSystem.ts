import type { Simulation, System } from '../Simulation';
import { GENRES, type GenreId } from '../../content/music';
import { TRENDS, trendLabel, type TrendLabel } from '../../content/trends';
import { advanceTrends } from '../trends';

export interface TrendView {
  genre: GenreId;
  label: TrendLabel;
  direction: 'up' | 'down' | 'flat';
  hotBpm: number;
}

/** Genre popularity and popular tempos, updated every Monday. */
export class TrendSystem implements System {
  readonly id = 'trends';

  constructor(private sim: Simulation) {
    sim.events.on('weekStarted', () => {
      advanceTrends(sim.state.trends, sim.state.rng);
      sim.events.emit('trendsChanged', {});
    });
  }

  popularity(genre: GenreId): number {
    return this.sim.state.trends.genres[genre].popularity;
  }

  /** Bonus when a beat's tempo is close to what buyers want right now. */
  bpmFit(genre: GenreId, bpm: number): number {
    return Math.abs(bpm - this.sim.state.trends.genres[genre].hotBpm) <= TRENDS.bpmWindow ? TRENDS.bpmBonus : 1;
  }

  /** What BeatHub shows: ranks and directions, never the raw numbers. */
  view(): TrendView[] {
    const genres = this.sim.state.trends.genres;
    return (Object.keys(GENRES) as GenreId[])
      .sort((a, b) => genres[b].popularity - genres[a].popularity)
      .map((genre) => {
        const g = genres[genre];
        const label = trendLabel(g.popularity, g.previous);
        // The arrow always agrees with the label: only Rising/Cooling (or a Hot genre still climbing) move.
        const direction = label === 'Rising' ? 'up' : label === 'Cooling' ? 'down'
          : label === 'Hot' && g.popularity - g.previous >= 0.04 ? 'up' : 'flat';
        return { genre, label, direction, hotBpm: g.hotBpm } as TrendView;
      });
  }
}
