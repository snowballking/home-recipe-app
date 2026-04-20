-- Migration 018: Ensure all approval RLS policies exist
-- Safe to run multiple times — drops before creating

-- ── meal_plans policies for approvers ──────────────────────────
DROP POLICY IF EXISTS "Approver can read assigned plans" ON public.meal_plans;
CREATE POLICY "Approver can read assigned plans"
  ON public.meal_plans FOR SELECT
  USING (approver_id = auth.uid());

DROP POLICY IF EXISTS "Approver can update approval status" ON public.meal_plans;
CREATE POLICY "Approver can update approval status"
  ON public.meal_plans FOR UPDATE
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());

-- ── meal_plan_slots: approver can read slots on assigned plans ──
DROP POLICY IF EXISTS "Approver can read slots on assigned plans" ON public.meal_plan_slots;
CREATE POLICY "Approver can read slots on assigned plans"
  ON public.meal_plan_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_slots.meal_plan_id
        AND approver_id = auth.uid()
    )
  );

-- ── meal_plan_day_comments policies ────────────────────────────
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

-- Verify: run this to confirm policies exist
-- SELECT policyname, tablename, cmd FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE '%pprover%' ORDER BY tablename;
