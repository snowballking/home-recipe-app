-- ============================================================
-- 010: Ensure RLS is enabled on all tables
-- ============================================================
-- Safe to run multiple times. Turns on Row Level Security for
-- every user-facing table. The policies themselves were defined
-- in migrations 001, 004, and 009 — this just makes sure the
-- switch is flipped on.

ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_saves         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_slots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_lists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_items        ENABLE ROW LEVEL SECURITY;

-- Verify: the query below should show rowsecurity = true for all tables
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
