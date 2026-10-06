"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | null;

/**
 * Cloudflare Turnstile's token, when the bot check is switched on. Supabase
 * verifies it against the secret in its own auth settings; if the project has
 * no CAPTCHA configured it ignores whatever is sent, so passing it always is
 * safe (Josh, 2026-10-06).
 */
function captcha(formData: FormData): { captchaToken?: string } {
  const token = String(formData.get("captcha_token") ?? "");
  return token ? { captchaToken: token } : {};
}

/** Supabase's wording for a missing or stale token isn't much use to a person. */
function authMessage(message: string): string {
  if (/captcha/i.test(message)) return "The bot check didn't go through. Tick it again, or refresh the page.";
  return message;
}

function safeNext(next: FormDataEntryValue | null): string {
  // Only ever redirect to a path on this app — never to an absolute URL
  // supplied through the query string.
  const value = typeof next === "string" ? next : "";
  // Default to "/", which sends coaches to /coach and clients to /setup.
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Where to land afterwards — an invite link puts /join/<token> here, and it
  // has to survive the round trip through the confirmation email.
  const next = safeNext(formData.get("next"));

  if (!fullName) return { error: "Add your first name to begin." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "That email does not look right." };
  if (password.length < 8)
    return { error: "Choose a password of at least 8 characters." };

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by the handle_new_user trigger to populate profiles.full_name.
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      ...captcha(formData),
    },
  });

  if (error) return { error: authMessage(error.message) };

  // Session is null when email confirmation is required — send them to a
  // "check your inbox" state rather than into the app.
  if (!data.session) redirect(`/signup?check=${encodeURIComponent(email)}`);

  revalidatePath("/", "layout");
  redirect(next === "/" ? "/setup" : next);
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password, options: captcha(formData) });

  if (error) return { error: authMessage(error.message) };

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
