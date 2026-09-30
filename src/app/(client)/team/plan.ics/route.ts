import { notFound } from "next/navigation";

import { buildTeamPlanIcs } from "@/lib/team-plan";
import { loadMyTeam, loadReleasedPlan } from "@/lib/teams";
import { requireViewer } from "@/lib/viewer";

/**
 * The team's meeting and protected blocks as a calendar file. Leads only, and
 * only once Jen has released the plan — the same rule as the page.
 */
export async function GET() {
  const { supabase, user } = await requireViewer("/team");

  const mine = await loadMyTeam(supabase, user.id);
  if (!mine || mine.role !== "lead") notFound();

  const released = await loadReleasedPlan(supabase, mine.team.id);
  if (!released) notFound();

  const ics = buildTeamPlanIcs({ teamName: mine.team.name, plan: released.plan });
  if (!ics) notFound();

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="TeamPeakPlan.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
