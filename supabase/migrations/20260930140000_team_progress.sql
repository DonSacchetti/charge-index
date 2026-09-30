-- Charge Index — corporate teams, stage 2: what the lead can see
--
-- A team lead sees who has joined and how far through the week each person
-- is, and nothing else — no entries, no curve, no results (Jen and Josh,
-- 2026-09-29). That's a problem for ordinary row-level security: working out
-- "how far along" means counting rows the lead must never read.
--
-- So progress is computed here, in a function that runs as the owner and
-- returns aggregates only. The lead gets numbers; the hours behind them never
-- leave the database.

-- ── The time rule, separated from the permission ───────────────────────────
--
-- entry_hour_open() answers "may I write this hour?", which is true for a
-- coach whatever the clock says. Progress needs the plain question — has this
-- hour's 24 hours run out? — so the two are split.

create or replace function public.entry_window_open(p_session uuid, p_day int, p_slot time)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when s.id is null then false
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

revoke all on function public.entry_window_open(uuid, int, time) from public;
grant execute on function public.entry_window_open(uuid, int, time) to authenticated, service_role;

/** Past its 24 hours — the hour can no longer be logged by anyone but a coach. */
create or replace function public.entry_window_closed(p_session uuid, p_day int, p_slot time)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when s.id is null then false
    else now() >= hour_start + interval '24 hours'
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

revoke all on function public.entry_window_closed(uuid, int, time) from public;
grant execute on function public.entry_window_closed(uuid, int, time) to authenticated, service_role;

create or replace function public.entry_hour_open(p_session uuid, p_day int, p_slot time)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Coaches work with clients directly, by phone or in the room, so the
  -- window isn't theirs (Jen wants to fix entries with the client).
  select public.is_coach() or public.entry_window_open(p_session, p_day, p_slot)
$$;

-- ── The roster ─────────────────────────────────────────────────────────────

/**
 * One row per team member for the round that's running.
 *
 * `flagged` is Josh's rule (2026-09-29): two hours in a row that have CLOSED
 * with nothing logged, within one day — the lead's cue to chase. Hours that
 * simply haven't happened yet are not missed, and a gap across a night is
 * sleep rather than neglect.
 */
-- The shape of the result changed while this was being written; Postgres
-- refuses to replace a function whose OUT columns differ.
drop function if exists public.team_progress(uuid);

create or replace function public.team_progress(p_team uuid)
returns table (
  client_id uuid,
  full_name text,
  role text,
  joined_at timestamptz,
  session_id uuid,
  session_status text,
  day_count int,
  hours_per_day int,
  hours_logged int,
  days_complete int,
  missed_hours int,
  flagged boolean
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  if not (public.is_coach() or public.is_team_lead(p_team)) then
    raise exception 'not your team';
  end if;

  return query
  with round as (
    select r.id from public.team_rounds r
    where r.team_id = p_team and r.status = 'tracking'
    order by r.created_at desc
    limit 1
  ),
  people as (
    select m.client_id, p.full_name, m.role, m.created_at as joined_at, s.id as session_id,
           s.status::text as session_status, s.day_count, s.wake_time, s.sleep_time,
           -- Hours in a waking day; a bedtime at or before the wake hour wraps.
           (extract(hour from s.sleep_time)::int
             + case when s.sleep_time <= s.wake_time then 24 else 0 end
             - extract(hour from s.wake_time)::int) as hours_per_day
    from public.team_memberships m
    join public.profiles p on p.id = m.client_id
    left join public.tracking_sessions s
      on s.client_id = m.client_id and s.round_id = (select id from round)
    where m.team_id = p_team
  ),
  slots as (
    select pe.client_id, pe.session_id, d.day_number, g.position,
           (pe.wake_time + make_interval(hours => g.position))::time as slot_hour
    from people pe
    cross join lateral generate_series(1, coalesce(pe.day_count, 0)) as d(day_number)
    cross join lateral generate_series(0, coalesce(pe.hours_per_day, 0) - 1) as g(position)
    where pe.session_id is not null
  ),
  marked as (
    select sl.client_id, sl.session_id, sl.day_number, sl.position,
           (e.id is not null) as logged,
           (e.id is null and public.entry_window_closed(sl.session_id, sl.day_number, sl.slot_hour)) as missed
    from slots sl
    left join public.daily_entries e
      on e.session_id = sl.session_id and e.day_number = sl.day_number and e.slot_hour = sl.slot_hour
  ),
  -- A window function can't live inside FILTER (42P20), so the next hour is
  -- worked out first and counted afterwards.
  neighboured as (
    select m.client_id,
           m.missed,
           lead(m.missed) over (partition by m.session_id, m.day_number order by m.position) as next_missed
    from marked m
  ),
  pairs as (
    select n.client_id,
           count(*) filter (where n.missed)::int as missed_hours,
           bool_or(n.missed and n.next_missed) as flagged
    from neighboured n
    group by n.client_id
  ),
  tallies as (
    select m.client_id, count(*) filter (where m.logged)::int as hours_logged
    from marked m
    group by m.client_id
  ),
  full_days as (
    select m.client_id, count(*)::int as days_complete
    from (
      select m.client_id, m.day_number, bool_and(m.logged) as whole_day
      from marked m
      group by m.client_id, m.day_number
    ) m
    where m.whole_day
    group by m.client_id
  )
  select pe.client_id,
         pe.full_name,
         pe.role,
         pe.joined_at,
         pe.session_id,
         pe.session_status,
         coalesce(pe.day_count, 0),
         coalesce(pe.hours_per_day, 0),
         coalesce(t.hours_logged, 0),
         coalesce(f.days_complete, 0),
         coalesce(pr.missed_hours, 0),
         coalesce(pr.flagged, false)
  from people pe
  left join tallies t on t.client_id = pe.client_id
  left join full_days f on f.client_id = pe.client_id
  left join pairs pr on pr.client_id = pe.client_id
  order by pe.role desc, pe.full_name;
end;
$fn$;

revoke all on function public.team_progress(uuid) from public;
grant execute on function public.team_progress(uuid) to authenticated, service_role;
