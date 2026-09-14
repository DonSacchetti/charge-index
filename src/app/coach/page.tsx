import Link from "next/link";

import { Card, CoachShell } from "@/components/CoachShell";
import { formatHour, hourOf } from "@/lib/slots";
import { requireCoach } from "@/lib/viewer";

/**
 * Every session, newest first — the way into the coach view. A deliberately
 * plain list: the full client roster (grouping by client, notes, bulk export)
 * is Phase 10.
 */
export default async function CoachHome() {
  const { supabase } = await requireCoach("/coach");

  // Coach RLS returns every client's sessions. Hours logged are counted in
  // the database — fetching entry rows to count them would hit the API's
  // 1,000-row default and silently undercount.
  const { data: sessions } = await supabase
    .from("tracking_sessions")
    .select(
      "id, label, day_count, status, start_date, wake_time, sleep_time, profiles(full_name), daily_entries(count)",
    )
    .order("created_at", { ascending: false });

  return (
    <CoachShell>
      <div className="mb-6">
        <div className="text-[10px] font-extrabold tracking-[0.15em] text-muted uppercase">
          Coach view · not visible to client
        </div>
        <h1 className="mt-2 font-serif text-[30px] leading-tight font-semibold text-navy">
          Sessions
        </h1>
      </div>

      <Card className="p-0">
        {!sessions?.length ? (
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
                      <Link
                        href={`/coach/sessions/${s.id}`}
                        className="font-extrabold text-navy underline"
                      >
                        {s.profiles?.full_name || "Unnamed client"}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-body">{s.label ?? "—"}</td>
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
