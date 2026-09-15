import { loadSessionBundles, toSummaryRow } from "@/lib/coach-data";
import { buildSummaryCsv } from "@/lib/roster";
import { requireCoach } from "@/lib/viewer";

/** Bulk export: one summary row per session, across every client. Coach only. */
export async function GET() {
  const { supabase } = await requireCoach("/coach");
  const bundles = await loadSessionBundles(supabase);
  const csv = buildSummaryCsv(bundles.map(toSummaryRow));
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ChargeIndex_all_sessions_${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
