-- ============================================================
-- 030: User-tagged festive / seasonal meal plans
-- ============================================================
-- Public plan creators can optionally choose one festival tag. The Market
-- filters on this field; no platform-owned plans or seeded content are added.

ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS festival text;

ALTER TABLE public.meal_plans
  DROP CONSTRAINT IF EXISTS meal_plans_festival_check;

ALTER TABLE public.meal_plans
  ADD CONSTRAINT meal_plans_festival_check
  CHECK (
    festival IS NULL OR festival IN (
      'lunar_new_year',
      'hari_raya',
      'deepavali',
      'mid_autumn',
      'christmas',
      'ramadan',
      'new_year'
    )
  );

-- The Market always scopes results to public plans, then commonly filters by
-- festival and sorts by newest. This partial index keeps that browse path fast.
CREATE INDEX IF NOT EXISTS idx_meal_plans_public_festival_created_at
  ON public.meal_plans (festival, created_at DESC)
  WHERE is_public = true AND festival IS NOT NULL;
