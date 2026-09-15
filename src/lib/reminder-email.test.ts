import { describe, expect, it } from "vitest";

import { renderReminderEmail } from "@/lib/reminder-email";
import { type PlanSession, planReminders } from "@/lib/reminder-plan";

describe("renderReminderEmail", () => {
  const base = { clientName: "Sarah Anne", sessionLabel: "Spring 2026", dayNumber: 2, dayCount: 5, url: "https://app.example/track/s1?day=2" };

  it("names the single hour to log", () => {
    const e = renderReminderEmail({ ...base, unloggedHours: [8] });
    expect(e.subject).toBe("How charged were you?");
    expect(e.text).toContain("Hi Sarah,");
    expect(e.text).toContain("log your 8 AM hour — Day 2 of 5 of Spring 2026.");
    expect(e.text).toContain("https://app.example/track/s1?day=2");
  });

  it("summarises several missed hours", () => {
    expect(renderReminderEmail({ ...base, unloggedHours: [8, 9] }).text).toContain("log 8 AM and 9 AM");
    expect(renderReminderEmail({ ...base, unloggedHours: [6, 7, 8, 9, 10] }).text).toContain("log 5 hours");
  });

  it("escapes client-written text in the HTML version", () => {
    const e = renderReminderEmail({ ...base, clientName: "<script>x</script>", sessionLabel: 'Q3 "reset" & <b>', unloggedHours: [8] });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(e.html).toContain("Q3 &quot;reset&quot; &amp; &lt;b&gt;");
  });
});

describe("planReminders", () => {
  const session: PlanSession = {
    id: "s1", label: "Spring", wake_time: "06:00:00", sleep_time: "22:00:00", day_count: 5,
    start_date: "2026-09-14", status: "in_progress", reminder_pref: "hourly", timezone: "America/Toronto",
    profiles: { full_name: "Sarah", email: "sarah@example.com" },
  };
  const at = new Date("2026-09-15T09:05:00-04:00");

  it("plans one email per due reminder, linking to the right day", () => {
    const plan = planReminders([session], [], at, "https://charge-index.vercel.app/");
    expect(plan).toEqual([expect.objectContaining({ sessionId: "s1", dayNumber: 2, key: "hourly:08", to: "sarah@example.com" })]);
    expect(plan[0].text).toContain("https://charge-index.vercel.app/track/s1?day=2");
  });

  it("uses logged entries to skip, and skips clients with no email", () => {
    expect(planReminders([session], [{ session_id: "s1", day_number: 2, slot_hour: "08:00:00" }], at, "https://x")).toEqual([]);
    expect(planReminders([{ ...session, profiles: { full_name: "S", email: null } }], [], at, "https://x")).toEqual([]);
  });
});
