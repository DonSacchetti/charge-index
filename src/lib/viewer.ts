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
