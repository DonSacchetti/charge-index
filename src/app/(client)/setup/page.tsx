import Link from "next/link";
import { redirect } from "next/navigation";

import { PageBody, PageHero, SectionLabel, Surface } from "@/components/AppShell";
import { BOOK_CALL_URL } from "@/components/brand/SiteHeader";
import { formatDayDate } from "@/lib/days";
import { buildSessionSlots, formatHour, hourOf } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";

import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/setup");

  const [{ data: profile }, { data: sessions }, { count: grantCount }, { data: purchases }] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
    supabase
      .from("tracking_sessions")
      .select("id, label, day_count, status, start_date, wake_time, sleep_time, daily_entries(count)")
      .eq("client_id", user.id)
      // By the week they cover, not when the row was created — a session
      // seeded or started later can still be the older measurement.
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("session_grants")
      .select("id", { count: "exact", head: true })
      .eq("client_id", user.id),
    supabase
      .from("purchases")
      .select("session_id")
      .eq("client_id", user.id)
      .eq("product", "basic_peak_plan")
      .eq("status", "completed"),
  ]);

  const first = profile?.full_name?.trim().split(/\s+/)[0];
  const returning = (sessions?.length ?? 0) > 0;
  // One Charge Index per client; Jen reopens tracking by granting another
  // (Jen, 2026-09-24). Staff aren't limited. The database enforces this —
  // can_start_session() in 20260924143000_pacing_and_session_limit.sql.
  const isStaff = profile?.role === "coach" || profile?.role === "admin";
  const canStart = isStaff || (sessions?.length ?? 0) < 1 + (grantCount ?? 0);
  const latest = sessions?.[0];
  // A plan belongs to one session, so its link lives on that session's card —
  // otherwise an older plan someone paid for is reachable only by URL (Josh,
  // 2026-09-24). Staff can open any completed session's plan.
  const paid = new Set((purchases ?? []).map((p) => p.session_id));
  const hasPlan = (id: string, status: string) => paid.has(id) || (isStaff && status === "completed");

  return (
    <>
      <PageHero
        eyebrow={returning ? "Your Charge Index" : "Getting set up · 5–7 days"}
        title={
          returning ? (
            <>Welcome back{first ? `, ${first}` : ""}.</>
          ) : (
            <>
              How charged
              <br />
              are you?
            </>
          )
        }
        lead={
          <>
            Log your energy through your waking hours for five to seven days. Five choices every time, from{" "}
            <strong className="text-white">100% Fully Charged</strong> down to <strong className="text-white">10% Recharge Needed</strong>. No right or
            wrong answers — it&rsquo;s data, not a grade.
          </>
        }
      />

      <PageBody>
        <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col gap-6">
            {returning ? (
              <Surface className="p-6 sm:p-7" accent="spectrum">
                <SectionLabel>Your sessions</SectionLabel>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {sessions!.map((s, i) => {
                    const done = s.status === "completed";
                    const hours = buildSessionSlots(hourOf(s.wake_time), hourOf(s.sleep_time)).length;
                    const logged = s.daily_entries[0]?.count ?? 0;
                    const pct = hours ? Math.min(100, Math.round((logged / (hours * s.day_count)) * 100)) : 0;
                    const planHref = hasPlan(s.id, s.status) ? `/plan/${s.id}` : null;
                    return (
                      <li key={s.id} className="animate-rise" style={{ animationDelay: `${80 + i * 60}ms` }}>
                        {/* The whole tile opens the session (Josh, 2026-09-24):
                            the Peak Plan when they have one, since that's what
                            they come back for, otherwise results or the log. */}
                        <Link
                          href={planHref ?? (done ? `/track/${s.id}/complete` : `/track/${s.id}`)}
                          className="block rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-navy/25 hover:shadow-[0_18px_40px_-26px_rgba(19,36,73,0.6)]"
                        >
                          <span className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="min-w-0 font-serif text-[19px] font-semibold text-navy wrap-anywhere">
                              {s.label ?? "Untitled session"}
                            </span>
                            <span
                              className={`rounded-full px-[10px] py-[3px] text-[11px] font-extrabold ${
                                done ? "bg-level-100/12 text-level-100" : "bg-level-75/12 text-level-75"
                              }`}
                            >
                              {done ? "Complete" : "In progress"}
                            </span>
                          </span>
                          <span className="mt-1 block text-[12px] text-muted">
                            {s.day_count} days · {formatHour(hourOf(s.wake_time))} – {formatHour(hourOf(s.sleep_time))} · started{" "}
                            {formatDayDate(s.start_date)}
                          </span>
                          <span className="mt-3 block h-2 overflow-hidden rounded-full bg-cream">
                            <span
                              className="block h-full origin-left rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: done ? "var(--color-level-100)" : "linear-gradient(90deg, var(--color-glow-75), var(--color-glow-100))",
                                animation: `charge-rise 0.9s cubic-bezier(.2,.8,.2,1) ${150 + i * 60}ms both`,
                              }}
                            />
                          </span>
                          <span className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                            <span className="font-bold text-body">
                              {logged} of {hours * s.day_count} hours logged
                            </span>
                            <span className="font-extrabold text-level-75">
                              {planHref ? "Open my Peak Plan →" : done ? "See results →" : "Keep logging →"}
                            </span>
                          </span>
                        </Link>

                        {/* Only where there's something still to buy. */}
                        {done && !planHref ? (
                          <div className="mt-2 flex flex-wrap items-center gap-3 px-1">
                            <button
                              type="button"
                              disabled
                              className="inline-flex min-h-10 cursor-not-allowed items-center rounded-xl bg-gold px-4 text-[12.5px] font-extrabold text-navy-deep opacity-60"
                            >
                              Unlock my Peak Plan · $49
                            </button>
                            <span className="text-[11.5px] font-bold text-muted">Coming soon</span>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 text-[12px] text-muted">
                  {canStart ? "Starting a new session won’t touch these." : "Your entries stay here, yours to revisit any time."}
                </p>
              </Surface>
            ) : null}

            <Surface className="p-6 sm:p-7" accent="gold" delay={120}>
              <SectionLabel>Before you start</SectionLabel>
              <ul className="m-0 flex list-none flex-col gap-4 p-0">
                {[
                  { t: "No right or wrong.", d: "Be honest, don't judge the entry.", level: 100 },
                  { t: "Stay curious.", d: "This is discovery, not perfection.", level: 75 },
                  { t: "Consistency over perfection.", d: "Miss an hour, keep going.", level: 25 },
                ].map((tip) => (
                  <li key={tip.t} className="flex gap-3">
                    <span className="mt-[3px] h-5 w-1.5 flex-none rounded-full" style={{ background: `var(--color-level-${tip.level})` }} />
                    <span className="text-[14px] leading-[1.6] text-body">
                      <strong className="text-navy">{tip.t}</strong> {tip.d}
                    </span>
                  </li>
                ))}
              </ul>
              {profile?.role === "coach" || profile?.role === "admin" ? (
                <Link href="/coach" className="mt-5 inline-flex min-h-11 items-center text-[13px] font-extrabold text-navy underline">
                  Go to coach view
                </Link>
              ) : null}
            </Surface>
          </div>

          {canStart ? (
            <Surface className="p-6 sm:p-8" accent="spectrum" delay={60}>
              <h2 className="font-serif text-[28px] font-semibold text-navy">{returning ? "Start a new session" : "Set up your session"}</h2>
              <p className="mt-1 mb-6 text-[13.5px] text-muted">Two minutes, then one tap an hour.</p>
              <SetupForm defaultName={profile?.full_name ?? ""} email={user.email ?? ""} />
            </Surface>
          ) : (
            <Surface className="p-6 sm:p-8" accent="gold" delay={60}>
              <SectionLabel>One Charge Index each</SectionLabel>
              <h2 className="font-serif text-[28px] font-semibold text-navy">You&rsquo;ve had your free session</h2>
              <p className="mt-3 text-[14.5px] leading-[1.7] text-body">
                The Charge Index is one measurement per person, so the numbers mean something. When you&rsquo;re ready to
                measure again — a new season, a new role, a plan you want to test — Jen reopens it for you.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={BOOK_CALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center rounded-2xl bg-navy px-6 text-[14px] font-extrabold text-white transition hover:-translate-y-0.5"
                >
                  Ask Jen to reopen it
                </a>
                {latest ? (
                  <Link
                    href={latest.status === "completed" ? `/track/${latest.id}/complete` : `/track/${latest.id}`}
                    className="inline-flex min-h-12 items-center rounded-2xl border-[1.5px] border-line bg-white px-5 text-[14px] font-extrabold text-body transition hover:border-navy hover:text-navy"
                  >
                    {latest.status === "completed" ? "See my results" : "Keep logging"}
                  </Link>
                ) : null}
              </div>
            </Surface>
          )}
        </div>
      </PageBody>
    </>
  );
}
