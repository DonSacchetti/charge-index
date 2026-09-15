import Link from "next/link";
import { notFound } from "next/navigation";

import { ChargeCurve } from "@/components/ChargeCurve";
import { Card, CoachShell } from "@/components/CoachShell";
import { type CompareSeries, CompareCurve } from "@/components/coach/CompareCurve";
import { ConsistencyCard } from "@/components/coach/ConsistencyCard";
import { IdealDayCard } from "@/components/coach/IdealDayCard";
import { InsightsCard } from "@/components/coach/InsightsCard";
import { ZoneCards } from "@/components/coach/ZoneCards";
import { consistency, idealDay, zoneTopHours } from "@/lib/coach-analysis";
import { alignToAxis, compareAxis } from "@/lib/compare";
import { insightsConfigured } from "@/lib/insights-client";
import { PLAN_WINDOWS } from "@/lib/peak-plan";
import { loadSessionAnalysis } from "@/lib/session-data";
import { formatHour } from "@/lib/slots";
import { requireCoach } from "@/lib/viewer";
import { formatWindow } from "@/lib/weekly-map";

export default async function CoachSessionPage({
  params,
}: PageProps<"/coach/sessions/[sessionId]">) {
  const { sessionId } = await params;
  const { supabase } = await requireCoach(`/coach/sessions/${sessionId}`);

  const data = await loadSessionAnalysis(supabase, sessionId);
  if (!data) notFound();

  const { session, clientName, wake, sleep, hours, map, windows, entries, reflections } = data;
  const hasData = entries.length > 0;

  const { data: savedInsights } = await supabase
    .from("ai_insights")
    .select("energy_type, insights, recommendations, generated_at, model")
    .eq("session_id", session.id)
    .maybeSingle();
  const asStrings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

  // Pattern comparison: this session plus up to three of the client's most
  // recent others, shown oldest first.
  const { data: siblings } = await supabase
    .from("tracking_sessions")
    .select("id")
    .eq("client_id", session.client_id)
    .neq("id", session.id)
    .order("created_at", { ascending: false })
    .limit(3);
  const others = (
    await Promise.all((siblings ?? []).map((s) => loadSessionAnalysis(supabase, s.id)))
  ).filter((o): o is NonNullable<typeof o> => o !== null);
  const compared = [data, ...others].sort(
    (a, b) =>
      a.session.start_date.localeCompare(b.session.start_date) ||
      a.session.created_at.localeCompare(b.session.created_at),
  );
  const axis = compareAxis(compared.map((c) => c.map));
  const series: CompareSeries[] = compared.map((c) => ({
    id: c.session.id,
    label: c.session.label || "Untitled session",
    startDate: c.session.start_date,
    values: alignToAxis(c.map, axis),
    current: c.session.id === session.id,
  }));

  return (
    <CoachShell>
      <Link href={`/coach/clients/${session.client_id}`} className="text-[12px] font-bold text-muted underline">
        ← {clientName || "Client"}
      </Link>

      <div className="mt-3 mb-5 flex flex-wrap items-end justify-between gap-5 rounded-[20px] bg-[linear-gradient(150deg,#0b1533,#132449_65%,#24417e)] px-[30px] py-7 text-white">
        <div className="min-w-0 wrap-anywhere">
          <div className="mb-[7px] text-[10px] font-extrabold tracking-[0.15em] text-white/50 uppercase">
            Coach view · not visible to client
          </div>
          <h1 className="font-serif text-[30px] leading-[1.15] font-semibold">
            {clientName || "Client"} · {session.label || "Session"}
          </h1>
          <p className="mt-[7px] max-w-[560px] text-[13.5px] leading-[1.6] text-white/75">
            {hasData
              ? `${session.day_count} days, ${entries.length} logged hours. Peak window ${formatWindow(windows.peak)}. This is the analysis layer the client never sees.`
              : "Nothing logged yet. The analysis fills in as the client logs their hours."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-right text-[12px] leading-[1.7] text-white/70">
            <div>Started {session.start_date}</div>
            <div>
              Waking {formatHour(wake)} – {formatHour(sleep)}
            </div>
            <div>{session.status === "completed" ? "Complete" : "In progress"}</div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href={`/plan/${session.id}`}
              className="rounded-[10px] border-[1.5px] border-white/30 bg-white/10 px-4 py-[10px] text-[12.5px] font-extrabold text-white hover:bg-white/20"
            >
              Peak Plan
            </Link>
            <a
              href={`/coach/sessions/${session.id}/export.csv`}
              className="rounded-[10px] bg-gold px-4 py-[11px] text-[12.5px] font-extrabold text-white hover:bg-gold-deep"
            >
              Export CSV
            </a>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        {PLAN_WINDOWS.map((w) => (
          <div
            key={w.band}
            className="rounded-[14px] border-[1.5px] p-5"
            style={{ borderColor: w.color, background: w.tint }}
          >
            <div
              className="mb-2 text-[9.5px] font-extrabold tracking-[0.13em] uppercase"
              style={{ color: w.color }}
            >
              {w.label}
            </div>
            <div className="font-serif text-[21px] leading-[1.25] font-semibold text-ink">
              {formatWindow(windows[w.band])}
            </div>
            <p className="mt-2 text-[12px] leading-[1.6] text-body">{w.desc}</p>
          </div>
        ))}
      </div>

      <Card className="mb-5">
        <h2 className="mb-1 font-serif text-[18px] font-semibold text-navy">Charge curve</h2>
        <p className="mb-4 text-[12px] leading-normal text-muted">
          Average charge by hour across the session.
        </p>
        <ChargeCurve map={map} windows={windows} dayCount={session.day_count} />
      </Card>

      <div className="mb-5">
        <InsightsCard
          sessionId={session.id}
          configured={insightsConfigured()}
          hasData={hasData}
          saved={
            savedInsights
              ? {
                  energyType: savedInsights.energy_type,
                  insights: asStrings(savedInsights.insights),
                  recommendations: asStrings(savedInsights.recommendations),
                  generatedAt: savedInsights.generated_at,
                  model: savedInsights.model,
                }
              : null
          }
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <ConsistencyCard data={consistency(entries, hours, session.day_count)} hoursPerDay={hours.length} />
        <IdealDayCard day={idealDay(map)} />
      </div>

      <div className="mb-5">
        <ZoneCards top={zoneTopHours(entries, hours)} />
      </div>

      {compared.length > 1 ? (
        <Card className="mb-5">
          <h2 className="mb-1 font-serif text-[18px] font-semibold text-navy">Compare sessions</h2>
          <p className="mb-4 text-[12px] leading-normal text-muted">
            How this client&rsquo;s average charge has shifted between sessions.
          </p>
          <CompareCurve axis={axis} series={series} />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-[10px] font-extrabold tracking-[0.08em] text-muted uppercase">
                  <th className="py-2 pr-3">Session</th>
                  <th className="py-2 pr-3">Hours logged</th>
                  <th className="py-2 pr-3">Peak</th>
                  <th className="py-2 pr-3">Collaboration</th>
                  <th className="py-2">Recovery</th>
                </tr>
              </thead>
              <tbody>
                {compared.map((c) => (
                  <tr key={c.session.id} className="border-b border-[#f0efea] last:border-b-0">
                    <td className="py-2 pr-3">
                      {c.session.id === session.id ? (
                        <span className="font-extrabold text-navy">{c.session.label || "Untitled session"}</span>
                      ) : (
                        <Link href={`/coach/sessions/${c.session.id}`} className="font-bold text-navy underline">
                          {c.session.label || "Untitled session"}
                        </Link>
                      )}
                      <span className="ml-2 text-muted">{c.session.start_date}</span>
                    </td>
                    <td className="py-2 pr-3 text-body">{c.entries.length}</td>
                    <td className="py-2 pr-3 text-body">{formatWindow(c.windows.peak)}</td>
                    <td className="py-2 pr-3 text-body">{formatWindow(c.windows.collaboration)}</td>
                    <td className="py-2 text-body">{formatWindow(c.windows.recovery)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {reflections.length > 0 ? (
        <Card>
          <h2 className="mb-4 font-serif text-[18px] font-semibold text-navy">Client reflections</h2>
          <div className="flex flex-col gap-4">
            {reflections.map((r) => (
              <div key={r.dayNumber} className="border-b border-[#f0efea] pb-4 last:border-b-0 last:pb-0">
                <div className="mb-[7px] text-[12.5px] font-extrabold text-navy">Day {r.dayNumber}</div>
                <div className="flex flex-col gap-[5px] text-[13px] leading-[1.65] text-body">
                  {r.feel ? (
                    <div>
                      <em className="text-muted">Felt:</em> {r.feel}
                    </div>
                  ) : null}
                  {r.unexpected ? (
                    <div>
                      <em className="text-muted">Unexpected:</em> {r.unexpected}
                    </div>
                  ) : null}
                  {r.forJen ? (
                    <div>
                      <em className="text-muted">For Jen:</em> {r.forJen}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </CoachShell>
  );
}
