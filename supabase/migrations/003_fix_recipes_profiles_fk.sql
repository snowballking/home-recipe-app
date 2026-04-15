-- ============================================================
-- FIX: Backfill missing profiles, then add direct foreign keys
-- ============================================================
-- Users who signed up BEFORE the auto-profile trigger was created
-- won't have a profiles row. This backfills them first.
-- ============================================================

-- Step 1: Create profiles for any existing users who don't have one
INSERT INTO public.profiles (id, displayname)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Step 2: Add direct FKs so Supabase PostgREST can resolve joins
ALTER TABLE public.recipes
  ADD CONSTRAINT fk_recipes_profiles
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.ratings
  ADD CONSTRAINT fk_ratings_profiles
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.comments
  ADD CONSTRAINT fk_comments_profiles
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.follows
  ADD CONSTRAINT fk_follows_follower_profiles
  FOREIGN KEY (follower_id) REFERENCES public.profiles(id);

ALTER TABLE public.follows
  ADD CONSTRAINT fk_follows_following_profiles
  FOREIGN KEY (following_id) REFERENCES public.profiles(id);

ALTER TABLE public.recipe_saves
  ADD CONSTRAINT fk_recipe_saves_profiles
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);
