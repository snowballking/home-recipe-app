import { describe, expect, it } from "vitest";
import {
  filterRecipesForPicker,
  getDefaultRecipePickerSource,
} from "@/lib/recipe-picker-source";
import type { Recipe } from "@/lib/types";

function makeRecipe(id: string, userId: string, title: string): Recipe {
  return {
    id,
    user_id: userId,
    title,
    description: null,
    important_note: null,
    ingredients: [],
    alternative_ingredients: [],
    steps: [],
    servings: 2,
    prep_time: null,
    cook_time: null,
    difficulty: "beginner",
    cuisine: null,
    meal_type: null,
    category: null,
    dietary_tags: [],
    calories_per_serving: null,
    protein_grams: null,
    carbs_grams: null,
    fat_grams: null,
    hero_image_url: null,
    image_source: null,
    source_url: null,
    is_public: true,
    original_recipe_id: null,
    variation_note: null,
    variation_diff: null,
    avg_rating: 0,
    rating_count: 0,
    save_count: 0,
    comment_count: 0,
    created_at: "2026-08-02T00:00:00.000Z",
    updated_at: "2026-08-02T00:00:00.000Z",
    title_zh: null,
    description_zh: null,
    important_note_zh: null,
    ingredients_zh: null,
    steps_zh: null,
  };
}

describe("meal-plan recipe picker sources", () => {
  const ownRecipe = makeRecipe("own-1", "me", "My curry");
  const communityRecipe = makeRecipe("community-1", "chef-2", "Community laksa");
  const recipes = [ownRecipe, communityRecipe];

  it("defaults to Saved when saved recipes exist and All otherwise", () => {
    expect(getDefaultRecipePickerSource(["community-1"])).toBe("saved");
    expect(getDefaultRecipePickerSource([])).toBe("all");
  });

  it("shows only saved recipes without changing their source-list order", () => {
    expect(filterRecipesForPicker(
      [communityRecipe, ownRecipe],
      "me",
      "saved",
      ["community-1"],
    )).toEqual([communityRecipe]);
  });

  it("keeps My Recipes and Community filters distinct from saved recipes", () => {
    expect(filterRecipesForPicker(recipes, "me", "mine", [])).toEqual([ownRecipe]);
    expect(filterRecipesForPicker(recipes, "me", "community", [])).toEqual([communityRecipe]);
  });

  it("returns no recipes for an empty Saved collection", () => {
    expect(filterRecipesForPicker(recipes, "me", "saved", [])).toEqual([]);
  });
});
