import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/PrintButton";
import { PLAN_WINDOWS, planGuards, planSchedule } from "@/lib/peak-plan";
import { loadSessionAnalysis } from "@/lib/session-data";
import { formatHourLong } from "@/lib/slots";
import { canViewPeakPlan, requireViewer } from "@/lib/viewer";
import { formatWindow } from "@/lib/weekly-map";

export const metadata = { title: "The Peak Plan™ | Soenen Strategies" };

/**
 * The Peak Plan™ one-pager, built to the prototype's Plan view. Prints as a
 * single page (browser print → Save as PDF) and doubles as the screen the
 * client keeps. Coaches always; clients once purchased — see canViewPeakPlan.
 */
export default async function PeakPlanPage({ params }: PageProps<"/plan/[sessionId]">) {
  const { sessionId } = await params;
  const viewer = await requireViewer(`/plan/${sessionId}`);

  const data = await loadSessionAnalysis(viewer.supabase, sessionId);
  if (!data || !(await canViewPeakPlan(viewer, data.session))) notFound();

  const { session, clientName, map, windows } = data;
  const schedule = planSchedule(map);
  const guards = planGuards(windows);
  const backHref = viewer.isCoach ? `/coach/sessions/${sessionId}` : `/track/${sessionId}/complete`;

  const meta = [
    { k: "Client", v: clientName || "—" },
    { k: "Session", v: session.label || "—" },
    { k: "Days tracked", v: String(session.day_count) },
    { k: "Prepared by", v: "Jen Soenen" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6 print:max-w-none print:p-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="text-[12px] font-bold text-muted underline">
          ← Back
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton>Print or save as PDF</PrintButton>
          {windows.peak.length ? (
            <a
              href={`/plan/${sessionId}/peak-plan.ics`}
              className="rounded-[10px] bg-navy px-4 py-[11px] text-[12.5px] font-extrabold text-white hover:bg-navy-light"
            >
              Calendar file
            </a>
          ) : (
            <span className="text-[11.5px] text-muted">No peak window yet, so no calendar block to add.</span>
          )}
        </div>
      </div>

      <article className="overflow-hidden rounded-[4px] bg-white shadow-[0_8px_40px_rgba(19,36,73,0.13)] print:rounded-none print:shadow-none">
        <header className="bg-[linear-gradient(150deg,#0b1533,#132449_60%,#24417e)] px-7 py-9 text-white sm:px-[46px] print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
          <div className="mb-3 text-[10px] font-extrabold tracking-[0.2em] text-gold uppercase">Soenen Strategies</div>
          <h1 className="font-serif text-[36px] leading-[1.06] font-semibold tracking-[-0.015em] sm:text-[44px]">
            The Peak Plan<sup className="text-[18px]">™</sup>
          </h1>
          <p className="mt-3 text-[14px] leading-[1.6] text-white/80">
            Prepared for {clientName || "your client"} · {session.label || ""} · {session.day_count} days of Charge Index data
          </p>
        </header>

        <div className="px-7 pt-[34px] pb-10 sm:px-[46px] print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
          <div className="mb-8 grid gap-4 md:grid-cols-3 print:grid-cols-3">
            {PLAN_WINDOWS.map((w) => (
              <div key={w.band} className="rounded-[14px] border-[1.5px] p-5" style={{ borderColor: w.color, background: w.tint }}>
                <div className="mb-2 text-[9.5px] font-extrabold tracking-[0.13em] uppercase" style={{ color: w.color }}>
                  {w.label}
                </div>
                <div className="font-serif text-[21px] leading-[1.25] font-semibold text-ink">{formatWindow(windows[w.band])}</div>
                <p className="mt-2 text-[12px] leading-[1.6] text-body">{w.desc}</p>
              </div>
            ))}
          </div>

          <h2 className="mb-[5px] font-serif text-[22px] font-semibold text-navy">Your charged schedule</h2>
          <p className="mb-[18px] text-[12.5px] leading-[1.6] text-muted">
            Match the work to the charge. This is the schedule your own data asks for.
          </p>
          <ol className="m-0 mb-[34px] flex list-none flex-col gap-[5px] p-0">
            {schedule.map((s) => (
              <li
                key={s.hour}
                className="grid grid-cols-[84px_1fr] items-baseline gap-3 rounded-r-[9px] border-l-[3px] px-4 py-[9px] print:break-inside-avoid"
                style={{ borderColor: s.color, background: s.tint }}
              >
                <span className="text-[13px] font-extrabold text-navy">{formatHourLong(s.hour)}</span>
                <span className="flex flex-wrap items-baseline justify-between gap-x-[14px]">
                  <span className="text-[13.5px] font-bold text-ink">{s.task}</span>
                  <span className="text-[10.5px] font-extrabold tracking-[0.08em] uppercase" style={{ color: s.color }}>
                    {s.zone}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <div className="grid gap-7 md:grid-cols-2 print:grid-cols-2 print:break-inside-avoid">
            <div>
              <h2 className="mb-3 font-serif text-[18px] font-semibold text-navy">Guard these three things</h2>
              {guards.length ? (
                <ol className="m-0 flex list-none flex-col gap-[11px] p-0">
                  {guards.map((g) => (
                    <li key={g.n} className="flex items-baseline gap-[11px]">
                      <span className="flex-none font-serif text-[17px] font-semibold text-gold">{g.n}</span>
                      <span className="text-[13px] leading-[1.65] text-body">{g.text}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[13px] leading-[1.65] text-body">Log more hours to find the windows worth guarding.</p>
              )}
            </div>
            <div className="rounded-[14px] bg-[#eef1f8] p-5">
              <div className="mb-[10px] text-[10px] font-extrabold tracking-[0.13em] text-navy uppercase">Session</div>
              <dl className="m-0 flex flex-col gap-2">
                {meta.map((m) => (
                  <div key={m.k} className="flex justify-between gap-3 border-b border-navy/8 pb-2 text-[12.5px]">
                    <dt className="text-muted">{m.k}</dt>
                    <dd className="m-0 text-right font-extrabold text-navy">{m.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t-[1.5px] border-line px-7 py-5 text-[11px] text-muted sm:px-[46px]">
          <span>Soenen Strategies® · All rights reserved</span>
          <a href="mailto:soenenstrategies@gmail.com">soenenstrategies@gmail.com</a>
        </footer>
      </article>
    </div>
  );
}
