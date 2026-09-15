import { describe, expect, it } from "vitest";

import { fetchAll } from "@/lib/fetch-all";
import { buildRoster, buildSummaryCsv, filterRoster } from "@/lib/roster";

const profile = (id: string, name: string | null, email = `${id}@example.com`, role: "client" | "coach" | "admin" = "client") => ({ id, full_name: name, email, created_at: "2026-09-01T00:00:00Z", role });
const session = (id: string, client: string, start: string, status = "completed") => ({
  id, client_id: client, label: id, status, start_date: start, created_at: `${start}T10:00:00Z`, day_count: 5,
});

describe("buildRoster", () => {
  const roster = buildRoster(
    [profile("amy", "Amy"), profile("ben", "Ben"), profile("cat", null), profile("dan", "Dan")],
    [session("a1", "amy", "2026-03-01"), session("a2", "amy", "2026-09-01", "in_progress"), session("b1", "ben", "2026-06-01")],
    new Set(["a1"]),
    ["amy", "amy", "ben"],
  );

  it("aggregates sessions, drafts and notes per client", () => {
    const amy = roster.find((c) => c.id === "amy")!;
    expect(amy).toMatchObject({ sessionCount: 2, completedCount: 1, draftCount: 1, noteCount: 2 });
    expect(amy.latest?.id).toBe("a2");
  });

  it("puts the most recent activity first, clients with no sessions last by name", () => {
    expect(roster.map((c) => c.id)).toEqual(["amy", "ben", "dan", "cat"]);
  });

  it("includes staff who have tracked a session, and leaves out staff who haven't", () => {
    const withStaff = buildRoster(
      [profile("amy", "Amy"), profile("jen", "Jen", "jen@example.com", "admin"), profile("kate", "Kate", "kate@example.com", "coach")],
      [session("j1", "jen", "2026-09-10")],
      new Set(),
      [],
    );
    expect(withStaff.map((c) => [c.id, c.role])).toEqual([["jen", "admin"], ["amy", "client"]]);
  });

  it("names unnamed clients", () => {
    expect(roster.find((c) => c.id === "cat")!.name).toBe("Unnamed client");
  });

  it("filters by name or email, case-insensitively", () => {
    expect(filterRoster(roster, "BE").map((c) => c.id)).toEqual(["ben"]);
    expect(filterRoster(roster, "dan@EXAMPLE").map((c) => c.id)).toEqual(["dan"]);
    expect(filterRoster(roster, "  ")).toHaveLength(4);
  });
});

describe("buildSummaryCsv", () => {
  it("writes one escaped row per session with its headline numbers", () => {
    const csv = buildSummaryCsv([{
      clientName: "Amy", clientEmail: "amy@example.com", label: "=Spring", status: "completed",
      startDate: "2026-03-01", dayCount: 5, wake: 6, sleep: 22, hoursLogged: 72, coveragePct: 90, completeDays: 4,
      windows: { peak: [9, 10], collaboration: [], recovery: [18] }, energyType: null,
    }]);
    const lines = csv.replace(/^﻿/, "").trimEnd().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('"Amy","amy@example.com","\'=Spring","Complete","2026-03-01","5","6 AM – 10 PM","72","90%","4","9 AM – 11 AM","—","6 PM – 7 PM",""');
  });
});

describe("fetchAll", () => {
  it("pages past the 1,000-row cap until a short page", async () => {
    const data = Array.from({ length: 2500 }, (_, i) => i);
    const calls: [number, number][] = [];
    const rows = await fetchAll(async (from, to) => {
      calls.push([from, to]);
      return { data: data.slice(from, to + 1), error: null };
    });
    expect(rows).toHaveLength(2500);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("surfaces query errors instead of returning partial data", async () => {
    await expect(fetchAll(async () => ({ data: null, error: { message: "nope" } }))).rejects.toThrow("nope");
  });
});
