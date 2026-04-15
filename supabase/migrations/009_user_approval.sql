-- ============================================================
-- 009: Admin-approval workflow for new users
-- ============================================================
-- Adds is_approved + is_admin flags to profiles. New signups
-- are created as not-approved; an admin must approve them
-- before they can use the app.
--
-- IMPORTANT: After running this migration, promote YOUR account
-- to admin by running (replace with your actual email):
--
--   UPDATE public.profiles
--   SET is_admin = true, is_approved = true
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');

-- 1) Add columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_admin    BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Backfill all existing profiles as approved (so current users don't get locked out)
UPDATE public.profiles SET is_approved = TRUE WHERE is_approved IS NOT TRUE;

-- 3) Index for the pending-users query
CREATE INDEX IF NOT EXISTS idx_profiles_pending ON public.profiles (is_approved) WHERE is_approved = FALSE;

-- 4) RLS: allow admins to view & update any profile (for the approvals screen)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

-- 5) SECURITY DEFINER RPC: list users with email + approval status.
-- Only callable by admins (returns empty otherwise). This lets the admin
-- page read auth.users.email without exposing the service role key.
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  displayname text,
  is_approved boolean,
  is_admin boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, u.email::text, p.displayname, p.is_approved, p.is_admin, p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.is_approved ASC, p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
