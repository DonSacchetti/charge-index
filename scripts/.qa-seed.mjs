import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `qa-${Date.now()}@example.com`, password = "QaPassword!2026";
const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
await admin.from("profiles").update({ full_name: "Quinn Tester" }).eq("id", u.user.id);
const start = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
const { data: s } = await admin.from("tracking_sessions").insert({ client_id: u.user.id, label: "Fall 2026", wake_time: "07:00:00", sleep_time: "22:00:00", day_count: 5, start_date: start, timezone: "America/Toronto", status: "completed" }).select("id").single();
const shape = { 7: 50, 8: 75, 9: 100, 10: 100, 11: 100, 12: 75, 13: 50, 14: 25, 15: 25, 16: 50, 17: 75, 18: 75, 19: 50, 20: 50, 21: 25 };
const rows = [];
for (let d = 1; d <= 5; d++) for (const [h, pct] of Object.entries(shape)) { if (d === 3 && Number(h) === 14) continue; rows.push({ session_id: s.id, day_number: d, slot_hour: `${String(h).padStart(2, "0")}:00`, energy_pct: pct }); }
await admin.from("daily_entries").insert(rows);
console.log(JSON.stringify({ email, password, sessionId: s.id, entries: rows.length }));
