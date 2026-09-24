/**
 * The Peak Plan schedule as a calendar file — Josh, 2026-09-24.
 *
 * The plan already says what each hour is *for* ("Strategic thinking · deep
 * work"). A client can now write what they actually intend to do in that hour,
 * and take the whole week into their calendar, the same way the hourly
 * tracking reminders work.
 *
 * Consecutive hours of the same kind become one block, so a four-hour stretch
 * of admin is one event rather than four. A block splits when the client's own
 * note changes, because two different intentions shouldn't share an entry.
 *
 * Alerts fire only for blocks the client wrote a note on, and for their peak
 * block. A notification every hour of the working day is noise; a nudge for
 * "the thing I said I'd do" is the point.
 */

import { escapeIcsText, foldIcsLine, icsFloating, icsUtcStamp } from "@/lib/peak-plan";
import { formatHour } from "@/lib/slots";

export type ScheduleRow = {
  hour: number;
  /** The plan's own wording for the hour, e.g. "Email · files". */
  task: string;
  zone: string;
  /** What the client wrote for this hour, if anything. */
  note?: string | null;
};

export type ScheduleBlock = {
  hours: number[];
  task: string;
  zone: string;
  note: string | null;
};

/** Weekday occurrences per event — four working weeks, as the Peak Plan's own export uses. */
const OCCURRENCES = 20;

export function scheduleBlocks(rows: ScheduleRow[]): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  for (const row of rows) {
    const note = row.note?.trim() || null;
    const last = blocks[blocks.length - 1];
    const follows = last && last.hours[last.hours.length - 1] === (row.hour + 23) % 24;
    if (last && follows && last.task === row.task && last.note === note) {
      last.hours.push(row.hour);
    } else {
      blocks.push({ hours: [row.hour], task: row.task, zone: row.zone, note });
    }
  }
  return blocks;
}

/**
 * @param peak the client's peak hours, which get an alert even without a note.
 * Returns null when there's nothing worth putting in a calendar.
 */
export function buildScheduleIcs({
  sessionId,
  rows,
  peak = [],
  now = new Date(),
}: {
  sessionId: string;
  rows: ScheduleRow[];
  peak?: number[];
  now?: Date;
}): string | null {
  const blocks = scheduleBlocks(rows).filter((b) => b.zone !== "—");
  if (blocks.length === 0) return null;

  // First occurrence is the next weekday: DTSTART always counts as one, so
  // starting on a Saturday would put a working block on a Saturday.
  const day0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  while (day0.getUTCDay() === 0 || day0.getUTCDay() === 6) day0.setUTCDate(day0.getUTCDate() + 1);

  const peakSet = new Set(peak);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Soenen Strategies//Peak Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText("My Peak Plan")}`,
  ];

  blocks.forEach((block, i) => {
    // Hours are in slot order and can cross midnight, so count positions from
    // the first hour rather than trusting the numbers to increase.
    const startHour = block.hours[0];
    const start = new Date(day0.getTime() + startHour * 3_600_000);
    const end = new Date(start.getTime() + block.hours.length * 3_600_000);
    const alarm = Boolean(block.note) || block.hours.some((h) => peakSet.has(h));
    const span = `${formatHour(block.hours[0])} – ${formatHour((block.hours[block.hours.length - 1] + 1) % 24)}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:peak-plan-${sessionId}-b${i}-h${startHour}@charge-index`,
      `DTSTAMP:${icsUtcStamp(now)}`,
      `DTSTART:${icsFloating(start)}`,
      `DTEND:${icsFloating(end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=${OCCURRENCES}`,
      // Charge level first, then their own words if they wrote any (Josh,
      // 2026-09-24): in a phone's calendar list the title is all you see, and
      // "Coding" alone doesn't say those are the client's best hours.
      `SUMMARY:${escapeIcsText(`${block.zone} · ${block.note || block.task}`)}`,
      // The client's own words first: some calendars show only the body in a
      // notification, and that's the part they wrote for themselves.
      `DESCRIPTION:${escapeIcsText(
        [block.note, `${block.zone} · ${block.task} (${span}). From your Peak Plan.`].filter(Boolean).join("\n\n"),
      )}`,
      "TRANSP:OPAQUE",
    );
    if (alarm) {
      lines.push(
        "BEGIN:VALARM",
        "TRIGGER:PT0S",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcsText(`${block.zone} · ${block.note || block.task}`)}`,
        "END:VALARM",
      );
    }
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
