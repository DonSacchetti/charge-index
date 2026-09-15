/**
 * Phase 7 analysis for the coach view: ideal day, zone cards, consistency.
 * Everything here is taken from Jen's prototype (Design/Prototypes/Charge
 * Index App.dc.html) unless a comment says otherwise.
 */

import { formatHourLong } from "@/lib/slots";
import type { Entry, HourAverage } from "@/lib/weekly-map";

// ── Ideal day ──────────────────────────────────────────────────────────────

export type IdealZone = "peak" | "collab" | "low" | "depleted" | "unknown";

/**
 * NOTE: these thresholds (≥88 / ≥62 / ≥22) are the prototype's `zoneFromAvg`
 * and deliberately differ from the window bands in weekly-map.ts (≥90 / 62–90
 * / <38). An hour averaging 30% is inside the recovery *window* but gets
 * "Admin · light tasks" on the ideal day. Kept faithful to the prototype and
 * flagged for Jen rather than silently reconciled.
 */
export function idealZone(avgPct: number | null): IdealZone {
  if (avgPct === null) return "unknown";
  if (avgPct >= 88) return "peak";
  if (avgPct >= 62) return "collab";
  if (avgPct >= 22) return "low";
  return "depleted";
}

/** Activity defaults — generic by design for the automated tier (Build Plan Phase 7). */
export const IDEAL_ACTIVITY: Record<
  IdealZone,
  { task: string; badge: string; fg: string; bg: string; badgeBg: string }
> = {
  peak: { task: "Deep work · strategy", badge: "Full", fg: "#2f7d52", bg: "#eaf5ef", badgeBg: "#2f7d52" },
  collab: { task: "Meetings · collaboration", badge: "Dynamic", fg: "#3a6ec4", bg: "#eaf0fb", badgeBg: "#3a6ec4" },
  low: { task: "Admin · light tasks", badge: "Low", fg: "#a8722a", bg: "#fdf3e4", badgeBg: "#d4943a" },
  depleted: { task: "Rest · recharge", badge: "Recharge", fg: "#c04545", bg: "#fceaea", badgeBg: "#c04545" },
  unknown: { task: "Untracked", badge: "—", fg: "#8a8aa0", bg: "#f0efea", badgeBg: "#8a8aa0" },
};

export type IdealHour = { hour: number; zone: IdealZone };

export function idealDay(map: HourAverage[]): IdealHour[] {
  return map.map((m) => ({ hour: m.hour, zone: idealZone(m.avgPct) }));
}

// ── Zone cards ─────────────────────────────────────────────────────────────

export type ZoneCardKey = "peak" | "collab" | "low" | "depleted";

/** Raw-entry zoning, the prototype's `zoneKey`: 100 / 75 / 50–25 / 10. */
export function entryZone(pct: number): ZoneCardKey {
  if (pct === 100) return "peak";
  if (pct === 75) return "collab";
  if (pct >= 25) return "low";
  return "depleted";
}

export const ZONE_CARDS: {
  key: ZoneCardKey;
  name: string;
  desc: string;
  color: string;
  tint: string;
}[] = [
  { key: "peak", name: "Fully Charged", desc: "100% · deep work, strategy", color: "#2f7d52", tint: "#eaf5ef" },
  { key: "collab", name: "Dynamic", desc: "75% · meetings, teamwork", color: "#3a6ec4", tint: "#eaf0fb" },
  { key: "low", name: "Steady & Low", desc: "25–50% · admin, routine", color: "#d4943a", tint: "#fdf3e4" },
  { key: "depleted", name: "Recharge Needed", desc: "10% · rest, recovery", color: "#c04545", tint: "#fceaea" },
];

/**
 * For each zone, the (up to) three hours that landed in it most often across
 * all days. Ties break by position in the session's day, earliest first — the
 * prototype relied on JS object key order, which sorts 12 AM before 6 AM on a
 * past-midnight session.
 */
export function zoneTopHours(entries: Entry[], hours: number[]): Record<ZoneCardKey, number[]> {
  const position = new Map(hours.map((h, i) => [h, i]));
  const counts: Record<ZoneCardKey, Map<number, number>> = {
    peak: new Map(),
    collab: new Map(),
    low: new Map(),
    depleted: new Map(),
  };
  for (const e of entries) {
    if (!position.has(e.hour)) continue;
    const zone = counts[entryZone(e.pct)];
    zone.set(e.hour, (zone.get(e.hour) ?? 0) + 1);
  }
  const top = (m: Map<number, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1] || position.get(a[0])! - position.get(b[0])!)
      .slice(0, 3)
      .map(([hour]) => hour);
  return { peak: top(counts.peak), collab: top(counts.collab), low: top(counts.low), depleted: top(counts.depleted) };
}

export function formatTopHours(hours: number[]): string {
  return hours.length ? hours.map(formatHourLong).join(" · ") : "No data";
}

// ── Consistency ────────────────────────────────────────────────────────────

export type DayCoverage = { dayNumber: number; logged: number; complete: boolean };

export type Consistency = {
  days: DayCoverage[];
  completeDays: number;
  /** Longest run of back-to-back complete days. */
  longestStreak: number;
  /** Share of all possible hour-slots that were logged, 0–100, whole number. */
  coveragePct: number;
};

/**
 * Not in the prototype's coach view — the prototype only shows streaks on the
 * client side. Built to Build Plan Phase 7's "completion streaks (consecutive
 * days/slots logged)", using the same definition of a complete day as the
 * client's streak dots: every waking hour logged.
 */
export function consistency(entries: Entry[], hours: number[], dayCount: number): Consistency {
  const valid = new Set(hours);
  const perDay = new Map<number, Set<number>>();
  for (const e of entries) {
    if (!valid.has(e.hour) || e.dayNumber < 1 || e.dayNumber > dayCount) continue;
    if (!perDay.has(e.dayNumber)) perDay.set(e.dayNumber, new Set());
    perDay.get(e.dayNumber)!.add(e.hour);
  }

  const days: DayCoverage[] = Array.from({ length: dayCount }, (_, i) => {
    const logged = perDay.get(i + 1)?.size ?? 0;
    return { dayNumber: i + 1, logged, complete: hours.length > 0 && logged === hours.length };
  });

  let longestStreak = 0;
  let run = 0;
  for (const d of days) {
    run = d.complete ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }

  const possible = hours.length * dayCount;
  const logged = days.reduce((sum, d) => sum + d.logged, 0);

  return {
    days,
    completeDays: days.filter((d) => d.complete).length,
    longestStreak,
    coveragePct: possible ? Math.round((logged / possible) * 100) : 0,
  };
}
