-- ============================================================
-- Migration 024: Allow approvers to edit meal plan slots and
-- update plan fields (meal_remarks, notes)
-- ============================================================
-- RUN THIS IN: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- 1. Add RLS policy: approver can INSERT meal_plan_slots
--    (service role bypasses RLS, but this is a safety net)
DROP POLICY IF EXISTS "Approver can insert meal plan slots" ON public.meal_plan_slots;
CREATE POLICY "Approver can insert meal plan slots"
  ON public.meal_plan_slots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_id AND approver_id = auth.uid()
    )
  );

-- 2. Add RLS policy: approver can DELETE meal_plan_slots
DROP POLICY IF EXISTS "Approver can delete meal plan slots" ON public.meal_plan_slots;
CREATE POLICY "Approver can delete meal plan slots"
  ON public.meal_plan_slots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_id AND approver_id = auth.uid()
    )
  );

-- 3. Add RLS policy: approver can SELECT meal_plan_slots
DROP POLICY IF EXISTS "Approver can view meal plan slots" ON public.meal_plan_slots;
CREATE POLICY "Approver can view meal plan slots"
  ON public.meal_plan_slots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_id AND approver_id = auth.uid()
    )
  );

-- 4. Add RLS policy: approver can UPDATE specific fields on meal_plans
--    (meal_remarks, notes, approval_status)
DROP POLICY IF EXISTS "Approver can update assigned meal plans" ON public.meal_plans;
CREATE POLICY "Approver can update assigned meal plans"
  ON public.meal_plans
  FOR UPDATE
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());

-- 5. Ensure the notes column exists (it should already, but just in case)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.meal_plans ADD COLUMN notes TEXT;
  END IF;
END$$;
