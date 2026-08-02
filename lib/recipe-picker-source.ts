import type { Recipe } from "@/lib/types";

export type RecipePickerSource = "saved" | "all" | "mine" | "community";

export function getDefaultRecipePickerSource(savedRecipeIds: string[]): RecipePickerSource {
  return savedRecipeIds.length > 0 ? "saved" : "all";
}

export function filterRecipesForPicker(
  recipes: Recipe[],
  currentUserId: string | null,
  source: RecipePickerSource,
  savedRecipeIds: string[],
): Recipe[] {
  if (source === "saved") {
    const savedIds = new Set(savedRecipeIds);
    return recipes.filter((recipe) => savedIds.has(recipe.id));
  }

  if (source === "mine") return recipes.filter((recipe) => recipe.user_id === currentUserId);
  if (source === "community") return recipes.filter((recipe) => recipe.user_id !== currentUserId);

  return recipes;
}
