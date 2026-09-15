/**
 * The coach roster — Build Plan Phase 10. Pure aggregation, so it's testable
 * without a database.
 */

import { csvCell } from "@/lib/peak-plan";
import { formatHour } from "@/lib/slots";
import { formatWindow, type Windows } from "@/lib/weekly-map";

export type RosterProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  role: "client" | "coach" | "admin";
};

export type RosterSession = {
  id: string;
  client_id: string;
  label: string | null;
  status: string;
  start_date: string;
  created_at: string;
  day_count: number;
};

export type RosterClient = {
  id: string;
  name: string;
  email: string | null;
  joined: string;
  role: RosterProfile["role"];
  sessionCount: number;
  completedCount: number;
  latest: RosterSession | null;
  draftCount: number;
  noteCount: number;
};

/**
 * One row per client: session counts, the most recent session, how many AI
 * drafts and notes exist. Sorted so the clients Jen most likely needs are on
 * top — most recently started session first, then clients with none, by name.
 *
 * Coaches and admins appear only if they've tracked a session themselves —
 * Jen may well log her own energy, and it should be as visible as anyone's.
 */
export function buildRoster(
  profiles: RosterProfile[],
  sessions: RosterSession[],
  draftSessionIds: Set<string>,
  noteClientIds: string[],
): RosterClient[] {
  const byClient = new Map<string, RosterSession[]>();
  for (const s of sessions) {
    if (!byClient.has(s.client_id)) byClient.set(s.client_id, []);
    byClient.get(s.client_id)!.push(s);
  }
  const notes = new Map<string, number>();
  for (const id of noteClientIds) notes.set(id, (notes.get(id) ?? 0) + 1);

  const newest = (a: RosterSession, b: RosterSession) =>
    b.start_date.localeCompare(a.start_date) || b.created_at.localeCompare(a.created_at);

  return profiles
    .filter((p) => p.role === "client" || byClient.has(p.id))
    .map((p) => {
      const own = (byClient.get(p.id) ?? []).sort(newest);
      return {
        id: p.id,
        name: p.full_name?.trim() || "Unnamed client",
        email: p.email,
        joined: p.created_at,
        role: p.role,
        sessionCount: own.length,
        completedCount: own.filter((s) => s.status === "completed").length,
        latest: own[0] ?? null,
        draftCount: own.filter((s) => draftSessionIds.has(s.id)).length,
        noteCount: notes.get(p.id) ?? 0,
      };
    })
    .sort((a, b) => {
      if (a.latest && b.latest) return newest(a.latest, b.latest);
      if (a.latest || b.latest) return a.latest ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/** Case-insensitive match on name or email. */
export function filterRoster(clients: RosterClient[], query: string): RosterClient[] {
  const q = query.trim().toLowerCase();
  if (!q) return clients;
  return clients.filter((c) => c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q));
}

export type SummaryRow = {
  clientName: string | null;
  clientEmail: string | null;
  label: string | null;
  status: string;
  startDate: string;
  dayCount: number;
  wake: number;
  sleep: number;
  hoursLogged: number;
  coveragePct: number;
  completeDays: number;
  windows: Windows;
  energyType: string | null;
};

/**
 * Bulk export: one row per session with its headline numbers. The detailed
 * per-hour data stays in each session's own CSV (Phase 8). Same cell escaping
 * as the session CSV, so client-written labels can't run as formulas.
 */
export function buildSummaryCsv(rows: SummaryRow[]): string {
  const header = [
    "Client", "Email", "Session", "Status", "Started", "Days", "Waking hours",
    "Hours logged", "Hours covered", "Complete days", "Peak window",
    "Collaboration window", "Recovery window", "AI energy type",
  ];
  const lines = [header, ...rows.map((r) => [
    r.clientName, r.clientEmail, r.label, r.status === "completed" ? "Complete" : "In progress",
    r.startDate, r.dayCount, `${formatHour(r.wake)} – ${formatHour(r.sleep)}`,
    r.hoursLogged, `${r.coveragePct}%`, r.completeDays,
    formatWindow(r.windows.peak), formatWindow(r.windows.collaboration), formatWindow(r.windows.recovery),
    r.energyType,
  ])];
  return "﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
