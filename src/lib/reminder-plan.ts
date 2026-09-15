/**
 * Turning sessions and their entries into the reminders to send right now.
 * Pure — the dispatcher does the IO.
 */

import { type ReminderSession, dueReminders } from "@/lib/reminders";
import { renderReminderEmail } from "@/lib/reminder-email";
import { hourOf } from "@/lib/slots";

export type PlannedReminder = {
  sessionId: string;
  dayNumber: number;
  key: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type PlanSession = ReminderSession & {
  label: string | null;
  profiles: { full_name: string | null; email: string | null } | null;
};

export function planReminders(
  sessions: PlanSession[],
  entries: { session_id: string; day_number: number; slot_hour: string }[],
  now: Date,
  appUrl: string,
): PlannedReminder[] {
  const logged = new Map<string, Set<string>>();
  for (const e of entries) {
    if (!logged.has(e.session_id)) logged.set(e.session_id, new Set());
    logged.get(e.session_id)!.add(`${e.day_number}:${hourOf(e.slot_hour)}`);
  }

  return sessions.flatMap((s) => {
    const to = s.profiles?.email;
    if (!to) return [];
    return dueReminders(s, logged.get(s.id) ?? new Set(), now).map((due) => ({
      sessionId: s.id,
      dayNumber: due.dayNumber,
      key: due.key,
      to,
      ...renderReminderEmail({
        clientName: s.profiles?.full_name ?? null,
        sessionLabel: s.label,
        dayNumber: due.dayNumber,
        dayCount: s.day_count,
        unloggedHours: due.unloggedHours,
        url: `${appUrl.replace(/\/$/, "")}/track/${s.id}?day=${due.dayNumber}`,
      }),
    }));
  });
}
