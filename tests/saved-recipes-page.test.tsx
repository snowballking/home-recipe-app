import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/lib/i18n/language-context";
import type { Recipe } from "@/lib/types";
import SavedRecipesPage from "@/app/dashboard/saved-recipes/page";

const database = vi.hoisted(() => ({
  rows: [] as Array<{ recipe_id: string; created_at: string; recipes: Recipe | null }>,
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "freddie@example.com" },
    isAdmin: false,
    displayName: "Freddie",
    loading: false,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: database.from.mockImplementation(() => {
      const query: {
        select: typeof database.select;
        eq: typeof database.eq;
        order: typeof database.order;
        then: PromiseLike<{ data: typeof database.rows; error: null }>["then"];
      } = {
        select: database.select,
        eq: database.eq,
        order: database.order,
        then: (onfulfilled, onrejected) => Promise.resolve({ data: database.rows, error: null }).then(onfulfilled, onrejected),
      };
      database.select.mockImplementation(() => query);
      database.eq.mockImplementation(() => query);
      database.order.mockImplementation(() => query);
      return query;
    }),
  }),
}));

function makeRecipe(): Recipe {
  return {
    id: "laksa",
    user_id: "chef-1",
    title: "Laksa",
    description: "Spicy coconut noodles.",
    important_note: null,
    ingredients: [],
    alternative_ingredients: [],
    steps: [],
    servings: 2,
    prep_time: 10,
    cook_time: 20,
    difficulty: "beginner",
    cuisine: "Malaysian",
    meal_type: "dinner",
    category: "noodles_rice",
    dietary_tags: [],
    calories_per_serving: 400,
    protein_grams: 20,
    carbs_grams: 50,
    fat_grams: 16,
    hero_image_url: null,
    image_source: null,
    source_url: null,
    is_public: true,
    original_recipe_id: null,
    variation_note: null,
    variation_diff: null,
    avg_rating: 4.5,
    rating_count: 8,
    save_count: 12,
    comment_count: 2,
    created_at: "2026-08-02T00:00:00.000Z",
    updated_at: "2026-08-02T00:00:00.000Z",
    title_zh: null,
    description_zh: null,
    important_note_zh: null,
    ingredients_zh: null,
    steps_zh: null,
  };
}

function renderPage() {
  return render(
    <LanguageProvider>
      <SavedRecipesPage />
    </LanguageProvider>,
  );
}

describe("Saved Recipes page", () => {
  beforeEach(() => {
    database.rows = [];
    database.from.mockClear();
    database.select.mockClear();
    database.eq.mockClear();
    database.order.mockClear();
  });

  it("loads and renders the signed-in user's saved recipe collection", async () => {
    database.rows = [{
      recipe_id: "laksa",
      created_at: "2026-08-02T00:00:00.000Z",
      recipes: makeRecipe(),
    }];

    renderPage();

    await waitFor(() => expect(screen.getByRole("heading", { name: "Saved Recipes", level: 1 })).toBeTruthy());
    expect(database.select).toHaveBeenCalledWith("recipe_id, created_at, recipes(*)");
    expect(database.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(screen.getByRole("heading", { name: "Laksa", level: 3 })).toBeTruthy();
  });

  it("keeps the Discover call to action when the collection is empty", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByRole("link", { name: "Browse recipes" }).getAttribute("href")).toBe("/discover"));
  });
});
