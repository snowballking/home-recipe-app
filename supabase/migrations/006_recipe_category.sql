-- ============================================================
-- 006: Add category column to recipes
-- ============================================================
-- A proper DB column for recipe categories, used for browsing
-- and filtering in Recipes Market and My Collections.

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes (category);

-- Backfill existing recipes based on meal_type where applicable
UPDATE recipes SET category = 'breakfast' WHERE category IS NULL AND meal_type = 'breakfast';
UPDATE recipes SET category = 'snacks'   WHERE category IS NULL AND meal_type = 'snack';
UPDATE recipes SET category = 'desserts' WHERE category IS NULL AND meal_type = 'dessert';
UPDATE recipes SET category = 'drinks'   WHERE category IS NULL AND meal_type = 'drinks';
