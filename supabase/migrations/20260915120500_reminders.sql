-- Charge Index — reminder groundwork (Build Plan Phase 11)
--
-- 1. The client's timezone on each session. Reminders fire at local clock
--    times ("hourly while awake"), which can't be worked out without it. It's
--    captured from the browser at setup; sessions created before this have
--    none and are skipped by the reminder engine rather than guessed at.
--
-- 2. A log of reminders sent, unique per session / tracking day / reminder,
--    so a retried or overlapping scheduled run can never send one twice.
--    Written only by server code with the service role; coaches can read it;
--    clients have no policy.

alter table public.tracking_sessions add column timezone text;

create table public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tracking_sessions (id) on delete cascade,
  day_number int not null check (day_number between 1 and 7),
  reminder_key text not null,
  sent_at timestamptz not null default now(),
  unique (session_id, day_number, reminder_key)
);

alter table public.reminder_log enable row level security;

create policy "reminder_log_select_coach"
  on public.reminder_log for select
  using (public.is_coach());
