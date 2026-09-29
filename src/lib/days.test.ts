import { describe, expect, it } from "vitest";

import {
  currentDay,
  dayHasStarted,
  daysBetween,
  formatDayDate,
  formatDayDateLong,
  isHourOpen,
  minutesLeft,
  sessionDays,
  todayInZone,
} from "@/lib/days";

describe("sessionDays", () => {
  it("numbers the days from the start date", () => {
    expect(sessionDays("2026-09-21", 3)).toEqual([
      { dayNumber: 1, date: "2026-09-21" },
      { dayNumber: 2, date: "2026-09-22" },
      { dayNumber: 3, date: "2026-09-23" },
    ]);
  });

  it("crosses a month end", () => {
    expect(sessionDays("2026-09-30", 2).map((d) => d.date)).toEqual(["2026-09-30", "2026-10-01"]);
  });

  it("crosses a year end", () => {
    expect(sessionDays("2026-12-31", 2).map((d) => d.date)).toEqual(["2026-12-31", "2027-01-01"]);
  });

  it("handles a leap day", () => {
    expect(sessionDays("2028-02-28", 3).map((d) => d.date)).toEqual([
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
    ]);
  });
});

describe("daysBetween", () => {
  it("counts forwards and backwards", () => {
    expect(daysBetween("2026-09-21", "2026-09-24")).toBe(3);
    expect(daysBetween("2026-09-24", "2026-09-21")).toBe(-3);
    expect(daysBetween("2026-09-21", "2026-09-21")).toBe(0);
  });

  it("is unaffected by daylight saving changes", () => {
    // North America ends DST on 2026-11-01; a naive hour-based diff would
    // return 0.958 days here and round to the wrong day.
    expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
  });
});

describe("todayInZone", () => {
  // 2026-09-24T02:30Z — already the 24th in London, still the 23rd in Toronto.
  const now = new Date("2026-09-24T02:30:00Z");

  it("uses the client's own timezone", () => {
    expect(todayInZone("Europe/London", now)).toBe("2026-09-24");
    expect(todayInZone("America/Toronto", now)).toBe("2026-09-23");
    expect(todayInZone("Australia/Sydney", now)).toBe("2026-09-24");
  });

  it("falls back to UTC when the timezone is missing or nonsense", () => {
    expect(todayInZone(null, now)).toBe("2026-09-24");
    expect(todayInZone("Mars/Olympus", now)).toBe("2026-09-24");
  });
});

describe("isHourOpen — Jen's 24-hour window", () => {
  const session = { startDate: "2026-09-24", wakeHour: 7, timezone: "UTC" };
  const at = (iso: string) => new Date(iso);

  it("opens an hour when it starts, not before", () => {
    expect(isHourOpen({ ...session, dayNumber: 1, hour: 14 }, at("2026-09-24T13:59:00Z"))).toBe(false);
    expect(isHourOpen({ ...session, dayNumber: 1, hour: 14 }, at("2026-09-24T14:00:00Z"))).toBe(true);
  });

  it("keeps it open for 24 hours, then closes it", () => {
    expect(isHourOpen({ ...session, dayNumber: 1, hour: 14 }, at("2026-09-25T13:59:00Z"))).toBe(true);
    expect(isHourOpen({ ...session, dayNumber: 1, hour: 14 }, at("2026-09-25T14:01:00Z"))).toBe(false);
  });

  it("lets yesterday afternoon stay open while this morning's early hours have closed", () => {
    // Now: Friday 3 PM. Thursday 4 PM is 23 hours ago; Thursday 2 PM is 25.
    const now = at("2026-09-25T15:00:00Z");
    expect(isHourOpen({ ...session, dayNumber: 1, hour: 16 }, now)).toBe(true);
    expect(isHourOpen({ ...session, dayNumber: 1, hour: 14 }, now)).toBe(false);
  });

  it("follows the client's own clock", () => {
    // 23:00 UTC on the 25th is 7 PM in Toronto (22 hours after their 9 PM on
    // the 24th, so still open) and 8 AM on the 26th in Tokyo (35 hours, shut).
    const now = at("2026-09-25T23:00:00Z");
    expect(isHourOpen({ ...session, timezone: "America/Toronto", dayNumber: 1, hour: 21 }, now)).toBe(true);
    expect(isHourOpen({ ...session, timezone: "Asia/Tokyo", dayNumber: 1, hour: 21 }, now)).toBe(false);
  });

  it("puts an after-midnight slot on the following date", () => {
    // Wake 7 AM, bedtime 1 AM: the midnight slot of day 1 is the 25th.
    expect(isHourOpen({ ...session, dayNumber: 1, hour: 0 }, at("2026-09-24T23:00:00Z"))).toBe(false);
    expect(isHourOpen({ ...session, dayNumber: 1, hour: 0 }, at("2026-09-25T00:30:00Z"))).toBe(true);
  });

  it("reports how long is left", () => {
    expect(minutesLeft({ ...session, dayNumber: 1, hour: 14 }, at("2026-09-24T14:00:00Z"))).toBe(24 * 60);
    expect(minutesLeft({ ...session, dayNumber: 1, hour: 14 }, at("2026-09-25T12:00:00Z"))).toBe(120);
    expect(minutesLeft({ ...session, dayNumber: 1, hour: 14 }, at("2026-09-26T12:00:00Z"))).toBe(0);
  });
});

describe("dayHasStarted / currentDay", () => {
  const session = { startDate: "2026-09-24", wakeHour: 7, timezone: "UTC", dayCount: 7 };
  const at = (iso: string) => new Date(iso);

  it("a day starts at its first waking hour", () => {
    expect(dayHasStarted({ ...session, dayNumber: 1 }, at("2026-09-24T06:59:00Z"))).toBe(false);
    expect(dayHasStarted({ ...session, dayNumber: 1 }, at("2026-09-24T07:00:00Z"))).toBe(true);
    expect(dayHasStarted({ ...session, dayNumber: 3 }, at("2026-09-25T09:00:00Z"))).toBe(false);
  });

  it("the current day is the latest one that has started", () => {
    expect(currentDay(session, at("2026-09-24T09:00:00Z"))).toBe(1);
    expect(currentDay(session, at("2026-09-27T09:00:00Z"))).toBe(4);
    expect(currentDay(session, at("2026-09-27T03:00:00Z"))).toBe(3); // before waking
    expect(currentDay(session, at("2026-10-30T09:00:00Z"))).toBe(7); // never past the end
    expect(currentDay(session, at("2026-09-01T09:00:00Z"))).toBe(1); // before it begins
  });
});

describe("formatDayDate", () => {
  it("renders the date it was given, with no timezone drift", () => {
    expect(formatDayDate("2026-09-21")).toBe("Mon, Sep 21");
    expect(formatDayDateLong("2026-09-21")).toBe("Monday, September 21");
  });

  it("renders a date that would slip a day under a western timezone", () => {
    expect(formatDayDate("2026-01-01")).toBe("Thu, Jan 1");
  });
});
