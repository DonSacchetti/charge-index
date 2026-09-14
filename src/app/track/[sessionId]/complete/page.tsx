import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { buildSessionSlots, formatHour, hourOf } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";
import { computeWeeklyMap, findWindows, formatWindow } from "@/lib/weekly-map";

/** Jen's booking link for the $249 session, as used in her prototype. */
const BOOK_SESSION_URL = "https://calendly.com/soenenstrategies/introtimestrategycall";

/**
 * End-of-session results, built to mockups 07–10. Per Josh (2026-09-14) the
 * client sees their peak window here. That's the one piece of analysis on the
 * client side: it's computed from the client's own entries, which RLS already
 * lets them read. Everything deeper — the curve, the other windows, ideal day,
 * AI insights — stays coach-only.
 */
export default async function CompletePage({
  params,
}: PageProps<"/track/[sessionId]/complete">) {
  const { sessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/track/${sessionId}/complete`);

  const [{ data: session }, { data: entries }, { data: profile }] = await Promise.all([
    supabase
      .from("tracking_sessions")
      .select("id, label, wake_time, sleep_time, day_count, status")
      .eq("id", sessionId)
      .maybeSingle(),
    supabase
      .from("daily_entries")
      .select("day_number, slot_hour, energy_pct")
      .eq("session_id", sessionId),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  if (!session) notFound();
  if (session.status !== "completed") redirect(`/track/${sessionId}`);

  const wake = hourOf(session.wake_time);
  const sleep = hourOf(session.sleep_time);
  const hours = buildSessionSlots(wake, sleep).map(hourOf);
  const map = computeWeeklyMap(
    (entries ?? []).map((e) => ({
      dayNumber: e.day_number,
      hour: hourOf(e.slot_hour),
      pct: e.energy_pct,
    })),
    hours,
  );
  const { peak } = findWindows(map);

  const stats = [
    { label: "Session", value: session.label ?? "—" },
    { label: "Days tracked", value: `${session.day_count} days` },
    { label: "Hours logged", value: String(entries?.length ?? 0) },
    { label: "Waking window", value: `${formatHour(wake)} – ${formatHour(sleep)}` },
    { label: "Peak window found", value: formatWindow(peak) },
  ];

  const steps = session.day_count + 2;

  return (
    <AppShell subtitle="Sent to Jen" badge="Complete" progress={{ total: steps, current: steps - 1 }}>
      <div className="px-[22px] pt-10 pb-9 text-center">
        <div className="mx-auto mb-5 flex h-[66px] w-[66px] items-center justify-center rounded-full border-2 border-level-100 bg-[#eaf5ef]">
          <div className="h-3 w-[22px] translate-x-px -translate-y-[3px] -rotate-45 border-b-[3px] border-l-[3px] border-level-100" />
        </div>
        <h1 className="mb-[10px] font-serif text-[26px] leading-[1.2] font-semibold text-navy">
          Thanks, {profile?.full_name || "friend"}.
        </h1>
        <p className="mb-[26px] text-[13.5px] leading-[1.75] text-body">
          Your Charge Index is complete. Your curve and your peak windows are
          yours to keep, free. Where you go next is up to you.
        </p>

        <div className="mb-4 rounded-[15px] border border-line bg-white px-[18px] py-[18px] text-left">
          <div className="mb-3 text-[10px] font-extrabold tracking-[0.13em] text-muted uppercase">
            Your session, free
          </div>
          <div className="flex flex-col gap-[9px]">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex items-baseline justify-between gap-3 border-b border-[#f0efea] pb-[9px]"
              >
                <span className="text-[12.5px] text-body">{s.label}</span>
                <span className="text-right text-[13px] font-extrabold text-navy">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-5 text-left">
          <div className="mb-[11px] text-[10px] font-extrabold tracking-[0.13em] text-muted uppercase">
            Turn it into a plan
          </div>
          <div className="flex flex-col gap-[10px]">
            <div className="rounded-[15px] bg-[linear-gradient(150deg,#0b1533,#132449)] px-[18px] py-5 text-white">
              <div className="mb-2 flex items-baseline justify-between gap-[10px]">
                <h2 className="font-serif text-[18px] font-semibold">
                  Basic Peak Plan<sup className="text-[10px]">™</sup>
                </h2>
                <div className="text-[15px] font-extrabold text-gold">$49</div>
              </div>
              <p className="mb-[13px] text-[12.5px] leading-[1.7] text-white/80">
                Built from your data right now, no call needed. Your full schedule
                by charge level, your protected peak windows, a calendar file and
                a one-page PDF.
              </p>
              {/* Checkout arrives with Phase 2, once Jen's Stripe account exists. */}
              <button
                type="button"
                disabled
                className="inline-block cursor-not-allowed rounded-[10px] bg-gold px-[18px] py-[11px] text-[13px] font-extrabold text-white opacity-60"
              >
                Unlock my plan
              </button>
              <span className="ml-3 text-[11px] font-semibold text-white/60">Coming soon</span>
            </div>

            <div className="rounded-[15px] border-[1.5px] border-gold bg-white px-[18px] py-5">
              <div className="mb-2 flex items-baseline justify-between gap-[10px]">
                <h2 className="font-serif text-[18px] font-semibold text-navy">
                  Peak Plan<sup className="text-[10px]">™</sup> Session
                </h2>
                <div className="text-[15px] font-extrabold text-gold-deep">$249</div>
              </div>
              <p className="mb-[13px] text-[12.5px] leading-[1.7] text-body">
                90 minutes with Jen. Everything the automated plan cannot see —
                your goals, your team&rsquo;s calendar, your season — decided
                together.
              </p>
              <a
                href={BOOK_SESSION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-[10px] border-[1.5px] border-navy px-[18px] py-[11px] text-[13px] font-extrabold text-navy hover:bg-navy hover:text-white"
              >
                Book the session
              </a>
            </div>
          </div>
        </div>

        <Link
          href={`/track/${sessionId}`}
          className="inline-block rounded-[11px] border-[1.5px] border-line px-5 py-3 text-[13px] font-extrabold text-muted hover:border-navy hover:text-navy"
        >
          Edit my entries
        </Link>
      </div>
    </AppShell>
  );
}
