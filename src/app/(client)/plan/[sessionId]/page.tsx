import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/PrintButton";
import { ScheduleEditor } from "@/components/plan/ScheduleEditor";
import { PLAN_WINDOWS, planGuards, planSchedule } from "@/lib/peak-plan";
import { loadSessionAnalysis } from "@/lib/session-data";
import { formatDayDate } from "@/lib/days";
import { hourOf } from "@/lib/slots";
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

  // What the client wrote against each hour (Josh, 2026-09-24). Coaches see
  // them; only the client who bought the plan can write them (RLS).
  const { data: planNotes } = await viewer.supabase
    .from("plan_notes")
    .select("slot_hour, body")
    .eq("session_id", sessionId);
  const noteByHour = new Map((planNotes ?? []).map((n) => [hourOf(n.slot_hour), n.body]));
  const items = schedule.map((s) => ({ ...s, note: noteByHour.get(s.hour) ?? null }));
  const canEdit = !viewer.isCoach && session.client_id === viewer.user.id;

  // Their other plans, so an older one someone paid for stays reachable
  // (Josh, 2026-09-24). Only for the client themselves: a coach navigates
  // sessions from the client's page, which already lists every one of them.
  const otherPlans = canEdit
    ? (
        await viewer.supabase
          .from("purchases")
          .select("session_id, tracking_sessions(id, label, start_date)")
          .eq("client_id", viewer.user.id)
          .eq("product", "basic_peak_plan")
          .eq("status", "completed")
          .neq("session_id", sessionId)
      ).data
        ?.map((p) => p.tracking_sessions)
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .sort((a, b) => b.start_date.localeCompare(a.start_date)) ?? []
    : [];
  const hasSchedule = items.some((i) => i.zone !== "—");
  const backHref = viewer.isCoach ? `/coach/sessions/${sessionId}` : `/track/${sessionId}/complete`;

  const meta = [
    { k: "Client", v: clientName || "—" },
    { k: "Session", v: session.label || "—" },
    { k: "Days tracked", v: String(session.day_count) },
    { k: "Prepared by", v: "Jen Soenen" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6 print:max-w-none print:p-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="inline-flex min-h-11 items-center text-[13px] font-extrabold text-navy hover:underline">
          ← Back
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton>Print or save as PDF</PrintButton>
          {hasSchedule ? (
            <a
              href={`/plan/${sessionId}/schedule.ics`}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gold px-5 text-[13.5px] font-extrabold text-navy-deep shadow-[0_10px_26px_-12px_rgba(201,169,110,0.9)] transition hover:-translate-y-0.5 hover:bg-gold-bright"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                <rect x="4" y="5" width="16" height="15" rx="2" />
                <path d="M8 3v4M16 3v4M4 10h16" />
              </svg>
              Add my schedule to my calendar
            </a>
          ) : (
            <span className="text-[11.5px] text-muted">No tracked hours yet, so there&rsquo;s nothing to add.</span>
          )}
          {windows.peak.length ? (
            <a href={`/plan/${sessionId}/peak-plan.ics`} className="inline-flex min-h-11 items-center px-2 text-[12.5px] font-extrabold text-navy underline">
              Just my peak block
            </a>
          ) : (
            <span className="text-[11.5px] text-muted">No peak window yet — the file still carries the rest of your schedule.</span>
          )}
        </div>
      </div>

      <article className="animate-rise overflow-hidden rounded-[28px] bg-white shadow-[0_40px_90px_-40px_rgba(19,36,73,0.55)] print:animate-none print:rounded-none print:shadow-none">
        <header className="aurora px-7 py-10 text-white sm:px-[46px] print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
          <div className="mb-3 text-[10.5px] font-extrabold tracking-[0.22em] text-gold-bright uppercase">Soenen Strategies</div>
          <h1 className="font-serif text-[40px] leading-[1.02] font-semibold tracking-[-0.015em] sm:text-[56px]">
            The Peak Plan<sup className="text-[18px]">™</sup>
          </h1>
          <p className="mt-3 text-[14px] leading-[1.6] text-white/80">
            Prepared for {clientName || "your client"} · {session.label || ""} · {session.day_count} days of Charge Index data
          </p>
        </header>
        <div className="spectrum h-[5px] print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]" />

        <div className="px-7 pt-[34px] pb-10 sm:px-[46px] print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
          <div className="mb-8 grid gap-4 md:grid-cols-3 print:grid-cols-3">
            {PLAN_WINDOWS.map((w) => (
              <div key={w.band} className="relative overflow-hidden rounded-[20px] border-[1.5px] p-5 print:break-inside-avoid" style={{ borderColor: w.color, background: w.tint }}>
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: w.color }} />
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
          <ScheduleEditor sessionId={sessionId} items={items} canEdit={canEdit} />

          <div className="grid gap-7 md:grid-cols-2 print:grid-cols-2 print:break-inside-avoid">
            <div>
              <h2 className="mb-3 font-serif text-[18px] font-semibold text-navy">Guard these three things</h2>
              {guards.length ? (
                <ol className="m-0 flex list-none flex-col gap-[11px] p-0">
                  {guards.map((g) => (
                    <li key={g.n} className="flex items-baseline gap-[11px]">
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-navy font-serif text-[14px] font-semibold text-gold-bright print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">{g.n}</span>
                      <span className="text-[13px] leading-[1.65] text-body">{g.text}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[13px] leading-[1.65] text-body">Log more hours to find the windows worth guarding.</p>
              )}
            </div>
            <div className="rounded-[20px] bg-[#eef1f8] p-5">
              <div className="mb-[10px] text-[10px] font-extrabold tracking-[0.13em] text-navy uppercase">Session</div>
              <dl className="m-0 flex flex-col gap-2">
                {meta.map((m) => (
                  <div key={m.k} className="flex justify-between gap-3 border-b border-navy/8 pb-2 text-[12.5px]">
                    <dt className="text-muted">{m.k}</dt>
                    <dd className="m-0 min-w-0 text-right font-extrabold text-navy wrap-anywhere">{m.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {otherPlans.length ? (
          <div className="border-t-[1.5px] border-line px-7 py-5 sm:px-[46px] print:hidden">
            <div className="mb-2 text-[10px] font-extrabold tracking-[0.13em] text-muted uppercase">Your other plans</div>
            <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
              {otherPlans.map((o) => (
                <li key={o.id}>
                  <Link href={`/plan/${o.id}`} className="text-[13px] font-extrabold text-navy hover:underline">
                    {o.label || "Untitled session"}
                    <span className="ml-2 font-bold text-muted">{formatDayDate(o.start_date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t-[1.5px] border-line px-7 py-5 text-[11px] text-muted sm:px-[46px]">
          <span>Soenen Strategies® · All rights reserved</span>
          <a href="mailto:soenenstrategies@gmail.com">soenenstrategies@gmail.com</a>
        </footer>
      </article>
    </div>
  );
}
