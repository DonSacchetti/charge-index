import { notFound } from "next/navigation";

import { csvCell, exportFilename } from "@/lib/peak-plan";
import { loadTeamProgress } from "@/lib/teams";
import { requireCoach } from "@/lib/viewer";

/**
 * One row per person across a company's teams: where they are in the round,
 * and whether their hours are slipping. Jen's working file for a check-in
 * call with the team lead.
 */
export async function GET(_request: Request, { params }: RouteContext<"/coach/companies/[companyId]/progress.csv">) {
  const { companyId } = await params;
  const { supabase } = await requireCoach(`/coach/companies/${companyId}`);

  const [{ data: company }, { data: teams }] = await Promise.all([
    supabase.from("companies").select("name").eq("id", companyId).maybeSingle(),
    supabase.from("teams").select("id, name, seats").eq("company_id", companyId).order("name"),
  ]);
  if (!company) notFound();

  const header = ["Team", "Seats", "Person", "Role", "Joined", "Status", "Days complete", "Days", "Hours logged", "Hours closed unlogged", "Flagged"];
  const lines: (string | number)[][] = [header];

  for (const team of teams ?? []) {
    for (const row of await loadTeamProgress(supabase, team.id)) {
      lines.push([
        team.name,
        team.seats,
        row.full_name ?? "",
        row.role,
        row.joined_at.slice(0, 10),
        row.session_id ? (row.session_status === "completed" ? "Finished" : "Tracking") : "Not started",
        row.days_complete,
        row.day_count,
        row.hours_logged,
        row.missed_hours,
        row.flagged ? "yes" : "",
      ]);
    }
  }

  const csv = "﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(company.name, "team_progress.csv")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
