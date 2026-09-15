import { describe, expect, it } from "vitest";

import { alignToAxis, compareAxis } from "@/lib/compare";
import { buildSessionSlots, hourOf } from "@/lib/slots";
import type { HourAverage } from "@/lib/weekly-map";

const mapFor = (wake: number, sleep: number, value = 50): HourAverage[] =>
  buildSessionSlots(wake, sleep)
    .map(hourOf)
    .map((hour) => ({ hour, avgPct: value, daysAnswered: 1 }));

describe("compareAxis", () => {
  it("unions different waking hours in day order", () => {
    const axis = compareAxis([mapFor(8, 20), mapFor(6, 18)]);
    expect(axis[0]).toBe(6);
    expect(axis[axis.length - 1]).toBe(19);
    expect(axis).toHaveLength(14); // 6 AM through 7 PM
  });

  it("keeps past-midnight hours at the end of the day", () => {
    const axis = compareAxis([mapFor(6, 22), mapFor(7, 1)]);
    expect(axis.slice(0, 2)).toEqual([6, 7]);
    expect(axis.slice(-3)).toEqual([22, 23, 0]);
  });

  it("returns an empty axis for no sessions", () => {
    expect(compareAxis([])).toEqual([]);
  });
});

describe("alignToAxis", () => {
  it("fills null where a session doesn't cover or didn't answer an hour", () => {
    const map: HourAverage[] = [
      { hour: 8, avgPct: 75, daysAnswered: 2 },
      { hour: 9, avgPct: null, daysAnswered: 0 },
    ];
    expect(alignToAxis(map, [7, 8, 9])).toEqual([null, 75, null]);
  });
});
