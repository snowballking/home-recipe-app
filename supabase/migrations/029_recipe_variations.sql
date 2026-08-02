-- 029_recipe_variations.sql
-- Recipe forking / variations — "Make it your own".
-- Reuses the existing self-referential recipes.original_recipe_id (added in 001)
-- as the fork pointer to the immediate parent; fork chains are allowed and a
-- fork survives deletion of its parent (FK is ON DELETE SET NULL).

-- The forker's note describing what they changed (required at the app layer for
-- forks; nullable here so ordinary, non-fork recipes leave it empty).
alter table public.recipes
  add column if not exists variation_note text;

-- Auto-computed, human-readable diff vs. the parent (ingredients/steps/servings
-- changed). Reserved for the follow-up "What changed" panel — unused for now.
alter table public.recipes
  add column if not exists variation_diff jsonb;

-- Speeds up "Variations (N)" lookups (forks of a given recipe) and the card tag.
create index if not exists recipes_original_recipe_id_idx
  on public.recipes (original_recipe_id);
