/**
 * Game time is a single integer: minutes elapsed since the campaign started.
 * Everything calendar-related is derived from it.
 */
export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/** The campaign starts on Monday 4 January 2027 at 08:00. */
export const CAMPAIGN_START_UTC = Date.UTC(2027, 0, 4, 0, 0);
export const START_MINUTE = 8 * MINUTES_PER_HOUR;

export const SPEEDS = [1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

/** At 1x, one in-game minute passes per real second (a day lasts 24 real minutes). */
export const REAL_MS_PER_GAME_MINUTE = 1000;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export interface CalendarTime {
  /** 1-based day number since the campaign started. */
  day: number;
  hour: number;
  minute: number;
  weekday: (typeof WEEKDAYS)[number];
  /** 0 = Sunday ... 6 = Saturday */
  weekdayIndex: number;
  date: number;
  month: (typeof MONTHS)[number];
  monthIndex: number;
  year: number;
}

export function toCalendar(totalMinutes: number): CalendarTime {
  const d = new Date(CAMPAIGN_START_UTC + totalMinutes * 60_000);
  const weekdayIndex = d.getUTCDay();
  const monthIndex = d.getUTCMonth();
  return {
    day: Math.floor(totalMinutes / MINUTES_PER_DAY) + 1,
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: WEEKDAYS[weekdayIndex]!,
    weekdayIndex,
    date: d.getUTCDate(),
    month: MONTHS[monthIndex]!,
    monthIndex,
    year: d.getUTCFullYear(),
  };
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
export const formatClock = (t: CalendarTime) => `${pad2(t.hour)}:${pad2(t.minute)}`;
export const formatDate = (t: CalendarTime) => `${t.weekday} ${t.month} ${t.date}, ${t.year}`;
