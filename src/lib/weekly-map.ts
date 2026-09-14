/**
 * The weekly map engine — Planning/Build Plan.md Section 3, Phase 5.
 *
 * Two computations everything downstream hangs off:
 *
 *   computeWeeklyMap()  one average per waking hour, across every day logged
 *   findWindows()       the longest unbroken run of hours in each band
 *
 * Skipped ≠ 0%: a skipped hour has no entry at all, so it never enters an
 * average. An hour nobody answered on any day averages to `null`, not 0.
 */

import { formatHour } from "@/lib/slots";

export type Entry = { dayNumber: number; hour: number; pct: number };

export type HourAverage = {
  hour: number;
  /** Mean of the answered days, to 2dp — matches the SQL's round(avg, 2). */
  avgPct: number | null;
  daysAnswered: number;
};

/**
 * @param hours the session's slots in display order, e.g. [7, 8, … 23, 0].
 *              Entries for hours outside this list are ignored.
 */
export function computeWeeklyMap(entries: Entry[], hours: number[]): HourAverage[] {
  const byHour = new Map<number, number[]>(hours.map((h) => [h, []]));
  for (const e of entries) byHour.get(e.hour)?.push(e.pct);

  return hours.map((hour) => {
    const values = byHour.get(hour)!;
    const avgPct = values.length
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
      : null;
    return { hour, avgPct, daysAnswered: values.length };
  });
}

/**
 * Bands are judged on the averaged value, not snapped to the nearest tier —
 * an average like 43.75% gets its own classification (Build Plan Section 3).
 * Thresholds are the prototype's: ≥90 peak, 62–90 collaboration, <38 recovery.
 */
export const BANDS = {
  peak: (v: number) => v >= 90,
  collaboration: (v: number) => v >= 62 && v < 90,
  recovery: (v: number) => v < 38,
} as const;

export type Band = keyof typeof BANDS;
export type Windows = Record<Band, number[]>;

/**
 * Longest run of consecutive slots whose average passes `test`. An hour with
 * no data breaks a run. On a tie the earliest run wins, as in the prototype.
 *
 * Runs are consecutive by position in the slot list, not by hour number. The
 * prototype sorted hour numbers, which splits a run across midnight — with a
 * 1 AM bedtime, 11 PM and 12 AM would never join. Slots already wrap past
 * midnight (lib/slots.ts), so position is the correct measure.
 */
export function longestRun(map: HourAverage[], test: (v: number) => boolean): number[] {
  let best: number[] = [];
  let current: number[] = [];
  for (const { hour, avgPct } of map) {
    if (avgPct !== null && test(avgPct)) {
      current.push(hour);
    } else {
      if (current.length > best.length) best = current;
      current = [];
    }
  }
  return current.length > best.length ? current : best;
}

export function findWindows(map: HourAverage[]): Windows {
  return {
    peak: longestRun(map, BANDS.peak),
    collaboration: longestRun(map, BANDS.collaboration),
    recovery: longestRun(map, BANDS.recovery),
  };
}

/**
 * "10 AM – 12 PM" for a run of [10, 11] — the end is when the last hour
 * finishes. "—" when there's no run, matching the prototype's sparse state.
 */
export function formatWindow(run: number[]): string {
  if (run.length === 0) return "—";
  return `${formatHour(run[0])} – ${formatHour((run[run.length - 1] + 1) % 24)}`;
}
