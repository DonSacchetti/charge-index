import { describe, expect, it } from "vitest";

import { buildScheduleIcs, scheduleBlocks, type ScheduleRow } from "@/lib/plan-calendar";

const row = (hour: number, task: string, note?: string | null): ScheduleRow => ({
  hour,
  task,
  zone: task === "Deep work" ? "Fully Charged" : "Steady / Low",
  note,
});

describe("scheduleBlocks", () => {
  it("merges consecutive hours of the same kind", () => {
    const blocks = scheduleBlocks([row(9, "Deep work"), row(10, "Deep work"), row(11, "Admin")]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].hours).toEqual([9, 10]);
    expect(blocks[1].hours).toEqual([11]);
  });

  it("splits when the client's note changes, even within the same kind of hour", () => {
    const blocks = scheduleBlocks([
      row(9, "Deep work", "Write the board deck"),
      row(10, "Deep work", "Write the board deck"),
      row(11, "Deep work", "Review the numbers"),
    ]);
    expect(blocks.map((b) => b.hours)).toEqual([[9, 10], [11]]);
    expect(blocks.map((b) => b.note)).toEqual(["Write the board deck", "Review the numbers"]);
  });

  it("treats blank and whitespace-only notes as no note", () => {
    const blocks = scheduleBlocks([row(9, "Deep work", "   "), row(10, "Deep work", "")]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].note).toBeNull();
  });

  it("keeps a run together across midnight", () => {
    const blocks = scheduleBlocks([row(23, "Admin"), row(0, "Admin")]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].hours).toEqual([23, 0]);
  });

  it("does not merge hours that aren't adjacent", () => {
    const blocks = scheduleBlocks([row(9, "Admin"), row(14, "Admin")]);
    expect(blocks.map((b) => b.hours)).toEqual([[9], [14]]);
  });
});

describe("buildScheduleIcs", () => {
  const rows = [
    row(9, "Deep work", "Write the board deck"),
    row(10, "Deep work", "Write the board deck"),
    row(11, "Admin"),
  ];
  // A Thursday, so the first occurrence needs no weekend skip.
  const now = new Date("2026-09-24T12:00:00Z");
  const build = (over = {}) => buildScheduleIcs({ sessionId: "s1", rows, peak: [9, 10], now, ...over });

  it("writes one event per block, spanning its hours", () => {
    const ics = build()!;
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART:20260924T090000");
    expect(ics).toContain("DTEND:20260924T110000"); // two hours
    expect(ics).toContain("DTSTART:20260924T110000");
    expect(ics).toContain("DTEND:20260924T120000");
  });

  it("uses the client's own words as the title, and the plan's wording otherwise", () => {
    const ics = build()!;
    expect(ics).toContain("SUMMARY:Write the board deck");
    expect(ics).toContain("SUMMARY:Admin");
  });

  it("repeats on weekdays for four weeks", () => {
    expect(build()).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=20");
  });

  it("starts on the next weekday rather than putting work on a Saturday", () => {
    const saturday = new Date("2026-09-26T12:00:00Z");
    expect(build({ now: saturday })).toContain("DTSTART:20260928T090000"); // Monday
  });

  it("alerts for hours the client wrote a note on, and for the peak block", () => {
    const ics = build()!;
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(1); // the noted peak block only
    const quiet = buildScheduleIcs({ sessionId: "s1", rows: [row(11, "Admin")], peak: [], now })!;
    expect(quiet).not.toContain("BEGIN:VALARM");
    const peakOnly = buildScheduleIcs({ sessionId: "s1", rows: [row(9, "Deep work")], peak: [9], now })!;
    expect(peakOnly).toContain("BEGIN:VALARM");
  });

  it("leaves out untracked hours, and returns null when nothing is left", () => {
    const untracked: ScheduleRow = { hour: 6, task: "Untracked hour", zone: "—" };
    const ics = buildScheduleIcs({ sessionId: "s1", rows: [untracked, row(9, "Deep work")], now })!;
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(buildScheduleIcs({ sessionId: "s1", rows: [untracked], now })).toBeNull();
    expect(buildScheduleIcs({ sessionId: "s1", rows: [], now })).toBeNull();
  });

  it("escapes a note that would otherwise break the file", () => {
    const ics = buildScheduleIcs({
      sessionId: "s1",
      rows: [row(9, "Deep work", "Plan Q4, then email Ana; no calls\nEver")],
      now,
    })!;
    // Long lines are folded as "\r\n " — unfold before reading the value.
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("SUMMARY:Plan Q4\\, then email Ana\\; no calls\\nEver");
    expect(unfolded.split("\r\n").filter((l) => l.startsWith("SUMMARY"))).toHaveLength(1);
  });

  it("is a well-formed calendar", () => {
    const ics = build()!;
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBe(ics.match(/END:VEVENT/g)!.length);
    expect(ics.match(/BEGIN:VALARM/g)!.length).toBe(ics.match(/END:VALARM/g)!.length);
  });
});
