import { describe, expect, it } from "vitest";

import { buildSessionSlots, hourOf } from "@/lib/slots";
import {
  type Entry,
  type HourAverage,
  computeWeeklyMap,
  findWindows,
  formatWindow,
  flatDayLevels,
  hasRepeatedFlatRun,
  longestRun,
  formatHours,
  topHours,
  formatRanges,
  qualifyingHours,
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
      // 8 AM at 75% qualifies too, and is no longer dropped for sitting
      // outside the longest run (Jen, 2026-09-29).
      collaboration: [8, 12, 13],
      // 6 AM at 25% is a recovery hour as much as the evening dip is.
      recovery: [6, 15, 16, 17],
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

describe("topHours", () => {
  const map = (pairs: [number, number | null, number?][]) =>
    pairs.map(([hour, avgPct, daysAnswered = 5]) => ({ hour, avgPct, daysAnswered }));

  it("picks the two highest averages, in clock order", () => {
    expect(topHours(map([[9, 60], [10, 95], [11, 40], [12, 88]]))).toEqual([10, 12]);
  });

  it("ignores hours with no data", () => {
    expect(topHours(map([[9, null], [10, 50], [11, null], [12, 30]]))).toEqual([10, 12]);
  });

  it("returns what there is when fewer hours are answered", () => {
    expect(topHours(map([[9, null], [10, 75]]))).toEqual([10]);
    expect(topHours([])).toEqual([]);
  });

  it("breaks ties towards more days answered, then the earlier slot", () => {
    expect(topHours(map([[9, 90, 2], [10, 90, 5], [11, 90, 5]]))).toEqual([10, 11]);
  });

  it("keeps clock order across midnight, following slot position", () => {
    // Slots for a 1 AM bedtime: 22, 23, 0 — midnight is last, not first.
    expect(topHours(map([[22, 70], [23, 95], [0, 99]]))).toEqual([23, 0]);
  });

  it("can return more than two when asked", () => {
    expect(topHours(map([[9, 60], [10, 95], [11, 40], [12, 88]]), 3)).toEqual([9, 10, 12]);
  });
});

describe("formatHours", () => {
  it("reads as a range when the hours are consecutive", () => {
    expect(formatHours([9, 10])).toBe("9 AM – 11 AM");
  });

  it("lists them when they are not, rather than implying the hours between", () => {
    expect(formatHours([9, 14])).toBe("9 AM and 2 PM");
  });

  it("treats a run across midnight as consecutive", () => {
    expect(formatHours([23, 0])).toBe("11 PM – 1 AM");
  });

  it("handles one hour and none", () => {
    expect(formatHours([14])).toBe("2 PM – 3 PM");
    expect(formatHours([])).toBe("—");
  });
});

describe("findWindows — bands as Jen defines them (2026-09-29)", () => {
  const map = (pairs: [number, number | null][]) =>
    pairs.map(([hour, avgPct]) => ({ hour, avgPct, daysAnswered: 5 }));

  it("keeps peak hours that sit in different parts of the day", () => {
    const windows = findWindows(map([[9, 95], [10, 92], [11, 40], [12, 50], [15, 97]]));
    expect(windows.peak).toEqual([9, 10, 15]);
    expect(formatRanges(windows.peak)).toBe("9 AM – 11 AM and 3 PM – 4 PM");
  });

  it("no longer throws away the shorter stretch", () => {
    // The old rule returned only [9, 10] — the longest unbroken run.
    expect(findWindows(map([[9, 95], [10, 95], [11, 20], [15, 99]])).peak).toEqual([9, 10, 15]);
  });

  it("caps collaboration at four hours, keeping the strongest", () => {
    const windows = findWindows(map([[8, 63], [9, 70], [10, 88], [11, 80], [12, 75], [13, 65]]));
    expect(windows.collaboration).toHaveLength(4);
    expect(windows.collaboration).toEqual([9, 10, 11, 12]); // 63 and 65 drop out
  });

  it("leaves collaboration alone when four or fewer hours qualify", () => {
    expect(findWindows(map([[9, 70], [10, 80]])).collaboration).toEqual([9, 10]);
  });

  it("takes every recovery hour, scattered or not", () => {
    expect(findWindows(map([[7, 20], [8, 90], [21, 30], [22, 10]])).recovery).toEqual([7, 21, 22]);
  });

  it("ignores hours with no data", () => {
    expect(qualifyingHours(map([[9, null], [10, 95]]), (v) => v >= 90)).toEqual([10]);
  });
});

describe("formatRanges", () => {
  it("joins separate stretches", () => {
    expect(formatRanges([9, 10, 15])).toBe("9 AM – 11 AM and 3 PM – 4 PM");
    expect(formatRanges([9, 12, 15])).toBe("9 AM – 10 AM, 12 PM – 1 PM and 3 PM – 4 PM");
  });

  it("reads as one range when the hours are consecutive, including past midnight", () => {
    expect(formatRanges([9, 10, 11])).toBe("9 AM – 12 PM");
    expect(formatRanges([23, 0])).toBe("11 PM – 1 AM");
  });

  it("shows an em dash when there's nothing", () => {
    expect(formatRanges([])).toBe("—");
  });
});

describe("hasRepeatedFlatRun", () => {
  const hours = [7, 8, 9, 10, 11, 12, 13];
  const day = (dayNumber: number, pcts: (number | null)[]) =>
    pcts.flatMap((pct, i) => (pct === null ? [] : [{ dayNumber, hour: hours[i], pct }]));

  it("flags five straight hours at one level on two days running", () => {
    const entries = [...day(1, [100, 100, 100, 100, 100, 25, 50]), ...day(2, [50, 100, 100, 100, 100, 100, 25])];
    expect(hasRepeatedFlatRun(entries, hours)).toBe(true);
  });

  it("needs the same level on both days", () => {
    const entries = [...day(1, [100, 100, 100, 100, 100, 25, 50]), ...day(2, [50, 50, 50, 50, 50, 100, 25])];
    expect(hasRepeatedFlatRun(entries, hours)).toBe(false);
  });

  it("needs the days to be consecutive", () => {
    const entries = [...day(1, [75, 75, 75, 75, 75, 25, 50]), ...day(3, [75, 75, 75, 75, 75, 25, 50])];
    expect(hasRepeatedFlatRun(entries, hours)).toBe(false);
  });

  it("needs five in a row, not five in the day", () => {
    const entries = [...day(1, [100, 100, 25, 100, 100, 100, 50]), ...day(2, [100, 100, 25, 100, 100, 100, 50])];
    expect(hasRepeatedFlatRun(entries, hours)).toBe(false);
  });

  it("treats a skipped hour as breaking the run", () => {
    const entries = [...day(1, [100, 100, null, 100, 100, 100, 100]), ...day(2, [100, 100, null, 100, 100, 100, 100])];
    expect(hasRepeatedFlatRun(entries, hours)).toBe(false);
  });

  it("records every level a day runs flat on", () => {
    const entries = day(1, [100, 100, 100, 100, 100, 50, 50]);
    expect(flatDayLevels(entries, hours).get(1)).toEqual(new Set([100]));
    expect(hasRepeatedFlatRun(entries, hours)).toBe(false); // one day only
  });

  it("is quiet on an empty session", () => {
    expect(hasRepeatedFlatRun([], hours)).toBe(false);
  });
});
