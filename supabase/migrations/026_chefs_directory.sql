-- ============================================================
-- 026: Chef directory + recipe exploration support
-- ============================================================
-- Run this migration in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run
-- ============================================================

-- 1. Curated chefs (outside creators; NOT app users)
create table if not exists public.chefs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  avatar_url text check (avatar_url is null or avatar_url ~* '^https?://'),
  channel_url text unique check (channel_url is null or channel_url ~* '^https?://'),
  source_site text not null default 'other'
    check (source_site in ('youtube', 'xiaohongshu', 'website', 'other')),
  linked_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.chefs enable row level security;

create policy "Anyone can view chefs" on public.chefs
  for select using (true);
create policy "Admins can insert chefs" on public.chefs
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
create policy "Admins can update chefs" on public.chefs
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
create policy "Admins can delete chefs" on public.chefs
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- 2. Recipe → chef attribution
alter table public.recipes
  add column if not exists chef_id uuid references public.chefs(id) on delete set null;
create index if not exists idx_recipes_chef_id on public.recipes(chef_id);

-- 3. Follow a chef (mirrors user-to-user follows)
create table if not exists public.chef_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  chef_id uuid not null references public.chefs(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, chef_id)
);

alter table public.chef_follows enable row level security;

create policy "Anyone can view chef follows" on public.chef_follows
  for select using (true);
create policy "Users can follow chefs" on public.chef_follows
  for insert with check (auth.uid() = user_id);
create policy "Users can unfollow chefs" on public.chef_follows
  for delete using (auth.uid() = user_id);

-- 4. Import flow runs as a normal user but chef writes are admin-only,
--    so chef upsert happens through a SECURITY DEFINER function.
create or replace function public.upsert_chef_for_channel(
  p_name text, p_channel_url text, p_source_site text default 'youtube')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 then return null; end if;
  if p_channel_url is null or p_channel_url !~* '^https?://' then return null; end if;
  if p_source_site not in ('youtube', 'xiaohongshu', 'website', 'other') then
    p_source_site := 'other';
  end if;
  select id into v_id from public.chefs where channel_url = p_channel_url;
  if v_id is null then
    insert into public.chefs (name, channel_url, source_site)
    values (trim(p_name), p_channel_url, p_source_site)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

grant execute on function public.upsert_chef_for_channel(text, text, text) to authenticated;
revoke execute on function public.upsert_chef_for_channel(text, text, text) from public, anon;

-- 5. Admins assign recipes to chefs (recipes UPDATE policy is owner-only)
create or replace function public.admin_set_recipe_chef(p_recipe_id uuid, p_chef_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true) then
    raise exception 'Not authorized';
  end if;
  update public.recipes set chef_id = p_chef_id where id = p_recipe_id;
end;
$$;

grant execute on function public.admin_set_recipe_chef(uuid, uuid) to authenticated;
revoke execute on function public.admin_set_recipe_chef(uuid, uuid) from public, anon;
