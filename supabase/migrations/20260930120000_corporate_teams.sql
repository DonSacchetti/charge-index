-- Charge Index — corporate teams, stage 1: the structure
--
-- Jen sells to companies as well as individuals (Planning/Corporate Build
-- Plan.md, agreed 2026-09-29). A company has teams; a team runs rounds; a
-- round is one tracking cycle whose deliverable is a team Peak Plan that only
-- the team lead sees.
--
-- How a team comes into being, and why the shape is this way:
--
--   1. Jen creates the company and the team, and generates the LEAD invite —
--      a single-use link. Whoever opens it first becomes the lead.
--   2. The company pays Jen directly. She then sets the seat count, which is
--      what makes the MEMBER invite work. No Stripe anywhere in this.
--   3. The lead hands the member link round. It works up to the seat count
--      and then refuses.
--
-- The privacy rule that everything else bends around: **a lead can see who is
-- in their team and how far along each person is, and nothing else.** No
-- entries, no curve, no peak hours, no reflections. Progress reaches them
-- through an aggregate-only view (stage 2), never through these tables.

-- ── Companies and teams ────────────────────────────────────────────────────

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  -- Nullable so removing a coach's account never blocks on a company row.
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  -- 0 until the company has paid; the member invite checks against this.
  seats int not null default 0 check (seats >= 0),
  -- Set when the lead claims their link; the lead holds a seat too.
  lead_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index teams_company_idx on public.teams (company_id);

create type team_round_status as enum ('setup', 'tracking', 'released');

create table public.team_rounds (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  number int not null,
  status team_round_status not null default 'setup',
  released_at timestamptz,
  released_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (team_id, number)
);

create index team_rounds_team_idx on public.team_rounds (team_id);

create table public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('lead', 'member')),
  created_at timestamptz not null default now(),
  unique (team_id, client_id)
);

create index team_memberships_client_idx on public.team_memberships (client_id);

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  kind text not null check (kind in ('lead', 'member')),
  token text not null unique,
  uses int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Which round a session belongs to. Null for an individual's own session.
alter table public.tracking_sessions add column round_id uuid references public.team_rounds (id);
create index tracking_sessions_round_idx on public.tracking_sessions (round_id);

-- ── Who can read what ──────────────────────────────────────────────────────

alter table public.companies enable row level security;
alter table public.teams enable row level security;
alter table public.team_rounds enable row level security;
alter table public.team_memberships enable row level security;
alter table public.team_invites enable row level security;

/**
 * Membership lookups used by the policies below.
 *
 * These have to be security definer: a policy on `teams` that reads
 * `team_memberships` — whose own policy reads `teams` — is mutual recursion,
 * and Postgres refuses it outright (42P17, hit while building this).
 */
create or replace function public.is_team_member(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_memberships
    where team_id = p_team and client_id = auth.uid()
  )
$$;

create or replace function public.is_team_lead(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teams
    where id = p_team and lead_id = auth.uid()
  )
$$;

revoke all on function public.is_team_member(uuid) from public;
revoke all on function public.is_team_lead(uuid) from public;
grant execute on function public.is_team_member(uuid) to authenticated, service_role;
grant execute on function public.is_team_lead(uuid) to authenticated, service_role;

-- Companies are Jen's alone: clients never see the commercial side.
create policy "companies_coach_only"
  on public.companies for all
  using (public.is_coach())
  with check (public.is_coach());

-- Everyone in a team can see the team itself (its name is on their screens).
create policy "teams_select_own_or_coach"
  on public.teams for select
  using (public.is_coach() or public.is_team_member(id));

create policy "teams_write_coach"
  on public.teams for all
  using (public.is_coach())
  with check (public.is_coach());

create policy "rounds_select_own_or_coach"
  on public.team_rounds for select
  using (public.is_coach() or public.is_team_member(team_id));

create policy "rounds_write_coach"
  on public.team_rounds for all
  using (public.is_coach())
  with check (public.is_coach());

-- A lead sees the membership list of their own team — names only, since that's
-- all these rows hold. A member sees their own row and nobody else's.
create policy "memberships_select_scoped"
  on public.team_memberships for select
  using (public.is_coach() or client_id = auth.uid() or public.is_team_lead(team_id));

create policy "memberships_write_coach"
  on public.team_memberships for all
  using (public.is_coach())
  with check (public.is_coach());

-- The lead needs the MEMBER link to hand round. The lead link is single-use
-- and already spent by the time they're a lead, so it stays Jen's.
create policy "invites_select_scoped"
  on public.team_invites for select
  using (public.is_coach() or (kind = 'member' and public.is_team_lead(team_id)));

create policy "invites_write_coach"
  on public.team_invites for all
  using (public.is_coach())
  with check (public.is_coach());

-- ── Joining ────────────────────────────────────────────────────────────────

/**
 * Claim an invite. Returns the team id.
 *
 * Security definer because the person joining has no read access to the team
 * or the invite until they're in it. Every refusal is a plain message the
 * screen can show: a spent lead link, a team that hasn't been paid for, a full
 * team, an expired link.
 */
create or replace function public.join_team(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_invite public.team_invites;
  v_team public.teams;
  v_taken int;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;

  select * into v_invite from public.team_invites where token = p_token;
  if v_invite.id is null then
    raise exception 'that link is not valid';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'that link has expired';
  end if;

  select * into v_team from public.teams where id = v_invite.team_id;

  -- Already in this team: nothing to do, and no error worth showing.
  if exists (select 1 from public.team_memberships where team_id = v_team.id and client_id = auth.uid()) then
    return v_team.id;
  end if;

  -- One team per person, so a roster always means one set of results.
  if exists (select 1 from public.team_memberships where client_id = auth.uid()) then
    raise exception 'you are already part of another team';
  end if;

  if v_invite.kind = 'lead' then
    if v_team.lead_id is not null then
      raise exception 'that link has already been used';
    end if;
    update public.teams set lead_id = auth.uid() where id = v_team.id;
    insert into public.team_memberships (team_id, client_id, role) values (v_team.id, auth.uid(), 'lead');
  else
    if v_team.seats = 0 then
      raise exception 'this team is not open yet';
    end if;
    select count(*) into v_taken from public.team_memberships where team_id = v_team.id;
    if v_taken >= v_team.seats then
      raise exception 'this team is full';
    end if;
    insert into public.team_memberships (team_id, client_id, role) values (v_team.id, auth.uid(), 'member');
  end if;

  update public.team_invites set uses = uses + 1 where id = v_invite.id;
  return v_team.id;
end;
$fn$;

revoke all on function public.join_team(text) from public;
grant execute on function public.join_team(text) to authenticated;

-- ── Tracking for a round ───────────────────────────────────────────────────

/** The round a client should be tracking for, if any. */
create or replace function public.active_round()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select r.id
  from public.team_rounds r
  join public.team_memberships m on m.team_id = r.team_id
  where m.client_id = auth.uid() and r.status = 'tracking'
  order by r.created_at desc
  limit 1
$$;

revoke all on function public.active_round() from public;
grant execute on function public.active_round() to authenticated, service_role;

/**
 * A round gives its members a session, on top of whatever they're entitled to
 * as an individual: being asked to track by your employer shouldn't spend the
 * free Charge Index you might want for yourself.
 */
create or replace function public.can_start_session()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_coach()
    or (
      -- A round they haven't tracked for yet.
      public.active_round() is not null
      and not exists (
        select 1 from public.tracking_sessions
        where client_id = auth.uid() and round_id = public.active_round()
      )
    )
    or (
      (select count(*) from public.tracking_sessions where client_id = auth.uid() and round_id is null)
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
