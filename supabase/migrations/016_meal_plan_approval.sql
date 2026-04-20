-- Migration 016: Meal plan approval workflow
-- Adds approver assignment and per-day comments for meal plan review

-- 1. Add approval columns to meal_plans
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS approver_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT NULL
    CHECK (approval_status IS NULL OR approval_status IN ('pending_approval', 'approved', 'changes_requested'));

-- 2. Create meal_plan_day_comments table
-- Each row = one comment by the approver for a specific day in the plan
CREATE TABLE IF NOT EXISTS public.meal_plan_day_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by plan + date
CREATE INDEX IF NOT EXISTS idx_day_comments_plan_date
  ON public.meal_plan_day_comments(meal_plan_id, plan_date);

-- 3. Enable RLS
ALTER TABLE public.meal_plan_day_comments ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for meal_plan_day_comments
-- Drop existing policies first (safe re-run)
DROP POLICY IF EXISTS "Plan owner can read day comments" ON public.meal_plan_day_comments;
DROP POLICY IF EXISTS "Approver can read day comments" ON public.meal_plan_day_comments;
DROP POLICY IF EXISTS "Approver can insert day comments" ON public.meal_plan_day_comments;
DROP POLICY IF EXISTS "Approver can update own day comments" ON public.meal_plan_day_comments;
DROP POLICY IF EXISTS "Approver can delete own day comments" ON public.meal_plan_day_comments;
DROP POLICY IF EXISTS "Approver can read assigned plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Approver can update approval status" ON public.meal_plans;
DROP POLICY IF EXISTS "Approver can read slots on assigned plans" ON public.meal_plan_slots;

-- Plan owner can read all day comments on their plans
CREATE POLICY "Plan owner can read day comments"
  ON public.meal_plan_day_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_day_comments.meal_plan_id
        AND user_id = auth.uid()
    )
  );

-- Approver can read day comments on plans they are assigned to
CREATE POLICY "Approver can read day comments"
  ON public.meal_plan_day_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_day_comments.meal_plan_id
        AND approver_id = auth.uid()
    )
  );

-- Approver can insert day comments on plans they are assigned to
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

-- Approver can update their own day comments
CREATE POLICY "Approver can update own day comments"
  ON public.meal_plan_day_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Approver can delete their own day comments
CREATE POLICY "Approver can delete own day comments"
  ON public.meal_plan_day_comments FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Allow approvers to read meal plans assigned to them
CREATE POLICY "Approver can read assigned plans"
  ON public.meal_plans FOR SELECT
  USING (approver_id = auth.uid());

-- 6. Allow approvers to update approval_status on plans assigned to them
CREATE POLICY "Approver can update approval status"
  ON public.meal_plans FOR UPDATE
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());

-- 7. Allow approvers to read slots on plans assigned to them
CREATE POLICY "Approver can read slots on assigned plans"
  ON public.meal_plan_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_slots.meal_plan_id
        AND approver_id = auth.uid()
    )
  );
