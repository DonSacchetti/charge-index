import Link from "next/link";
import { notFound } from "next/navigation";

import { ChargeCurve } from "@/components/ChargeCurve";
import { Card, CoachShell } from "@/components/CoachShell";
import { loadSessionAnalysis } from "@/lib/session-data";
import { formatHour } from "@/lib/slots";
import { requireCoach } from "@/lib/viewer";
import { formatWindow } from "@/lib/weekly-map";

/** Window cards — labels and descriptions verbatim from Jen's prototype. */
const WINDOW_CARDS = [
  {
    band: "peak",
    label: "Fully Charged",
    color: "#2f7d52",
    tint: "#eaf5ef",
    desc: "Guard it like Fort Knox. One hour here is worth two or three anywhere else.",
  },
  {
    band: "collaboration",
    label: "Dynamic",
    color: "#3a6ec4",
    tint: "#eaf0fb",
    desc: "Meetings, stakeholder work, anything that needs you communicating well.",
  },
  {
    band: "recovery",
    label: "Recovery",
    color: "#c04545",
    tint: "#fceaea",
    desc: "Stop fighting this dip. Schedule the recharge instead of pushing through it.",
  },
] as const;

export default async function CoachSessionPage({
  params,
}: PageProps<"/coach/sessions/[sessionId]">) {
  const { sessionId } = await params;
  const { supabase } = await requireCoach(`/coach/sessions/${sessionId}`);

  const data = await loadSessionAnalysis(supabase, sessionId);
  if (!data) notFound();

  const { session, clientName, wake, sleep, map, windows, entries, reflections } = data;
  const hasData = entries.length > 0;

  return (
    <CoachShell>
      <Link href="/coach" className="text-[12px] font-bold text-muted underline">
        ← All sessions
      </Link>

      <div className="mt-3 mb-5 flex flex-wrap items-end justify-between gap-5 rounded-[20px] bg-[linear-gradient(150deg,#0b1533,#132449_65%,#24417e)] px-[30px] py-7 text-white">
        <div>
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
        <div className="text-right text-[12px] leading-[1.7] text-white/70">
          <div>Started {session.start_date}</div>
          <div>
            Waking {formatHour(wake)} – {formatHour(sleep)}
          </div>
          <div>{session.status === "completed" ? "Complete" : "In progress"}</div>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        {WINDOW_CARDS.map((w) => (
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
