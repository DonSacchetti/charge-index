-- Charge Index — keep the account email on profiles
--
-- The coach's CSV export (Phase 8) and client roster (Phase 10) need each
-- client's email. It lives in auth.users, which coach RLS can't read. Rather
-- than hand those features the service-role key, mirror the email onto
-- profiles, where "profiles_select_own_or_coach" already scopes who sees it.
--
-- Clients still can't write it: 20260914203306 grants them UPDATE on
-- profiles.full_name only. It changes only through these triggers.

alter table public.profiles add column email text;

-- Signup: carry the email across along with the name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  return new;
end;
$$;

-- Email change on the account: keep the profile in step.
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute procedure public.handle_user_email_change();

-- Existing accounts.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id;
