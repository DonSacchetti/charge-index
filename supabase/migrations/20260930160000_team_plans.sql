-- Charge Index — corporate teams, stage 3: the team plan
--
-- Jen releases a team's plan by hand (her decision, 2026-09-29), so the plan
-- is computed at that moment and stored, rather than recalculated whenever
-- someone opens the page. Two reasons, both practical:
--
--   1. The lead can't read the entries it's built from. Storing the result
--      keeps the privacy boundary intact with no service-role code path.
--   2. A plan a company has been given shouldn't quietly change because
--      somebody edited an hour afterwards.
--
-- The row existing IS the release: no row, no plan.
create table public.team_plans (
  round_id uuid primary key references public.team_rounds (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  plan jsonb not null,
  released_at timestamptz not null default now(),
  released_by uuid references public.profiles (id) on delete set null
);

create index team_plans_team_idx on public.team_plans (team_id);

alter table public.team_plans enable row level security;

-- The lead sees their team's plan; members never do (Josh, 2026-09-29).
create policy "team_plans_select_lead_or_coach"
  on public.team_plans for select
  using (public.is_coach() or public.is_team_lead(team_id));

create policy "team_plans_write_coach"
  on public.team_plans for all
  using (public.is_coach())
  with check (public.is_coach());
