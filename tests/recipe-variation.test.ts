import { describe, expect, it } from "vitest";
import type { Ingredient, Recipe } from "@/lib/types";
import {
  applyVariationDiff,
  buildMaterializedVariationInput,
  isVariationDiffV1,
  validateVariationDiff,
  type VariationDiffV1,
} from "@/lib/recipe-variation";

const rice: Ingredient = { name: "white rice", quantity: "1", unit: "cup" };
const brownRice: Ingredient = { name: "brown rice", quantity: "1", unit: "cup" };
const peanuts: Ingredient = { name: "peanuts", quantity: "2", unit: "tbsp" };
const lime: Ingredient = { name: "lime", quantity: "1", unit: "" };

const source = {
  id: "base-recipe",
  user_id: "original-author",
  title: "Peanut rice",
  description: "A quick rice bowl.",
  important_note: null,
  ingredients: [rice, peanuts],
  alternative_ingredients: [],
  steps: ["Boil rice.", "Add peanuts."],
  servings: 2,
  prep_time: 5,
  cook_time: 20,
  difficulty: "beginner",
  cuisine: "Singaporean",
  meal_type: "lunch",
  category: "noodles_rice",
  dietary_tags: [],
  calories_per_serving: 300,
  protein_grams: 8,
  carbs_grams: 50,
  fat_grams: 6,
  hero_image_url: "https://example.com/original.jpg",
  image_source: "user_upload",
  chef_id: null,
  source_url: null,
  is_public: true,
  original_recipe_id: null,
  variation_note: null,
  variation_diff: null,
  avg_rating: 4.5,
  rating_count: 10,
  save_count: 20,
  comment_count: 3,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
  title_zh: "花生饭",
  description_zh: "快捷饭碗。",
  important_note_zh: null,
  ingredients_zh: [
    { name: "白米", quantity: "1", unit: "杯" },
    { name: "花生", quantity: "2", unit: "汤匙" },
  ],
  steps_zh: ["煮米饭。", "加入花生。"],
} as Recipe;

const validDiff: VariationDiffV1 = {
  version: 1,
  ingredientChanges: [
    { kind: "replace", originalIndex: 0, from: rice, to: brownRice },
    { kind: "remove", originalIndex: 1, ingredient: peanuts },
    { kind: "add", afterOriginalIndex: 1, ingredient: lime },
  ],
  stepChanges: [
    { kind: "add", afterOriginalIndex: null, step: "Rinse the rice." },
    { kind: "edit", originalIndex: 0, from: "Boil rice.", to: "Steam the rice." },
    { kind: "remove", originalIndex: 1, step: "Add peanuts." },
  ],
};

describe("recipe variation overlays", () => {
  it("applies ingredient and instruction operations to the original snapshot", () => {
    expect(applyVariationDiff(source, validDiff)).toEqual({
      ingredients: [brownRice, lime],
      steps: ["Rinse the rice.", "Steam the rice."],
    });
  });

  it("rejects conflicting, blank, and out-of-range operations", () => {
    const contradictory: VariationDiffV1 = {
      version: 1,
      ingredientChanges: [
        { kind: "replace", originalIndex: 0, from: rice, to: brownRice },
        { kind: "remove", originalIndex: 0, ingredient: rice },
      ],
      stepChanges: [],
    };
    const blankStep: VariationDiffV1 = {
      version: 1,
      ingredientChanges: [],
      stepChanges: [{ kind: "add", afterOriginalIndex: 0, step: "   " }],
    };
    const missingStep: VariationDiffV1 = {
      version: 1,
      ingredientChanges: [],
      stepChanges: [{ kind: "remove", originalIndex: 4, step: "Missing" }],
    };

    expect(validateVariationDiff(source, contradictory)).toContain("ingredient_conflict");
    expect(validateVariationDiff(source, blankStep)).toContain("step_blank");
    expect(validateVariationDiff(source, missingStep)).toContain("step_index_invalid");
    expect(() => applyVariationDiff(source, blankStep)).toThrow("step_blank");
  });

  it("builds a private materialised recipe while preserving the structured overlay", () => {
    const payload = buildMaterializedVariationInput(source, "new-user", "Less oil and no peanuts", validDiff);

    expect(payload).toMatchObject({
      user_id: "new-user",
      title: "Peanut rice",
      original_recipe_id: "base-recipe",
      variation_note: "Less oil and no peanuts",
      variation_diff: validDiff,
      is_public: false,
      hero_image_url: null,
      image_source: null,
      ingredients: [brownRice, lime],
      steps: ["Rinse the rice.", "Steam the rice."],
      description: "A quick rice bowl.",
      servings: 2,
    });
    expect(payload.ingredients_zh).toBeNull();
    expect(payload.steps_zh).toBeNull();
  });

  it("recognises only the supported versioned overlay shape", () => {
    expect(isVariationDiffV1(validDiff)).toBe(true);
    expect(isVariationDiffV1({ version: 2, ingredientChanges: [], stepChanges: [] })).toBe(false);
    expect(isVariationDiffV1({ version: 1, ingredientChanges: "wrong", stepChanges: [] })).toBe(false);
  });
});
