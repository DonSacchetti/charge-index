-- Charge Index — initial schema
-- Tables, enums, and RLS policies per Planning/Build Plan.md Section 4.
-- Coach-only tables (session_analysis, ai_insights) intentionally have no
-- client-scoped policy at all — that's the enforcement behind "the client
-- never sees analysis," not a UI convention.

create type user_role as enum ('client', 'coach', 'admin');
create type session_status as enum ('in_progress', 'completed');
create type reminder_pref as enum ('none', 'hourly', 'three_times_daily', 'once_daily');
create type purchase_product as enum ('basic_peak_plan', 'peak_plan_session', 'coaching');
create type purchase_status as enum ('pending', 'completed', 'refunded');

-- ── profiles ────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'client',
  full_name text,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- role-check helper, security definer so it can read profiles without
-- recursing through the RLS policy that calls it
create function public.is_coach()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('coach', 'admin')
  );
$$;

-- auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_coach"
  on public.profiles for select
  using (id = auth.uid() or public.is_coach());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- ── tracking_sessions ───────────────────────────────────────────────────

create table public.tracking_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  wake_time time not null,
  sleep_time time not null,
  day_count int not null check (day_count between 5 and 7),
  start_date date not null default current_date,
  reminder_pref reminder_pref not null default 'none',
  status session_status not null default 'in_progress',
  created_at timestamptz not null default now()
);

alter table public.tracking_sessions enable row level security;

create policy "sessions_select_own_or_coach"
  on public.tracking_sessions for select
  using (client_id = auth.uid() or public.is_coach());

create policy "sessions_insert_own"
  on public.tracking_sessions for insert
  with check (client_id = auth.uid());

create policy "sessions_update_own_or_coach"
  on public.tracking_sessions for update
  using (client_id = auth.uid() or public.is_coach());

-- ── daily_entries — one row per ANSWERED slot, never a row for a skip ──

create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tracking_sessions (id) on delete cascade,
  day_number int not null check (day_number between 1 and 7),
  slot_hour time not null,
  energy_pct smallint not null check (energy_pct in (10, 25, 50, 75, 100)),
  created_at timestamptz not null default now(),
  unique (session_id, day_number, slot_hour)
);

alter table public.daily_entries enable row level security;

create policy "entries_select_own_or_coach"
  on public.daily_entries for select
  using (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
    or public.is_coach()
  );

create policy "entries_insert_own"
  on public.daily_entries for insert
  with check (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
  );

create policy "entries_update_own"
  on public.daily_entries for update
  using (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
  );

create policy "entries_delete_own"
  on public.daily_entries for delete
  using (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
  );

-- ── daily_notes — the three daily reflections ──────────────────────────

create table public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tracking_sessions (id) on delete cascade,
  day_number int not null check (day_number between 1 and 7),
  feel_note text,
  unexpected_note text,
  for_jen_note text,
  updated_at timestamptz not null default now(),
  unique (session_id, day_number)
);

alter table public.daily_notes enable row level security;

create policy "notes_select_own_or_coach"
  on public.daily_notes for select
  using (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
    or public.is_coach()
  );

create policy "notes_upsert_own"
  on public.daily_notes for insert
  with check (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
  );

create policy "notes_update_own"
  on public.daily_notes for update
  using (
    exists (
      select 1 from public.tracking_sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
  );

-- ── session_analysis — COACH-ONLY, no client policy at all ─────────────

create table public.session_analysis (
  session_id uuid primary key references public.tracking_sessions (id) on delete cascade,
  windows jsonb,
  ideal_day jsonb,
  computed_at timestamptz not null default now()
);

alter table public.session_analysis enable row level security;

create policy "session_analysis_coach_only"
  on public.session_analysis for select
  using (public.is_coach());

-- writes come from server-side code using the service-role key (bypasses
-- RLS entirely), never from a client-facing insert/update policy

-- ── ai_insights — COACH-ONLY, same rule as session_analysis ────────────

create table public.ai_insights (
  session_id uuid primary key references public.tracking_sessions (id) on delete cascade,
  energy_type text,
  insights jsonb,
  recommendations jsonb,
  generated_at timestamptz not null default now()
);

alter table public.ai_insights enable row level security;

create policy "ai_insights_coach_only"
  on public.ai_insights for select
  using (public.is_coach());

-- ── purchases — drives the pricing ladder ──────────────────────────────

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.tracking_sessions (id) on delete set null,
  product purchase_product not null,
  stripe_payment_intent_id text,
  amount_cents int,
  status purchase_status not null default 'pending',
  purchased_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

create policy "purchases_select_own_or_coach"
  on public.purchases for select
  using (client_id = auth.uid() or public.is_coach());

-- writes come from the Stripe webhook handler using the service-role key,
-- never from a client-facing insert policy
