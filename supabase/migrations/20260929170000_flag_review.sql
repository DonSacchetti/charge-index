-- Charge Index — Jen can mark a flagged session as reviewed
--
-- Josh, 2026-09-29: the "same level" flag should be clearable once she's had
-- the conversation, and it should come back if the client carries on filling
-- the grid in the same way.
--
-- So: clearing stamps a time rather than setting a boolean. The flag shows
-- again as soon as an entry lands after that stamp, which is exactly the
-- case worth another look.
alter table public.tracking_sessions add column flag_cleared_at timestamptz;

-- Clients may still finish a session (status) and name it, but nothing else —
-- without this a client could clear the flag on their own session, since RLS
-- can't restrict a policy to particular columns.
revoke update on public.tracking_sessions from anon, authenticated;
grant update (label, status) on public.tracking_sessions to authenticated;

create or replace function public.set_session_flag_review(p_session uuid, p_clear boolean)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_coach() then
    raise exception 'only a coach can review a flag';
  end if;
  update public.tracking_sessions
     set flag_cleared_at = case when p_clear then now() else null end
   where id = p_session;
end;
$fn$;

revoke all on function public.set_session_flag_review(uuid, boolean) from public;
grant execute on function public.set_session_flag_review(uuid, boolean) to authenticated, service_role;
