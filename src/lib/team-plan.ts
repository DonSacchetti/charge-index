/**
 * The team Peak Plan — Planning/Corporate Build Plan.md, stage 3.
 *
 * A company doesn't want an average of its people: averaging a morning person
 * and an afternoon person describes nobody. What a team needs to know is when
 * enough of them are sharp at the same time.
 *
 * So every hour is scored by how many of the team are in each band, and the
 * plan is built from the hours where a majority agree:
 *
 *   protect  — most of the team is at peak: the hours to leave alone for the
 *              work only each person can do
 *   meet     — most of the team is at least dynamic: the hours to put people
 *              in a room together
 *   avoid    — most of the team is in recovery: schedule nothing that matters
 *
 * Plus the split: when the team's peaks fall into two camps hours apart,
 * that's usually the most useful sentence in the document, and the one Jen
 * coaches around.
 *
 * The three numbers below are starting points, not findings — Jen will move
 * them once she's seen real teams (noted in the build plan).
 */

import { compareAxis } from "@/lib/compare";
import { escapeIcsText, foldIcsLine, icsFloating, icsUtcStamp } from "@/lib/peak-plan";
import { formatHour } from "@/lib/slots";
import {
  BANDS,
  MIN_HOURS_FOR_RESULT,
  type HourAverage,
  capHours,
  formatRanges,
  hourRuns,
  topHours,
} from "@/lib/weekly-map";

/** How much of the team has to agree before an hour counts. */
export const TEAM_MAJORITY = 0.6;

/** Two peak clusters this far apart are worth calling a split. */
export const SPLIT_GAP_HOURS = 3;

/** Meeting blocks stay short, like the individual collaboration window. */
export const MAX_MEETING_HOURS = 4;

export type TeamMember = {
  clientId: string;
  name: string | null;
  /** Their own hourly averages, from analyseSession. */
  map: HourAverage[];
  hoursLogged: number;
};

export type TeamHour = {
  hour: number;
  /** Members with data for this hour. */
  answered: number;
  peakShare: number;
  readyShare: number;
  recoveryShare: number;
  /** Mean of the members' own averages, to 2dp. */
  avgPct: number | null;
};

export type TeamPlan = {
  /** Members whose own data was strong enough to include. */
  included: { clientId: string; name: string | null; peak: number[] }[];
  /** Members left out, and why. */
  excluded: { clientId: string; name: string | null; hoursLogged: number }[];
  hours: TeamHour[];
  protect: number[];
  meet: number[];
  avoid: number[];
  split: { early: number[]; late: number[]; gap: number } | null;
  /** Sentences for the plan, built from whatever was actually found. */
  headlines: string[];
};

/**
 * A member is in the analysis once their own week clears the same floor an
 * individual result needs (35 hours). Below that their curve is noise, and
 * noise from one person shouldn't move a whole company's schedule — the lead's
 * roster flag is what chases them.
 */
export function splitByData(members: TeamMember[]) {
  const included = members.filter((m) => m.hoursLogged >= MIN_HOURS_FOR_RESULT);
  const excluded = members.filter((m) => m.hoursLogged < MIN_HOURS_FOR_RESULT);
  return { included, excluded };
}

export function teamHours(members: TeamMember[]): TeamHour[] {
  const axis = compareAxis(members.map((m) => m.map));
  return axis.map((hour) => {
    const values = members
      .map((m) => m.map.find((h) => h.hour === hour)?.avgPct ?? null)
      .filter((v): v is number => v !== null);
    const share = (test: (v: number) => boolean) => (values.length ? values.filter(test).length / values.length : 0);
    return {
      hour,
      answered: values.length,
      peakShare: share(BANDS.peak),
      // "Ready to be in a room": anything at or above the collaboration band.
      readyShare: share((v) => v >= 62),
      recoveryShare: share(BANDS.recovery),
      avgPct: values.length
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
        : null,
    };
  });
}

/** Hours where enough of the team answered and enough of them agree. */
function majorityHours(hours: TeamHour[], pick: (h: TeamHour) => number, teamSize: number): number[] {
  return hours
    .filter((h) => h.answered >= Math.ceil(teamSize / 2) && pick(h) >= TEAM_MAJORITY)
    .map((h) => h.hour);
}

/**
 * Two camps: members whose own peak hours sit early against those sitting
 * late. Reported only when the gap is wide enough to schedule around.
 */
