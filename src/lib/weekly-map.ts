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

/** Collaboration is a working cap, not a measurement (Jen, 2026-09-29). */
export const MAX_COLLABORATION_HOURS = 4;

/** Every hour whose average passes `test`, in slot order. */
export function qualifyingHours(map: HourAverage[], test: (v: number) => boolean): number[] {
  return map.filter((m) => m.avgPct !== null && test(m.avgPct)).map((m) => m.hour);
}

/**
 * The bands as Jen described them on 2026-09-29, replacing "longest unbroken
 * run": a person's peak hours are simply the hours that qualify, wherever
 * they fall. Someone sharp at 9 AM and again at 3 PM has two peak stretches,
 * and calling only the longer one their peak threw the other away.
 *
 * Collaboration keeps at most four hours — her cap on how long a
 * collaboration block should run. When more hours qualify, the strongest four
 * are kept, which can leave two shorter stretches rather than one block.
 */
export function findWindows(map: HourAverage[]): Windows {
  const collaboration = qualifyingHours(map, BANDS.collaboration);
  return {
    peak: qualifyingHours(map, BANDS.peak),
    collaboration: capHours(map, collaboration, MAX_COLLABORATION_HOURS),
    recovery: qualifyingHours(map, BANDS.recovery),
  };
}

/** Keeps the `limit` strongest of `hours`, back in slot order. */
export function capHours(map: HourAverage[], hours: number[], limit: number): number[] {
  if (hours.length <= limit) return hours;
  const order = new Map(map.map((m, i) => [m.hour, i]));
  const avg = new Map(map.map((m) => [m.hour, m.avgPct ?? 0]));
  return [...hours]
    .sort((a, b) => avg.get(b)! - avg.get(a)! || order.get(a)! - order.get(b)!)
    .slice(0, limit)
    .sort((a, b) => order.get(a)! - order.get(b)!);
}

/**
 * "10 AM – 12 PM" for a run of [10, 11] — the end is when the last hour
 * finishes. "—" when there's no run, matching the prototype's sparse state.
 *
 * Takes the whole set as ONE span, so it's only right for consecutive hours.
 * Since bands can now be scattered across the day, most callers want
 * formatRanges().
 */
export function formatWindow(run: number[]): string {
  if (run.length === 0) return "—";
  return `${formatHour(run[0])} – ${formatHour((run[run.length - 1] + 1) % 24)}`;
}

/** Consecutive hours grouped into runs: [9,10,15] → [[9,10],[15]]. */
export function hourRuns(hours: number[]): number[][] {
  const runs: number[][] = [];
  for (const hour of hours) {
    const last = runs[runs.length - 1];
    if (last && hour === (last[last.length - 1] + 1) % 24) last.push(hour);
    else runs.push([hour]);
  }
  return runs;
}

/**
 * "9 AM – 11 AM and 3 PM – 4 PM" — a band that isn't one block. Bands stopped
 * being single runs on 2026-09-29, and a plain start-to-end range would claim
 * the weak hours in between.
 */
export function formatRanges(hours: number[]): string {
  if (hours.length === 0) return "—";
  const runs = hourRuns(hours).map(formatWindow);
  if (runs.length === 1) return runs[0];
  return `${runs.slice(0, -1).join(", ")} and ${runs[runs.length - 1]}`;
}

/**
 * Hours that needn't be consecutive: "9 AM – 11 AM" when they are, "9 AM and
 * 2 PM" when they aren't. The free tier's top two hours are often adjacent,
 * but nothing guarantees it, so a plain range would lie about the hours
 * between them.
 */
export function formatHours(run: number[]): string {
  if (run.length === 0) return "—";
  const consecutive = run.every((h, i) => i === 0 || h === (run[i - 1] + 1) % 24);
  if (consecutive) return formatWindow(run);
  return run.map(formatHour).join(" and ");
}

/**
 * Jen's minimum before the app will call a peak window (her feedback,
 * 2026-09-24): under 35 logged hours there isn't enough evidence, so the
 * results screen says so instead of naming hours.
 */
export const MIN_HOURS_FOR_RESULT = 35;

/**
 * The free tier's answer: the `count` hours with the highest averages, in
 * clock order (Jen, 2026-09-24 — her own session returned a four-hour window,
 * and she wants the free version to name the best two hours only).
 *
 * Ties break towards the hour answered on more days, then the earlier slot, so
 * the result is stable rather than dependent on input order. Hours with no
 * data can never be chosen. Fewer than `count` answered hours returns what
 * there is.
 */
export function topHours(map: HourAverage[], count = 2): number[] {
  const order = new Map(map.map((m, i) => [m.hour, i]));
  return map
    .filter((m) => m.avgPct !== null)
    .sort(
      (a, b) =>
        b.avgPct! - a.avgPct! ||
        b.daysAnswered - a.daysAnswered ||
        order.get(a.hour)! - order.get(b.hour)!,
    )
    .slice(0, count)
    .map((m) => m.hour)
    .sort((a, b) => order.get(a)! - order.get(b)!);
}


/**
 * "Five hours in a row on the same level, two days running" — Jen's flag,
 * 2026-09-29. It catches someone tapping down the column rather than reading
 * their day, which is a coaching conversation, not a scheduling one. The
 * level has to match on both days (Josh, same date): the same button pressed
 * twice is the tell.
 */
export const FLAT_RUN_HOURS = 5;

/**
 * @param hours the session's slots in display order — runs are consecutive by
 * slot position, so a day that wraps past midnight still counts.
 */
export function flatDayLevels(entries: Entry[], hours: number[]): Map<number, Set<number>> {
  const byDay = new Map<number, Map<number, number>>();
  for (const e of entries) {
    if (!byDay.has(e.dayNumber)) byDay.set(e.dayNumber, new Map());
    byDay.get(e.dayNumber)!.set(e.hour, e.pct);
  }

  const levels = new Map<number, Set<number>>();
  for (const [day, slots] of byDay) {
    let runLevel: number | null = null;
    let runLength = 0;
    const found = new Set<number>();
    for (const hour of hours) {
      const pct = slots.get(hour);
      if (pct !== undefined && pct === runLevel) {
        runLength += 1;
      } else {
        runLevel = pct ?? null;
        runLength = pct === undefined ? 0 : 1;
      }
      if (runLength >= FLAT_RUN_HOURS && runLevel !== null) found.add(runLevel);
    }
    if (found.size) levels.set(day, found);
  }
  return levels;
}

/** True when two consecutive days share a flat run at the same level. */
export function hasRepeatedFlatRun(entries: Entry[], hours: number[]): boolean {
  const levels = flatDayLevels(entries, hours);
  for (const [day, dayLevels] of levels) {
    const next = levels.get(day + 1);
    if (next && [...dayLevels].some((level) => next.has(level))) return true;
  }
  return false;
}
