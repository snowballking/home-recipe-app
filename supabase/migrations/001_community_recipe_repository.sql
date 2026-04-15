-- ============================================================
-- Community Recipe Repository - Database Schema
-- ============================================================
-- Run this migration in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run
-- ============================================================

-- 1. User Profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  displayname text,
  bio text,
  avatar_url text,
  follower_count int default 0,
  following_count int default 0,
  recipe_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Recipes
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  servings int default 1,
  prep_time int, -- minutes
  cook_time int, -- minutes
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')) default 'beginner',
  cuisine text,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drinks')),
  dietary_tags text[] default '{}',
  calories_per_serving numeric,
  protein_grams numeric,
  carbs_grams numeric,
  fat_grams numeric,
  hero_image_url text,
  source_url text,
  is_public boolean default true,
  original_recipe_id uuid references public.recipes(id) on delete set null,
  avg_rating numeric default 0,
  rating_count int default 0,
  save_count int default 0,
  comment_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Ratings
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  score int not null check (score >= 1 and score <= 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, recipe_id)
);

-- 4. Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null,
  photo_url text,
  is_pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Follows
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- 6. Recipe Saves (when user saves community recipe to their collection)
create table if not exists public.recipe_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, recipe_id)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index if not exists idx_recipes_user_id on public.recipes(user_id);
create index if not exists idx_recipes_is_public on public.recipes(is_public) where is_public = true;
create index if not exists idx_recipes_cuisine on public.recipes(cuisine);
create index if not exists idx_recipes_meal_type on public.recipes(meal_type);
create index if not exists idx_recipes_avg_rating on public.recipes(avg_rating desc);
create index if not exists idx_recipes_save_count on public.recipes(save_count desc);
create index if not exists idx_recipes_created_at on public.recipes(created_at desc);
create index if not exists idx_ratings_recipe_id on public.ratings(recipe_id);
create index if not exists idx_comments_recipe_id on public.comments(recipe_id);
create index if not exists idx_follows_following_id on public.follows(following_id);
create index if not exists idx_recipe_saves_recipe_id on public.recipe_saves(recipe_id);

-- ============================================================
-- FUNCTIONS for auto-updating cached counts
-- ============================================================

-- Update recipe avg_rating and rating_count
create or replace function public.update_recipe_rating_stats()
returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    update public.recipes set
      avg_rating = coalesce((select avg(score)::numeric(3,1) from public.ratings where recipe_id = OLD.recipe_id), 0),
      rating_count = (select count(*) from public.ratings where recipe_id = OLD.recipe_id)
    where id = OLD.recipe_id;
    return OLD;
  else
    update public.recipes set
      avg_rating = coalesce((select avg(score)::numeric(3,1) from public.ratings where recipe_id = NEW.recipe_id), 0),
      rating_count = (select count(*) from public.ratings where recipe_id = NEW.recipe_id)
    where id = NEW.recipe_id;
    return NEW;
  end if;
end;
$$ language plpgsql security definer;

create or replace trigger on_rating_change
  after insert or update or delete on public.ratings
  for each row execute function public.update_recipe_rating_stats();

-- Update recipe save_count
create or replace function public.update_recipe_save_count()
returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    update public.recipes set save_count = (select count(*) from public.recipe_saves where recipe_id = OLD.recipe_id) where id = OLD.recipe_id;
    return OLD;
  else
    update public.recipes set save_count = (select count(*) from public.recipe_saves where recipe_id = NEW.recipe_id) where id = NEW.recipe_id;
    return NEW;
  end if;
end;
$$ language plpgsql security definer;

create or replace trigger on_save_change
  after insert or delete on public.recipe_saves
  for each row execute function public.update_recipe_save_count();

-- Update recipe comment_count
create or replace function public.update_recipe_comment_count()
returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    update public.recipes set comment_count = (select count(*) from public.comments where recipe_id = OLD.recipe_id) where id = OLD.recipe_id;
    return OLD;
  else
    update public.recipes set comment_count = (select count(*) from public.comments where recipe_id = NEW.recipe_id) where id = NEW.recipe_id;
    return NEW;
  end if;
end;
$$ language plpgsql security definer;

create or replace trigger on_comment_change
  after insert or delete on public.comments
  for each row execute function public.update_recipe_comment_count();

-- Update follower/following counts
create or replace function public.update_follow_counts()
returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    update public.profiles set follower_count = (select count(*) from public.follows where following_id = OLD.following_id) where id = OLD.following_id;
    update public.profiles set following_count = (select count(*) from public.follows where follower_id = OLD.follower_id) where id = OLD.follower_id;
    return OLD;
  else
    update public.profiles set follower_count = (select count(*) from public.follows where following_id = NEW.following_id) where id = NEW.following_id;
    update public.profiles set following_count = (select count(*) from public.follows where follower_id = NEW.follower_id) where id = NEW.follower_id;
    return NEW;
  end if;
end;
$$ language plpgsql security definer;

create or replace trigger on_follow_change
  after insert or delete on public.follows
  for each row execute function public.update_follow_counts();

-- Update profile recipe_count
create or replace function public.update_profile_recipe_count()
returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    update public.profiles set recipe_count = (select count(*) from public.recipes where user_id = OLD.user_id and is_public = true) where id = OLD.user_id;
    return OLD;
  else
    update public.profiles set recipe_count = (select count(*) from public.recipes where user_id = NEW.user_id and is_public = true) where id = NEW.user_id;
    return NEW;
  end if;
end;
$$ language plpgsql security definer;

create or replace trigger on_recipe_change
  after insert or update of is_public or delete on public.recipes
  for each row execute function public.update_profile_recipe_count();

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, displayname)
  values (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  return NEW;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.ratings enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.recipe_saves enable row level security;

-- Profiles: public read, own write
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Recipes: public recipes visible to all, private only to owner
create policy "Public recipes are viewable by everyone" on public.recipes for select using (is_public = true or auth.uid() = user_id);
create policy "Users can create recipes" on public.recipes for insert with check (auth.uid() = user_id);
create policy "Users can update own recipes" on public.recipes for update using (auth.uid() = user_id);
create policy "Users can delete own recipes" on public.recipes for delete using (auth.uid() = user_id);

-- Ratings: public read, own write
create policy "Ratings are viewable by everyone" on public.ratings for select using (true);
create policy "Users can create ratings" on public.ratings for insert with check (auth.uid() = user_id);
create policy "Users can update own ratings" on public.ratings for update using (auth.uid() = user_id);
create policy "Users can delete own ratings" on public.ratings for delete using (auth.uid() = user_id);

-- Comments: public read, own write
create policy "Comments are viewable by everyone" on public.comments for select using (true);
create policy "Users can create comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can update own comments" on public.comments for update using (auth.uid() = user_id);
create policy "Users can delete own comments" on public.comments for delete using (auth.uid() = user_id);

-- Follows: public read, own write
create policy "Follows are viewable by everyone" on public.follows for select using (true);
create policy "Users can follow others" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- Recipe Saves: own only
create policy "Users can see own saves" on public.recipe_saves for select using (auth.uid() = user_id);
create policy "Users can save recipes" on public.recipe_saves for insert with check (auth.uid() = user_id);
create policy "Users can unsave recipes" on public.recipe_saves for delete using (auth.uid() = user_id);
