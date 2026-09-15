import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { consistency } from "@/lib/coach-analysis";
import type { Database } from "@/lib/database.types";
import { fetchAll } from "@/lib/fetch-all";
import type { SummaryRow } from "@/lib/roster";
import { analyseSession } from "@/lib/session-data";

type Db = SupabaseClient<Database>;

/** Everything the roster needs, read in pages past the 1,000-row cap. */
export async function loadRosterData(supabase: Db) {
  const [profiles, sessions, drafts, notes] = await Promise.all([
    fetchAll((from, to) =>
      supabase.from("profiles").select("id, full_name, email, created_at, role").order("id").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("tracking_sessions")
        .select("id, client_id, label, status, start_date, created_at, day_count")
        .order("id")
        .range(from, to),
    ),
    fetchAll((from, to) => supabase.from("ai_insights").select("session_id").order("session_id").range(from, to)),
    fetchAll((from, to) => supabase.from("coach_notes").select("client_id").order("id").range(from, to)),
  ]);
  return {
    profiles,
    sessions,
    draftSessionIds: new Set(drafts.map((d) => d.session_id)),
    noteClientIds: notes.map((n) => n.client_id),
  };
}

/**
 * Sessions with their full analysis, for one client or for everyone. Rows
 * are loaded in bulk and analysed in memory with the same analyseSession()
 * the session pages use, so exported numbers match the screens exactly.
 */
export async function loadSessionBundles(supabase: Db, clientId?: string) {
  const sessions = await fetchAll((from, to) => {
    let q = supabase
      .from("tracking_sessions")
      .select("id, client_id, label, status, start_date, created_at, day_count, wake_time, sleep_time, profiles(full_name, email)");
    if (clientId) q = q.eq("client_id", clientId);
    return q.order("start_date", { ascending: false }).order("id").range(from, to);
  });
  if (sessions.length === 0) return [];

  // One client has few sessions, so filter by id; for everyone, read it all
  // rather than build an id list too long for a URL.
  const ids = sessions.map((s) => s.id);
  const [entries, notes, insights] = await Promise.all([
    fetchAll((from, to) => {
      let q = supabase.from("daily_entries").select("session_id, day_number, slot_hour, energy_pct");
      if (clientId) q = q.in("session_id", ids);
      return q.order("id").range(from, to);
    }),
    fetchAll((from, to) => {
      let q = supabase.from("daily_notes").select("session_id, day_number, feel_note, unexpected_note, for_jen_note");
      if (clientId) q = q.in("session_id", ids);
      return q.order("id").range(from, to);
    }),
    fetchAll((from, to) => {
      let q = supabase.from("ai_insights").select("session_id, energy_type");
      if (clientId) q = q.in("session_id", ids);
      return q.order("session_id").range(from, to);
    }),
  ]);

  const group = <T extends { session_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      if (!m.has(r.session_id)) m.set(r.session_id, []);
      m.get(r.session_id)!.push(r);
    }
    return m;
  };
  const entriesBy = group(entries);
  const notesBy = group(notes);
  const energyBy = new Map(insights.map((i) => [i.session_id, i.energy_type]));

  return sessions.map((session) => {
    const analysis = analyseSession(session, entriesBy.get(session.id) ?? [], notesBy.get(session.id) ?? []);
    const c = consistency(analysis.entries, analysis.hours, session.day_count);
    return {
      session,
      clientName: session.profiles?.full_name ?? null,
      clientEmail: session.profiles?.email ?? null,
      energyType: energyBy.get(session.id) ?? null,
      consistency: c,
      ...analysis,
    };
  });
}

export type SessionBundle = Awaited<ReturnType<typeof loadSessionBundles>>[number];

export function toSummaryRow(b: SessionBundle): SummaryRow {
  return {
    clientName: b.clientName,
    clientEmail: b.clientEmail,
    label: b.session.label,
    status: b.session.status,
    startDate: b.session.start_date,
    dayCount: b.session.day_count,
    wake: b.wake,
    sleep: b.sleep,
    hoursLogged: b.entries.length,
    coveragePct: b.consistency.coveragePct,
    completeDays: b.consistency.completeDays,
    windows: b.windows,
    energyType: b.energyType,
  };
}
