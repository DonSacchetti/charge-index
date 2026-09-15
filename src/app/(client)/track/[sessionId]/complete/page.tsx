import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageBody, PageHero, SectionLabel, Surface } from "@/components/AppShell";
import { loadSessionAnalysis } from "@/lib/session-data";
import { formatHour } from "@/lib/slots";
import { canViewPeakPlan, requireViewer } from "@/lib/viewer";
import { formatWindow } from "@/lib/weekly-map";

/** Jen's booking link for the $249 session, as used in her prototype. */
const BOOK_SESSION_URL = "https://calendly.com/soenenstrategies/introtimestrategycall";

/**
 * End-of-session results, built to mockups 07–10. Per Josh (2026-09-14) the
 * client sees their peak window here. That's the one piece of analysis on the
 * client side: it's computed from the client's own entries, which RLS already
 * lets them read. Only `windows.peak` is rendered — the curve, the other
 * windows, ideal day and AI insights stay on the coach side.
 */
export default async function CompletePage({
  params,
}: PageProps<"/track/[sessionId]/complete">) {
  const { sessionId } = await params;

  const viewer = await requireViewer(`/track/${sessionId}/complete`);
  const { supabase, user } = viewer;

  const [data, { data: profile }] = await Promise.all([
    loadSessionAnalysis(supabase, sessionId),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  if (!data) notFound();
  const { session, wake, sleep, entries, windows } = data;
  if (session.status !== "completed") redirect(`/track/${sessionId}`);
  const peak = windows.peak;
  const hasPlan = await canViewPeakPlan(viewer, session);

  const first = profile?.full_name?.trim().split(/\s+/)[0] || "friend";
  const peakSet = new Set(peak);
  const stats = [
    { label: "Session", value: session.label ?? "—", level: 75 },
    { label: "Days tracked", value: `${session.day_count} days`, level: 50 },
    { label: "Hours logged", value: String(entries.length), level: 100 },
    { label: "Waking window", value: `${formatHour(wake)} – ${formatHour(sleep)}`, level: 25 },
  ];
  const steps = session.day_count + 2;

  return (
    <>
      <PageHero
        eyebrow="Sent to Jen · Complete"
        title={<>Thanks, {first}.</>}
        lead="Your Charge Index is complete. Your curve and your peak windows are yours to keep, free. Where you go next is up to you."
        progress={{ total: steps, current: steps - 1 }}
        aside={
          <div className="relative hidden h-24 w-24 sm:block" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: `var(--color-glow-${[100, 75, 25][i]})`, animation: `burst 1.6s ease-out ${300 + i * 260}ms infinite` }}
              />
            ))}
            <svg viewBox="0 0 96 96" className="relative h-24 w-24">
              <circle cx="48" cy="48" r="40" fill="rgba(63,191,127,0.18)" stroke="var(--color-glow-100)" strokeWidth="3" strokeDasharray="252" strokeDashoffset="252" style={{ animation: "draw 0.9s ease-out 0.1s forwards" }} />
              <path d="M31 49 l12 12 l23 -25" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="60" style={{ animation: "draw 0.5s ease-out 0.8s forwards" }} />
            </svg>
          </div>
        }
      />

      <PageBody>
        <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <Surface className="p-6 sm:p-8" accent={100}>
              <SectionLabel>Your session, free</SectionLabel>
              <div className="text-[13px] font-extrabold tracking-[0.08em] text-level-100 uppercase">Peak window found</div>
              <div className="mt-1 font-serif text-[44px] leading-tight font-semibold text-navy sm:text-[56px]">{formatWindow(peak)}</div>
              <p className="mt-2 text-[14px] leading-[1.6] text-body">
                {peak.length
                  ? "The stretch of your day where you ran most fully charged. Protect it."
                  : "No hours averaged fully charged this session — keep tracking and it may appear."}
              </p>
              <div className="mt-6" aria-label={`Waking hours ${formatHour(wake)} to ${formatHour(sleep)}, peak window ${formatWindow(peak)}`} role="img">
                <div className="flex gap-[3px]">
                  {data.hours.map((h, i) => (
                    <span
                      key={h}
                      className="h-10 flex-1 origin-bottom rounded-md"
                      style={{
                        background: peakSet.has(h) ? "linear-gradient(180deg, var(--color-glow-100), var(--color-level-100))" : "var(--color-cream)",
                        boxShadow: peakSet.has(h) ? "0 8px 18px -8px var(--color-glow-100)" : undefined,
                        animation: `charge-rise 0.6s cubic-bezier(.2,.8,.2,1) ${i * 35}ms both`,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] font-bold text-muted">
                  <span>{formatHour(wake)}</span>
                  <span>{formatHour(sleep)}</span>
                </div>
              </div>
            </Surface>

            <div className="grid grid-cols-2 gap-4">
              {stats.map((s, i) => (
                <Surface key={s.label} className="p-5" delay={80 + i * 60}>
                  <div className="h-1.5 w-8 rounded-full" style={{ background: `var(--color-level-${s.level})` }} />
                  <div className="mt-3 text-[12px] font-bold text-muted">{s.label}</div>
                  <div className="mt-1 font-serif text-[22px] leading-tight font-semibold text-navy wrap-anywhere">{s.value}</div>
                </Surface>
              ))}
            </div>

            <Link
              href={`/track/${sessionId}`}
              className="inline-flex min-h-12 items-center justify-center self-start rounded-2xl border-[1.5px] border-line bg-white px-5 text-[13.5px] font-extrabold text-body transition hover:border-navy hover:text-navy"
            >
              Edit my entries
            </Link>
          </div>

          <div className="flex flex-col gap-5">
            <section className="aurora animate-rise relative overflow-hidden rounded-[26px] p-7 text-white shadow-[0_30px_60px_-28px_rgba(19,36,73,0.75)] [animation-delay:160ms]">
              <div className="spectrum-animated absolute inset-x-0 top-0 h-1.5" />
              <div className="mb-3 text-[11px] font-extrabold tracking-[0.18em] text-gold-bright uppercase">Turn it into a plan</div>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-serif text-[24px] font-semibold">
                  Basic Peak Plan<sup className="text-[11px]">™</sup>
                </h2>
                <div className="font-serif text-[28px] font-semibold text-gold-bright">$49</div>
              </div>
              <p className="mt-3 text-[14px] leading-[1.7] text-white/80">
                Built from your data right now, no call needed. Your full schedule by charge level, your protected peak windows, a calendar file
                and a one-page PDF.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {hasPlan ? (
                  <Link
                    href={`/plan/${sessionId}`}
                    className="inline-flex min-h-12 items-center rounded-2xl bg-gold px-6 text-[14.5px] font-extrabold text-navy-deep transition hover:-translate-y-0.5 hover:bg-gold-bright"
                  >
                    View my Peak Plan
                  </Link>
                ) : (
                  <>
                    {/* Checkout arrives with Phase 2, once Jen's Stripe account exists. */}
                    <button type="button" disabled className="inline-flex min-h-12 cursor-not-allowed items-center rounded-2xl bg-gold px-6 text-[14.5px] font-extrabold text-navy-deep opacity-60">
                      Unlock my plan
                    </button>
                    <span className="text-[12px] font-bold text-white/60">Coming soon</span>
                  </>
                )}
              </div>
            </section>

            <Surface className="p-7" accent="gold" delay={220}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-serif text-[24px] font-semibold text-navy">
                  Peak Plan<sup className="text-[11px]">™</sup> Session
                </h2>
                <div className="font-serif text-[28px] font-semibold text-gold-deep">$249</div>
              </div>
              <p className="mt-3 text-[14px] leading-[1.7] text-body">
                90 minutes with Jen. Everything the automated plan cannot see — your goals, your team&rsquo;s calendar, your season — decided together.
              </p>
              <a
                href={BOOK_SESSION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex min-h-12 items-center rounded-2xl border-[1.5px] border-navy px-6 text-[14.5px] font-extrabold text-navy transition hover:bg-navy hover:text-white"
              >
                Book the session
              </a>
            </Surface>
          </div>
        </div>
      </PageBody>
    </>
  );
}
