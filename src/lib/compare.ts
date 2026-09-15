/**
 * Pattern comparison across a client's sessions — Build Plan Phase 7.
 *
 * Sessions can cover different waking hours (6 AM–10 PM one season, 7 AM–1 AM
 * the next), so they're lined up on a shared axis: every hour any session
 * covers, in day order. Each session is null where it has no average — either
 * outside its waking hours or never answered.
 */

import type { HourAverage } from "@/lib/weekly-map";

/**
 * Union of hours in day order. Wake times are always morning (4 AM–12 PM) and
 * only bedtimes cross midnight, so ordering from the earliest first slot puts
 * 12 AM and 1 AM at the end of the day rather than the start.
 */
export function compareAxis(maps: HourAverage[][]): number[] {
  const firstSlots = maps.filter((m) => m.length).map((m) => m[0].hour);
  if (!firstSlots.length) return [];
  const anchor = Math.min(...firstSlots);
  const all = new Set(maps.flatMap((m) => m.map((h) => h.hour)));
  return [...all].sort((a, b) => ((a - anchor + 24) % 24) - ((b - anchor + 24) % 24));
}

/** One session's averages on the shared axis. */
export function alignToAxis(map: HourAverage[], axis: number[]): (number | null)[] {
  const byHour = new Map(map.map((m) => [m.hour, m.avgPct]));
  return axis.map((h) => byHour.get(h) ?? null);
}
