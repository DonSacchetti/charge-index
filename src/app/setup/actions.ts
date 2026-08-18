"use server";

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

const VALID_REMINDERS = new Set<string>(REMINDERS.map((r) => r.value));

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
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/track/${data.id}`);
}
