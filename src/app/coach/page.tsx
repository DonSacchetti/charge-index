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
  const all = buildRoster(data.profiles, data.sessions, data.draftSessionIds, data.noteClientIds, data.entryStats);
  const clients = filterRoster(all, query);
  const active = all.filter((c) => c.latest?.status === "in_progress").length;
  // Clients logging 100% nearly every hour — Jen wants these visible (2026-09-24).
  const flagged = all.filter((c) => c.flatTop).length;

  return (
    <CoachShell>
      <div className="aurora animate-rise mb-6 rounded-[28px] px-6 py-8 text-white shadow-[0_30px_70px_-35px_rgba(19,36,73,0.8)] sm:px-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-extrabold tracking-[0.2em] text-gold-bright uppercase">Coach view · not visible to client</div>
            <h1 className="mt-2 font-serif text-[40px] leading-tight font-semibold">Clients</h1>
          </div>
          <a
            href="/coach/export/sessions.csv"
            className="inline-flex min-h-11 items-center rounded-2xl bg-gold px-5 text-[13.5px] font-extrabold text-navy-deep transition hover:-translate-y-0.5 hover:bg-gold-bright"
          >
            Export all (CSV)
          </a>
        </div>
        <dl className="m-0 mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: all.length === 1 ? "client" : "clients", value: all.length, level: 75 },
            { label: data.sessions.length === 1 ? "session" : "sessions", value: data.sessions.length, level: 100 },
            { label: "tracking now", value: active, level: 25 },
            { label: flagged === 1 ? "to review" : "to review", value: flagged, level: 10 },
          ].map((s, i) => (
            <div key={s.label} className="animate-rise rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-4 backdrop-blur" style={{ animationDelay: `${120 + i * 70}ms` }}>
              <dd className="m-0 font-serif text-[34px] leading-none font-semibold" style={{ color: `var(--color-glow-${s.level})` }}>
                {s.value}
              </dd>
              <dt className="mt-2 text-[12px] font-bold text-white/70">{s.label}</dt>
            </div>
          ))}
        </dl>
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
          className="w-full max-w-sm rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 text-[14px] text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/20"
        />
        <button type="submit" className="rounded-2xl bg-navy px-5 text-[13.5px] font-extrabold text-white transition hover:bg-navy-light">
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
                      {c.flatTop ? (
                        <span
                          className="ml-2 rounded-full bg-level-100/12 px-[7px] py-[2px] text-[10px] font-extrabold tracking-[0.05em] text-level-100 uppercase"
                          title={`${c.hoursLogged} hours logged, nearly all at 100% — worth a coaching call about energy vs brain activity`}
                        >
                          ⚡ always 100%
                        </span>
                      ) : null}
                      {c.role !== "client" ? (
                        <span className="ml-2 rounded-full bg-[#f4ecdf] px-[7px] py-[2px] text-[10px] font-extrabold tracking-[0.05em] text-gold-deep uppercase">
                          {c.role}
                        </span>
                      ) : null}
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
