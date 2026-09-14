import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { formatHour, hourOf } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";

/**
 * End-of-session screen. Deliberately limited to facts about the session —
 * no curve, no peak window, no upsell cards yet. Jen's mockup shows the client
 * their peak window here, which conflicts with the Build Plan's "client never
 * sees analysis" rule; that's an open product question, not a build detail.
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

  const [{ data: session }, { count: hoursLogged }, { data: profile }] =
    await Promise.all([
      supabase
        .from("tracking_sessions")
        .select("id, label, wake_time, sleep_time, day_count, status")
        .eq("id", sessionId)
        .maybeSingle(),
      supabase
        .from("daily_entries")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId),
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    ]);

  if (!session) notFound();
  if (session.status !== "completed") redirect(`/track/${sessionId}`);

  const stats = [
    { label: "Session", value: session.label ?? "—" },
    { label: "Days tracked", value: `${session.day_count} days` },
    { label: "Hours logged", value: String(hoursLogged ?? 0) },
    {
      label: "Waking window",
      value: `${formatHour(hourOf(session.wake_time))} – ${formatHour(hourOf(session.sleep_time))}`,
    },
  ];

  const steps = session.day_count + 2;

  return (
    <AppShell
      subtitle="Sent to Jen"
      badge="Complete"
      progress={{ total: steps, current: steps - 1 }}
    >
      <div className="px-[26px] pt-11 pb-9 text-center">
        <div className="mx-auto mb-5 flex h-[66px] w-[66px] items-center justify-center rounded-full border-2 border-level-100 bg-[#eaf5ef]">
          <div className="h-3 w-[22px] translate-x-px -translate-y-[3px] -rotate-45 border-b-[3px] border-l-[3px] border-level-100" />
        </div>
        <h1 className="mb-[10px] font-serif text-[26px] leading-[1.2] font-semibold text-navy">
          Thanks, {profile?.full_name || "friend"}.
        </h1>
        <p className="mb-[26px] text-[13.5px] leading-[1.75] text-body">
          Your Charge Index is complete.
        </p>

        <div className="mb-4 rounded-[15px] border border-line bg-white px-[18px] py-[18px] text-left">
          <div className="mb-3 text-[10px] font-extrabold tracking-[0.13em] text-muted uppercase">
            Your session
          </div>
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between gap-3 border-b border-line py-[10px] last:border-b-0"
            >
              <span className="text-[13.5px] text-body">{s.label}</span>
              <span className="text-[13.5px] font-extrabold text-navy">{s.value}</span>
            </div>
          ))}
        </div>

        <Link
          href={`/track/${sessionId}`}
          className="text-[12.5px] font-bold text-navy underline"
        >
          Back to my log
        </Link>
      </div>
    </AppShell>
  );
}
