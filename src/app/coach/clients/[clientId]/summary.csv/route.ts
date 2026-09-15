import { notFound } from "next/navigation";

import { loadSessionBundles, toSummaryRow } from "@/lib/coach-data";
import { exportFilename } from "@/lib/peak-plan";
import { buildSummaryCsv } from "@/lib/roster";
import { requireCoach } from "@/lib/viewer";

/** One client's sessions as summary rows. Coach only. */
export async function GET(_request: Request, { params }: RouteContext<"/coach/clients/[clientId]/summary.csv">) {
  const { clientId } = await params;
  const { supabase } = await requireCoach(`/coach/clients/${clientId}`);

  const [{ data: client }, bundles] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", clientId).maybeSingle(),
    loadSessionBundles(supabase, clientId),
  ]);
  // Clients always; coaches and admins only if they've tracked a session.
  if (!client || (client.role !== "client" && bundles.length === 0)) notFound();

  const csv = buildSummaryCsv(bundles.map(toSummaryRow));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(client.full_name, "sessions_summary.csv")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
