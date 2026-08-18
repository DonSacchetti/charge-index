import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { SCALE } from "@/lib/charge";
import { buildSessionSlots, formatHour, hourOf } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";

/**
 * Placeholder for the Phase 4 daily check-in grid. It renders the real slot
 * list generated from this session's wake/bedtime, so the Phase 3 setup flow
 * ends somewhere that proves the slot maths against live data.
 */
export default async function TrackPage({ params }: PageProps<"/track/[sessionId]">) {
  const { sessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/track/${sessionId}`);

  // RLS scopes this to the signed-in client (or a coach) — a stranger's id
  // returns no row rather than someone else's session.
  const { data: session } = await supabase
    .from("tracking_sessions")
    .select("id, label, wake_time, sleep_time, day_count, reminder_pref")
    .eq("id", sessionId)
    .single();

  if (!session) notFound();

  const slots = buildSessionSlots(
    hourOf(session.wake_time),
    hourOf(session.sleep_time),
  );

  return (
    <AppShell
      subtitle={session.label ?? "This session"}
      badge={`Day 1 of ${session.day_count}`}
      progress={{ total: session.day_count, filled: 0 }}
    >
      <div className="px-5 pt-6 pb-9">
        <h1 className="font-serif text-[27px] leading-[1.14] font-semibold text-navy">
          Your session is set
        </h1>
        <div className="my-[15px] h-0.5 w-[38px] bg-gold" />
        <p className="mb-5 text-[13.5px] leading-[1.72] text-body">
          {slots.length} hours a day, {session.day_count} days. The one-tap
          check-in grid lands in the next build phase — these are the exact
          slots it will ask you about.
        </p>

        <div className="mb-6 overflow-hidden rounded-[12px] border-[1.5px] border-line bg-white">
          {slots.map((slot) => (
            <div
              key={slot}
              className="flex items-center justify-between border-b border-line px-4 py-[11px] last:border-b-0"
            >
              <span className="text-[13.5px] font-bold text-navy">
                {formatHour(hourOf(slot))}
              </span>
              <span className="text-[11.5px] text-muted">Not logged yet</span>
            </div>
          ))}
        </div>

        <div className="mb-6 rounded-[12px] border-[1.5px] border-line bg-white p-4">
          <div className="mb-[9px] text-[10px] font-extrabold tracking-[0.12em] text-muted uppercase">
            The scale
          </div>
          <div className="flex flex-col gap-2">
            {SCALE.map((s) => (
              <div key={s.value} className="flex items-center gap-[10px]">
                <span
                  className="h-[10px] w-[10px] flex-none rounded-full"
                  style={{ background: `var(--color-level-${s.value})` }}
                />
                <span className="text-[12.5px] text-body">
                  <strong className="text-navy">{s.label}</strong> {s.short} —{" "}
                  {s.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/setup"
          className="text-[12.5px] font-bold text-navy underline"
        >
          Back to setup
        </Link>
      </div>
    </AppShell>
  );
}
