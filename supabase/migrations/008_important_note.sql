-- ============================================================
-- 008: Add important_note column to recipes
-- ============================================================
-- Freestyle text field for important remarks about the recipe
-- (e.g. "Less oil", "No chilli", dietary notes, family preferences).

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS important_note TEXT DEFAULT NULL;
