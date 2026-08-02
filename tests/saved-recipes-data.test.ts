import { describe, expect, it } from "vitest";
import { getSavedRecipeIds, normalizeSavedRecipeRows } from "@/lib/saved-recipes";
import type { Recipe } from "@/lib/types";

function makeRecipe(id: string, title: string): Recipe {
  return {
    id,
    user_id: "chef-1",
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

describe("saved recipe data helpers", () => {
  it("keeps only available joined recipes in the saved order", () => {
    const laksa = makeRecipe("laksa", "Laksa");
    const nasiLemak = makeRecipe("nasi-lemak", "Nasi lemak");

    expect(normalizeSavedRecipeRows([
      { recipe_id: "laksa", recipes: laksa },
      { recipe_id: "removed", recipes: null },
      { recipe_id: "nasi-lemak", recipes: nasiLemak },
    ])).toEqual([laksa, nasiLemak]);
  });

  it("returns each saved recipe id once in saved order", () => {
    expect(getSavedRecipeIds([
      { recipe_id: "laksa" },
      { recipe_id: "laksa" },
      { recipe_id: "nasi-lemak" },
    ])).toEqual(["laksa", "nasi-lemak"]);
  });
});
