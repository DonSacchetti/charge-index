import { describe, expect, it } from "vitest";

import { MIN_HOURS_FOR_RESULT } from "@/lib/weekly-map";
import {
  type TeamMember,
  buildTeamPlan,
  buildTeamPlanIcs,
  findSplit,
  splitByData,
  teamHours,
} from "@/lib/team-plan";

/** A member whose hours read as given: [hour, average]. */
const member = (name: string, pairs: [number, number | null][], hoursLogged = MIN_HOURS_FOR_RESULT): TeamMember => ({
  clientId: name,
  name,
  hoursLogged,
  map: pairs.map(([hour, avgPct]) => ({ hour, avgPct, daysAnswered: 5 })),
});

/** A morning person and an afternoon person, both fully logged. */
const morning = (name: string) =>
  member(name, [
    [8, 75],
    [9, 100],
    [10, 96],
    [11, 70],
    [12, 60],
    [13, 40],
    [14, 30],
    [15, 55],
    [16, 65],
  ]);

const afternoon = (name: string) =>
  member(name, [
    [8, 45],
    [9, 55],
    [10, 60],
    [11, 65],
    [12, 60],
    [13, 70],
    [14, 95],
    [15, 98],
    [16, 72],
  ]);

describe("splitByData", () => {
  it("leaves out anyone whose own week is too thin to read", () => {
    const { included, excluded } = splitByData([morning("Amy"), member("Ben", [[9, 100]], 12)]);
    expect(included.map((m) => m.name)).toEqual(["Amy"]);
    expect(excluded.map((m) => m.name)).toEqual(["Ben"]);
  });

  it("includes someone exactly at the floor", () => {
    const { included } = splitByData([member("Cat", [[9, 90]], MIN_HOURS_FOR_RESULT)]);
    expect(included).toHaveLength(1);
  });
});

describe("teamHours", () => {
  const hours = teamHours([morning("Amy"), morning("Ann"), afternoon("Zoe")]);

  it("scores each hour by how much of the team is in each band", () => {
    const nine = hours.find((h) => h.hour === 9)!;
    expect(nine.answered).toBe(3);
    expect(nine.peakShare).toBeCloseTo(2 / 3);
    expect(nine.readyShare).toBeCloseTo(2 / 3);
  });

  it("averages the members' own averages", () => {
    const eight = hours.find((h) => h.hour === 8)!;
    expect(eight.avgPct).toBe(65); // 75, 75, 45
  });

  it("keeps the day in order across everyone's hours", () => {
    expect(hours.map((h) => h.hour)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16]);
  });
});

describe("buildTeamPlan", () => {
  it("protects the hours most of the team is at peak", () => {
    const plan = buildTeamPlan([morning("Amy"), morning("Ann"), morning("Ada")]);
    expect(plan.protect).toEqual([9, 10]);
    expect(plan.headlines[0]).toContain("Protect 9 AM – 11 AM");
  });

  it("never proposes a meeting in an hour it just told them to protect", () => {
    const plan = buildTeamPlan([morning("Amy"), morning("Ann"), morning("Ada")]);
    expect(plan.meet.some((h) => plan.protect.includes(h))).toBe(false);
  });

  it("keeps meetings to four hours at most", () => {
    const steady = (name: string) =>
      member(name, [8, 9, 10, 11, 12, 13, 14, 15].map((h) => [h, 70] as [number, number]));
    const plan = buildTeamPlan([steady("A"), steady("B"), steady("C")]);
    expect(plan.meet.length).toBeLessThanOrEqual(4);
  });

  it("marks the hours to schedule nothing in", () => {
    const flat = (name: string) =>
      member(name, [
        [9, 80],
        [14, 20],
        [15, 18],
      ]);
    const plan = buildTeamPlan([flat("A"), flat("B")]);
    expect(plan.avoid).toEqual([14, 15]);
    expect(plan.headlines.some((h) => h.includes("Schedule nothing"))).toBe(true);
  });

  it("calls out a team that splits into two camps", () => {
    const plan = buildTeamPlan([morning("Amy"), morning("Ann"), afternoon("Zoe"), afternoon("Zak")]);
    expect(plan.split).not.toBeNull();
    expect(plan.split!.gap).toBeGreaterThanOrEqual(3);
    expect(plan.headlines.some((h) => h.includes("Your team splits"))).toBe(true);
  });

  it("stays quiet about a split when everyone peaks together", () => {
    expect(buildTeamPlan([morning("Amy"), morning("Ann"), morning("Ada")]).split).toBeNull();
  });

  it("says so when one strong hour doesn't carry the team", () => {
    // Two peak, two nowhere near: 50% never reaches the majority.
    const low = (name: string) =>
      member(name, [
        [9, 40],
        [10, 45],
      ]);
    const plan = buildTeamPlan([morning("Amy"), morning("Ann"), low("C"), low("D")]);
    expect(plan.protect).toEqual([]);
    expect(plan.headlines[0]).toContain("No hour found the whole team at peak");
  });

  it("names how many people were too thin to include", () => {
    const plan = buildTeamPlan([morning("Amy"), morning("Ann"), member("Thin", [[9, 100]], 4)]);
    expect(plan.excluded.map((m) => m.name)).toEqual(["Thin"]);
    expect(plan.headlines.some((h) => h.includes("1 person logged too little"))).toBe(true);
  });

  it("has something to say when nobody has logged enough", () => {
    const plan = buildTeamPlan([member("Thin", [[9, 100]], 2)]);
    expect(plan.protect).toEqual([]);
    expect(plan.headlines).toEqual(["Nobody has logged enough yet for a team plan."]);
  });

  it("ignores an hour only a minority even answered", () => {
    // One person logs a 6 AM nobody else tracks; it can't become the team's hour.
    const early = member("Early", [
      [6, 100],
      [9, 100],
      [10, 100],
    ]);
    const plan = buildTeamPlan([early, morning("Amy"), morning("Ann")]);
    expect(plan.protect).not.toContain(6);
  });
});

describe("findSplit", () => {
  it("returns nothing for a single member", () => {
    const one = [morning("Amy")];
    expect(findSplit(one, teamHours(one))).toBeNull();
  });
});

describe("buildTeamPlanIcs", () => {
  const now = new Date("2026-09-30T12:00:00Z"); // a Wednesday
  const plan = buildTeamPlan([morning("Amy"), morning("Ann"), morning("Ada")]);

  it("writes a weekday block for the protected hours", () => {
    const ics = buildTeamPlanIcs({ teamName: "Operations", plan, now })!.replace(/\r\n /g, "");
    expect(ics).toContain("SUMMARY:Operations — protected");
    expect(ics).toContain("DTSTART:20260930T090000");
    expect(ics).toContain("DTEND:20260930T110000");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=20");
  });

  it("writes the meeting block separately", () => {
    const ics = buildTeamPlanIcs({ teamName: "Operations", plan, now })!.replace(/\r\n /g, "");
    expect(ics).toContain("SUMMARY:Operations — meet");
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it("starts on the next weekday rather than a Saturday", () => {
    const saturday = new Date("2026-10-03T12:00:00Z");
    expect(buildTeamPlanIcs({ teamName: "Ops", plan, now: saturday })).toContain("DTSTART:20261005T");
  });

  it("returns null when there's nothing to put in a calendar", () => {
    expect(buildTeamPlanIcs({ teamName: "Ops", plan: buildTeamPlan([]), now })).toBeNull();
  });
});
