import { describe, expect, it } from "vitest";

import { type ReminderSession, dueReminders, localClock, reminderSchedule } from "@/lib/reminders";

const base: ReminderSession = {
  id: "s1",
  wake_time: "06:00:00",
  sleep_time: "22:00:00",
  day_count: 5,
  start_date: "2026-09-14",
  status: "in_progress",
  reminder_pref: "hourly",
  timezone: "America/Toronto",
};

/** A UTC instant for a Toronto wall-clock time (EDT, UTC−4, in September). */
const toronto = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00-04:00`);

describe("localClock", () => {
  it("reads the local date and minute in the client's timezone", () => {
    expect(localClock(new Date("2026-09-15T02:30:00Z"), "America/Toronto")).toEqual({ date: "2026-09-14", minute: 22 * 60 + 30 });
    expect(localClock(new Date("2026-09-15T02:30:00Z"), "Europe/London")).toEqual({ date: "2026-09-15", minute: 3 * 60 + 30 });
  });
});

describe("reminderSchedule", () => {
  it("hourly: one per waking hour, at the end of that hour", () => {
    const s = reminderSchedule("hourly", 6, 22);
    expect(s).toHaveLength(16);
    expect(s[0]).toEqual({ key: "hourly:06", minute: 7 * 60, covers: [6] });
    expect(s[15]).toEqual({ key: "hourly:21", minute: 22 * 60, covers: [21] });
  });

  it("three times: 2h after waking, mid-day, 1h before bed, each covering hours so far", () => {
    const s = reminderSchedule("three_times_daily", 6, 22);
    expect(s.map((x) => [x.key, x.minute / 60])).toEqual([["thrice:morning", 8], ["thrice:midday", 14], ["thrice:evening", 21]]);
    expect(s[0].covers).toEqual([6, 7]);
    expect(s[2].covers).toHaveLength(15);
  });

  it("once a day: 1h before bed", () => {
    expect(reminderSchedule("once_daily", 6, 22)).toEqual([expect.objectContaining({ key: "daily", minute: 21 * 60 })]);
  });

  it("runs past midnight for a 1 AM bedtime", () => {
    const s = reminderSchedule("hourly", 7, 1);
    expect(s.at(-1)).toEqual({ key: "hourly:00", minute: 25 * 60, covers: [0] });
    expect(reminderSchedule("once_daily", 7, 1)[0].minute).toBe(24 * 60);
  });

  it("returns nothing for 'none'", () => {
    expect(reminderSchedule("none", 6, 22)).toEqual([]);
  });
});

describe("dueReminders", () => {
  it("sends the hourly reminder for the hour just ended", () => {
    const due = dueReminders(base, new Set(), toronto("2026-09-15", "09:05"));
    expect(due).toEqual([{ sessionId: "s1", dayNumber: 2, key: "hourly:08", kind: "hourly", unloggedHours: [8] }]);
  });

  it("catches the hour's reminder when the scheduled run starts late in the hour", () => {
    expect(dueReminders(base, new Set(), toronto("2026-09-15", "09:59")).map((d) => d.key)).toEqual(["hourly:08"]);
  });

  it("never reaches back to the previous hour by default, so a skipped run can't double up", () => {
    expect(dueReminders(base, new Set(), toronto("2026-09-15", "10:00")).map((d) => d.key)).toEqual(["hourly:09"]);
  });

  it("honours a wider window when asked", () => {
    expect(dueReminders(base, new Set(), toronto("2026-09-15", "09:25"), 90).map((d) => d.key)).toEqual(["hourly:07", "hourly:08"]);
  });

  it("skips a reminder whose hours are already logged", () => {
    expect(dueReminders(base, new Set(["2:8"]), toronto("2026-09-15", "09:05"))).toEqual([]);
  });

  it("only lists the hours still missing", () => {
    const s = { ...base, reminder_pref: "three_times_daily" as const };
    const due = dueReminders(s, new Set(["1:6"]), toronto("2026-09-14", "08:10"));
    expect(due).toEqual([expect.objectContaining({ key: "thrice:morning", dayNumber: 1, unloggedHours: [7] })]);
  });

  it("does nothing before the session starts, after its last day, or outside waking hours", () => {
    expect(dueReminders(base, new Set(), toronto("2026-09-13", "09:05"))).toEqual([]);
    expect(dueReminders(base, new Set(), toronto("2026-09-19", "09:05"))).toEqual([]);
    expect(dueReminders(base, new Set(), toronto("2026-09-15", "03:00"))).toEqual([]);
  });

  it("files an after-midnight reminder under the previous tracking day", () => {
    const late = { ...base, wake_time: "07:00:00", sleep_time: "01:00:00" };
    const due = dueReminders(late, new Set(), toronto("2026-09-15", "01:03"));
    expect(due).toEqual([expect.objectContaining({ key: "hourly:00", dayNumber: 1, unloggedHours: [0] })]);
  });

  it("ignores finished sessions, 'none', and sessions with no or an invalid timezone", () => {
    const at = toronto("2026-09-15", "09:05");
    expect(dueReminders({ ...base, status: "completed" }, new Set(), at)).toEqual([]);
    expect(dueReminders({ ...base, reminder_pref: "none" }, new Set(), at)).toEqual([]);
    expect(dueReminders({ ...base, timezone: null }, new Set(), at)).toEqual([]);
    expect(dueReminders({ ...base, timezone: "Not/AZone" }, new Set(), at)).toEqual([]);
  });

  it("uses the client's own clock, not the server's", () => {
    const london = { ...base, timezone: "Europe/London" };
    // 09:05 in Toronto is 14:05 in London — London's hourly reminder is for 13:00.
    expect(dueReminders(london, new Set(), toronto("2026-09-15", "09:05")).map((d) => d.key)).toEqual(["hourly:13"]);
  });
});
