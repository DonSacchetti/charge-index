-- Charge Index — close privilege escalation through profiles
--
-- Found 2026-09-14. Supabase grants the anon and authenticated roles UPDATE
-- and INSERT on every column of public tables, leaving RLS as the only gate.
-- "profiles_update_own" allows a user to update their own row, and says
-- nothing about which columns — so any signed-up client could run
--
--   update profiles set role = 'coach' where id = auth.uid()
--
-- and is_coach() would then open every client's sessions, entries, notes,
-- profiles, purchases and the coach-only analysis tables. Verified live with
-- test users before this fix; no real accounts existed at the time.
-- The same hole let a client set their own stripe_customer_id, which Phase 2
-- will trust.
--
-- Fix: column-level privileges, which Postgres checks before RLS runs. The
-- only profile field a client may ever change is their name. Role and Stripe
-- linkage change only through the service role (server code) or SQL.

revoke insert, update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;
