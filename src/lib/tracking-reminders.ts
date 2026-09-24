/**
 * Hourly tracking reminders as a calendar file — Josh, 2026-09-24, after Jen
 * reported getting no reminders:
 *
 *   "since most people will be doing this on their iphone … if a client clicks
 *    add reminders … it would auto populate recurring reminders at the top of
 *    every hour that they have to fill out the index"
 *
 * What's actually possible from a web page: a website cannot write into the
 * iOS Reminders app (or Google Tasks) — no API exists, by design. A calendar
 * file can do the job: the phone opens it in its own calendar app, the person
 * confirms once, and each entry carries an alert that fires a notification at
 * the top of the hour. That works on iPhone, Android, Outlook and Google
 * Calendar without an account, an email provider, or push permission.
 *
 * Shape of the file: one event per waking hour, repeating daily for the length
 * of the session, five minutes long, with an alarm at the start. Times are
 * floating (no timezone), so the 9 AM reminder is 9 AM wherever the client
 * wakes up — the same choice the Peak Plan export makes.
 */

import { escapeIcsText, foldIcsLine, icsFloating, icsUtcStamp } from "@/lib/peak-plan";
import { formatHour } from "@/lib/slots";

const MS_PER_HOUR = 3_600_000;

export type TrackingRemindersInput = {
  sessionId: string;
  /** The session's first day, "YYYY-MM-DD". */
  startDate: string;
  dayCount: number;
  /** Hour numbers in slot order, e.g. [7, 8, … 23, 0] — midnight last. */
  hours: number[];
  /** Reminders can't start before the client asks for them. */
  now?: Date;
};

/**
 * Returns null when there's nothing to remind about — no hours, or a session
 * that has already finished, where a calendar full of past alerts would be
 * noise rather than help.
 */
export function buildTrackingRemindersIcs({
  sessionId,
  startDate,
  dayCount,
  hours,
  now = new Date(),
}: TrackingRemindersInput): string | null {
  if (hours.length === 0 || dayCount < 1) return null;

  const [y, m, d] = startDate.split("-").map(Number);
  const day0 = Date.UTC(y, m - 1, d);

  // Start today when the session is already under way: a reminder series that
  // begins in the past still repeats correctly, but the phone shows a wall of
  // missed alerts. Never start later than the session's last day.
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const lastDay = day0 + (dayCount - 1) * 24 * MS_PER_HOUR;
  const firstDay = Math.min(Math.max(day0, today), lastDay);
  const remaining = Math.round((lastDay - firstDay) / (24 * MS_PER_HOUR)) + 1;
  if (remaining < 1) return null;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Soenen Strategies//Charge Index//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText("Charge Index — hourly check-in")}`,
  ];

  // Slots run in clock order and can cross midnight (a 1 AM bedtime gives
  // …23, 0). Once they wrap, the remaining hours belong to the next date.
  let dayOffset = 0;
  hours.forEach((hour, i) => {
    if (i > 0 && hour < hours[i - 1]) dayOffset += 1;
    const start = new Date(firstDay + dayOffset * 24 * MS_PER_HOUR + hour * MS_PER_HOUR);
    const end = new Date(start.getTime() + 5 * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:charge-index-${sessionId}-h${hour}@charge-index`,
      `DTSTAMP:${icsUtcStamp(now)}`,
      `DTSTART:${icsFloating(start)}`,
      `DTEND:${icsFloating(end)}`,
      `RRULE:FREQ=DAILY;COUNT=${remaining}`,
      `SUMMARY:${escapeIcsText(`Charge Index — how charged are you? (${formatHour(hour)})`)}`,
      `DESCRIPTION:${escapeIcsText("One tap: log the hour you've just finished in your Charge Index.")}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "TRIGGER:PT0S",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText("Log this hour in your Charge Index")}`,
      "END:VALARM",
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
