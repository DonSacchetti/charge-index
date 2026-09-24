-- Charge Index — per-session entry counts for the roster
--
-- Jen wants to spot, from the client list, anyone logging 100% almost every
-- hour: "If someone was selecting 100% all the time, I would want the system
-- to flag me so that I can have a quick coaching call" (2026-09-24).
--
-- Counting in the database keeps the roster to one row per session instead of
-- one per logged hour. security_invoker means the caller's own RLS decides
-- what the view returns — a client sees only their own sessions here, exactly
-- as they do on the underlying tables.
create view public.session_entry_stats
with (security_invoker = true) as
select
  s.id as session_id,
  s.client_id,
  count(e.id)::int as hours_logged,
  count(e.id) filter (where e.energy_pct = 100)::int as top_hours
from public.tracking_sessions s
left join public.daily_entries e on e.session_id = s.id
group by s.id, s.client_id;

grant select on public.session_entry_stats to authenticated, service_role;
