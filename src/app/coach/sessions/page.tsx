import Link from "next/link";

import { Card, CoachShell } from "@/components/CoachShell";
import { fetchAll } from "@/lib/fetch-all";
import { formatHour, hourOf } from "@/lib/slots";
import { requireCoach } from "@/lib/viewer";

/** Every session across all clients, newest first. The roster at /coach groups them by client. */
export default async function AllSessions() {
  const { supabase } = await requireCoach("/coach/sessions");

  // Coach RLS returns every client's sessions. Hours logged are counted in
  // the database, and pages are read past the API's 1,000-row default.
  const sessions = await fetchAll((from, to) =>
    supabase
      .from("tracking_sessions")
      .select(
        "id, client_id, label, day_count, status, start_date, wake_time, sleep_time, profiles(full_name), daily_entries(count)",
      )
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );

  return (
    <CoachShell>
      <div className="aurora animate-rise mb-6 flex flex-wrap items-end justify-between gap-4 rounded-[28px] px-6 py-8 text-white shadow-[0_30px_70px_-35px_rgba(19,36,73,0.8)] sm:px-9">
        <div>
          <div className="text-[11px] font-extrabold tracking-[0.2em] text-gold-bright uppercase">Coach view · not visible to client</div>
          <h1 className="mt-2 font-serif text-[40px] leading-tight font-semibold">All sessions</h1>
          <p className="mt-1 text-[13px] text-white/70">{sessions.length} across every client</p>
        </div>
        <a
          href="/coach/export/sessions.csv"
          className="inline-flex min-h-11 items-center rounded-2xl bg-gold px-5 text-[13.5px] font-extrabold text-navy-deep transition hover:-translate-y-0.5 hover:bg-gold-bright"
        >
          Export all (CSV)
        </a>
      </div>

      <Card className="p-0">
        {!sessions.length ? (
          <p className="p-6 text-[13.5px] text-body">
            No sessions yet. They appear here as soon as a client sets one up.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[10px] font-extrabold tracking-[0.1em] text-muted uppercase">
                  <th className="px-6 py-3">Client</th>
                  <th className="px-3 py-3">Session</th>
                  <th className="px-3 py-3">Started</th>
                  <th className="px-3 py-3">Waking hours</th>
                  <th className="px-3 py-3">Logged</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-[#f0efea] last:border-b-0 hover:bg-[#faf9f7]">
                    <td className="px-6 py-3">
                      <Link href={`/coach/clients/${s.client_id}`} className="font-extrabold text-navy underline">
                        {s.profiles?.full_name || "Unnamed client"}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/coach/sessions/${s.id}`} className="font-bold text-navy underline">
                        {s.label ?? "Untitled session"}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-body">{s.start_date}</td>
                    <td className="px-3 py-3 text-body">
                      {formatHour(hourOf(s.wake_time))} – {formatHour(hourOf(s.sleep_time))}
                    </td>
                    <td className="px-3 py-3 text-body">
                      {s.daily_entries[0]?.count ?? 0} hrs · {s.day_count} days
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-[9px] py-[3px] text-[10.5px] font-extrabold ${
                          s.status === "completed"
                            ? "bg-[#eaf5ef] text-level-100"
                            : "bg-[#eaf0fb] text-level-75"
                        }`}
                      >
                        {s.status === "completed" ? "Complete" : "In progress"}
                      </span>
                    </td>
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
