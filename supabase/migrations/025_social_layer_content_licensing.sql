-- ============================================================
-- 025: Social layer + content licensing (ROADMAP weeks 1-2)
-- ============================================================
-- Run this migration in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run
-- ============================================================

-- 1. Profile upgrades (chef + user profiles)
alter table public.profiles
  add column if not exists specialties text[] default '{}',
  add column if not exists external_links jsonb default '{}'::jsonb,
  add column if not exists dietary_preferences text[] default '{}',
  add column if not exists is_chef boolean default false;

-- 2. Recipe image provenance (IP risk reduction)
-- 'user_upload'  = author's own photo
-- 'ai_generated' = AI placeholder image
-- 'imported'     = came from the source site (may NOT be published)
alter table public.recipes
  add column if not exists image_source text
    check (image_source in ('user_upload', 'ai_generated', 'imported'));

-- Backfill: existing photos on recipes without a source URL were uploaded
-- by the author; photos on imported recipes came from the source site.
update public.recipes
set image_source = case when source_url is null then 'user_upload' else 'imported' end
where hero_image_url is not null and image_source is null;

-- 2b. Comment photos: block javascript:/data: URIs at the database level
-- (the UI also validates, but a malicious client could insert directly)
alter table public.comments
  drop constraint if exists comments_photo_url_scheme;
alter table public.comments
  add constraint comments_photo_url_scheme
  check (photo_url is null or photo_url ~* '^https?://');

-- 3. Content reports (takedown requests)
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null check (reason in ('copyright', 'inappropriate', 'spam', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz default now()
);

create index if not exists idx_content_reports_status on public.content_reports(status);

alter table public.content_reports enable row level security;

create policy "Users can report content" on public.content_reports
  for insert with check (auth.uid() = reporter_id);

create policy "Admins can view reports" on public.content_reports
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "Admins can update reports" on public.content_reports
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- 4. admin_list_users now also returns is_chef.
-- The return type changes, so the old function must be dropped first.
drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  displayname text,
  is_approved boolean,
  is_admin boolean,
  is_chef boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true) then
    return;
  end if;

  return query
  select p.id, u.email::text, p.displayname, p.is_approved, p.is_admin, p.is_chef, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.is_approved asc, p.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;
