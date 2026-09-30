"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Claim a team invite. Every rule lives in join_team() in the database —
 * a spent lead link, a team with no seats open, a full team, someone already
 * in another team — so the same answer comes back however it's called.
 */
export async function claimInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/join/${token}`)}`);

  const { error } = await supabase.rpc("join_team", { p_token: token });
  if (error) redirect(`/join/${token}?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/", "layout");
  redirect("/team");
}
