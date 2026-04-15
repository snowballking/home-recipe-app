-- ============================================================
-- Meal Plans, Grocery Lists & Nutrition Targets
-- ============================================================
-- Run this migration in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run
-- ============================================================

-- 1. Household Members (stored per profile)
-- Add household_members JSONB column to profiles
-- Format: [{"name": "Dad", "age_group": "adult"}, {"name": "Lily", "age_group": "toddler"}]
alter table public.profiles
  add column if not exists household_members jsonb default '[]'::jsonb;

-- 2. Meal Plans
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  duration_type text not null check (duration_type in ('1_week', '2_weeks', '3_weeks', '1_month')),
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  is_public boolean default false,
  notes text,
  comment_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_meal_plans_user on public.meal_plans(user_id);
create index idx_meal_plans_public on public.meal_plans(is_public) where is_public = true;

-- 3. Meal Plan Slots (individual meals assigned to a day + meal type)
create table if not exists public.meal_plan_slots (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  plan_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  servings int default 1,
  notes text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index idx_meal_plan_slots_plan on public.meal_plan_slots(meal_plan_id);
create index idx_meal_plan_slots_recipe on public.meal_plan_slots(recipe_id);

-- 4. Meal Plan Comments
create table if not exists public.meal_plan_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  parent_id uuid references public.meal_plan_comments(id) on delete cascade,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_meal_plan_comments_plan on public.meal_plan_comments(meal_plan_id);

-- 5. Grocery Lists (auto-generated from a meal plan)
create table if not exists public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  title text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_grocery_lists_plan on public.grocery_lists(meal_plan_id);

-- 6. Grocery Items (individual items in a grocery list)
create table if not exists public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  grocery_list_id uuid not null references public.grocery_lists(id) on delete cascade,
  name text not null,
  quantity text,
  unit text,
  category text default 'other' check (category in (
    'produce', 'dairy', 'meat', 'seafood', 'bakery', 'frozen',
    'canned', 'condiments', 'spices', 'grains', 'snacks', 'beverages', 'other'
  )),
  is_checked boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index idx_grocery_items_list on public.grocery_items(grocery_list_id);

-- 7. Nutrition Targets (age-appropriate daily targets)
-- These are reference data, not user-generated
create table if not exists public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  age_group text not null unique check (age_group in (
    'toddler', 'child_4_8', 'child_9_13', 'teen_14_18', 'adult'
  )),
  label text not null,
  calories_min int not null,
  calories_max int not null,
  protein_min_g int not null,
  protein_max_g int not null,
  carbs_min_g int not null,
  carbs_max_g int not null,
  fat_min_g int not null,
  fat_max_g int not null
);

-- Insert reference nutrition targets (based on general dietary guidelines)
insert into public.nutrition_targets (age_group, label, calories_min, calories_max, protein_min_g, protein_max_g, carbs_min_g, carbs_max_g, fat_min_g, fat_max_g) values
  ('toddler',     'Toddler (1-3 years)',     1000, 1400, 13, 20, 130, 175, 30, 45),
  ('child_4_8',   'Child (4-8 years)',        1200, 1800, 19, 30, 130, 220, 35, 55),
  ('child_9_13',  'Child (9-13 years)',       1600, 2200, 34, 50, 175, 275, 45, 65),
  ('teen_14_18',  'Teenager (14-18 years)',   1800, 2800, 46, 65, 200, 350, 50, 80),
  ('adult',       'Adult (19+ years)',        1800, 2600, 46, 56, 200, 325, 50, 78)
on conflict (age_group) do nothing;

-- Add FK from meal_plans to profiles
alter table public.meal_plans
  add constraint fk_meal_plans_profiles
  foreign key (user_id) references public.profiles(id);

-- Add FK from meal_plan_comments to profiles
alter table public.meal_plan_comments
  add constraint fk_meal_plan_comments_profiles
  foreign key (user_id) references public.profiles(id);

-- ── Trigger: update meal_plan comment_count ─────────────────
create or replace function update_meal_plan_comment_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.meal_plans set comment_count = comment_count + 1 where id = NEW.meal_plan_id;
  elsif TG_OP = 'DELETE' then
    update public.meal_plans set comment_count = comment_count - 1 where id = OLD.meal_plan_id;
  end if;
  return null;
end;
$$;

create trigger trg_meal_plan_comment_count
  after insert or delete on public.meal_plan_comments
  for each row execute function update_meal_plan_comment_count();

-- ── Row Level Security ──────────────────────────────────────

-- Meal Plans
alter table public.meal_plans enable row level security;

create policy "Users can read own meal plans"
  on public.meal_plans for select
  using (auth.uid() = user_id);

create policy "Anyone can read public meal plans"
  on public.meal_plans for select
  using (is_public = true);

create policy "Users can create own meal plans"
  on public.meal_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meal plans"
  on public.meal_plans for update
  using (auth.uid() = user_id);

create policy "Users can delete own meal plans"
  on public.meal_plans for delete
  using (auth.uid() = user_id);

-- Meal Plan Slots
alter table public.meal_plan_slots enable row level security;

create policy "Users can manage slots on own plans"
  on public.meal_plan_slots for all
  using (
    exists (select 1 from public.meal_plans where id = meal_plan_id and user_id = auth.uid())
  );

create policy "Anyone can read slots on public plans"
  on public.meal_plan_slots for select
  using (
    exists (select 1 from public.meal_plans where id = meal_plan_id and is_public = true)
  );

-- Meal Plan Comments
alter table public.meal_plan_comments enable row level security;

create policy "Anyone can read comments on public plans"
  on public.meal_plan_comments for select
  using (
    exists (select 1 from public.meal_plans where id = meal_plan_id and (is_public = true or user_id = auth.uid()))
  );

create policy "Authenticated users can comment on public plans"
  on public.meal_plan_comments for insert
  with check (
    auth.uid() = user_id and
    exists (select 1 from public.meal_plans where id = meal_plan_id and (is_public = true or user_id = auth.uid()))
  );

create policy "Users can delete own comments"
  on public.meal_plan_comments for delete
  using (auth.uid() = user_id);

-- Grocery Lists
alter table public.grocery_lists enable row level security;

create policy "Users can manage own grocery lists"
  on public.grocery_lists for all
  using (auth.uid() = user_id);

-- Grocery Items
alter table public.grocery_items enable row level security;

create policy "Users can manage items on own grocery lists"
  on public.grocery_items for all
  using (
    exists (select 1 from public.grocery_lists where id = grocery_list_id and user_id = auth.uid())
  );
