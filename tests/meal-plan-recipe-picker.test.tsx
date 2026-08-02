import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { RecipePickerModal } from "@/app/dashboard/plans/[id]/page";
import type { Recipe } from "@/lib/types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  }),
}));

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
    category: "noodles_rice",
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

describe("meal-plan recipe picker", () => {
  it("opens Saved first and selected when the user has saved recipes", () => {
    const savedCommunityRecipe = makeRecipe("community-laksa", "chef-1", "Community laksa");
    const ownRecipe = makeRecipe("own-curry", "me", "My curry");

    render(
      <LanguageProvider>
        <RecipePickerModal
          recipes={[ownRecipe, savedCommunityRecipe]}
          savedRecipeIds={["community-laksa"]}
          saving={false}
          onSelect={vi.fn()}
          onClose={vi.fn()}
          mealLabel="Dinner"
          currentUserId="me"
        />
      </LanguageProvider>,
    );

    const sourceTabs = screen.getByRole("tablist", { name: "Recipe source" });
    const tabs = within(sourceTabs).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Saved (1)",
      "All",
      "My Recipes",
      "Community",
    ]);
    expect(within(sourceTabs).getByRole("tab", { name: "Saved (1)" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("button", { name: /Community laksa/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /My curry/ })).toBeNull();
  });
});
