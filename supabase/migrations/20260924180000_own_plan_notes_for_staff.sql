-- Charge Index — staff can annotate their OWN Peak Plan
--
-- Found by Josh on 2026-09-24: his own plan had no "add what you'll do",
-- because the editor is off for staff reading a client's plan and nothing
-- distinguished "a coach looking at someone else's plan" from "a coach
-- looking at their own".
--
-- The rule the app means: you may write on a plan that is yours, and that you
-- can open. Staff can open any plan (canViewPeakPlan short-circuits for
-- coaches), so for their own sessions that's enough — Jen tracks her own
-- energy and should be able to use her plan like anyone else. Writing on
-- someone else's plan stays impossible for everyone, staff included.
create or replace function public.has_peak_plan(p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tracking_sessions s
    where s.id = p_session and s.client_id = auth.uid()
  )
  and (
    public.is_coach()
    or exists (
      select 1
      from public.tracking_sessions s
      join public.purchases p
        on p.session_id = s.id
       and p.client_id = s.client_id
       and p.product = 'basic_peak_plan'
       and p.status = 'completed'
      where s.id = p_session
    )
  )
$$;
