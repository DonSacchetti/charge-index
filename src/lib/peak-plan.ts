/**
 * The Peak Plan™ deliverable — Build Plan Phase 8.
 *
 * Copy is Jen's, verbatim from Design/Prototypes/Charge Index App.dc.html.
 * The calendar and CSV builders fix real problems in the prototype's exports;
 * each is called out where it happens.
 */

import { nearestTier, scaleOf } from "@/lib/charge";
import { type IdealZone, idealZone } from "@/lib/coach-analysis";
import { formatHourLong } from "@/lib/slots";
import { type HourAverage, type Windows, formatWindow } from "@/lib/weekly-map";

// ── Plan content ───────────────────────────────────────────────────────────

export const PLAN_WINDOWS = [
  {
    band: "peak",
    label: "Fully Charged",
    color: "#2f7d52",
    tint: "#eaf5ef",
    desc: "Guard it like Fort Knox. One hour here is worth two or three anywhere else.",
  },
  {
    band: "collaboration",
    label: "Dynamic",
    color: "#3a6ec4",
    tint: "#eaf0fb",
    desc: "Meetings, stakeholder work, anything that needs you communicating well.",
  },
  {
    band: "recovery",
    label: "Recovery",
    color: "#c04545",
    tint: "#fceaea",
    desc: "Stop fighting this dip. Schedule the recharge instead of pushing through it.",
  },
] as const;

/** The plan's schedule wording differs from the coach's ideal day, as in the prototype. */
export const PLAN_SCHEDULE: Record<IdealZone, { task: string; zone: string; color: string; tint: string }> = {
  peak: { task: "Strategic thinking · deep work", zone: "Fully Charged", color: "#2f7d52", tint: "#f4faf7" },
  collab: { task: "Meetings · stakeholder engagement", zone: "Dynamic", color: "#3a6ec4", tint: "#f5f8fd" },
  low: { task: "Email · files · look ahead at schedule", zone: "Steady / Low", color: "#d4943a", tint: "#fdfaf4" },
  depleted: { task: "Rest · relax · protect sleep", zone: "Recharge Needed", color: "#c04545", tint: "#fdf6f6" },
  unknown: { task: "Untracked hour", zone: "—", color: "#8a8aa0", tint: "#f7f6f3" },
};

export function planSchedule(map: HourAverage[]) {
  return map.map((m) => ({ hour: m.hour, ...PLAN_SCHEDULE[idealZone(m.avgPct)] }));
}

/**
 * "Guard these three things". The prototype always shows all three, which
 * prints "Nothing books over —." when a window wasn't found; a guard is only
 * shown when its window exists, numbered in order.
 */
export function planGuards(windows: Windows): { n: string; text: string }[] {
  const lines = [
    windows.peak.length &&
      `Nothing books over ${formatWindow(windows.peak)}. That block belongs to the work only you can do.`,
    windows.collaboration.length &&
      `Move collaboration into ${formatWindow(windows.collaboration)}, where your communication is strongest.`,
    windows.recovery.length &&
      `Plan the dip at ${formatWindow(windows.recovery)} instead of pushing through it. Recovery is scheduled work.`,
  ].filter((l): l is string => Boolean(l));
  return lines.map((text, i) => ({ n: String(i + 1).padStart(2, "0"), text }));
}

// ── Calendar file (.ics) ───────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");
export const icsFloating = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
export const icsUtcStamp = (d: Date) => `${icsFloating(d)}Z`;

