-- ============================================================
-- Migration 022: Function to fetch meal plan slots for approver
-- ============================================================
-- Approvers need to see the slots (recipes) in plans assigned to them.
-- This SECURITY DEFINER function bypasses RLS on meal_plan_slots.
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_slots_for_plan(p_plan_id uuid, p_user_id uuid)
RETURNS SETOF public.meal_plan_slots
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return slots if the user is the plan owner OR the assigned approver
  SELECT s.*
  FROM public.meal_plan_slots s
  JOIN public.meal_plans mp ON mp.id = s.meal_plan_id
  WHERE s.meal_plan_id = p_plan_id
    AND (mp.user_id = p_user_id OR mp.approver_id = p_user_id)
  ORDER BY s.plan_date ASC, s.meal_type ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_slots_for_plan(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_slots_for_plan(uuid, uuid) TO anon;
