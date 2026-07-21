-- ============================================================
-- 028: Chefs directory counts ORIGINAL recipes only
-- ============================================================
-- Run this migration in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run
-- ============================================================

-- A member's chef credit should reflect only recipes they created
-- themselves, not recipes they imported from an external source. An
-- imported recipe has a source_url (and, once assigned, a chef_id pointing
-- at the real external creator). "Original" therefore means:
--   source_url IS NULL AND chef_id IS NULL.
-- Members whose public recipes are all imports no longer qualify as chefs.
create or replace function public.list_app_chefs()
returns table (
  id uuid,
  displayname text,
  avatar_url text,
  recipe_count bigint,
  follower_count integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.displayname,
    p.avatar_url,
    count(r.id) as recipe_count,
    p.follower_count
  from public.profiles p
  join public.recipes r
    on r.user_id = p.id
    and r.is_public = true
    and r.source_url is null
    and r.chef_id is null
  where not exists (
    select 1 from public.chefs c where c.linked_profile_id = p.id
  )
  group by p.id, p.displayname, p.avatar_url, p.follower_count
  having count(r.id) > 0;
$$;

grant execute on function public.list_app_chefs() to authenticated, anon;
revoke execute on function public.list_app_chefs() from public;
