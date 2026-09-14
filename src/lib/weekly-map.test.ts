import { describe, expect, it } from "vitest";

import { buildSessionSlots, hourOf } from "@/lib/slots";
import {
  type Entry,
  type HourAverage,
  computeWeeklyMap,
  findWindows,
  formatWindow,
  longestRun,
  BANDS,
} from "@/lib/weekly-map";

const e = (dayNumber: number, hour: number, pct: number): Entry => ({ dayNumber, hour, pct });

/** A map straight from averages, for window tests. `null` = unanswered. */
const mapOf = (pairs: [number, number | null][]): HourAverage[] =>
  pairs.map(([hour, avgPct]) => ({ hour, avgPct, daysAnswered: avgPct === null ? 0 : 1 }));

describe("computeWeeklyMap", () => {
  it("averages each hour over the days that answered it", () => {
    const map = computeWeeklyMap([e(1, 9, 100), e(2, 9, 50), e(3, 9, 75)], [9]);
    expect(map).toEqual([{ hour: 9, avgPct: 75, daysAnswered: 3 }]);
  });

  it("treats a skipped hour as missing, never as 0%", () => {
    // Day 2 skipped 9 AM. If a skip counted as 0 this would be 50, not 100.
    const map = computeWeeklyMap([e(1, 9, 100), e(3, 9, 100)], [9]);
    expect(map[0]).toEqual({ hour: 9, avgPct: 100, daysAnswered: 2 });
  });

  it("returns null for an hour nobody answered on any day", () => {
    const map = computeWeeklyMap([e(1, 9, 100)], [9, 10]);
    expect(map[1]).toEqual({ hour: 10, avgPct: null, daysAnswered: 0 });
  });

  it("rounds to 2dp, like the SQL's round(avg, 2)", () => {
    const map = computeWeeklyMap([e(1, 9, 100), e(2, 9, 100), e(3, 9, 75)], [9]);
    expect(map[0].avgPct).toBe(91.67);
  });

  it("keeps slot order, including past midnight, and ignores stray hours", () => {
    const hours = buildSessionSlots(22, 1).map(hourOf); // [22, 23, 0]
    const map = computeWeeklyMap([e(1, 0, 25), e(1, 15, 100)], hours);
    expect(map.map((m) => m.hour)).toEqual([22, 23, 0]);
    expect(map[2].avgPct).toBe(25);
  });
});

describe("band thresholds", () => {
  it("puts boundary values in the right band", () => {
    expect(BANDS.peak(90)).toBe(true);
    expect(BANDS.peak(89.99)).toBe(false);
    expect(BANDS.collaboration(89.99)).toBe(true);
    expect(BANDS.collaboration(62)).toBe(true);
    expect(BANDS.collaboration(61.99)).toBe(false);
    expect(BANDS.recovery(38)).toBe(false);
    expect(BANDS.recovery(37.99)).toBe(true);
  });

  it("classifies averages as-is rather than snapping to a tier", () => {
    // 43.75 would snap to the 50% tier; it's between bands, so it's in none.
    expect(BANDS.recovery(43.75)).toBe(false);
    expect(BANDS.collaboration(43.75)).toBe(false);
  });
});

describe("longestRun", () => {
  it("returns the longest consecutive run", () => {
    const map = mapOf([[6, 100], [7, 25], [8, 100], [9, 95], [10, 90], [11, 50]]);
    expect(longestRun(map, BANDS.peak)).toEqual([8, 9, 10]);
  });

  it("breaks a run at an unanswered hour", () => {
    const map = mapOf([[8, 100], [9, null], [10, 100]]);
    expect(longestRun(map, BANDS.peak)).toEqual([8]);
  });

  it("keeps the earliest run on a tie", () => {
    const map = mapOf([[8, 100], [9, 100], [10, 10], [11, 100], [12, 100]]);
    expect(longestRun(map, BANDS.peak)).toEqual([8, 9]);
  });

  it("joins a run across midnight", () => {
    const hours = buildSessionSlots(20, 1).map(hourOf); // [20, 21, 22, 23, 0]
    const map = mapOf(hours.map((h) => [h, h === 20 ? 50 : 10]));
    expect(longestRun(map, BANDS.recovery)).toEqual([21, 22, 23, 0]);
  });

  it("returns an empty run when nothing qualifies", () => {
    expect(longestRun(mapOf([[9, 50], [10, null]]), BANDS.peak)).toEqual([]);
  });
});

describe("findWindows", () => {
  it("finds all three windows from a realistic day", () => {
    const map = mapOf([
      [6, 25], [7, 50], [8, 75], [9, 100], [10, 100], [11, 91.67],
      [12, 75], [13, 62.5], [14, 50], [15, 25], [16, 10], [17, 25],
    ]);
    expect(findWindows(map)).toEqual({
      peak: [9, 10, 11],
      collaboration: [12, 13],
      recovery: [15, 16, 17],
    });
  });
});

describe("formatWindow", () => {
  it("formats a run as start – end of the last hour", () => {
    expect(formatWindow([10, 11])).toBe("10 AM – 12 PM");
    expect(formatWindow([14])).toBe("2 PM – 3 PM");
  });

  it("wraps the end past midnight", () => {
    expect(formatWindow([23, 0])).toBe("11 PM – 1 AM");
  });

  it("shows an em dash when there is no window", () => {
    expect(formatWindow([])).toBe("—");
  });
});
