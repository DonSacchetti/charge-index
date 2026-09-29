-- Charge Index — entries remember when they last changed
--
-- The flag review (20260929170000) raises the flag again when a client logs
-- after Jen reviewed it. That was written against created_at, which never
-- moves when someone *changes* an hour they'd already logged — so re-filling
-- the same grid a second time would have stayed invisible.
alter table public.daily_entries add column updated_at timestamptz not null default now();

create or replace function public.touch_daily_entry()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

create trigger daily_entries_touch
  before update on public.daily_entries
  for each row execute function public.touch_daily_entry();

-- The column is written by the trigger, never by a client.
revoke update on public.daily_entries from anon, authenticated;
grant update (day_number, slot_hour, energy_pct) on public.daily_entries to authenticated;
