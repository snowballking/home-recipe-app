import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/lib/i18n/language-context";
import type { Recipe } from "@/lib/types";
import NewRecipePage from "@/app/dashboard/recipes/new/page";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));
const database = vi.hoisted(() => ({ inserted: [] as unknown[] }));

const source = {
  id: "base-recipe",
  user_id: "mei",
  title: "Prawn noodles",
  description: "The original recipe.",
  ingredients: [{ name: "prawns", quantity: "300", unit: "g" }],
  alternative_ingredients: [],
  steps: ["Boil the noodles."],
  servings: 2,
  prep_time: 10,
  cook_time: 15,
  difficulty: "beginner",
  cuisine: "Chinese",
  meal_type: "dinner",
  category: "main",
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
  important_note: null,
  important_note_zh: null,
  ingredients_zh: null,
  steps_zh: null,
} as Recipe;

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams("fork=base-recipe"),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "viewer" } } }),
    },
    from: (table: string) => {
      let operation: "read" | "insert" = "read";
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        insert: vi.fn((payload: unknown) => {
          operation = "insert";
          database.inserted.push(payload);
          return query;
        }),
        single: vi.fn(async () => operation === "insert"
          ? { data: { id: "saved-variation" }, error: null }
          : table === "recipes"
            ? { data: source, error: null }
            : { data: { displayname: "Mei", is_chef: false }, error: null }),
      };
      return query;
    },
  }),
}));

describe("new recipe variation route", () => {
  beforeEach(() => {
    database.inserted.length = 0;
    navigation.push.mockClear();
    navigation.back.mockClear();
  });

  it("shows the focused overlay editor instead of copied recipe metadata", async () => {
    render(
      <LanguageProvider>
        <NewRecipePage />
      </LanguageProvider>,
    );

    expect(await screen.findByRole("heading", { name: /Make a variation/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ingredient changes" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Instruction changes" })).toBeTruthy();
    expect(screen.queryByLabelText("Recipe Title")).toBeNull();
    expect(screen.queryByText("Estimated Nutrition (per serving)")).toBeNull();
  });

  it("saves the structured overlay and its materialised final recipe", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <NewRecipePage />
      </LanguageProvider>,
    );

    await screen.findByRole("heading", { name: /Make a variation/i });
    await user.type(screen.getByLabelText("What is different?"), "A tofu noodle version");
    await user.click(screen.getByRole("button", { name: "Replace prawns" }));
    await user.clear(screen.getByLabelText("Replacement ingredient for prawns"));
    await user.type(screen.getByLabelText("Replacement ingredient for prawns"), "tofu");
    await user.click(screen.getByRole("button", { name: "Save variation" }));

    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/recipe/saved-variation"));
    expect(database.inserted).toHaveLength(1);
    expect(database.inserted[0]).toMatchObject({
      user_id: "viewer",
      original_recipe_id: "base-recipe",
      variation_note: "A tofu noodle version",
      is_public: false,
      ingredients: [{ name: "tofu", quantity: "300", unit: "g" }],
      steps: ["Boil the noodles."],
      variation_diff: {
        version: 1,
        ingredientChanges: [{
          kind: "replace",
          originalIndex: 0,
          from: { name: "prawns", quantity: "300", unit: "g" },
          to: { name: "tofu", quantity: "300", unit: "g" },
        }],
        stepChanges: [],
      },
    });
  });
});
