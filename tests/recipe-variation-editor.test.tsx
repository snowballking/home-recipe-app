import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import type { Recipe } from "@/lib/types";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { RecipeVariationEditor } from "@/app/components/recipe-variation-editor";

const source = {
  id: "base-recipe",
  user_id: "mei",
  title: "Prawn noodles",
  description: "The original recipe.",
  ingredients: [
    { name: "prawns", quantity: "300", unit: "g" },
    { name: "peanut oil", quantity: "2", unit: "tbsp" },
  ],
  alternative_ingredients: [],
  steps: ["Boil the noodles.", "Fry the prawns."],
  servings: 2,
  prep_time: 10,
  cook_time: 20,
  difficulty: "beginner",
  cuisine: "Singaporean",
  meal_type: "dinner",
  category: "noodles_rice",
  dietary_tags: [],
  calories_per_serving: null,
  protein_grams: null,
  carbs_grams: null,
  fat_grams: null,
  hero_image_url: "https://example.com/prawns.jpg",
  image_source: "user_upload",
  source_url: null,
  is_public: true,
  original_recipe_id: null,
  variation_note: null,
  variation_diff: null,
  avg_rating: 0,
  rating_count: 0,
  save_count: 0,
  comment_count: 0,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
  title_zh: "虾面",
  description_zh: null,
  important_note: null,
  important_note_zh: null,
  ingredients_zh: null,
  steps_zh: null,
} as Recipe;

function renderEditor() {
  const onSave = vi.fn();
  render(
    <LanguageProvider>
      <RecipeVariationEditor
        source={source}
        sourceAuthor="Mei"
        saving={false}
        error=""
        onSave={onSave}
        onCancel={() => undefined}
      />
    </LanguageProvider>,
  );
  return { onSave };
}

describe("RecipeVariationEditor", () => {
  it("shows only the source context and material variation sections", () => {
    renderEditor();

    expect(screen.getByRole("heading", { name: "Make a variation" })).toBeTruthy();
    expect(screen.getByText(/Prawn noodles/)).toBeTruthy();
    expect(screen.getByLabelText("What is different?")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ingredient changes" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Instruction changes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save variation" })).toBeTruthy();

    expect(screen.queryByLabelText("Title")).toBeNull();
    expect(screen.queryByText("Nutrition")).toBeNull();
    expect(screen.queryByLabelText("Cuisine")).toBeNull();
    expect(screen.queryByText("Public")).toBeNull();
  });

  it("submits literal replace, remove, and add ingredient operations", async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();

    await user.type(screen.getByLabelText("What is different?"), "Coconut oil and extra lime");
    await user.click(screen.getByRole("button", { name: "Replace prawns" }));
    await user.clear(screen.getByLabelText("Replacement quantity for prawns"));
    await user.type(screen.getByLabelText("Replacement quantity for prawns"), "200");
    await user.clear(screen.getByLabelText("Replacement unit for prawns"));
    await user.type(screen.getByLabelText("Replacement unit for prawns"), "g");
    await user.type(screen.getByLabelText("Replacement ingredient for prawns"), "tofu");
    await user.click(screen.getByRole("button", { name: "Remove peanut oil" }));
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));
    await user.type(screen.getByLabelText("Additional quantity 1"), "1");
    await user.type(screen.getByLabelText("Additional unit 1"), "whole");
    await user.type(screen.getByLabelText("Additional ingredient 1"), "lime");
    await user.click(screen.getByRole("button", { name: "Save variation" }));

    expect(onSave).toHaveBeenCalledWith("Coconut oil and extra lime", {
      version: 1,
      ingredientChanges: [
        {
          kind: "replace",
          originalIndex: 0,
          from: { name: "prawns", quantity: "300", unit: "g" },
          to: { name: "tofu", quantity: "200", unit: "g" },
        },
        {
          kind: "remove",
          originalIndex: 1,
          ingredient: { name: "peanut oil", quantity: "2", unit: "tbsp" },
        },
        {
          kind: "add",
          afterOriginalIndex: 1,
          ingredient: { name: "lime", quantity: "1", unit: "whole" },
        },
      ],
      stepChanges: [],
    });
  });

  it("submits rewrite, remove, add-before, and add-after instruction operations without reordering", async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();

    await user.type(screen.getByLabelText("What is different?"), "A gentler cooking method");
    await user.click(screen.getByRole("button", { name: "Rewrite step 1" }));
    await user.clear(screen.getByLabelText("Rewritten step 1"));
    await user.type(screen.getByLabelText("Rewritten step 1"), "Soak the noodles until tender.");
    await user.click(screen.getByRole("button", { name: "Remove step 2" }));
    await user.click(screen.getByRole("button", { name: "Add before step 1" }));
    await user.type(screen.getByLabelText("New step before step 1"), "Warm a bowl of water.");
    await user.click(screen.getByRole("button", { name: "Add after step 1" }));
    await user.type(screen.getByLabelText("New step after step 1"), "Drain the noodles well.");

    expect(screen.queryByRole("button", { name: /^(move|reorder)\b/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Save variation" }));

    expect(onSave).toHaveBeenCalledWith("A gentler cooking method", {
      version: 1,
      ingredientChanges: [],
      stepChanges: [
        {
          kind: "edit",
          originalIndex: 0,
          from: "Boil the noodles.",
          to: "Soak the noodles until tender.",
        },
        {
          kind: "remove",
          originalIndex: 1,
          step: "Fry the prawns.",
        },
        {
          kind: "add",
          afterOriginalIndex: null,
          step: "Warm a bowl of water.",
        },
        {
          kind: "add",
          afterOriginalIndex: 0,
          step: "Drain the noodles well.",
        },
      ],
    });
  });
});
