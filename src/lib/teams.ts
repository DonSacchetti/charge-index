import "server-only";

import { randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { fetchAll } from "@/lib/fetch-all";
import { analyseSession } from "@/lib/session-data";
import { type TeamMember, type TeamPlan, buildTeamPlan } from "@/lib/team-plan";

type Db = SupabaseClient<Database>;

/**
 * Corporate teams — Planning/Corporate Build Plan.md.
 *
 * Jen creates a company and a team, sends the lead's single-use link, and once
 * the company has paid she sets the seat count, which is what makes the member
 * link work. Everything a lead can see about their people comes from a
 * progress view, never from this data.
 */

/** Unguessable, short enough to paste into an email without wrapping. */
export function inviteToken(): string {
  return randomBytes(18).toString("base64url");
}

export function inviteUrl(origin: string, token: string): string {
  return `${origin}/join/${token}`;
}

export type CompanyRow = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
};

export type TeamRow = {
  id: string;
  company_id: string;
  name: string;
  seats: number;
  lead_id: string | null;
  created_at: string;
};

export type RoundRow = {
  id: string;
  team_id: string;
  number: number;
  status: "setup" | "tracking" | "released";
  released_at: string | null;
  created_at: string;
};

/** Companies with their teams, for Jen's corporate list. */
export async function loadCompanies(supabase: Db) {
  const [companies, teams, memberships, rounds] = await Promise.all([
    fetchAll((from, to) => supabase.from("companies").select("id, name, notes, created_at").order("name").range(from, to)),
    fetchAll((from, to) =>
      supabase.from("teams").select("id, company_id, name, seats, lead_id, created_at").order("name").range(from, to),
    ),
    fetchAll((from, to) => supabase.from("team_memberships").select("team_id, client_id, role").order("id").range(from, to)),
    fetchAll((from, to) =>
      supabase.from("team_rounds").select("id, team_id, number, status, released_at, created_at").order("number").range(from, to),
    ),
  ]);

  return companies.map((company) => {
    const own = teams.filter((t) => t.company_id === company.id);
    return {
      ...company,
      teams: own.map((team) => ({
        ...team,
        members: memberships.filter((m) => m.team_id === team.id),
        rounds: rounds.filter((r) => r.team_id === team.id),
      })),
    };
  });
}

export type CompanyWithTeams = Awaited<ReturnType<typeof loadCompanies>>[number];

/** The team a client belongs to, if any — used by the client-side screens. */
export async function loadMyTeam(supabase: Db, clientId: string) {
  const { data: membership } = await supabase
    .from("team_memberships")
    .select("team_id, role")
    .eq("client_id", clientId)
    .maybeSingle();
  if (!membership) return null;

  const [{ data: team }, { data: rounds }] = await Promise.all([
    supabase.from("teams").select("id, name, seats, lead_id, company_id").eq("id", membership.team_id).single(),
    supabase
      .from("team_rounds")
      .select("id, team_id, number, status, released_at, created_at")
      .eq("team_id", membership.team_id)
      .order("number", { ascending: false }),
  ]);
  if (!team) return null;

  return {
    team,
    role: membership.role as "lead" | "member",
    rounds: (rounds ?? []) as RoundRow[],
    currentRound: (rounds ?? []).find((r) => r.status === "tracking") ?? null,
  };
}

/** One member's progress, as team_progress() returns it. */
export type TeamProgressRow = {
  client_id: string;
  full_name: string | null;
  role: "lead" | "member";
  joined_at: string;
  session_id: string | null;
  session_status: string | null;
  day_count: number;
  hours_per_day: number;
  hours_logged: number;
  days_complete: number;
  missed_hours: number;
  flagged: boolean;
};

/**
 * The roster for a team. Computed in the database so a lead never touches the
 * entries behind it; the function refuses anyone who isn't that team's lead
 * or a coach.
 */
export async function loadTeamProgress(supabase: Db, teamId: string): Promise<TeamProgressRow[]> {
  const { data, error } = await supabase.rpc("team_progress", { p_team: teamId });
  if (error) return [];
  return (data ?? []) as TeamProgressRow[];
}

/**
 * Build a team's plan from everyone's week. Only a coach can run this: it
 * reads the members' entries, which is exactly what a lead may not do. The
 * result is stored by the release action and read back from there.
 */
export async function computeTeamPlan(supabase: Db, roundId: string): Promise<TeamPlan> {
  const sessions = await fetchAll((from, to) =>
    supabase
      .from("tracking_sessions")
      .select("id, client_id, wake_time, sleep_time, day_count, profiles(full_name)")
      .eq("round_id", roundId)
      .order("id")
      .range(from, to),
  );
  if (!sessions.length) return buildTeamPlan([]);

  const entries = await fetchAll((from, to) =>
    supabase
      .from("daily_entries")
      .select("session_id, day_number, slot_hour, energy_pct")
      .in("session_id", sessions.map((s) => s.id))
      .order("id")
      .range(from, to),
  );

  const members: TeamMember[] = sessions.map((session) => {
    const own = entries.filter((e) => e.session_id === session.id);
    const analysis = analyseSession(session, own, []);
    return {
      clientId: session.client_id,
      name: session.profiles?.full_name ?? null,
      map: analysis.map,
      hoursLogged: analysis.entries.length,
    };
  });

  return buildTeamPlan(members);
}

/** The plan a team has been given, if Jen has released one. */
export async function loadReleasedPlan(supabase: Db, teamId: string) {
  const { data } = await supabase
    .from("team_plans")
    .select("round_id, plan, released_at, team_rounds(number)")
    .eq("team_id", teamId)
    .order("released_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    roundId: data.round_id,
    roundNumber: data.team_rounds?.number ?? null,
    releasedAt: data.released_at,
    plan: data.plan as unknown as TeamPlan,
  };
}