export function findSplit(included: TeamMember[], hours: TeamHour[]): TeamPlan["split"] {
  const order = new Map(hours.map((h, i) => [h.hour, i]));
  const peaks = included
    .map((m) => ({ member: m, peak: topHours(m.map) }))
    .filter((p) => p.peak.length > 0);
  if (peaks.length < 2) return null;

  const position = (p: (typeof peaks)[number]) =>
    p.peak.reduce((sum, h) => sum + (order.get(h) ?? 0), 0) / p.peak.length;

  const sorted = [...peaks].sort((a, b) => position(a) - position(b));
  // The widest gap between neighbours is where the team divides, if anywhere.
  let cut = -1;
  let widest = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = position(sorted[i + 1]) - position(sorted[i]);
    if (gap > widest) {
      widest = gap;
      cut = i;
    }
  }
  if (cut === -1 || widest < SPLIT_GAP_HOURS) return null;

  return {
    early: sorted.slice(0, cut + 1).flatMap((p) => p.peak),
    late: sorted.slice(cut + 1).flatMap((p) => p.peak),
    gap: Math.round(widest),
  };
}

export function buildTeamPlan(members: TeamMember[]): TeamPlan {
  const { included, excluded } = splitByData(members);
  const hours = teamHours(included);
  const size = included.length;

  const protect = majorityHours(hours, (h) => h.peakShare, size);
  const meetAll = majorityHours(hours, (h) => h.readyShare, size);
  const avoid = majorityHours(hours, (h) => h.recoveryShare, size);

  // Keep the strongest meeting hours, and never propose a meeting in an hour
  // the team should be protecting for deep work.
  const meetMap: HourAverage[] = hours.map((h) => ({ hour: h.hour, avgPct: h.readyShare * 100, daysAnswered: h.answered }));
  const meet = capHours(
    meetMap,
    meetAll.filter((h) => !protect.includes(h)),
    MAX_MEETING_HOURS,
  );

  const split = findSplit(included, hours);

  const headlines: string[] = [];
  if (!size) {
    headlines.push("Nobody has logged enough yet for a team plan.");
  } else {
    headlines.push(
      protect.length
        ? `Protect ${formatRanges(protect)} — most of the team is at their sharpest.`
        : "No hour found the whole team at peak together. Protect each person's own hours instead.",
    );
    if (meet.length) headlines.push(`Meet in ${formatRanges(meet)}, when enough of the team is ready to talk.`);
    if (avoid.length) headlines.push(`Schedule nothing that matters in ${formatRanges(avoid)}.`);
    if (split) {
      headlines.push(
        `Your team splits: some peak around ${formatHour(split.early[0])}, others around ${formatHour(
          split.late[0],
        )}. One meeting time won't suit both — alternate it, or split the work.`,
      );
    }
    if (excluded.length) {
      headlines.push(
        `${excluded.length} ${excluded.length === 1 ? "person" : "people"} logged too little to include.`,
      );
    }
  }

  return {
    included: included.map((m) => ({ clientId: m.clientId, name: m.name, peak: topHours(m.map) })),
    excluded: excluded.map((m) => ({ clientId: m.clientId, name: m.name, hoursLogged: m.hoursLogged })),
    hours,
    protect,
    meet,
    avoid,
    split,
    headlines,
  };
}

/**
 * The team's week as a calendar file: the hours to meet in and the hours to
 * protect, each as its own weekday block. Floating times, like every other
 * calendar file here, so an hour means the same wherever someone sits.
 */
export function buildTeamPlanIcs({
  teamName,
  plan,
  now = new Date(),
}: {
  teamName: string;
  plan: TeamPlan;
  now?: Date;
}): string | null {
  const blocks = [
    ...hourRuns(plan.meet).map((run) => ({ run, summary: `${teamName} — meet`, detail: "Enough of the team is ready to be in a room together. From your team's Peak Plan." })),
    ...hourRuns(plan.protect).map((run) => ({ run, summary: `${teamName} — protected`, detail: "Most of the team is at their sharpest. Deep work, no meetings. From your team's Peak Plan." })),
  ];
  if (!blocks.length) return null;

  const day0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  while (day0.getUTCDay() === 0 || day0.getUTCDay() === 6) day0.setUTCDate(day0.getUTCDate() + 1);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Soenen Strategies//Team Peak Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(`${teamName} — Peak Plan`)}`,
  ];

  blocks.forEach((block, i) => {
    const start = new Date(day0.getTime() + block.run[0] * 3_600_000);
    const end = new Date(start.getTime() + block.run.length * 3_600_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:team-plan-${i}-${block.run[0]}@charge-index`,
      `DTSTAMP:${icsUtcStamp(now)}`,
      `DTSTART:${icsFloating(start)}`,
      `DTEND:${icsFloating(end)}`,
      "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=20",
      `SUMMARY:${escapeIcsText(block.summary)}`,
      `DESCRIPTION:${escapeIcsText(block.detail)}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
