import { formatMoney, type Cents } from '../../sim/core/money';
import { formatClock, toCalendar } from '../../sim/core/time';

export const signedMoney = (c: Cents) => (c > 0 ? `+${formatMoney(c)}` : formatMoney(c).replace('-', '−'));

/** "Today 14:20", "Yesterday 09:05" or "Mon Jan 4 · 08:00", relative to the current game minute. */
export function when(minute: number, now: number): string {
  const t = toCalendar(minute);
  const today = toCalendar(now);
  const dayDiff = today.day - t.day;
  if (dayDiff === 0) return `Today ${formatClock(t)}`;
  if (dayDiff === 1) return `Yesterday ${formatClock(t)}`;
  return `${t.weekday} ${t.month} ${t.date} · ${formatClock(t)}`;
}
