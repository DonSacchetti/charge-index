import { notFound, redirect } from "next/navigation";

import { formatDayDate, sessionDays, unlockedDayCount } from "@/lib/days";
import { type DayLog, emptyDay, resumeDay } from "@/lib/progress";
import { buildSessionSlots, hourOf } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";

import { CheckIn } from "./check-in";

export default async function TrackPage({
  params,
  searchParams,
}: PageProps<"/track/[sessionId]">) {
  const { sessionId } = await params;
  const { day: dayParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/track/${sessionId}`);

  // RLS scopes all three reads to the signed-in client (or a coach) — a
  // stranger's session id returns nothing rather than someone else's data.
  const [{ data: session }, { data: entries }, { data: notes }] = await Promise.all([
    supabase
      .from("tracking_sessions")
      .select("id, label, wake_time, sleep_time, day_count, start_date, timezone")
      .eq("id", sessionId)
      .maybeSingle(),
    supabase
      .from("daily_entries")
      .select("day_number, slot_hour, energy_pct")
      .eq("session_id", sessionId),
    supabase
      .from("daily_notes")
      .select("day_number, feel_note, unexpected_note, for_jen_note")
      .eq("session_id", sessionId),
  ]);

  if (!session) notFound();

  const hours = buildSessionSlots(
    hourOf(session.wake_time),
    hourOf(session.sleep_time),
  ).map(hourOf);

  const days: DayLog[] = Array.from({ length: session.day_count }, emptyDay);
  for (const e of entries ?? []) {
    const d = days[e.day_number - 1];
    if (d) d.slots[hourOf(e.slot_hour)] = e.energy_pct;
  }
  for (const n of notes ?? []) {
    const d = days[n.day_number - 1];
    if (!d) continue;
    d.feel = n.feel_note ?? "";
    d.unexpected = n.unexpected_note ?? "";
    d.forJen = n.for_jen_note ?? "";
  }

  // A day opens on its own date, in the client's own timezone (Jen,
  // 2026-09-24). The database enforces this too; here it decides which day
  // the screen opens on and which tabs are tappable.
  const dayDates = sessionDays(session.start_date, session.day_count).map((d) => formatDayDate(d.date));
  const unlockedDays = unlockedDayCount(session.start_date, session.day_count, session.timezone);

  const requested = Number(dayParam);
  const initialDay =
    Number.isInteger(requested) && requested >= 1 && requested <= session.day_count
      ? requested - 1
      : Math.min(resumeDay(days, hours.length), unlockedDays - 1);

  return (
    <CheckIn
      sessionId={session.id}
      label={session.label ?? "This session"}
      dayCount={session.day_count}
      hours={hours}
      initialDays={days}
      initialDay={initialDay}
      dayDates={dayDates}
      unlockedDays={unlockedDays}
    />
  );
}
