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
  it("places the non-link Chef credit under the title while preserving the original badge", () => {
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

    const credit = screen.getByText("By Chef Mei");
    const title = screen.getByRole("heading", { name: "Laksa" });
    const imageContainer = screen.getByRole("img", { name: "Laksa" }).parentElement?.parentElement;

    if (!credit || !imageContainer) throw new Error("Expected Chef credit and image container");

    expect(title.compareDocumentPosition(credit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(imageContainer.contains(credit)).toBe(false);
    expect(screen.getByText("⭐ User's Original")).toBeTruthy();
    expect(screen.getByText("Chef")).toBeTruthy();
    const chefMentionLink = screen.queryByRole("link", { name: /Chef Mei/ });
    expect(chefMentionLink?.getAttribute("href") ?? "").not.toMatch(/^\/chefs\//);
  });

  it("credits a user's original recipe to its uploader under the title", () => {
    const userOriginal = { ...recipe, author_name: "Mei", chefs: null } as Recipe;

    render(
      <LanguageProvider>
        <RecipeCard recipe={userOriginal} />
      </LanguageProvider>,
    );

    expect(screen.getByText("By Mei")).toBeTruthy();
    expect(screen.getByText("⭐ User's Original")).toBeTruthy();
    expect(screen.queryByText("Chef")).toBeNull();
  });

  it("omits creator credit for an unassigned imported recipe", () => {
    const unassignedRecipe = {
      ...recipe,
      author_name: "Mei",
      chefs: null,
      source_url: "https://example.com/imported",
    } as Recipe;

    render(
      <LanguageProvider>
        <RecipeCard recipe={unassignedRecipe} />
      </LanguageProvider>,
    );

    expect(screen.queryByText("Mei")).toBeNull();
    expect(screen.queryByText(/^By /)).toBeNull();
  });
});
