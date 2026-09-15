import { notFound, redirect } from "next/navigation";

import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type Role = Database["public"]["Enums"]["user_role"];

/** The signed-in user and their role, or a redirect to /login. */
export async function requireViewer(next: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const role: Role = profile?.role ?? "client";
  return {
    supabase,
    user,
    role,
    fullName: profile?.full_name ?? null,
    isCoach: role === "coach" || role === "admin",
  };
}

/**
 * Coach-only pages. A client gets a plain 404 rather than an "access denied",
 * so the coach area doesn't advertise itself. This is the UI layer — RLS on
 * every table is still what actually stops a client reading other clients.
 */
export async function requireCoach(next: string) {
  const viewer = await requireViewer(next);
  if (!viewer.isCoach) notFound();
  return viewer;
}

/**
 * Who may open a session's Peak Plan (and its calendar file):
 * - a coach or admin, always;
 * - the session's own client, once they hold a completed `basic_peak_plan`
 *   purchase for that session. A $249 `peak_plan_session` purchase also
 *   writes a `basic_peak_plan` row (Build Plan Phase 2), so it unlocks this too.
 *
 * Purchases can only be written by server code with the service role (RLS
 * gives clients no insert policy), so a client can't grant themselves access.
 * The purchase is tied to the session: the $49 plan is built from one
 * session's data, so a purchase with no session_id doesn't unlock any plan.
 */
export async function canViewPeakPlan(
  viewer: Awaited<ReturnType<typeof requireViewer>>,
  session: { id: string; client_id: string },
): Promise<boolean> {
  if (viewer.isCoach) return true;
  if (session.client_id !== viewer.user.id) return false;

  const { data } = await viewer.supabase
    .from("purchases")
    .select("id")
    .eq("client_id", viewer.user.id)
    .eq("session_id", session.id)
    .eq("product", "basic_peak_plan")
    .eq("status", "completed")
    .limit(1);
  return (data?.length ?? 0) > 0;
}
