import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { buildSessionSlots, hourOf } from "@/lib/slots";
import {
  type Entry,
  type HourAverage,
  type Windows,
  MIN_HOURS_FOR_RESULT,
  computeWeeklyMap,
  findWindows,
  isFlatTop,
  topHours,
} from "@/lib/weekly-map";

export type Reflection = {
  dayNumber: number;
  feel: string | null;
  unexpected: string | null;
  forJen: string | null;
};

/**
 * Everything the results and coach screens need about one session, read
 * through the caller's own Supabase client — so RLS decides what comes back.
 * Returns null when the session doesn't exist or isn't visible to them.
 */
export async function loadSessionAnalysis(
  supabase: SupabaseClient<Database>,
  sessionId: string,
) {
  const [{ data: session }, { data: rows }, { data: notes }] = await Promise.all([
    supabase
      .from("tracking_sessions")
      .select(
        "id, client_id, label, wake_time, sleep_time, day_count, start_date, status, created_at, profiles(full_name)",
      )
      .eq("id", sessionId)
      .maybeSingle(),
    supabase
      .from("daily_entries")
      .select("day_number, slot_hour, energy_pct")
      .eq("session_id", sessionId),
    supabase
      .from("daily_notes")
      .select("day_number, feel_note, unexpected_note, for_jen_note")
      .eq("session_id", sessionId)
      .order("day_number"),
  ]);

  if (!session) return null;
  return {
    session,
    clientName: session.profiles?.full_name ?? null,
    ...analyseSession(session, rows ?? [], notes ?? []),
  };
}

type SessionShape = { wake_time: string; sleep_time: string };
type EntryRow = { day_number: number; slot_hour: string; energy_pct: number };
type NoteRow = {
  day_number: number;
  feel_note: string | null;
  unexpected_note: string | null;
  for_jen_note: string | null;
};

/**
 * The analysis itself, from rows already loaded. Shared by the per-session
 * loader above and the bulk exports, which load rows for many sessions at
 * once — so a session's numbers are identical wherever they appear.
 */
export function analyseSession(session: SessionShape, rows: EntryRow[], notes: NoteRow[]) {
  const wake = hourOf(session.wake_time);
  const sleep = hourOf(session.sleep_time);
  const hours = buildSessionSlots(wake, sleep).map(hourOf);
  const entries: Entry[] = rows.map((e) => ({
    dayNumber: e.day_number,
    hour: hourOf(e.slot_hour),
    pct: e.energy_pct,
  }));
  const map: HourAverage[] = computeWeeklyMap(entries, hours);
  const windows: Windows = findWindows(map);

  const reflections: Reflection[] = [...notes]
    .sort((a, b) => a.day_number - b.day_number)
    .map((n) => ({
      dayNumber: n.day_number,
      feel: n.feel_note,
      unexpected: n.unexpected_note,
      forJen: n.for_jen_note,
    }))
    .filter((r) => r.feel || r.unexpected || r.forJen);

  return {
    wake,
    sleep,
    hours,
    entries,
    map,
    windows,
    reflections,
    /** The free tier's result: the two strongest hours (Jen, 2026-09-24). */
    topPeak: topHours(map),
    /** Below this, the results screen withholds the peak hours entirely. */
    hasEnoughData: entries.length >= MIN_HOURS_FOR_RESULT,
    flatTop: isFlatTop(entries),
  };
}
