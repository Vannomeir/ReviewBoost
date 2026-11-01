-- ReviewBoost signup provisioning: run once in the Supabase SQL Editor.
-- IMPORTANT: Verify the existing table schema, defaults, triggers and constraints
-- before applying. These columns are inferred only from the supplied JavaScript.
-- If a signup trigger already exists, MERGE the logic instead of adding a second one.

create or replace function public.reviewboost_create_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_name text;
begin
  v_business_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'business_name'), ''),
    'My Business'
  );

  insert into public.users (user_id, name, email, role)
  values (new.id, v_business_name, new.email, 'Owner');

  insert into public.businesses (user_id, name, category)
  values (new.id, v_business_name, 'General');

  return new;
end;
$$;

create trigger reviewboost_auth_user_created
  after insert on auth.users
  for each row execute function public.reviewboost_create_owner();

-- Keep RLS enabled on public.users and public.businesses.
-- For example, an owner SELECT policy for businesses can use:
--   using (user_id = (select auth.uid()))
-- Check all other needed SELECT/UPDATE/INSERT policies against your schema.
