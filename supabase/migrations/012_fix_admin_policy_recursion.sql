-- ============================================================
-- 012: Fix infinite recursion in admin RLS policies
-- ============================================================
-- The "Admins can view/update profiles" policies from migration
-- 009 referenced public.profiles inside their own USING clause,
-- which causes Postgres to recurse infinitely when evaluating.
-- Fix: use a SECURITY DEFINER helper that bypasses RLS.

-- Helper function to check admin status without triggering RLS
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated, anon;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Recreate using the helper (no recursion)
-- Note: the base "Profiles are viewable by everyone" policy from migration 001
-- already allows everyone to SELECT profiles, so an admin SELECT policy is
-- redundant. We only need the UPDATE policy so admins can approve users.
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE
  USING (public.is_current_user_admin());
