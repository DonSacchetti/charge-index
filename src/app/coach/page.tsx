import Link from "next/link";

import { Card, CoachShell } from "@/components/CoachShell";
import { loadRosterData } from "@/lib/coach-data";
import { buildRoster, filterRoster } from "@/lib/roster";
import { requireCoach } from "@/lib/viewer";

/**
 * The coach roster — Build Plan Phase 10. Every client in one place, most
 * recent activity first, searchable by name or email.
 */
export default async function CoachRoster({ searchParams }: PageProps<"/coach">) {
  const { supabase } = await requireCoach("/coach");
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";

  const data = await loadRosterData(supabase);
  const all = buildRoster(data.profiles, data.sessions, data.draftSessionIds, data.noteClientIds);
  const clients = filterRoster(all, query);
  const active = all.filter((c) => c.latest?.status === "in_progress").length;

  return (
    <CoachShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-extrabold tracking-[0.15em] text-muted uppercase">
            Coach view · not visible to client
          </div>
          <h1 className="mt-2 font-serif text-[30px] leading-tight font-semibold text-navy">Clients</h1>
          <p className="mt-1 text-[12.5px] text-muted">
            {all.length} {all.length === 1 ? "client" : "clients"} · {data.sessions.length}{" "}
            {data.sessions.length === 1 ? "session" : "sessions"} · {active} tracking now
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/coach/sessions" className="text-[12.5px] font-bold text-navy underline">
            All sessions
          </Link>
          <a
            href="/coach/export/sessions.csv"
            className="rounded-[10px] bg-gold px-4 py-[11px] text-[12.5px] font-extrabold text-white hover:bg-gold-deep"
          >
            Export all (CSV)
          </a>
        </div>
      </div>

      <form className="mb-4 flex gap-2" role="search">
        <label htmlFor="roster-search" className="sr-only">
          Search clients
        </label>
        <input
          id="roster-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search by name or email"
          className="w-full max-w-sm rounded-[11px] border-[1.5px] border-line bg-white px-[14px] py-[10px] text-[14px] text-ink outline-none focus:border-navy"
        />
        <button type="submit" className="rounded-[11px] bg-navy px-4 text-[13px] font-extrabold text-white hover:bg-navy-light">
          Search
        </button>
      </form>

      <Card className="p-0">
        {clients.length === 0 ? (
          <p className="p-6 text-[13.5px] text-body">
            {query ? `No clients match “${query}”.` : "No clients yet. They appear here as soon as someone signs up."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">
                  <th className="px-6 py-3">Client</th>
                  <th className="px-3 py-3">Latest session</th>
                  <th className="px-3 py-3">Sessions</th>
                  <th className="px-3 py-3">AI drafts</th>
                  <th className="px-6 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-[#f0efea] last:border-b-0 hover:bg-[#faf9f7]">
                    <td className="px-6 py-3">
                      <Link href={`/coach/clients/${c.id}`} className="font-extrabold text-navy underline">
                        {c.name}
                      </Link>
                      <div className="text-[11.5px] text-muted">{c.email ?? "—"}</div>
                    </td>
                    <td className="px-3 py-3 text-body">
                      {c.latest ? (
                        <>
                          <Link href={`/coach/sessions/${c.latest.id}`} className="font-bold text-navy underline">
                            {c.latest.label || "Untitled session"}
                          </Link>
                          <span
                            className={`ml-2 rounded-full px-[8px] py-[2px] text-[10px] font-extrabold ${
                              c.latest.status === "completed" ? "bg-[#eaf5ef] text-level-100" : "bg-[#eaf0fb] text-level-75"
                            }`}
                          >
                            {c.latest.status === "completed" ? "Complete" : "In progress"}
                          </span>
                          <div className="text-[11.5px] text-muted">Started {c.latest.start_date}</div>
                        </>
                      ) : (
                        <span className="text-muted">No sessions yet</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-body">
                      {c.sessionCount}
                      {c.sessionCount ? <span className="text-muted"> ({c.completedCount} complete)</span> : null}
                    </td>
                    <td className="px-3 py-3 text-body">{c.draftCount}</td>
                    <td className="px-6 py-3 text-body">{c.noteCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </CoachShell>
  );
}
