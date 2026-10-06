/**
 * Sign a throwaway check user in without a password.
 *
 * Once a CAPTCHA is enabled on a Supabase project (Turnstile, added 2026-10-06)
 * GoTrue refuses every password sign-in that arrives without a token — these
 * scripts included, which is how the whole suite failed the moment the local
 * stack matched production. A CAPTCHA can't be solved from a script and
 * shouldn't be: the point is to prove a human is at the keyboard.
 *
 * So the checks take the door that isn't guarded. The service-role key mints a
 * one-time link for the user, and verifying its token hash establishes exactly
 * the same session as a password would. /verify carries no CAPTCHA because the
 * token itself is the proof, and minting one already requires the service-role
 * key — nothing is weakened by using it here.
 */
export async function signInAs(admin, client, email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`generateLink ${email}: ${error.message}`);

  const tokenHash = data?.properties?.hashed_token;
  if (!tokenHash) throw new Error(`generateLink ${email}: no token returned`);

  const { error: verifyError } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (verifyError) throw new Error(`signIn ${email}: ${verifyError.message}`);
}
