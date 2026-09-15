import { notFound } from "next/navigation";

import { buildPeakPlanIcs, exportFilename } from "@/lib/peak-plan";
import { loadSessionAnalysis } from "@/lib/session-data";
import { canViewPeakPlan, requireViewer } from "@/lib/viewer";

/** The Peak Plan's calendar file — same access rule as the plan itself. */
export async function GET(_request: Request, { params }: RouteContext<"/plan/[sessionId]/peak-plan.ics">) {
  const { sessionId } = await params;
  const viewer = await requireViewer(`/plan/${sessionId}`);

  const data = await loadSessionAnalysis(viewer.supabase, sessionId);
  if (!data || !(await canViewPeakPlan(viewer, data.session))) notFound();

  const ics = buildPeakPlanIcs({ peak: data.windows.peak, sessionId });
  if (!ics) notFound();

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(data.clientName, "PeakPlan.ics")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
