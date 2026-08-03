import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecipeCard } from "@/app/components/recipe-card";
import { LanguageProvider } from "@/lib/i18n/language-context";
import type { Recipe } from "@/lib/types";

const recipe: Recipe = {
  id: "laksa",
  user_id: "user-1",
  title: "Laksa",
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
  created_at: "2026-08-03T00:00:00.000Z",
  updated_at: "2026-08-03T00:00:00.000Z",
  title_zh: null,
  description_zh: null,
  important_note_zh: null,
  ingredients_zh: null,
  steps_zh: null,
};

describe("RecipeCard Chef credit", () => {
  it("places the non-link Chef credit in the image before top-right badges", () => {
    const chefRecipe = {
      ...recipe,
      hero_image_url: "https://example.com/laksa.jpg",
      chefs: { id: "chef-mei", name: "Chef Mei" },
    } as Recipe;

    render(
      <LanguageProvider>
        <RecipeCard recipe={chefRecipe} />
      </LanguageProvider>,
    );

    const credit = screen.getByText("By Chef Mei").parentElement;
    const imageContainer = screen.getByRole("img", { name: "Laksa" }).parentElement?.parentElement;
    const originalBadge = screen.getByText("⭐ User's Original");

    if (!credit || !imageContainer) throw new Error("Expected Chef credit and image container");

    expect(imageContainer.contains(credit)).toBe(true);
    expect(credit.compareDocumentPosition(originalBadge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Chef")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Chef Mei/ })).toBeNull();
  });

  it("omits creator credit when no Chef relationship is present", () => {
    const unassignedRecipe = { ...recipe, author_name: "Mei", chefs: null } as Recipe;

    render(
      <LanguageProvider>
        <RecipeCard recipe={unassignedRecipe} />
      </LanguageProvider>,
    );

    expect(screen.queryByText("Mei")).toBeNull();
    expect(screen.queryByText(/^By /)).toBeNull();
  });
});
