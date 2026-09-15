import { notFound } from "next/navigation";

import { buildSessionCsv, exportFilename } from "@/lib/peak-plan";
import { loadSessionAnalysis } from "@/lib/session-data";
import { requireCoach } from "@/lib/viewer";

/** Coach-only CSV of a session: every hour, every day, averages and reflections. */
export async function GET(_request: Request, { params }: RouteContext<"/coach/sessions/[sessionId]/export.csv">) {
  const { sessionId } = await params;
  const { supabase } = await requireCoach(`/coach/sessions/${sessionId}`);

  const data = await loadSessionAnalysis(supabase, sessionId);
  if (!data) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", data.session.client_id)
    .maybeSingle();

  const csv = buildSessionCsv({
    clientName: data.clientName,
    clientEmail: profile?.email ?? null,
    label: data.session.label,
    dayCount: data.session.day_count,
    hours: data.hours,
    entries: data.entries,
    map: data.map,
    reflections: data.reflections,
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(data.clientName, "ChargeIndex.csv")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
