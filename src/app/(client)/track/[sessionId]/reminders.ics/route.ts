import { notFound } from "next/navigation";

import { buildSessionSlots, hourOf } from "@/lib/slots";
import { buildTrackingRemindersIcs } from "@/lib/tracking-reminders";
import { requireViewer } from "@/lib/viewer";

/**
 * Hourly check-in reminders for the client's phone (Josh, 2026-09-24).
 *
 * Served inline rather than as an attachment: on a phone that hands the file
 * straight to the calendar app's "add these events?" sheet, which is the whole
 * point. RLS decides whose session this is — a stranger's id returns nothing
 * and 404s here.
 */
export async function GET(_request: Request, { params }: RouteContext<"/track/[sessionId]/reminders.ics">) {
  const { sessionId } = await params;
  const { supabase } = await requireViewer(`/track/${sessionId}`);

  const { data: session } = await supabase
    .from("tracking_sessions")
    .select("id, start_date, day_count, wake_time, sleep_time")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) notFound();

  const ics = buildTrackingRemindersIcs({
    sessionId: session.id,
    startDate: session.start_date,
    dayCount: session.day_count,
    hours: buildSessionSlots(hourOf(session.wake_time), hourOf(session.sleep_time)).map(hourOf),
  });
  if (!ics) notFound();

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="ChargeIndexReminders.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
