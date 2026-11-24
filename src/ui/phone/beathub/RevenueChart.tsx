import { useState } from 'preact/hooks';
import { formatMoney, type Cents } from '../../../sim/core/money';
import { toCalendar, MINUTES_PER_DAY, START_MINUTE } from '../../../sim/core/time';

export interface DayPoint {
  day: number;
  revenue: Cents;
  sales: number;
  plays: number;
}

const W = 300;
const H = 110;
const TOP = 18; // room for the max label
const BASE = H - 18; // room for the x labels
const BAR = 12; // <= 24px, never fills the slot
const R = 4;

const dateOf = (day: number) => {
  const t = toCalendar(START_MINUTE - (START_MINUTE % MINUTES_PER_DAY) + (day - 1) * MINUTES_PER_DAY);
  return `${t.weekday} ${t.month} ${t.date}`;
};

/** Column path: 4px rounded data-end, square at the baseline. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(R, h, w / 2);
  return `M${x},${BASE} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${BASE} Z`;
}

/**
 * Earnings per day: one series, so one hue and no legend; the extreme is
 * labeled, every bar has a hover/focus tooltip, and a table view carries
 * every value without hovering.
 */
export function RevenueChart({ points, todayDay }: { points: DayPoint[]; todayDay: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(...points.map((p) => p.revenue));
  const slot = W / points.length;
  const scale = (v: Cents) => (max > 0 ? ((BASE - TOP) * v) / max : 0);
  const maxIndex = points.findIndex((p) => p.revenue === max);
  const hovered = hover === null ? null : points[hover];

  return (
    <figure class="chart">
      <figcaption class="chart-head">
        <span class="app-heading">Earned per day</span>
        <button class="chart-toggle" aria-pressed={table} onClick={() => setTable((t) => !t)}>{table ? 'Show chart' : 'Show table'}</button>
      </figcaption>

      {table ? (
        <table class="chart-table">
          <thead><tr><th scope="col">Day</th><th scope="col">Plays</th><th scope="col">Sales</th><th scope="col">Earned</th></tr></thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.day}>
                <th scope="row">{p.day === todayDay ? 'Today' : dateOf(p.day)}</th>
                <td>{p.plays}</td>
                <td>{p.sales}</td>
                <td>{formatMoney(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div class="chart-plot">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Earned per day for the last ${points.length} days. Highest: ${formatMoney(max)}. Use Show table for every value.`}>
            <line x1={0} x2={W} y1={BASE + 0.5} y2={BASE + 0.5} class="chart-baseline" />
            {points.map((p, i) => {
              const h = scale(p.revenue);
              const x = i * slot + (slot - BAR) / 2;
              return (
                <g key={p.day}>
                  {h > 0 && <path d={columnPath(x, BASE - h, BAR, h)} class={`chart-bar ${hover === i ? 'hot' : ''}`} />}
                  <rect
                    x={i * slot} y={0} width={slot} height={BASE} class="chart-hit" tabIndex={0}
                    aria-label={`${p.day === todayDay ? 'Today' : dateOf(p.day)}: ${formatMoney(p.revenue)}, ${p.sales} sales`}
                    onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  />
                </g>
              );
            })}
            {max > 0 && (
              <text x={maxIndex * slot + slot / 2} y={BASE - scale(max) - 5} class="chart-label" text-anchor="middle">
                {formatMoney(max).replace('.00', '')}
              </text>
            )}
            <text x={2} y={H - 4} class="chart-axis">{dateOf(points[0]!.day)}</text>
            <text x={W - 2} y={H - 4} class="chart-axis" text-anchor="end">Today</text>
          </svg>
          {hovered && hover !== null && (
            <div class="chart-tip" style={{ left: `${((hover + 0.5) / points.length) * 100}%` }} role="status">
              <strong>{formatMoney(hovered.revenue)}</strong>
              <span>{hovered.day === todayDay ? 'Today' : dateOf(hovered.day)} · {hovered.sales} sale{hovered.sales === 1 ? '' : 's'}</span>
            </div>
          )}
          {max === 0 && <p class="chart-empty">No sales yet. List a few beats and give it a few days.</p>}
        </div>
      )}
    </figure>
  );
}
