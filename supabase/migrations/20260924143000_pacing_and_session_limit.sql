-- Charge Index — day pacing and the one-free-session rule
--
-- Both come from Jen's feedback after her first run (2026-09-24):
--
--   "Need a way to stop people from filling each day one right after another"
--   "I will have to be the person to reset the data collection. Limit 1 free
--    session."
--
-- The UI enforces both, but the UI isn't the boundary: clients write their
-- entries straight to PostgREST with their own token, so anything the app
-- refuses has to be refused here too.

-- ── 1. A day can't be filled in before its date ────────────────────────────
--
-- Day 1 is the session's start_date, day 2 the next day, and so on. Past days
-- stay open — someone catching up on yesterday evening is the normal case,
-- and Jen's concern is people racing ahead, not filling gaps.
--
-- "Today" is the client's own date, from the timezone stamped on the session
-- at setup (20260915120500_reminders.sql). Sessions created before that
-- column existed fall back to UTC.
create or replace function public.session_day_unlocked(p_session uuid, p_day int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_day <= 1 + (
    (current_timestamp at time zone coalesce(s.timezone, 'UTC'))::date - s.start_date
  )
  from public.tracking_sessions s
  where s.id = p_session
$$;

revoke all on function public.session_day_unlocked(uuid, int) from public;
grant execute on function public.session_day_unlocked(uuid, int) to authenticated, service_role;

drop policy "entries_insert_own" on public.daily_entries;
create policy "entries_insert_own"
  on public.daily_entries for insert
  with check (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
    and public.session_day_unlocked(session_id, day_number)
  );

drop policy "entries_update_own" on public.daily_entries;
create policy "entries_update_own"
  on public.daily_entries for update
  using (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
    and public.session_day_unlocked(session_id, day_number)
  );

drop policy "notes_upsert_own" on public.daily_notes;
create policy "notes_upsert_own"
  on public.daily_notes for insert
  with check (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
    and public.session_day_unlocked(session_id, day_number)
  );

drop policy "notes_update_own" on public.daily_notes;
create policy "notes_update_own"
  on public.daily_notes for update
  using (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
    and public.session_day_unlocked(session_id, day_number)
  );

-- ── 2. One Charge Index per client, until Jen says otherwise ───────────────
--
-- A grant is a row, not a counter: it records who reopened tracking for whom
-- and when, so the history survives. One grant buys one more session.
create table public.session_grants (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  granted_by uuid not null references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create index session_grants_client_idx on public.session_grants (client_id);

alter table public.session_grants enable row level security;

create policy "grants_select_own_or_coach"
  on public.session_grants for select
  using (client_id = auth.uid() or public.is_coach());

create policy "grants_insert_coach"
  on public.session_grants for insert
  with check (public.is_coach() and granted_by = auth.uid());

create policy "grants_delete_coach"
  on public.session_grants for delete
  using (public.is_coach());

-- Coaches and admins aren't limited: Jen tracks her own energy, and needs to
-- be able to run the flow as often as she likes while coaching from it.
create or replace function public.can_start_session()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_coach() or (
    (select count(*) from public.tracking_sessions where client_id = auth.uid())
    < 1 + (select count(*) from public.session_grants where client_id = auth.uid())
  )
$$;

revoke all on function public.can_start_session() from public;
grant execute on function public.can_start_session() to authenticated, service_role;

drop policy "sessions_insert_own" on public.tracking_sessions;
create policy "sessions_insert_own"
  on public.tracking_sessions for insert
  with check (client_id = auth.uid() and public.can_start_session());
