import { describe, expect, it } from "vitest";

import {
  consistency,
  entryZone,
  formatTopHours,
  idealDay,
  idealZone,
  zoneTopHours,
} from "@/lib/coach-analysis";
import type { Entry } from "@/lib/weekly-map";

const e = (dayNumber: number, hour: number, pct: number): Entry => ({ dayNumber, hour, pct });

describe("idealZone", () => {
  it("uses the prototype's thresholds, including their boundaries", () => {
    expect(idealZone(88)).toBe("peak");
    expect(idealZone(87.99)).toBe("collab");
    expect(idealZone(62)).toBe("collab");
    expect(idealZone(61.99)).toBe("low");
    expect(idealZone(22)).toBe("low");
    expect(idealZone(21.99)).toBe("depleted");
    expect(idealZone(null)).toBe("unknown");
  });

  it("maps a weekly map hour by hour, keeping slot order", () => {
    const day = idealDay([
      { hour: 23, avgPct: 95, daysAnswered: 2 },
      { hour: 0, avgPct: null, daysAnswered: 0 },
    ]);
    expect(day).toEqual([
      { hour: 23, zone: "peak" },
      { hour: 0, zone: "unknown" },
    ]);
  });
});

describe("zone cards", () => {
  it("zones raw entries as 100 / 75 / 50–25 / 10", () => {
    expect([100, 75, 50, 25, 10].map(entryZone)).toEqual(["peak", "collab", "low", "low", "depleted"]);
  });

  it("ranks hours by how often they landed in each zone, top three", () => {
    const entries = [
      e(1, 9, 100), e(2, 9, 100), e(3, 9, 100),
      e(1, 10, 100), e(2, 10, 100),
      e(1, 11, 100),
      e(1, 12, 100),
      e(1, 14, 10),
    ];
    const top = zoneTopHours(entries, [9, 10, 11, 12, 13, 14]);
    expect(top.peak).toEqual([9, 10, 11]);
    expect(top.depleted).toEqual([14]);
    expect(top.collab).toEqual([]);
  });

  it("breaks ties by position in the day, past midnight included", () => {
    const hours = [22, 23, 0];
    const top = zoneTopHours([e(1, 0, 10), e(1, 22, 10), e(1, 23, 10)], hours);
    expect(top.depleted).toEqual([22, 23, 0]);
  });

  it("formats top hours, or 'No data'", () => {
    expect(formatTopHours([9, 14])).toBe("9:00 AM · 2:00 PM");
    expect(formatTopHours([])).toBe("No data");
  });
});

describe("consistency", () => {
  const hours = [9, 10, 11];

  it("counts complete days and the longest back-to-back run", () => {
    const entries = [
      ...hours.map((h) => e(1, h, 50)),
      ...hours.map((h) => e(2, h, 50)),
      e(3, 9, 50), // day 3 partial — breaks the streak
      ...hours.map((h) => e(4, h, 50)),
    ];
    const c = consistency(entries, hours, 5);
    expect(c.completeDays).toBe(3);
    expect(c.longestStreak).toBe(2);
    expect(c.days.map((d) => d.logged)).toEqual([3, 3, 1, 3, 0]);
    expect(c.coveragePct).toBe(67); // 10 of 15
  });

  it("ignores entries outside the session's hours or days", () => {
    const c = consistency([e(1, 9, 50), e(1, 20, 50), e(9, 9, 50)], hours, 5);
    expect(c.days[0].logged).toBe(1);
    expect(c.coveragePct).toBe(7); // 1 of 15
  });

  it("handles an empty session", () => {
    expect(consistency([], hours, 5)).toMatchObject({ completeDays: 0, longestStreak: 0, coveragePct: 0 });
  });
});
