import { notFound } from "next/navigation";
import { strToU8, zipSync } from "fflate";

import { loadSessionBundles } from "@/lib/coach-data";
import { buildSessionCsv, exportFilename } from "@/lib/peak-plan";
import { requireCoach } from "@/lib/viewer";

/**
 * Every session's detailed CSV for one client, zipped. Each file is built by
 * the same buildSessionCsv() as the single-session export, so they match.
 */
export async function GET(_request: Request, { params }: RouteContext<"/coach/clients/[clientId]/sessions.zip">) {
  const { clientId } = await params;
  const { supabase } = await requireCoach(`/coach/clients/${clientId}`);

  const [{ data: client }, bundles] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", clientId).maybeSingle(),
    loadSessionBundles(supabase, clientId),
  ]);
  if (!client || bundles.length === 0) notFound();

  const files: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  for (const b of bundles) {
    const base = exportFilename(`${b.session.start_date} ${b.session.label || "session"}`, "ChargeIndex");
    let name = `${base}.csv`;
    for (let i = 2; used.has(name); i++) name = `${base}_${i}.csv`;
    used.add(name);
    files[name] = strToU8(
      buildSessionCsv({
        clientName: b.clientName,
        clientEmail: b.clientEmail,
        label: b.session.label,
        dayCount: b.session.day_count,
        hours: b.hours,
        entries: b.entries,
        map: b.map,
        reflections: b.reflections,
      }),
    );
  }

  const zip = zipSync(files, { level: 6 });
  return new Response(zip as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${exportFilename(client.full_name, "ChargeIndex_sessions.zip")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
