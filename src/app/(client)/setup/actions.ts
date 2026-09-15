"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { REMINDERS, type ReminderPref } from "@/lib/charge";
import {
  SLEEP_HOURS,
  WAKE_HOURS,
  buildSessionSlots,
  defaultSessionLabel,
  toTimeValue,
} from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";

export type SetupState = { error: string } | null;

/**
 * The session's start date as the client sees it. Postgres `current_date` is
 * UTC, so an evening setup in Toronto would otherwise start "tomorrow". The
 * browser's date is only trusted within a day of the server's, which covers
 * every real timezone and nothing else.
 */
function startDate(raw: FormDataEntryValue | null): string | undefined {
  const value = typeof raw === "string" ? raw : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const offsetDays = Math.abs(Date.parse(`${value}T12:00:00Z`) - Date.now()) / 86_400_000;
  return offsetDays <= 1.5 ? value : undefined;
}

const VALID_REMINDERS = new Set<string>(REMINDERS.map((r) => r.value));

/**
 * An IANA timezone name from the browser ("America/Toronto"), accepted only if
 * this runtime recognises it. Anything else stores null — the reminder engine
 * skips a session with no timezone rather than guess at the client's clock.
 */
function timezone(raw: FormDataEntryValue | null): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value || value.length > 64) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return null;
  }
}

export async function createSession(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const supabase = await createClient();

  // Server Actions are reachable by direct POST, so re-check auth here rather
  // than trusting the proxy's redirect.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/setup");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const wake = Number(formData.get("wake_hour"));
  const sleep = Number(formData.get("sleep_hour"));
  const dayCount = Number(formData.get("day_count"));
  const reminder = String(formData.get("reminder_pref") ?? "none");
  const label =
    String(formData.get("label") ?? "").trim() || defaultSessionLabel(new Date());

  if (!fullName) return { error: "Add your first name to begin." };
  if (!WAKE_HOURS.includes(wake) || !SLEEP_HOURS.includes(sleep))
    return { error: "Pick a wake and bedtime from the list." };
  if (![5, 6, 7].includes(dayCount))
    return { error: "Tracking length must be 5, 6 or 7 days." };
  if (!VALID_REMINDERS.has(reminder))
    return { error: "Pick a reminder option." };

  // Guards against a wake/bedtime pair that produces no hours to log at all.
  const slots = buildSessionSlots(wake, sleep);
  if (slots.length === 0)
    return { error: "That wake and bedtime leave no hours to log." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);
  if (profileError) return { error: profileError.message };

  const { data, error } = await supabase
    .from("tracking_sessions")
    .insert({
      client_id: user.id,
      label,
      wake_time: toTimeValue(wake),
      sleep_time: toTimeValue(sleep),
      day_count: dayCount,
      reminder_pref: reminder as ReminderPref,
      start_date: startDate(formData.get("local_date")),
      timezone: timezone(formData.get("timezone")),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // The nav's "Log" item now points at this session.
  revalidatePath("/", "layout");
  redirect(`/track/${data.id}`);
}
