import { describe, expect, it } from "vitest";

import { buildSessionSlots, hourOf } from "@/lib/slots";
import { buildTrackingRemindersIcs } from "@/lib/tracking-reminders";

const hours = (wake: number, sleep: number) => buildSessionSlots(wake, sleep).map(hourOf);

const build = (over: Partial<Parameters<typeof buildTrackingRemindersIcs>[0]> = {}) =>
  buildTrackingRemindersIcs({
    sessionId: "s1",
    startDate: "2026-09-24",
    dayCount: 5,
    hours: hours(7, 10), // 7, 8, 9 — three slots keeps the assertions readable
    now: new Date("2026-09-24T11:00:00Z"),
    ...over,
  });

describe("buildTrackingRemindersIcs", () => {
  it("writes one repeating event per waking hour, each with an alarm", () => {
    const ics = build()!;
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(3);
    expect(ics).toContain("DTSTART:20260924T070000");
    expect(ics).toContain("DTSTART:20260924T080000");
    expect(ics).toContain("DTSTART:20260924T090000");
    expect(ics).toContain("TRIGGER:PT0S");
  });

  it("repeats once per day of the session", () => {
    expect(build()).toContain("RRULE:FREQ=DAILY;COUNT=5");
    expect(build({ dayCount: 7 })).toContain("RRULE:FREQ=DAILY;COUNT=7");
  });

  it("uses floating times, so an hour means the same wherever the client is", () => {
    // No TZID parameter and no trailing Z on the event times.
    expect(build()).not.toContain("TZID");
    expect(build()).not.toMatch(/DTSTART:\d{8}T\d{6}Z/);
  });

  it("gives each hour its own stable UID", () => {
    const ics = build()!;
    expect(ics).toContain("UID:charge-index-s1-h7@charge-index");
    expect(ics).toContain("UID:charge-index-s1-h9@charge-index");
  });

  it("moves hours past midnight onto the next date", () => {
    const ics = build({ hours: hours(22, 1), dayCount: 5 })!;
    expect(ics).toContain("DTSTART:20260924T220000"); // 10 PM, day one
    expect(ics).toContain("DTSTART:20260924T230000");
    expect(ics).toContain("DTSTART:20260925T000000"); // midnight belongs to the next date
  });

  it("starts today, with the remaining days, when the session is already under way", () => {
    const ics = build({ now: new Date("2026-09-26T08:00:00Z") })!;
    expect(ics).toContain("DTSTART:20260926T070000");
    expect(ics).toContain("RRULE:FREQ=DAILY;COUNT=3"); // 26th, 27th, 28th
  });

  it("starts on the session's start date when that's still ahead", () => {
    const ics = build({ now: new Date("2026-09-20T08:00:00Z") })!;
    expect(ics).toContain("DTSTART:20260924T070000");
    expect(ics).toContain("RRULE:FREQ=DAILY;COUNT=5");
  });

  it("still covers the last day for someone asking on it", () => {
    const ics = build({ now: new Date("2026-09-28T20:00:00Z") })!;
    expect(ics).toContain("DTSTART:20260928T070000");
    expect(ics).toContain("RRULE:FREQ=DAILY;COUNT=1");
  });

  it("clamps to the last day rather than scheduling past the session", () => {
    const ics = build({ now: new Date("2026-10-15T08:00:00Z") })!;
    expect(ics).toContain("DTSTART:20260928T070000");
    expect(ics).toContain("RRULE:FREQ=DAILY;COUNT=1");
  });

  it("returns null when there's nothing to remind about", () => {
    expect(build({ hours: [] })).toBeNull();
    expect(build({ dayCount: 0 })).toBeNull();
  });

  it("is a well-formed calendar: CRLF endings and matched blocks", () => {
    const ics = build()!;
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.split("\n").every((l) => l === "" || l.endsWith("\r"))).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBe(ics.match(/END:VEVENT/g)!.length);
  });

  it("escapes text so a comma can't split a property", () => {
    // formatHour puts no commas in, but the fixed strings carry them.
    const ics = build()!;
    for (const line of ics.split("\r\n")) {
      if (line.startsWith("SUMMARY:")) expect(line).not.toMatch(/(?<!\\),/);
    }
  });
});
