import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CoachShell } from "@/components/CoachShell";
import { NoteForm } from "@/components/coach/NoteForm";
import { loadSessionBundles } from "@/lib/coach-data";
import { formatHour } from "@/lib/slots";
import { requireCoach } from "@/lib/viewer";
import { formatWindow } from "@/lib/weekly-map";

import { deleteNote } from "./actions";

/** One client: every session with its headline numbers, Jen's notes, and exports. */
export default async function CoachClientPage({ params }: PageProps<"/coach/clients/[clientId]">) {
  const { clientId } = await params;
  const { supabase, user } = await requireCoach(`/coach/clients/${clientId}`);

  const [{ data: client }, bundles, { data: notes }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, created_at, role").eq("id", clientId).maybeSingle(),
    loadSessionBundles(supabase, clientId),
    supabase
      .from("coach_notes")
      .select("id, body, created_at, session_id, author_id, author:profiles!coach_notes_author_id_fkey(full_name)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
  ]);

  if (!client || client.role !== "client") notFound();

  const name = client.full_name?.trim() || "Unnamed client";
  const sessionLabel = new Map(bundles.map((b) => [b.session.id, b.session.label || "Untitled session"]));
  const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });

  return (
    <CoachShell>
      <Link href="/coach" className="text-[12px] font-bold text-muted underline">
        ← Clients
      </Link>

      <div className="mt-3 mb-5 flex flex-wrap items-end justify-between gap-5 rounded-[20px] bg-[linear-gradient(150deg,#0b1533,#132449_65%,#24417e)] px-[30px] py-7 text-white">
        <div className="min-w-0 wrap-anywhere">
          <div className="mb-[7px] text-[10px] font-extrabold tracking-[0.15em] text-white/50 uppercase">
            Coach view · not visible to client
          </div>
          <h1 className="font-serif text-[30px] leading-[1.15] font-semibold">{name}</h1>
          <p className="mt-[7px] text-[13.5px] text-white/75">
            {client.email ?? "No email"} · joined {client.created_at.slice(0, 10)} · {bundles.length}{" "}
            {bundles.length === 1 ? "session" : "sessions"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/coach/clients/${clientId}/summary.csv`}
            className="rounded-[10px] border-[1.5px] border-white/30 bg-white/10 px-4 py-[10px] text-[12.5px] font-extrabold text-white hover:bg-white/20"
          >
            Summary (CSV)
          </a>
          {bundles.length ? (
            <a
              href={`/coach/clients/${clientId}/sessions.zip`}
              className="rounded-[10px] bg-gold px-4 py-[11px] text-[12.5px] font-extrabold text-white hover:bg-gold-deep"
            >
              All session data (ZIP)
            </a>
          ) : null}
        </div>
      </div>

      <Card className="mb-5 p-0">
        <h2 className="px-6 pt-5 pb-3 font-serif text-[18px] font-semibold text-navy">Sessions</h2>
        {bundles.length === 0 ? (
          <p className="px-6 pb-6 text-[13.5px] text-body">No sessions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-y border-line text-[10px] font-extrabold tracking-[0.08em] text-muted uppercase">
                  <th className="px-6 py-3">Session</th>
                  <th className="px-3 py-3">Waking</th>
                  <th className="px-3 py-3">Covered</th>
                  <th className="px-3 py-3">Peak</th>
                  <th className="px-3 py-3">Collaboration</th>
                  <th className="px-3 py-3">Recovery</th>
                  <th className="px-3 py-3">AI energy type</th>
                  <th className="px-6 py-3">Open</th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((b) => (
                  <tr key={b.session.id} className="border-b border-[#f0efea] last:border-b-0">
                    <td className="px-6 py-3">
                      <Link href={`/coach/sessions/${b.session.id}`} className="font-extrabold text-navy underline">
                        {b.session.label || "Untitled session"}
                      </Link>
                      <div className="text-[11px] text-muted">
                        {b.session.start_date} · {b.session.status === "completed" ? "Complete" : "In progress"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-body">
                      {formatHour(b.wake)} – {formatHour(b.sleep)}
                    </td>
                    <td className="px-3 py-3 text-body">
                      {b.consistency.coveragePct}%
                      <div className="text-[11px] text-muted">
                        {b.consistency.completeDays}/{b.session.day_count} days full
                      </div>
                    </td>
                    <td className="px-3 py-3 text-body">{formatWindow(b.windows.peak)}</td>
                    <td className="px-3 py-3 text-body">{formatWindow(b.windows.collaboration)}</td>
                    <td className="px-3 py-3 text-body">{formatWindow(b.windows.recovery)}</td>
                    <td className="px-3 py-3 text-body">{b.energyType ?? "—"}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <Link href={`/plan/${b.session.id}`} className="font-bold text-navy underline">
                        Plan
                      </Link>
                      <span className="text-muted"> · </span>
                      <a href={`/coach/sessions/${b.session.id}/export.csv`} className="font-bold text-navy underline">
                        CSV
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 font-serif text-[18px] font-semibold text-navy">Coach notes</h2>
        <p className="mb-4 text-[12px] text-muted">Private to coaches. Clients never see these.</p>
        <NoteForm clientId={clientId} sessions={bundles.map((b) => ({ id: b.session.id, label: b.session.label || "Untitled session" }))} />

        {notes?.length ? (
          <ol className="m-0 mt-6 flex list-none flex-col gap-4 p-0">
            {notes.map((n) => (
              <li key={n.id} className="border-t border-[#f0efea] pt-4">
                <div className="mb-[6px] flex flex-wrap items-baseline justify-between gap-2 text-[11.5px] text-muted">
                  <span className="min-w-0 wrap-anywhere">
                    <strong className="text-navy">{n.author?.full_name || "A coach"}</strong> · {when(n.created_at)}
                    {n.session_id ? ` · about ${sessionLabel.get(n.session_id) ?? "a session"}` : ""}
                  </span>
                  {n.author_id === user.id ? (
                    <form action={deleteNote.bind(null, clientId, n.id)}>
                      <button
                        type="submit"
                        className="-mx-2 -my-2 inline-flex min-h-9 items-center px-2 font-bold text-muted underline hover:text-level-10"
                      >
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>
                <p className="m-0 text-[13.5px] leading-[1.65] whitespace-pre-wrap text-body">{n.body}</p>
              </li>
            ))}
          </ol>
        ) : null}
      </Card>
    </CoachShell>
  );
}
