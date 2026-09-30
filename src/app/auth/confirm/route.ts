import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Lands here from the Supabase confirmation email.
 *
 * The project's confirmation email template links here with a `token_hash`
 * (`{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`), which verifies
 * in any browser — someone can sign up on a laptop and confirm on their phone.
 *
 * A `code` is also accepted, in case the template is ever reset to Supabase's
 * default `{{ .ConfirmationURL }}`: that flow sends a one-time code back here,
 * which only works in the same browser the signup started in.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  // Set when the signup came from an invite link, so confirming lands on the
  // join page rather than the app's front door. Paths only, never a URL.
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  }

  redirect(`/login?error=confirm&next=${encodeURIComponent(next)}`);
}
