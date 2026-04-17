-- Add Simplified Chinese translation columns to recipes table
-- These are populated by AI during recipe import/extraction

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS title_zh TEXT,
  ADD COLUMN IF NOT EXISTS description_zh TEXT,
  ADD COLUMN IF NOT EXISTS important_note_zh TEXT,
  ADD COLUMN IF NOT EXISTS ingredients_zh JSONB,
  ADD COLUMN IF NOT EXISTS steps_zh JSONB;

-- Add a comment for documentation
COMMENT ON COLUMN public.recipes.title_zh IS 'Simplified Chinese translation of title';
COMMENT ON COLUMN public.recipes.description_zh IS 'Simplified Chinese translation of description';
COMMENT ON COLUMN public.recipes.important_note_zh IS 'Simplified Chinese translation of important_note';
COMMENT ON COLUMN public.recipes.ingredients_zh IS 'Simplified Chinese translation of ingredients (same JSON structure)';
COMMENT ON COLUMN public.recipes.steps_zh IS 'Simplified Chinese translation of steps array';
