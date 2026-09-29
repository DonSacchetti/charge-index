-- Charge Index — the 24-hour logging window, a purchase that adds a session,
-- and Jen editing a client's entries. All from her review on 2026-09-29.

-- ── 1. An hour can be logged for 24 hours, then it closes ──────────────────
--
-- Jen: "restrict users from back filling out session days for anything past
-- the last 24 hours… it would be untruthful to tell what you would have put
-- for that 1 hour time block post 24 hours later." Josh chose the per-hour
-- reading: 2 PM Tuesday can be logged until 2 PM Wednesday, then it locks.
--
-- This replaces session_day_unlocked(), which worked a whole day at a time.
-- The hour's real moment needs the session's own timezone (stamped at setup;
-- older sessions fall back to UTC) and has to account for slots that wrap
-- past midnight: with a 1 AM bedtime, the 00:00 slot belongs to the next
-- calendar day, not the same one.
create or replace function public.entry_hour_open(p_session uuid, p_day int, p_slot time)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when s.id is null then false
    -- Coaches work with clients directly, by phone or in the room, so the
    -- window is not theirs (Jen wants to fix entries with the client).
    when public.is_coach() then true
    else now() >= hour_start and now() < hour_start + interval '24 hours'
  end
  from public.tracking_sessions s
  cross join lateral (
    select (
      (
        s.start_date
        + (p_day - 1)
        + case when p_slot < s.wake_time then 1 else 0 end
      )::timestamp + p_slot
    ) at time zone coalesce(s.timezone, 'UTC') as hour_start
  ) h
  where s.id = p_session
$$;

revoke all on function public.entry_hour_open(uuid, int, time) from public;
grant execute on function public.entry_hour_open(uuid, int, time) to authenticated, service_role;

drop policy "entries_insert_own" on public.daily_entries;
create policy "entries_insert_own"
  on public.daily_entries for insert
  with check (
    (
      exists (
        select 1 from public.tracking_sessions s
        where s.id = session_id and s.client_id = auth.uid()
      )
      or public.is_coach()
    )
    and public.entry_hour_open(session_id, day_number, slot_hour)
  );

drop policy "entries_update_own" on public.daily_entries;
create policy "entries_update_own"
  on public.daily_entries for update
  using (
    (
      exists (
        select 1 from public.tracking_sessions s
        where s.id = session_id and s.client_id = auth.uid()
      )
      or public.is_coach()
    )
    and public.entry_hour_open(session_id, day_number, slot_hour)
  );

drop policy "entries_delete_own" on public.daily_entries;
create policy "entries_delete_own"
  on public.daily_entries for delete
  using (
    (
      exists (
        select 1 from public.tracking_sessions s
        where s.id = session_id and s.client_id = auth.uid()
      )
      or public.is_coach()
    )
    and public.entry_hour_open(session_id, day_number, slot_hour)
  );

-- Reflections follow the day they belong to, at the same 24-hour distance
-- from the day's first waking hour.
drop policy "notes_upsert_own" on public.daily_notes;
create policy "notes_upsert_own"
  on public.daily_notes for insert
  with check (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
    and exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and public.entry_hour_open(session_id, day_number, s.wake_time)
    )
  );

drop policy "notes_update_own" on public.daily_notes;
create policy "notes_update_own"
  on public.daily_notes for update
  using (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
    and exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and public.entry_hour_open(session_id, day_number, s.wake_time)
    )
  );

drop function if exists public.session_day_unlocked(uuid, int);

-- ── 2. Buying a Peak Plan opens another Charge Index ───────────────────────
--
-- Free gets you one. Each completed basic_peak_plan purchase adds one more,
-- and Jen can still grant extras by hand from the client page.
create or replace function public.can_start_session()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_coach() or (
    (select count(*) from public.tracking_sessions where client_id = auth.uid())
    < 1
      + (select count(*) from public.session_grants where client_id = auth.uid())
      + (
        select count(*) from public.purchases
        where client_id = auth.uid()
          and product = 'basic_peak_plan'
          and status = 'completed'
      )
  )
$$;
