-- ============================================================
-- Migration 021: Bulletproof approval plan access
-- ============================================================
-- Previous approaches relied on auth.uid() inside SECURITY DEFINER
-- functions or RLS policies. This migration takes TWO approaches
-- to guarantee non-admin approvers can see assigned plans:
--
-- Approach A: Parameterized SECURITY DEFINER function that accepts
--   the user_id explicitly (no dependency on auth.uid() inside function)
--
-- Approach B: Fix the existing function to include auth in search_path
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ── Approach A: Parameterized function (most reliable) ──────
-- The server API route authenticates the user, then passes their
-- verified user_id to this function. No auth.uid() dependency.
CREATE OR REPLACE FUNCTION public.get_plans_for_approver(p_user_id uuid)
RETURNS SETOF public.meal_plans
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.meal_plans
  WHERE approver_id = p_user_id
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_plans_for_approver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plans_for_approver(uuid) TO anon;

-- ── Approach B: Fix existing function search_path ───────────
CREATE OR REPLACE FUNCTION public.get_approval_plans()
RETURNS SETOF public.meal_plans
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT *
  FROM public.meal_plans
  WHERE approver_id = auth.uid()
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_approval_plans() TO authenticated;

-- ── Re-ensure RLS policies exist ────────────────────────────
-- These are the SELECT policies that allow approvers to read plans
-- via direct queries (in addition to the functions above).

DROP POLICY IF EXISTS "Approver can read assigned plans" ON public.meal_plans;
CREATE POLICY "Approver can read assigned plans"
  ON public.meal_plans FOR SELECT
  USING (approver_id = auth.uid());

DROP POLICY IF EXISTS "Approver can update approval status" ON public.meal_plans;
CREATE POLICY "Approver can update approval status"
  ON public.meal_plans FOR UPDATE
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());

DROP POLICY IF EXISTS "Approver can read slots on assigned plans" ON public.meal_plan_slots;
CREATE POLICY "Approver can read slots on assigned plans"
  ON public.meal_plan_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = meal_plan_slots.meal_plan_id
        AND mp.approver_id = auth.uid()
    )
  );

-- ── Verification queries (run these after the migration) ────
-- 1. Check functions exist:
--    SELECT routine_name FROM information_schema.routines
--    WHERE routine_schema = 'public' AND routine_name IN ('get_approval_plans', 'get_plans_for_approver');
--
-- 2. Check policies exist:
--    SELECT policyname, tablename, cmd, qual
--    FROM pg_policies
--    WHERE schemaname = 'public' AND policyname LIKE '%pprover%'
--    ORDER BY tablename;
--
-- 3. Check approver_id data exists:
--    SELECT id, title, user_id, approver_id, approval_status
--    FROM meal_plans WHERE approver_id IS NOT NULL;
