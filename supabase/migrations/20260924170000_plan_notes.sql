-- Charge Index — the client's own notes on their Peak Plan schedule
--
-- Josh, 2026-09-24: once a client has unlocked their Peak Plan, let them write
-- what they actually intend to do in each hour, then put that schedule in
-- their calendar the same way the hourly tracking reminders work.
--
-- The plan tells them what KIND of work each hour suits ("Strategic thinking ·
-- deep work"); this is where they say what that means for them this week.
create table public.plan_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tracking_sessions (id) on delete cascade,
  slot_hour time not null,
  body text not null,
  updated_at timestamptz not null default now(),
  unique (session_id, slot_hour)
);

create index plan_notes_session_idx on public.plan_notes (session_id);

alter table public.plan_notes enable row level security;

-- Writing a plan note is a paid-plan feature, so it carries the same gate the
-- plan page does: the session is the client's own AND they've bought its plan.
-- Mirrors canViewPeakPlan() for the client half; coaches read but never write
-- a client's own words, as with entries and reflections.
create or replace function public.has_peak_plan(p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tracking_sessions s
    join public.purchases p
      on p.session_id = s.id
     and p.client_id = s.client_id
     and p.product = 'basic_peak_plan'
     and p.status = 'completed'
    where s.id = p_session and s.client_id = auth.uid()
  )
$$;

revoke all on function public.has_peak_plan(uuid) from public;
grant execute on function public.has_peak_plan(uuid) to authenticated, service_role;

create policy "plan_notes_select_own_or_coach"
  on public.plan_notes for select
  using (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
    or public.is_coach()
  );

create policy "plan_notes_insert_own"
  on public.plan_notes for insert
  with check (public.has_peak_plan(session_id));

create policy "plan_notes_update_own"
  on public.plan_notes for update
  using (public.has_peak_plan(session_id));

create policy "plan_notes_delete_own"
  on public.plan_notes for delete
  using (public.has_peak_plan(session_id));
