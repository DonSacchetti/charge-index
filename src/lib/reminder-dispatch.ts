import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { fetchAll } from "@/lib/fetch-all";
import { type PlanSession, type PlannedReminder, planReminders } from "@/lib/reminder-plan";

export type ReminderSender = {
  /** Provider name for the run report ("dry-run" sends nothing). */
  name: string;
  send(message: { to: string; subject: string; text: string; html: string }): Promise<void>;
};

/**
 * No email provider is configured yet (Build Plan Phase 11 needs a
 * transactional email account under Jen's identity). Until one is, runs are
 * dry: the report lists what would have been sent and nothing is claimed.
 */
export const dryRunSender: ReminderSender = { name: "dry-run", async send() {} };

export type RunReport = {
  now: string;
  sender: string;
  sessionsChecked: number;
  planned: number;
  sent: number;
  skippedAlreadySent: number;
  failed: number;
  reminders: { sessionId: string; dayNumber: number; key: string; to: string; subject: string; status: string }[];
};

const ID_CHUNK = 100; // keep `in (...)` filters well inside URL limits

export async function runReminders(
  admin: SupabaseClient<Database>,
  sender: ReminderSender,
  now: Date,
  appUrl: string,
): Promise<RunReport> {
  const sessions = (await fetchAll((from, to) =>
    admin
      .from("tracking_sessions")
      .select("id, label, wake_time, sleep_time, day_count, start_date, status, reminder_pref, timezone, profiles(full_name, email)")
      .eq("status", "in_progress")
      .neq("reminder_pref", "none")
      .not("timezone", "is", null)
      .order("id")
      .range(from, to),
  )) as PlanSession[];

  const entries: { session_id: string; day_number: number; slot_hour: string }[] = [];
  for (let i = 0; i < sessions.length; i += ID_CHUNK) {
    const ids = sessions.slice(i, i + ID_CHUNK).map((s) => s.id);
    entries.push(
      ...(await fetchAll((from, to) =>
        admin.from("daily_entries").select("session_id, day_number, slot_hour").in("session_id", ids).order("id").range(from, to),
      )),
    );
  }

  const plan = planReminders(sessions, entries, now, appUrl);
  const report: RunReport = {
    now: now.toISOString(),
    sender: sender.name,
    sessionsChecked: sessions.length,
    planned: plan.length,
    sent: 0,
    skippedAlreadySent: 0,
    failed: 0,
    reminders: [],
  };

  for (const r of plan) {
    report.reminders.push({ sessionId: r.sessionId, dayNumber: r.dayNumber, key: r.key, to: r.to, subject: r.subject, status: await deliver(admin, sender, r, report) });
  }
  return report;
}

/**
 * Claim-then-send. The unique (session, day, key) row is inserted first, so of
 * two overlapping runs only one can send; if sending fails the claim is
 * released so the next run retries. Dry runs claim nothing.
 */
async function deliver(
  admin: SupabaseClient<Database>,
  sender: ReminderSender,
  r: PlannedReminder,
  report: RunReport,
): Promise<string> {
  if (sender === dryRunSender) return "would send";

  const { data: claimed, error } = await admin
    .from("reminder_log")
    .upsert({ session_id: r.sessionId, day_number: r.dayNumber, reminder_key: r.key }, { onConflict: "session_id,day_number,reminder_key", ignoreDuplicates: true })
    .select("id");
  if (error) {
    report.failed++;
    return `claim failed: ${error.message}`;
  }
  if (!claimed?.length) {
    report.skippedAlreadySent++;
    return "already sent";
  }

  try {
    await sender.send({ to: r.to, subject: r.subject, text: r.text, html: r.html });
    report.sent++;
    return "sent";
  } catch (e) {
    await admin.from("reminder_log").delete().eq("id", claimed[0].id);
    report.failed++;
    return `send failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}
