-- Charge Index — let coaches write AI insights
--
-- Phase 1 planned for ai_insights to be written only by server code holding
-- the service-role key. Phase 9's generation runs in a Server Action that has
-- already confirmed the caller is a coach, so a coach-scoped write policy lets
-- it use the coach's own session instead — keeping the service-role key out of
-- the web app's runtime entirely.
--
-- Clients still have no write path: these policies require is_coach(), and
-- the existing select policy is still coach-only. A coach writing a row by
-- hand gains nothing they couldn't already type — these are Jen's own drafts.

create policy "ai_insights_coach_insert"
  on public.ai_insights for insert
  with check (public.is_coach());

create policy "ai_insights_coach_update"
  on public.ai_insights for update
  using (public.is_coach())
  with check (public.is_coach());

-- Which model actually served the draft (fallbacks can substitute one) and
-- what it cost in tokens — for Jen's cost visibility.
alter table public.ai_insights
  add column model text,
  add column input_tokens int,
  add column output_tokens int;
