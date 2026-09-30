import "server-only";

import { randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { fetchAll } from "@/lib/fetch-all";

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
