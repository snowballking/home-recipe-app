-- ============================================================
-- Migration 020: Complete fix for approver meal plan access
-- ============================================================
-- This is a self-contained, idempotent migration that ensures
-- approvers (non-admin users) can see meal plans assigned to them.
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ── 1. Ensure approval columns exist on meal_plans ──────────
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS approver_id uuid,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meal_remarks jsonb DEFAULT '{}'::jsonb;

-- ── 2. Drop ALL existing approver policies (clean slate) ────
DROP POLICY IF EXISTS "Approver can read assigned plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Approver can update approval status" ON public.meal_plans;
DROP POLICY IF EXISTS "Approver can read slots on assigned plans" ON public.meal_plan_slots;

-- ── 3. Create approver SELECT policy on meal_plans ──────────
-- This is the critical policy: allows non-admin approvers to
-- read plans where they are assigned as the approver.
-- Multiple SELECT policies are OR'd by PostgreSQL RLS.
CREATE POLICY "Approver can read assigned plans"
  ON public.meal_plans FOR SELECT
  USING (approver_id = auth.uid());

-- ── 4. Create approver UPDATE policy on meal_plans ──────────
CREATE POLICY "Approver can update approval status"
  ON public.meal_plans FOR UPDATE
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());

-- ── 5. Allow approver to read slots on assigned plans ───────
CREATE POLICY "Approver can read slots on assigned plans"
  ON public.meal_plan_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_slots.meal_plan_id
        AND approver_id = auth.uid()
    )
  );

-- ── 6. Create or replace the RPC function (backup method) ───
CREATE OR REPLACE FUNCTION public.get_approval_plans()
RETURNS SETOF public.meal_plans
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.meal_plans
  WHERE approver_id = auth.uid()
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_approval_plans() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_approval_plans() FROM anon;

-- ── 7. Day comments table + policies (if not exists) ────────
CREATE TABLE IF NOT EXISTS public.meal_plan_day_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_day_comments_plan_date
  ON public.meal_plan_day_comments(meal_plan_id, plan_date);

ALTER TABLE public.meal_plan_day_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Plan owner can read day comments" ON public.meal_plan_day_comments;
CREATE POLICY "Plan owner can read day comments"
  ON public.meal_plan_day_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_day_comments.meal_plan_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Approver can read day comments" ON public.meal_plan_day_comments;
CREATE POLICY "Approver can read day comments"
  ON public.meal_plan_day_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_day_comments.meal_plan_id
        AND approver_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Approver can insert day comments" ON public.meal_plan_day_comments;
CREATE POLICY "Approver can insert day comments"
  ON public.meal_plan_day_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_day_comments.meal_plan_id
        AND approver_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Approver can update own day comments" ON public.meal_plan_day_comments;
CREATE POLICY "Approver can update own day comments"
  ON public.meal_plan_day_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Approver can delete own day comments" ON public.meal_plan_day_comments;
CREATE POLICY "Approver can delete own day comments"
  ON public.meal_plan_day_comments FOR DELETE
  USING (auth.uid() = user_id);

-- ── 8. Verify everything is in place ────────────────────────
-- Run this SELECT after the migration to confirm policies exist:
-- SELECT policyname, tablename, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (policyname LIKE '%pprover%' OR policyname LIKE '%owner can read day%')
-- ORDER BY tablename, policyname;
