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

/**
 * How many of the session's days are open for logging. Past days stay open —
 * catching up on yesterday evening is normal, and what Jen wants to stop is
 * racing ahead through the whole week in one sitting.
 *
 * Mirrored in the database by session_day_unlocked()
 * (20260924143000_pacing_and_session_limit.sql), which is the real boundary.
 */
export function unlockedDayCount(
  startDate: string,
  dayCount: number,
  timezone: string | null | undefined,
  now = new Date(),
): number {
  const elapsed = daysBetween(startDate, todayInZone(timezone, now)) + 1;
  return Math.max(1, Math.min(dayCount, elapsed));
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
