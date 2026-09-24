import { describe, expect, it } from "vitest";

import {
  buildPeakPlanIcs,
  buildSessionCsv,
  csvCell,
  exportFilename,
  planGuards,
  planSchedule,
  escapeIcsText,
} from "@/lib/peak-plan";

describe("planGuards", () => {
  it("writes all three guards when every window exists", () => {
    const g = planGuards({ peak: [9, 10], collaboration: [13], recovery: [15, 16] });
    expect(g.map((x) => x.n)).toEqual(["01", "02", "03"]);
    expect(g[0].text).toBe("Nothing books over 9 AM – 11 AM. That block belongs to the work only you can do.");
    expect(g[2].text).toContain("Plan the dip at 3 PM – 5 PM");
  });

  it("skips a guard whose window wasn't found, and renumbers", () => {
    const g = planGuards({ peak: [], collaboration: [13], recovery: [15] });
    expect(g.map((x) => x.n)).toEqual(["01", "02"]);
    expect(g.some((x) => x.text.includes("—"))).toBe(false);
  });
});

describe("planSchedule", () => {
  it("uses the plan's own wording per zone", () => {
    const s = planSchedule([
      { hour: 9, avgPct: 95, daysAnswered: 3 },
      { hour: 10, avgPct: null, daysAnswered: 0 },
    ]);
    expect(s[0]).toMatchObject({ hour: 9, task: "Strategic thinking · deep work", zone: "Fully Charged" });
    expect(s[1]).toMatchObject({ task: "Untracked hour", zone: "—" });
  });
});

describe("buildPeakPlanIcs", () => {
  // Wednesday 16 September 2026, 14:30 UTC.
  const wednesday = new Date(Date.UTC(2026, 8, 16, 14, 30));

  it("returns null when there is no peak window", () => {
    expect(buildPeakPlanIcs({ peak: [], sessionId: "s1", now: wednesday })).toBeNull();
  });

  it("spans the real peak window in floating local time, weekdays, 20 times", () => {
    const ics = buildPeakPlanIcs({ peak: [9, 10, 11], sessionId: "s1", now: wednesday })!;
    expect(ics).toContain("DTSTART:20260916T090000\r\n");
    expect(ics).toContain("DTEND:20260916T120000\r\n");
    expect(ics).not.toContain("TZID");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=20");
  });

  it("includes the fields every event requires, with CRLF endings", () => {
    const ics = buildPeakPlanIcs({ peak: [9], sessionId: "abc", now: wednesday })!;
    expect(ics).toContain("UID:peak-plan-abc@charge-index\r\n");
    expect(ics).toContain("DTSTAMP:20260916T143000Z\r\n");
    expect(ics.split("\r\n").every((l) => !l.includes("\n"))).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("starts on the next weekday when generated at the weekend", () => {
    const saturday = new Date(Date.UTC(2026, 8, 19, 10));
    expect(buildPeakPlanIcs({ peak: [9], sessionId: "s", now: saturday })).toContain("DTSTART:20260921T090000");
  });

  it("ends on the next day for a window crossing midnight", () => {
    const ics = buildPeakPlanIcs({ peak: [23, 0], sessionId: "s", now: wednesday })!;
    expect(ics).toContain("DTSTART:20260916T230000");
    expect(ics).toContain("DTEND:20260917T010000");
  });

  it("escapes text and folds long lines at 75 octets without splitting characters", () => {
    const ics = buildPeakPlanIcs({ peak: [9, 10], sessionId: "s", now: wednesday })!;
    expect(ics).toContain("SUMMARY:Peak Plan Block — protected");
    const physical = ics.split("\r\n");
    const encoder = new TextEncoder();
    expect(physical.every((l) => encoder.encode(l).length <= 75)).toBe(true);
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("DESCRIPTION:Your fully-charged window (9 AM – 11 AM). Deep work only. Source: your Charge Index.");
  });
});

describe("csvCell", () => {
  it("quotes and doubles embedded quotes", () => {
    expect(csvCell('said "hi", then left')).toBe('"said ""hi"", then left"');
  });

  it("neutralises cells a spreadsheet would run as a formula", () => {
    expect(csvCell('=HYPERLINK("http://evil","x")')).toBe('"\'=HYPERLINK(""http://evil"",""x"")"');
    for (const lead of ["+", "-", "@"]) expect(csvCell(`${lead}1`).startsWith(`"'${lead}`)).toBe(true);
  });

  it("renders null as an empty cell", () => {
    expect(csvCell(null)).toBe('""');
  });
});

describe("buildSessionCsv", () => {
  const csv = buildSessionCsv({
    clientName: "Sarah",
    clientEmail: "sarah@example.com",
    label: "Spring 2026",
    dayCount: 2,
    hours: [9, 10],
    entries: [
      { dayNumber: 1, hour: 9, pct: 100 },
      { dayNumber: 2, hour: 9, pct: 75 },
    ],
    map: [
      { hour: 9, avgPct: 87.5, daysAnswered: 2 },
      { hour: 10, avgPct: null, daysAnswered: 0 },
    ],
    reflections: [{ dayNumber: 2, feel: "=cmd", unexpected: null, forJen: "Thanks" }],
  });
  const lines = csv.replace(/^\uFEFF/, "").trimEnd().split("\r\n");

  it("starts with a BOM and uses CRLF", () => {
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.includes("\r\n")).toBe(true);
  });

  it("writes header, per-hour values with average and zone, then reflections", () => {
    expect(lines[1]).toBe('"Client","Sarah","Email","sarah@example.com","Session","Spring 2026"');
    expect(lines[3]).toBe('"Time","Day 1","Day 2","Average","Zone"');
    expect(lines[4]).toBe('"9:00 AM","100%","75%","87.5%","Fully Charged"');
    expect(lines[5]).toBe('"10:00 AM","","","",""');
    expect(lines[7]).toBe('"Day","How I felt","Unexpected","For Jen"');
    expect(lines[8]).toBe('"Day 1","","",""');
    expect(lines[9]).toBe('"Day 2","\'=cmd","","Thanks"');
  });
});

describe("exportFilename", () => {
  it("makes a safe filename from the client name", () => {
    expect(exportFilename("Sarah O'Neil", "ChargeIndex.csv")).toBe("Sarah_O_Neil_ChargeIndex.csv");
    expect(exportFilename(null, "PeakPlan.ics")).toBe("client_PeakPlan.ics");
  });
});

describe("escapeIcsText", () => {
  it("escapes the characters RFC 5545 reserves in TEXT values", () => {
    expect(escapeIcsText("a,b")).toBe("a\\,b");
    // Regression: this was written "\\;" in a JS string, which is just ";",
    // so semicolons went through unescaped until 2026-09-24.
    expect(escapeIcsText("a;b")).toBe("a\\;b");
    expect(escapeIcsText("a\\b")).toBe("a\\\\b");
    expect(escapeIcsText("a\nb")).toBe("a\\nb");
    expect(escapeIcsText("a\r\nb")).toBe("a\\nb");
  });
});
