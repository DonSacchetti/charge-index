"use server";

import { revalidatePath } from "next/cache";

import { computeTeamPlan, inviteToken } from "@/lib/teams";
import { requireCoach } from "@/lib/viewer";

export type CompanyState = { error: string } | null;

const MAX_NAME = 120;

/** Jen creates the company; clients never see this side. */
export async function createCompany(_prev: CompanyState, formData: FormData): Promise<CompanyState> {
  const { supabase, user } = await requireCoach("/coach/companies");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the company a name." };
  if (name.length > MAX_NAME) return { error: `Names are limited to ${MAX_NAME} characters.` };

  const { error } = await supabase.from("companies").insert({ name, created_by: user.id });
  if (error) return { error: `The company couldn't be saved: ${error.message}` };

  revalidatePath("/coach/companies");
  return null;
}

/**
 * A team, plus its lead invite in the same step — there's no useful state
 * where a team exists and nobody can claim it.
 */
export async function createTeam(companyId: string, _prev: CompanyState, formData: FormData): Promise<CompanyState> {
  const { supabase } = await requireCoach(`/coach/companies/${companyId}`);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the team a name." };
  if (name.length > MAX_NAME) return { error: `Names are limited to ${MAX_NAME} characters.` };

  const { data: team, error } = await supabase
    .from("teams")
    .insert({ company_id: companyId, name })
    .select("id")
    .single();
  if (error || !team) return { error: `The team couldn't be saved: ${error?.message}` };

  const { error: inviteError } = await supabase.from("team_invites").insert([
    { team_id: team.id, kind: "lead", token: inviteToken() },
    { team_id: team.id, kind: "member", token: inviteToken() },
  ]);
  if (inviteError) return { error: `The team was created but its links weren't: ${inviteError.message}` };

  revalidatePath(`/coach/companies/${companyId}`);
  return null;
}

/**
 * Seats are the payment gate: until the company has paid Jen and she sets a
 * number here, the member link refuses everyone (join_team()).
 */
export async function setSeats(companyId: string, teamId: string, formData: FormData) {
  const { supabase } = await requireCoach(`/coach/companies/${companyId}`);

  const seats = Number(formData.get("seats"));
  if (!Number.isInteger(seats) || seats < 0 || seats > 500) return;

  await supabase.from("teams").update({ seats }).eq("id", teamId);
  revalidatePath(`/coach/companies/${companyId}`);
}

/** Start a round: members can track for it from this point. */
export async function startRound(companyId: string, teamId: string) {
  const { supabase } = await requireCoach(`/coach/companies/${companyId}`);

  const { data: rounds } = await supabase
    .from("team_rounds")
    .select("number, status")
    .eq("team_id", teamId)
    .order("number", { ascending: false });

  // One round runs at a time; a new one closes whatever is still open.
  await supabase.from("team_rounds").update({ status: "released" }).eq("team_id", teamId).eq("status", "tracking");

  const next = (rounds?.[0]?.number ?? 0) + 1;
  await supabase.from("team_rounds").insert({ team_id: teamId, number: next, status: "tracking" });

  revalidatePath(`/coach/companies/${companyId}`);
}

/** Jen's own notes about a company — the corporate equivalent of coach notes. */
export async function saveCompanyNotes(companyId: string, _prev: CompanyState, formData: FormData): Promise<CompanyState> {
  const { supabase } = await requireCoach(`/coach/companies/${companyId}`);

  const notes = String(formData.get("notes") ?? "").trim();
  if (notes.length > 10000) return { error: "Notes are limited to 10,000 characters." };

  const { error } = await supabase.from("companies").update({ notes: notes || null }).eq("id", companyId);
  if (error) return { error: `Couldn't save: ${error.message}` };

  revalidatePath(`/coach/companies/${companyId}`);
  return null;
}

/** Remove a team and everything under it. Rounds, invites and plans cascade. */
export async function deleteTeam(companyId: string, teamId: string) {
  const { supabase } = await requireCoach(`/coach/companies/${companyId}`);
  await supabase.from("teams").delete().eq("id", teamId);
  revalidatePath(`/coach/companies/${companyId}`);
}

/** Delete a company and everything under it. Teams and rounds cascade. */
export async function deleteCompany(companyId: string) {
  const { supabase } = await requireCoach("/coach/companies");
  await supabase.from("companies").delete().eq("id", companyId);
  revalidatePath("/coach/companies");
}

/**
 * Release a team's plan (Jen's call, always by hand). The plan is computed
 * here, from data only she can read, and stored — so the lead reads a result
 * rather than the hours behind it, and a plan a company has been given can't
 * shift under them afterwards.
 */
export async function releaseTeamPlan(companyId: string, teamId: string, roundId: string) {
  const { supabase, user } = await requireCoach(`/coach/companies/${companyId}`);

  const plan = await computeTeamPlan(supabase, roundId);
  const { error } = await supabase.from("team_plans").upsert(
    {
      round_id: roundId,
      team_id: teamId,
      // The plan is plain data; Postgres stores it as jsonb either way.
      plan: JSON.parse(JSON.stringify(plan)),
      released_at: new Date().toISOString(),
      released_by: user.id,
    },
    { onConflict: "round_id" },
  );
  if (error) return;

  await supabase
    .from("team_rounds")
    .update({ status: "released", released_at: new Date().toISOString(), released_by: user.id })
    .eq("id", roundId);

  revalidatePath(`/coach/companies/${companyId}`);
  revalidatePath("/team");
}

/** Take a plan back — it stops being visible to the lead immediately. */
export async function withdrawTeamPlan(companyId: string, roundId: string) {
  const { supabase } = await requireCoach(`/coach/companies/${companyId}`);
  await supabase.from("team_plans").delete().eq("round_id", roundId);
  await supabase.from("team_rounds").update({ status: "tracking", released_at: null }).eq("id", roundId);
  revalidatePath(`/coach/companies/${companyId}`);
  revalidatePath("/team");
}
