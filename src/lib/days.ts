/**
 * Calendar dates for a tracking session — Jen's feedback, 2026-09-24:
 *
 *   "Can we have the days automatically populate with the actual date?"
 *   "Need a way to stop people from filling each day one right after another"
 *
 * Both answers come from the same place: day 1 is the session's start_date,
 * day 2 the next day, and a day can't be logged before its own date has
 * arrived where the client is.
 *
 * Dates are handled as plain YYYY-MM-DD strings and compared as strings.
 * Turning them into Date objects invites the classic off-by-one, where a date
 * parsed as midnight UTC renders as the previous day for anyone west of it.
 */

/** A session day: 1-based number and the calendar date it belongs to. */
export type SessionDay = { dayNumber: number; date: string };

const MS_PER_DAY = 86_400_000;

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`, negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);
}

export function sessionDays(startDate: string, dayCount: number): SessionDay[] {
  const start = toUtc(startDate);
  return Array.from({ length: dayCount }, (_, i) => ({
    dayNumber: i + 1,
    date: fromUtc(start + i * MS_PER_DAY),
  }));
}

/**
 * Today's date where the client is. The timezone is stamped on the session at
 * setup; an unknown or unparseable one falls back to UTC rather than to the
 * server's own timezone, which would be an arbitrary third answer.
 */
export function todayInZone(timezone: string | null | undefined, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }
}

/** Wall-clock minutes since the epoch — for comparing times within one zone. */
function wallMinutes(y: number, m: number, d: number, hour = 0, minute = 0): number {
  return Date.UTC(y, m - 1, d, hour, minute) / 60_000;
}

/** Now, as wall-clock minutes where the client is. */
function nowInZone(timezone: string | null | undefined, now: Date): number {
  const [y, m, d] = todayInZone(timezone, now).split("-").map(Number);
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const [hour, minute] = hm.split(":").map(Number);
  return wallMinutes(y, m, d, hour === 24 ? 0 : hour, minute);
}

/**
 * When an hour of a session actually happens, as wall-clock minutes.
 *
 * Slots wrap past midnight: with a 1 AM bedtime the 00:00 slot belongs to the
 * next calendar day, so any hour below the wake hour is tomorrow's.
 */
export function hourStart(startDate: string, dayNumber: number, hour: number, wakeHour: number): number {
  const [y, m, d] = startDate.split("-").map(Number);
  return wallMinutes(y, m, d + (dayNumber - 1) + (hour < wakeHour ? 1 : 0), hour);
}

/** Jen's window: an hour can be logged for 24 hours after it starts. */
export const LOGGING_WINDOW_HOURS = 24;

/**
 * Whether an hour is open for logging (Jen, 2026-09-29): from the moment it
 * begins until 24 hours later. Before that it hasn't happened; after it,
 * "what would I have put?" is a guess rather than a record.
 *
 * The database decides for real — entry_hour_open() in
 * 20260929140000_hour_window_and_coach_edits.sql. This is the same rule, so
 * the screen can grey out what the database would refuse.
 */
export function isHourOpen(
  {
    startDate,
    dayNumber,
    hour,
    wakeHour,
    timezone,
  }: { startDate: string; dayNumber: number; hour: number; wakeHour: number; timezone: string | null | undefined },
  now = new Date(),
): boolean {
  const start = hourStart(startDate, dayNumber, hour, wakeHour);
  const current = nowInZone(timezone, now);
  return current >= start && current < start + LOGGING_WINDOW_HOURS * 60;
}

/** Minutes left before an hour closes; 0 once it has. */
export function minutesLeft(
  { startDate, dayNumber, hour, wakeHour, timezone }: Parameters<typeof isHourOpen>[0],
  now = new Date(),
): number {
  const closesAt = hourStart(startDate, dayNumber, hour, wakeHour) + LOGGING_WINDOW_HOURS * 60;
  return Math.max(0, closesAt - nowInZone(timezone, now));
}

/**
 * A day is reachable once its first hour has begun. Days ahead of that are
 * shown as "opens on…"; past days may be reachable but have closed hours.
 */
export function dayHasStarted(
  { startDate, dayNumber, wakeHour, timezone }: { startDate: string; dayNumber: number; wakeHour: number; timezone: string | null | undefined },
  now = new Date(),
): boolean {
  return nowInZone(timezone, now) >= hourStart(startDate, dayNumber, wakeHour, wakeHour);
}

/** The latest day that has started — where the log should open. */
export function currentDay(
  { startDate, dayCount, wakeHour, timezone }: { startDate: string; dayCount: number; wakeHour: number; timezone: string | null | undefined },
  now = new Date(),
): number {
  for (let day = dayCount; day >= 1; day--) {
    if (dayHasStarted({ startDate, dayNumber: day, wakeHour, timezone }, now)) return day;
  }
  return 1;
}

/**
 * "Mon, Sep 21" and "Monday, September 21".
 *
 * Built from fixed name lists rather than Intl: the month abbreviation for
 * September differs between ICU versions ("Sep" vs "Sept"), which makes the
 * label depend on whichever Node or browser renders it.
 */
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parts(date: string) {
  const d = new Date(toUtc(date));
  return {
    weekday: WEEKDAYS[d.getUTCDay()],
    month: MONTHS[d.getUTCMonth()],
    day: d.getUTCDate(),
  };
}

/** "Mon, Sep 21" — short enough for a day chip. */
export function formatDayDate(date: string): string {
  const { weekday, month, day } = parts(date);
  return `${weekday.slice(0, 3)}, ${month.slice(0, 3)} ${day}`;
}

/** "Monday, September 21" — for prose, where the short form reads clipped. */
export function formatDayDateLong(date: string): string {
  const { weekday, month, day } = parts(date);
  return `${weekday}, ${month} ${day}`;
}
