import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * Service-role client: bypasses RLS entirely. Only for work with no signed-in
 * user behind it — currently just the scheduled reminder run. Never import
 * this from a page, component or anything a user's request can reach
 * directly; use the cookie-scoped client from ./server instead.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
