-- ============================================================
-- Migration 023: Fix day comments — add FK to profiles and
-- create SECURITY DEFINER function for comment operations
-- ============================================================
-- RUN THIS IN: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- 1. Add FK from meal_plan_day_comments.user_id to profiles.id
-- This allows PostgREST joins like select("*, profiles(displayname)")
-- The FK to auth.users already exists, so we add a second one to profiles
ALTER TABLE public.meal_plan_day_comments
  DROP CONSTRAINT IF EXISTS meal_plan_day_comments_user_id_profiles_fkey;

ALTER TABLE public.meal_plan_day_comments
  ADD CONSTRAINT meal_plan_day_comments_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 2. Create SECURITY DEFINER function to insert day comments
-- This bypasses RLS so the approver can insert comments even
-- without direct RLS access to meal_plans
CREATE OR REPLACE FUNCTION public.insert_day_comment(
  p_meal_plan_id uuid,
  p_plan_date date,
  p_user_id uuid,
  p_comment text
)
RETURNS public.meal_plan_day_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.meal_plan_day_comments;
BEGIN
  -- Verify the user is the assigned approver for this plan
  IF NOT EXISTS (
    SELECT 1 FROM public.meal_plans
    WHERE id = p_meal_plan_id AND approver_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Not authorized: you are not the approver for this plan';
  END IF;

  INSERT INTO public.meal_plan_day_comments (meal_plan_id, plan_date, user_id, comment)
  VALUES (p_meal_plan_id, p_plan_date, p_user_id, p_comment)
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_day_comment(uuid, date, uuid, text) TO authenticated;

-- 3. Create SECURITY DEFINER function to fetch day comments for a plan
CREATE OR REPLACE FUNCTION public.get_day_comments(p_meal_plan_id uuid, p_user_id uuid)
RETURNS TABLE (
  id uuid,
  meal_plan_id uuid,
  plan_date date,
  user_id uuid,
  comment text,
  created_at timestamptz,
  updated_at timestamptz,
  displayname text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.meal_plan_id, c.plan_date, c.user_id, c.comment, c.created_at, c.updated_at,
    p.displayname
  FROM public.meal_plan_day_comments c
  LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE c.meal_plan_id = p_meal_plan_id
    AND EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = p_meal_plan_id
        AND (mp.user_id = p_user_id OR mp.approver_id = p_user_id)
    )
  ORDER BY c.plan_date ASC, c.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_day_comments(uuid, uuid) TO authenticated;

-- 4. Create SECURITY DEFINER function to delete own day comment
CREATE OR REPLACE FUNCTION public.delete_day_comment(p_comment_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.meal_plan_day_comments
  WHERE id = p_comment_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_day_comment(uuid, uuid) TO authenticated;
