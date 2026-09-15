/**
 * Reminder scheduling — Build Plan Phase 11. Pure, so it's testable without a
 * clock, a database or an email provider.
 *
 * Jen's copy defines the options ("Every 60 minutes while awake", "Morning,
 * midday, evening", "One catch-up nudge") but not exact times; these are
 * defaults for her to review, all relative to the client's own wake and
 * bedtime, in the timezone captured at setup:
 *
 *   hourly             at the top of each waking hour, for the hour just ended
 *   three_times_daily  2 hours after waking, the middle of the waking day,
 *                      and 1 hour before bed
 *   once_daily         1 hour before bed
 *
 * A reminder is skipped when every hour it covers is already logged — a client
 * who keeps up is never nagged.
 */

import type { ReminderPref } from "@/lib/charge";
import { buildSessionSlots, hourOf } from "@/lib/slots";

export type ReminderSession = {
  id: string;
  wake_time: string;
  sleep_time: string;
  day_count: number;
  start_date: string; // YYYY-MM-DD, the client's local date
  status: string;
  reminder_pref: ReminderPref;
  timezone: string | null;
};

export type DueReminder = {
  sessionId: string;
  dayNumber: number;
  /** Stable per session/day — the dedupe key in reminder_log. */
  key: string;
  kind: Exclude<ReminderPref, "none">;
  /** Waking hours (0–23) this reminder asks about that aren't logged yet. */
  unloggedHours: number[];
};

/** A scheduled reminder, in minutes on the tracking day's own timeline. */
type Slot = { key: string; minute: number; covers: number[] };

const MINUTES_PER_DAY = 24 * 60;

/** Local calendar date and minute-of-day of an instant in a timezone. */
export function localClock(instant: Date, timeZone: string): { date: string; minute: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * The day's reminder times for a preference. Hours after midnight (a 1 AM
 * bedtime) sit past 24:00 on the same tracking day's timeline.
 */
export function reminderSchedule(pref: ReminderPref, wake: number, sleep: number): Slot[] {
  const hours = buildSessionSlots(wake, sleep).map(hourOf);
  if (pref === "none" || hours.length === 0) return [];
  // Position on the tracking day's timeline, in hours: wrapped hours add 24.
  const timeline = hours.map((_, i) => wake + i);
  const end = wake + hours.length; // bedtime on the timeline
  const hourAt = (t: number) => ((t % 24) + 24) % 24;
  const coveredUpTo = (t: number) => timeline.filter((h) => h + 1 <= t).map(hourAt);

  if (pref === "hourly") {
    return timeline.map((h) => ({ key: `hourly:${String(hourAt(h)).padStart(2, "0")}`, minute: (h + 1) * 60, covers: [hourAt(h)] }));
  }
  if (pref === "once_daily") {
    const t = Math.max(wake + 1, end - 1);
    return [{ key: "daily", minute: t * 60, covers: coveredUpTo(t) }];
  }
  // three_times_daily — collapse any that land on the same hour on a short day.
  const times = [wake + 2, wake + Math.round(hours.length / 2), end - 1]
    .map((t) => Math.min(Math.max(t, wake + 1), end))
    .filter((t, i, all) => all.indexOf(t) === i);
  const names = ["morning", "midday", "evening"];
  return times.map((t, i) => ({ key: `thrice:${names[i]}`, minute: t * 60, covers: coveredUpTo(t) }));
}

/**
 * Reminders due for one session at `now`: scheduled within the last
 * `windowMinutes`, on one of the session's tracking days, with something left
 * to log. Sessions with no timezone, finished, or set to "none" get nothing.
 *
 * The window matches the hourly scheduled run: 60 minutes catches a reminder
 * even when a run starts late in its hour, without reaching back to the
 * previous hour's reminder — so a skipped run never makes the next one send
 * two nudges at once. reminder_log stops a reminder being sent twice when two
 * runs land in the same hour.
 */
export function dueReminders(
  session: ReminderSession,
  logged: Set<string>, // `${dayNumber}:${hour}`
  now: Date,
  windowMinutes = 60,
): DueReminder[] {
  if (session.reminder_pref === "none" || session.status !== "in_progress" || !session.timezone) return [];

  let clock: { date: string; minute: number };
  try {
    clock = localClock(now, session.timezone);
  } catch {
    return [];
  }

  const wake = hourOf(session.wake_time);
  const sleep = hourOf(session.sleep_time);
  const schedule = reminderSchedule(session.reminder_pref, wake, sleep);
  const due: DueReminder[] = [];

  // Now can belong to today's tracking day or, after midnight, yesterday's.
  for (const offset of [0, -1]) {
    const trackingDate = addDays(clock.date, offset);
    const dayNumber = daysBetween(session.start_date, trackingDate) + 1;
    if (dayNumber < 1 || dayNumber > session.day_count) continue;

    const nowMinute = clock.minute + (offset === -1 ? MINUTES_PER_DAY : 0);
    for (const slot of schedule) {
      if (slot.minute > nowMinute || slot.minute <= nowMinute - windowMinutes) continue;
      const unloggedHours = slot.covers.filter((h) => !logged.has(`${dayNumber}:${h}`));
      if (unloggedHours.length === 0) continue;
      due.push({ sessionId: session.id, dayNumber, key: slot.key, kind: session.reminder_pref, unloggedHours });
    }
  }
  return due;
}
