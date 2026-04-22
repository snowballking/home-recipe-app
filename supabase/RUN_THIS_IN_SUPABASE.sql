-- ============================================================
-- COMPLETE FIX: Approval plan access for non-admin users
-- ============================================================
-- Copy this ENTIRE file and paste into:
-- Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
-- This is SAFE to run multiple times. It drops before creating.
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- PART 1: Ensure columns exist
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS approver_id uuid,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meal_remarks jsonb DEFAULT '{}'::jsonb;


-- ══════════════════════════════════════════════════════════════
-- PART 2: RLS Policies (allow approvers to read plans directly)
-- ══════════════════════════════════════════════════════════════
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


-- ══════════════════════════════════════════════════════════════
-- PART 3: SECURITY DEFINER functions (bypass RLS completely)
-- ══════════════════════════════════════════════════════════════

-- Function A: Takes user_id as parameter (most reliable — no auth.uid() dependency)
CREATE OR REPLACE FUNCTION public.get_plans_for_approver(p_user_id uuid)
RETURNS SETOF public.meal_plans
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT *
  FROM public.meal_plans
  WHERE approver_id = p_user_id
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_plans_for_approver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plans_for_approver(uuid) TO anon;

-- Function B: Uses auth.uid() (backup, called from client-side)
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

-- Function C: Fetch slots for a plan (approver needs to see recipes)
CREATE OR REPLACE FUNCTION public.get_slots_for_plan(p_plan_id uuid, p_user_id uuid)
RETURNS SETOF public.meal_plan_slots
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.meal_plan_slots s
  JOIN public.meal_plans mp ON mp.id = s.meal_plan_id
  WHERE s.meal_plan_id = p_plan_id
    AND (mp.user_id = p_user_id OR mp.approver_id = p_user_id)
  ORDER BY s.plan_date ASC, s.meal_type ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_slots_for_plan(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_slots_for_plan(uuid, uuid) TO anon;


-- ══════════════════════════════════════════════════════════════
-- PART 4: Day comments table + policies
-- ══════════════════════════════════════════════════════════════
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


-- ══════════════════════════════════════════════════════════════
-- DONE! Now run these verification queries:
-- ══════════════════════════════════════════════════════════════

-- CHECK 1: Functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_approval_plans', 'get_plans_for_approver', 'get_slots_for_plan');

-- CHECK 2: Policies exist
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%pprover%'
ORDER BY tablename, policyname;

-- CHECK 3: Plans with approvers (verify data exists)
SELECT id, title, user_id, approver_id, approval_status
FROM public.meal_plans
WHERE approver_id IS NOT NULL;
