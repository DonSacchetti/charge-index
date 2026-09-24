import { notFound } from "next/navigation";

import { buildScheduleIcs } from "@/lib/plan-calendar";
import { exportFilename, planSchedule } from "@/lib/peak-plan";
import { loadSessionAnalysis } from "@/lib/session-data";
import { hourOf } from "@/lib/slots";
import { canViewPeakPlan, requireViewer } from "@/lib/viewer";
import { topHours } from "@/lib/weekly-map";

/**
 * The whole Peak Plan schedule as a calendar file, carrying whatever the
 * client wrote against each hour (Josh, 2026-09-24). Same access rule as the
 * plan itself; served inline so a phone hands it to its calendar app.
 */
export async function GET(_request: Request, { params }: RouteContext<"/plan/[sessionId]/schedule.ics">) {
  const { sessionId } = await params;
  const viewer = await requireViewer(`/plan/${sessionId}`);

  const data = await loadSessionAnalysis(viewer.supabase, sessionId);
  if (!data || !(await canViewPeakPlan(viewer, data.session))) notFound();

  const { data: planNotes } = await viewer.supabase
    .from("plan_notes")
    .select("slot_hour, body")
    .eq("session_id", sessionId);
  const noteByHour = new Map((planNotes ?? []).map((n) => [hourOf(n.slot_hour), n.body]));

  const ics = buildScheduleIcs({
    sessionId,
    rows: planSchedule(data.map).map((s) => ({ ...s, note: noteByHour.get(s.hour) ?? null })),
    peak: topHours(data.map),
  });
  if (!ics) notFound();

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${exportFilename(data.clientName, "PeakPlanSchedule.ics")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
