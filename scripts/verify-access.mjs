#!/usr/bin/env node
/**
 * Live check of page- and file-level access: who can open which screen.
 *
 * Complements verify-rls.mjs (database rules) by requesting the real routes as
 * real signed-in users. Each user signs in through @supabase/ssr exactly as the
 * app does, and the auth cookies it sets are replayed on plain HTTP requests.
 * Creates throwaway users and data in the LIVE project, deletes them after.
 *
 *   node --env-file=.env.local scripts/verify-access.mjs                                # localhost:3000
 *   node --env-file=.env.local scripts/verify-access.mjs https://charge-index.vercel.app
 *
 * Writes the fetched .ics and .csv to $VERIFY_OUT_DIR if set, for inspection.
 * Exits non-zero if any check fails.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
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
const pass = (m) => console.log(`  PASS  ${m}`);
const fail = (m) => { failures++; console.log(`  FAIL  ${m}`); };
const expect = (ok, m) => (ok ? pass(m) : fail(m));

async function makeUser(tag, role = "client") {
  const email = `access-check-${tag}-${stamp}@example.com`;
  const password = `AccessCheck!${stamp}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: tag } });
  if (error) throw new Error(`createUser ${tag}: ${error.message}`);
  created.push(data.user.id);
  if (role !== "client") await admin.from("profiles").update({ role }).eq("id", data.user.id);

  // Sign in the way the app does and keep the cookies it writes.
  const jar = new Map();
  const ssr = createServerClient(URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error: signInError } = await ssr.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn ${tag}: ${signInError.message}`);
  const cookie = [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
  return { id: data.user.id, email, cookie };
}

async function makeSession(clientId, label, shape) {
  const { data: s, error } = await admin
    .from("tracking_sessions")
    .insert({ client_id: clientId, label, wake_time: "08:00", sleep_time: "14:00", day_count: 5, status: "completed" })
    .select("id")
    .single();
  if (error) throw new Error(`session ${label}: ${error.message}`);
  const rows = [];
  for (let d = 1; d <= 3; d++) shape.forEach((pct, i) => rows.push({ session_id: s.id, day_number: d, slot_hour: `${String(8 + i).padStart(2, "0")}:00`, energy_pct: pct }));
  await admin.from("daily_entries").insert(rows);
  return s.id;
}

const buy = (clientId, sessionId, status = "completed") =>
  admin.from("purchases").insert({ client_id: clientId, session_id: sessionId, product: "basic_peak_plan", status });

async function get(path, user) {
  const res = await fetch(BASE + path, { redirect: "manual", headers: user ? { cookie: user.cookie } : {} });
  // Read raw bytes: res.text() silently strips a UTF-8 BOM, which the CSV must keep.
  const bytes = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    type: res.headers.get("content-type") || "",
    location: res.headers.get("location") || "",
    bytes,
    body: bytes.toString("utf8"),
  };
}

try {
  console.log(`Target: ${BASE}`);
  const coach = await makeUser("coach", "coach");
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const carol = await makeUser("carol");

  const peakShape = [50, 100, 100, 75, 50, 25]; // 8 AM–2 PM: peak 9–11 AM
  const lowShape = [50, 50, 25, 25, 50, 50]; // no peak window
  const alicePaid = await makeSession(alice.id, "Alice paid", peakShape);
  const aliceUnpaid = await makeSession(alice.id, "Alice unpaid", peakShape);
  const bobSession = await makeSession(bob.id, "Bob pending", peakShape);
  const carolSession = await makeSession(carol.id, "Carol no peak", lowShape);
  await buy(alice.id, alicePaid);
  await buy(bob.id, bobSession, "pending");
  await buy(carol.id, carolSession);

  console.log("\nSigned out");
  for (const path of [`/plan/${alicePaid}`, `/plan/${alicePaid}/peak-plan.ics`, `/coach/sessions/${alicePaid}/export.csv`]) {
    const r = await get(path);
    expect(r.status === 307 && r.location.includes("/login"), `${path.split("/").slice(0, 2).join("/")}… redirects to login (${r.status})`);
  }

  console.log("\nClient without a purchase");
  let r = await get(`/plan/${aliceUnpaid}`, alice);
  expect(r.status === 404, "own session's plan without a purchase is 404");
  r = await get(`/plan/${aliceUnpaid}/peak-plan.ics`, alice);
  expect(r.status === 404, "own session's calendar file without a purchase is 404");
  r = await get(`/track/${aliceUnpaid}/complete`, alice);
  expect(r.status === 200 && r.body.includes("Unlock my plan") && !r.body.includes("View my Peak Plan"), "results screen still offers the locked plan card");

  console.log("\nClient with a completed purchase for this session");
  r = await get(`/plan/${alicePaid}`, alice);
  expect(r.status === 200 && r.body.includes("Your charged schedule"), "plan opens");
  expect(r.body.includes("Nothing books over 9 AM – 11 AM"), "plan guards the computed peak window");
  r = await get(`/plan/${alicePaid}/peak-plan.ics`, alice);
  expect(r.status === 200 && r.type.startsWith("text/calendar") && r.body.startsWith("BEGIN:VCALENDAR"), "calendar file downloads");
  if (process.env.VERIFY_OUT_DIR) writeFileSync(join(process.env.VERIFY_OUT_DIR, "peak-plan.ics"), r.bytes);
  r = await get(`/track/${alicePaid}/complete`, alice);
  expect(r.body.includes("View my Peak Plan"), "results screen links to the plan");
  r = await get(`/coach/sessions/${alicePaid}/export.csv`, alice);
  expect(r.status === 404, "client cannot download the coach CSV, even for own session");

  console.log("\nOther clients");
  r = await get(`/plan/${bobSession}`, bob);
  expect(r.status === 404, "a pending purchase doesn't unlock the plan");
  r = await get(`/plan/${alicePaid}`, bob);
  expect(r.status === 404, "another client's paid plan is 404");
  r = await get(`/plan/${alicePaid}/peak-plan.ics`, bob);
  expect(r.status === 404, "another client's calendar file is 404");
  r = await get(`/track/${alicePaid}/complete`, bob);
  expect(r.status === 404, "another client's results screen is 404");
  r = await get(`/plan/${carolSession}`, carol);
  expect(r.status === 200 && r.body.includes("No peak window yet"), "paid plan with no peak window opens and says so");
  r = await get(`/plan/${carolSession}/peak-plan.ics`, carol);
  expect(r.status === 404, "no calendar file when there's no peak window to protect");
  r = await get("/coach", carol);
  expect(r.status === 404, "client can't open the coach list");

  console.log("\nCoach");
  r = await get("/coach", coach);
  expect(r.status === 200 && r.body.includes("Alice paid") && r.body.includes("Bob pending"), "coach list shows every client's sessions");
  r = await get(`/coach/sessions/${alicePaid}`, coach);
  expect(r.status === 200 && r.body.includes("Charge curve") && r.body.includes("Draft insights"), "coach session page renders the analysis and insights panel");
  r = await get(`/coach/sessions/${alicePaid}`, alice);
  expect(r.status === 404 && !r.body.includes("Draft insights"), "client can't open the coach session page for their own session");
  r = await get(`/plan/${bobSession}`, coach);
  expect(r.status === 200, "coach opens any plan, purchased or not");
  r = await get(`/coach/sessions/${alicePaid}/export.csv`, coach);
  expect(r.status === 200 && r.type.startsWith("text/csv") && r.body.startsWith("﻿"), "coach downloads the CSV");
  expect(r.body.includes(alice.email), "CSV carries the client's email");
  if (process.env.VERIFY_OUT_DIR) writeFileSync(join(process.env.VERIFY_OUT_DIR, "session.csv"), r.bytes);
} catch (error) {
  fail(`script error: ${error.message}`);
} finally {
  console.log("\nCleanup");
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) fail(`delete ${id}: ${error.message}`);
  }
  const { count } = await admin
    .from("purchases")
    .select("*", { count: "exact", head: true })
    .in("client_id", created.length ? created : ["00000000-0000-0000-0000-000000000000"]);
  expect(count === 0, `deleted ${created.length} test users, their sessions and purchases`);
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}
