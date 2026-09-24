import { describe, expect, it } from "vitest";

import {
  daysBetween,
  formatDayDate,
  formatDayDateLong,
  sessionDays,
  todayInZone,
  unlockedDayCount,
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

describe("unlockedDayCount", () => {
  const at = (iso: string) => new Date(iso);

  it("opens only day 1 on the first day", () => {
    expect(unlockedDayCount("2026-09-24", 7, "UTC", at("2026-09-24T09:00:00Z"))).toBe(1);
  });

  it("opens one more day per calendar day", () => {
    expect(unlockedDayCount("2026-09-24", 7, "UTC", at("2026-09-25T00:05:00Z"))).toBe(2);
    expect(unlockedDayCount("2026-09-24", 7, "UTC", at("2026-09-27T23:59:00Z"))).toBe(4);
  });

  it("never exceeds the session's length", () => {
    expect(unlockedDayCount("2026-09-24", 5, "UTC", at("2026-10-24T09:00:00Z"))).toBe(5);
  });

  it("keeps day 1 open when the start date is still in the future", () => {
    expect(unlockedDayCount("2026-09-24", 7, "UTC", at("2026-09-20T09:00:00Z"))).toBe(1);
  });

  it("follows the client's midnight, not the server's", () => {
    // 03:00 UTC on the 25th is still the 24th in Toronto, so day 2 hasn't
    // opened for a client there.
    const justAfterUtcMidnight = at("2026-09-25T03:00:00Z");
    expect(unlockedDayCount("2026-09-24", 7, "UTC", justAfterUtcMidnight)).toBe(2);
    expect(unlockedDayCount("2026-09-24", 7, "America/Toronto", justAfterUtcMidnight)).toBe(1);
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
