-- Migration 019: Create a SECURITY DEFINER function for fetching approval plans
-- This bypasses RLS so non-admin approvers can see plans assigned to them.
-- The function is still safe because it only returns plans where the
-- caller (auth.uid()) is the approver.

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

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_approval_plans() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_approval_plans() FROM anon;
