-- ============================================================
-- 007: Add alternative_ingredients column to recipes
-- ============================================================
-- Stores a list of ingredient substitutions for each recipe.
-- Each entry is { name: string, description: string }.

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS alternative_ingredients JSONB NOT NULL DEFAULT '[]'::jsonb;
