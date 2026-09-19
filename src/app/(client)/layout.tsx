import type { ReactNode } from "react";

import { ClientNav } from "@/components/nav/ClientNav";
import type { ClientNavData } from "@/components/nav/nav-types";
import { createClient } from "@/lib/supabase/server";

/**
 * The client app frame: navigation on every client screen (setup, the log,
 * results, the Peak Plan). Pages still do their own auth checks; this only
 * works out where each nav item should lead for the signed-in user.
 */
export default async function ClientLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nav: ClientNavData | null = null;
  if (user) {
    const [{ data: profile }, { data: sessions }, { data: purchases }] = await Promise.all([
      supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
      supabase.from("tracking_sessions").select("id, status").eq("client_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("purchases").select("session_id").eq("client_id", user.id).eq("product", "basic_peak_plan").eq("status", "completed"),
    ]);
    const inProgress = sessions?.find((s) => s.status === "in_progress");
    const completed = sessions?.find((s) => s.status === "completed");
    const paid = new Set((purchases ?? []).map((p) => p.session_id));
    const isStaff = profile?.role === "coach" || profile?.role === "admin";
    // Staff can open any Peak Plan without buying one (see canViewPeakPlan), so the tab isn't locked for them.
    const planned = sessions?.find((s) => paid.has(s.id)) ?? (isStaff ? completed : undefined);
    nav = {
      name: profile?.full_name ?? null,
      logHref: inProgress ? `/track/${inProgress.id}` : null,
      resultsHref: completed ? `/track/${completed.id}/complete` : null,
      planHref: planned ? `/plan/${planned.id}` : null,
      isStaff,
    };
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-cream">
      {nav ? <ClientNav nav={nav} /> : null}
      <div className="flex flex-1 flex-col pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0 print:pb-0">{children}</div>
    </div>
  );
}
