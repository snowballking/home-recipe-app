-- ============================================================
-- 011: Fix "Database error saving new user" during signup
-- ============================================================
-- Rebuilds the handle_new_user trigger with:
--   1. Explicit search_path (prevents schema-resolution failures)
--   2. Exception handler (so auth signup doesn't hard-fail)
--   3. Explicit values for all non-default columns
--   4. Correct ownership so SECURITY DEFINER bypasses RLS

-- Drop old trigger + function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Rebuild function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, displayname, is_approved, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    FALSE,
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never fail the auth.users insert; log + continue.
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Give the function to the postgres superuser so SECURITY DEFINER has
-- the permissions needed to bypass RLS on public.profiles.
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
