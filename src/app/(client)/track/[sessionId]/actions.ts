"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Marks a session complete and moves to the results screen. A Server Action
 * rather than a side effect of visiting /complete — Next.js prefetches links,
 * so a GET that mutates could complete a session nobody finished.
 */
export async function completeSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/track/${sessionId}`);

  // RLS limits this to the session's own client (or a coach); an id that
  // isn't theirs updates zero rows rather than erroring.
  await supabase
    .from("tracking_sessions")
    .update({ status: "completed" })
    .eq("id", sessionId)
    .eq("client_id", user.id);

  // The nav's "Results" item now points at this session.
  revalidatePath("/", "layout");
  redirect(`/track/${sessionId}/complete`);
}
