#!/usr/bin/env node
/**
 * Live check of the database's access rules (RLS + column privileges).
 *
 * Creates throwaway users against the REAL Supabase project, tries every
 * access path that matters — clients against each other, a client against
 * the coach role, a coach against client data — then deletes everything it
 * made. Run after any migration or policy change:
 *
 *   node --env-file=.env.local scripts/verify-rls.mjs
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY. Exits non-zero if any check fails.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SERVICE) {
  console.error("Missing Supabase env vars — run with --env-file=.env.local");
  process.exit(2);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const stamp = Date.now();
const created = [];
let failures = 0;

const pass = (msg) => console.log(`  PASS  ${msg}`);
const fail = (msg) => {
  failures++;
  console.log(`  FAIL  ${msg}`);
};
const expect = (ok, msg) => (ok ? pass(msg) : fail(msg));
const denied = (res) => !!res.error && res.error.code === "42501";

async function makeUser(tag, role = "client") {
  const email = `rls-check-${tag}-${stamp}@example.com`;
  const password = `RlsCheck!${stamp}${tag}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: tag },
  });
  if (error) throw new Error(`createUser ${tag}: ${error.message}`);
  created.push(data.user.id);
  if (role !== "client") {
    await admin.from("profiles").update({ role }).eq("id", data.user.id);
  }
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn ${tag}: ${signInError.message}`);
  return { id: data.user.id, email, db: client };
}

async function seedSession(user) {
  const { data: session } = await user.db
    .from("tracking_sessions")
    .insert({ client_id: user.id, label: "rls-check", wake_time: "06:00", sleep_time: "22:00", day_count: 5 })
    .select("id")
    .single();
  await user.db.from("daily_entries").insert({ session_id: session.id, day_number: 1, slot_hour: "09:00", energy_pct: 75 });
  await user.db.from("daily_notes").insert({ session_id: session.id, day_number: 1, for_jen_note: "private" });
  await admin.from("session_analysis").insert({ session_id: session.id, windows: {} });
  await admin.from("ai_insights").insert({ session_id: session.id, energy_type: "check" });
  await admin.from("purchases").insert({ client_id: user.id, product: "basic_peak_plan", status: "completed" });
  return session.id;
}

const count = async (db, table, column, value) => {
  const { data } = await db.from(table).select(column).eq(column, value);
  return data?.length ?? 0;
};

try {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const coach = await makeUser("coach", "coach");
  const aliceSession = await seedSession(alice);

  console.log("\nProfiles — no self-promotion");
  const { data: aliceProfile } = await admin.from("profiles").select("role, full_name").eq("id", alice.id).single();
  expect(aliceProfile?.role === "client" && aliceProfile?.full_name === "alice", "signup trigger creates a client profile with the name");
  expect(denied(await alice.db.from("profiles").update({ role: "coach" }).eq("id", alice.id)), "client cannot set own role");
  expect(denied(await alice.db.from("profiles").update({ role: "admin", full_name: "x" }).eq("id", alice.id)), "client cannot smuggle role alongside a name change");
  expect(denied(await alice.db.from("profiles").update({ stripe_customer_id: "cus_forged" }).eq("id", alice.id)), "client cannot set own stripe_customer_id");
  expect(!(await alice.db.from("profiles").update({ full_name: "alice" }).eq("id", alice.id)).error, "client can still change own name");
  const { data: withEmail } = await admin.from("profiles").select("email").eq("id", alice.id).single();
  expect(withEmail?.email === alice.email, "signup trigger copies the account email onto the profile");
  expect(denied(await alice.db.from("profiles").update({ email: "spoofed@example.com" }).eq("id", alice.id)), "client cannot overwrite the email on their profile");
  const changedEmail = `rls-check-changed-${stamp}@example.com`;
  await admin.auth.admin.updateUserById(alice.id, { email: changedEmail, email_confirm: true });
  const { data: afterChange } = await admin.from("profiles").select("email").eq("id", alice.id).single();
  expect(afterChange?.email === changedEmail, "changing the account email updates the profile");
  expect((await bob.db.from("profiles").select("id")).data?.length === 1, "client sees only their own profile");

  console.log("\nClient ↔ client");
  expect((await count(bob.db, "tracking_sessions", "id", aliceSession)) === 0, "bob cannot read alice's session");
  expect((await count(bob.db, "daily_entries", "session_id", aliceSession)) === 0, "bob cannot read alice's entries");
  expect((await count(bob.db, "daily_notes", "session_id", aliceSession)) === 0, "bob cannot read alice's reflections");
  expect((await count(bob.db, "purchases", "client_id", alice.id)) === 0, "bob cannot read alice's purchases");
  expect(denied(await bob.db.from("daily_entries").insert({ session_id: aliceSession, day_number: 2, slot_hour: "10:00", energy_pct: 10 })), "bob cannot write entries into alice's session");
  expect(denied(await bob.db.from("tracking_sessions").insert({ client_id: alice.id, wake_time: "06:00", sleep_time: "22:00", day_count: 5 })), "bob cannot create a session owned by alice");
  await bob.db.from("tracking_sessions").update({ status: "completed" }).eq("id", aliceSession);
  expect((await admin.from("tracking_sessions").select("status").eq("id", aliceSession).single()).data?.status === "in_progress", "bob cannot modify alice's session");

  console.log("\nClient → coach-only and paid data");
  expect((await count(alice.db, "session_analysis", "session_id", aliceSession)) === 0, "client reads no session_analysis, even for own session");
  expect((await count(alice.db, "ai_insights", "session_id", aliceSession)) === 0, "client reads no ai_insights, even for own session");
  expect(denied(await alice.db.from("ai_insights").insert({ session_id: aliceSession, energy_type: "forged" })), "client cannot write ai_insights");
  expect(denied(await alice.db.from("purchases").insert({ client_id: alice.id, product: "peak_plan_session", status: "completed" })), "client cannot grant themselves a purchase");
  expect((await count(alice.db, "purchases", "client_id", alice.id)) === 1, "client can read their own purchase");

  console.log("\nCoach");
  expect((await count(coach.db, "tracking_sessions", "id", aliceSession)) === 1, "coach reads a client's session");
  expect((await count(coach.db, "daily_entries", "session_id", aliceSession)) === 1, "coach reads a client's entries");
  expect((await count(coach.db, "daily_notes", "session_id", aliceSession)) === 1, "coach reads a client's reflections");
  expect((await count(coach.db, "session_analysis", "session_id", aliceSession)) === 1, "coach reads session_analysis");
  expect((await count(coach.db, "ai_insights", "session_id", aliceSession)) === 1, "coach reads ai_insights");
  expect((await coach.db.from("profiles").select("id").in("id", [alice.id, bob.id])).data?.length === 2, "coach reads client profiles");
  expect(!(await coach.db.from("ai_insights").update({ energy_type: "coach draft" }).eq("session_id", aliceSession)).error, "coach can write AI insight drafts");
  expect(denied(await alice.db.from("ai_insights").update({ energy_type: "forged" }).eq("session_id", aliceSession)) || (await admin.from("ai_insights").select("energy_type").eq("session_id", aliceSession).single()).data?.energy_type === "coach draft", "client still cannot change AI insights");
  expect(denied(await coach.db.from("daily_entries").insert({ session_id: aliceSession, day_number: 3, slot_hour: "11:00", energy_pct: 50 })), "coach cannot write a client's entries");
  expect(denied(await coach.db.from("profiles").update({ role: "admin" }).eq("id", coach.id)), "coach cannot change roles either");

  console.log("\nCoach notes");
  const coach2 = await makeUser("coach2", "coach");
  const { data: note, error: noteError } = await coach.db.from("coach_notes").insert({ client_id: alice.id, body: "Private note about alice" }).select("id, author_id").single();
  expect(!noteError && note?.author_id === coach.id, "coach can write a note, stamped with their own id");
  expect(denied(await coach.db.from("coach_notes").insert({ client_id: alice.id, author_id: coach2.id, body: "forged author" })), "coach cannot write a note as another coach");
  expect((await count(coach2.db, "coach_notes", "client_id", alice.id)) === 1, "another coach can read the note");
  await coach2.db.from("coach_notes").delete().eq("id", note.id);
  await coach2.db.from("coach_notes").update({ body: "tampered" }).eq("id", note.id);
  const { data: noteAfter } = await admin.from("coach_notes").select("body").eq("id", note.id).single();
  expect(noteAfter?.body === "Private note about alice", "another coach cannot edit or delete it");
  expect((await count(alice.db, "coach_notes", "client_id", alice.id)) === 0, "the client cannot read notes about themselves");
  expect(denied(await alice.db.from("coach_notes").insert({ client_id: alice.id, body: "client note" })), "a client cannot write coach notes");
  expect(!(await coach.db.from("coach_notes").delete().eq("id", note.id)).error && (await count(admin, "coach_notes", "id", note.id)) === 0, "the author can delete their note");

  console.log("\nReminder log");
  await admin.from("reminder_log").insert({ session_id: aliceSession, day_number: 1, reminder_key: "rls-check" });
  expect((await count(coach.db, "reminder_log", "session_id", aliceSession)) === 1, "coach can read the reminder log");
  expect((await count(alice.db, "reminder_log", "session_id", aliceSession)) === 0, "client cannot read the reminder log, even for their own session");
  expect(denied(await alice.db.from("reminder_log").insert({ session_id: aliceSession, day_number: 2, reminder_key: "forged" })), "client cannot write the reminder log");
  expect(denied(await coach.db.from("reminder_log").insert({ session_id: aliceSession, day_number: 2, reminder_key: "forged" })), "coach cannot write the reminder log either (server-only)");
} catch (error) {
  fail(`script error: ${error.message}`);
} finally {
  console.log("\nCleanup");
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) fail(`delete user ${id}: ${error.message}`);
  }
  const { count: leftover } = await admin
    .from("tracking_sessions")
    .select("*", { count: "exact", head: true })
    .eq("label", "rls-check");
  expect(leftover === 0, `deleted ${created.length} test users and their data`);
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}
