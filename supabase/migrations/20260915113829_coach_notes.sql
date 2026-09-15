-- Charge Index — Jen's private notes on clients (Build Plan Phase 10)
--
-- Coach-only, like session_analysis and ai_insights: no client-scoped policy
-- exists, so a client can't read notes about themselves by any route. Every
-- coach sees every note; only the coach who wrote a note may edit or delete it.

create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  -- Optional: a note can be about one session rather than the client overall.
  session_id uuid references public.tracking_sessions (id) on delete set null,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index coach_notes_client_id_idx on public.coach_notes (client_id, created_at desc);

alter table public.coach_notes enable row level security;

create policy "coach_notes_select_coach"
  on public.coach_notes for select
  using (public.is_coach());

create policy "coach_notes_insert_own"
  on public.coach_notes for insert
  with check (public.is_coach() and author_id = auth.uid());

create policy "coach_notes_update_own"
  on public.coach_notes for update
  using (public.is_coach() and author_id = auth.uid())
  with check (public.is_coach() and author_id = auth.uid());

create policy "coach_notes_delete_own"
  on public.coach_notes for delete
  using (public.is_coach() and author_id = auth.uid());