/** RFC 5545 §3.3.11 text escaping. */
export const escapeIcsText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545 §3.1: fold content lines longer than 75 octets, never mid-character. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let limit = 75;
  for (const ch of line) {
    if (encoder.encode(current + ch).length > limit) {
      out.push(current);
      current = ch;
      limit = 74; // continuation lines start with a space
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.join("\r\n ");
}

/**
 * One recurring weekday event over the client's peak window, 20 occurrences
 * (Build Plan Section 2). Returns null when there is no peak window — the
 * prototype defaulted to a 9 AM block, which would protect time the client's
 * own data never pointed to.
 *
 * Fixes against the prototype's export:
 * - Spans the actual peak window; the prototype always booked 2 hours from
 *   the first ≥90% hour.
 * - Floating local time (no TZID): the block sits at 10 AM wherever the client
 *   lives. The prototype hardcoded America/Toronto without a VTIMEZONE.
 * - First occurrence is the next weekday. The recurrence is Mon–Fri, but
 *   DTSTART always counts as an occurrence, so starting on a Saturday put a
 *   block on a Saturday.
 * - Adds the UID and DTSTAMP every VEVENT requires, CRLF line endings, text
 *   escaping and line folding — without them some calendar apps reject it.
 */
export function buildPeakPlanIcs({
  peak,
  sessionId,
  now = new Date(),
}: {
  peak: number[];
  sessionId: string;
  now?: Date;
}): string | null {
  if (peak.length === 0) return null;

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), peak[0]));
  while (start.getUTCDay() === 0 || start.getUTCDay() === 6) start.setUTCDate(start.getUTCDate() + 1);
  const end = new Date(start.getTime() + peak.length * 3_600_000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Soenen Strategies//Peak Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:peak-plan-${sessionId}@charge-index`,
    `DTSTAMP:${icsUtcStamp(now)}`,
    `DTSTART:${icsFloating(start)}`,
    `DTEND:${icsFloating(end)}`,
    "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=20",
    `SUMMARY:${escapeIcsText("Peak Plan Block — protected")}`,
    `DESCRIPTION:${escapeIcsText(`Your fully-charged window (${formatWindow(peak)}). Deep work only. Source: your Charge Index.`)}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

// ── CSV export ─────────────────────────────────────────────────────────────

/**
 * Quote every cell, and neutralise anything a spreadsheet would run as a
 * formula. Reflections are free text typed by clients; a note beginning "="
 * would otherwise execute when Jen opens the file in Excel (CSV injection).
 */
export function csvCell(value: string | number | null | undefined): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export type CsvInput = {
  clientName: string | null;
  clientEmail: string | null;
  label: string | null;
  dayCount: number;
  hours: number[];
  entries: { dayNumber: number; hour: number; pct: number }[];
  map: HourAverage[];
  reflections: { dayNumber: number; feel: string | null; unexpected: string | null; forJen: string | null }[];
};

/**
 * Format per Build Plan Section 2 and the prototype: a header block, one row
 * per hour with each day's value, the average and its zone, then each day's
 * reflections. The average is the engine's 2dp value, matching the coach view
 * (the prototype rounded to whole numbers). CRLF and a UTF-8 BOM so Excel reads
 * "—" and "·" correctly.
 */
export function buildSessionCsv(input: CsvInput): string {
  const days = Array.from({ length: input.dayCount }, (_, i) => i + 1);
  const value = new Map(input.entries.map((e) => [`${e.dayNumber}:${e.hour}`, e.pct]));
  const avg = new Map(input.map.map((m) => [m.hour, m.avgPct]));
  const notes = new Map(input.reflections.map((r) => [r.dayNumber, r]));

  const rows: (string | number | null)[][] = [
    ["Soenen Strategies — Charge Index"],
    ["Client", input.clientName, "Email", input.clientEmail, "Session", input.label],
    [],
    ["Time", ...days.map((d) => `Day ${d}`), "Average", "Zone"],
    ...input.hours.map((hour) => {
      const a = avg.get(hour) ?? null;
      return [
        formatHourLong(hour),
        ...days.map((d) => {
          const v = value.get(`${d}:${hour}`);
          return v === undefined ? "" : `${v}%`;
        }),
        a === null ? "" : `${a}%`,
        a === null ? "" : scaleOf(nearestTier(a)).short,
      ];
    }),
    [],
    ["Day", "How I felt", "Unexpected", "For Jen"],
    ...days.map((d) => {
      const n = notes.get(d);
      return [`Day ${d}`, n?.feel ?? "", n?.unexpected ?? "", n?.forJen ?? ""];
    }),
  ];

  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function exportFilename(clientName: string | null, suffix: string): string {
  const safe = (clientName || "client").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "client";
  return `${safe}_${suffix}`;
}
