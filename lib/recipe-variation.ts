import type { Ingredient, Recipe } from "@/lib/types";

export type IngredientChange =
  | { kind: "replace"; originalIndex: number; from: Ingredient; to: Ingredient }
  | { kind: "add"; afterOriginalIndex: number | null; ingredient: Ingredient }
  | { kind: "remove"; originalIndex: number; ingredient: Ingredient };

export type StepChange =
  | { kind: "edit"; originalIndex: number; from: string; to: string }
  | { kind: "add"; afterOriginalIndex: number | null; step: string }
  | { kind: "remove"; originalIndex: number; step: string };

export interface VariationDiffV1 {
  version: 1;
  ingredientChanges: IngredientChange[];
  stepChanges: StepChange[];
}

export type VariationValidationCode =
  | "variation_empty"
  | "ingredient_conflict"
  | "ingredient_index_invalid"
  | "ingredient_anchor_invalid"
  | "ingredient_blank"
  | "step_conflict"
  | "step_index_invalid"
  | "step_anchor_invalid"
  | "step_blank";

type RecipeSnapshot = Pick<Recipe, "ingredients" | "steps">;

function isIngredient(value: unknown): value is Ingredient {
  if (!value || typeof value !== "object") return false;
  const ingredient = value as Record<string, unknown>;
  return typeof ingredient.name === "string"
    && typeof ingredient.quantity === "string"
    && typeof ingredient.unit === "string";
}

function isValidIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length;
}

function isValidAnchor(index: number | null, length: number): boolean {
  return index === null || isValidIndex(index, length);
}

export function isVariationDiffV1(value: unknown): value is VariationDiffV1 {
  if (!value || typeof value !== "object") return false;
  const diff = value as Record<string, unknown>;
  if (diff.version !== 1 || !Array.isArray(diff.ingredientChanges) || !Array.isArray(diff.stepChanges)) {
    return false;
  }

  const ingredientsValid = diff.ingredientChanges.every((change) => {
    if (!change || typeof change !== "object") return false;
    const candidate = change as Record<string, unknown>;
    if (candidate.kind === "add") {
      return (candidate.afterOriginalIndex === null || typeof candidate.afterOriginalIndex === "number")
        && isIngredient(candidate.ingredient);
    }
    if (candidate.kind === "replace") {
      return typeof candidate.originalIndex === "number"
        && isIngredient(candidate.from)
        && isIngredient(candidate.to);
    }
    if (candidate.kind === "remove") {
      return typeof candidate.originalIndex === "number" && isIngredient(candidate.ingredient);
    }
    return false;
  });

  const stepsValid = diff.stepChanges.every((change) => {
    if (!change || typeof change !== "object") return false;
    const candidate = change as Record<string, unknown>;
    if (candidate.kind === "add") {
      return (candidate.afterOriginalIndex === null || typeof candidate.afterOriginalIndex === "number")
        && typeof candidate.step === "string";
    }
    if (candidate.kind === "edit") {
      return typeof candidate.originalIndex === "number"
        && typeof candidate.from === "string"
        && typeof candidate.to === "string";
    }
    if (candidate.kind === "remove") {
      return typeof candidate.originalIndex === "number" && typeof candidate.step === "string";
    }
    return false;
  });

  return ingredientsValid && stepsValid;
}

export function validateVariationDiff(base: RecipeSnapshot, diff: VariationDiffV1): VariationValidationCode[] {
  const errors = new Set<VariationValidationCode>();
  if (diff.ingredientChanges.length === 0 && diff.stepChanges.length === 0) {
    errors.add("variation_empty");
  }

  const ingredientTargets = new Set<number>();
  for (const change of diff.ingredientChanges) {
    if (change.kind === "add") {
      if (!isValidAnchor(change.afterOriginalIndex, base.ingredients.length)) errors.add("ingredient_anchor_invalid");
      if (!change.ingredient.name.trim()) errors.add("ingredient_blank");
      continue;
    }

    if (!isValidIndex(change.originalIndex, base.ingredients.length)) errors.add("ingredient_index_invalid");
    if (ingredientTargets.has(change.originalIndex)) errors.add("ingredient_conflict");
    ingredientTargets.add(change.originalIndex);
    if (change.kind === "replace" && !change.to.name.trim()) errors.add("ingredient_blank");
  }

  const stepTargets = new Set<number>();
  for (const change of diff.stepChanges) {
    if (change.kind === "add") {
      if (!isValidAnchor(change.afterOriginalIndex, base.steps.length)) errors.add("step_anchor_invalid");
      if (!change.step.trim()) errors.add("step_blank");
      continue;
    }

    if (!isValidIndex(change.originalIndex, base.steps.length)) errors.add("step_index_invalid");
    if (stepTargets.has(change.originalIndex)) errors.add("step_conflict");
    stepTargets.add(change.originalIndex);
    if (change.kind === "edit" && !change.to.trim()) errors.add("step_blank");
  }

  return [...errors];
}

export function applyVariationDiff(base: RecipeSnapshot, diff: VariationDiffV1): {
  ingredients: Ingredient[];
  steps: string[];
} {
  const errors = validateVariationDiff(base, diff);
  if (errors.length > 0) throw new Error(errors[0]);

  const ingredients: Ingredient[] = [];
  for (const addition of diff.ingredientChanges) {
    if (addition.kind === "add" && addition.afterOriginalIndex === null) ingredients.push(addition.ingredient);
  }
  for (let index = 0; index < base.ingredients.length; index += 1) {
    const terminal = diff.ingredientChanges.find(
      (change) => change.kind !== "add" && change.originalIndex === index,
    );
    if (terminal?.kind === "replace") ingredients.push(terminal.to);
    else if (terminal?.kind !== "remove") ingredients.push(base.ingredients[index]);

    for (const addition of diff.ingredientChanges) {
      if (addition.kind === "add" && addition.afterOriginalIndex === index) ingredients.push(addition.ingredient);
    }
  }

  const steps: string[] = [];
  for (const addition of diff.stepChanges) {
    if (addition.kind === "add" && addition.afterOriginalIndex === null) steps.push(addition.step);
  }
  for (let index = 0; index < base.steps.length; index += 1) {
    const terminal = diff.stepChanges.find(
      (change) => change.kind !== "add" && change.originalIndex === index,
    );
    if (terminal?.kind === "edit") steps.push(terminal.to);
    else if (terminal?.kind !== "remove") steps.push(base.steps[index]);

    for (const addition of diff.stepChanges) {
      if (addition.kind === "add" && addition.afterOriginalIndex === index) steps.push(addition.step);
    }
  }

  return { ingredients, steps };
}

export function buildMaterializedVariationInput(
  source: Recipe,
  userId: string,
  note: string,
  diff: VariationDiffV1,
) {
  const variationNote = note.trim();
  if (!variationNote) throw new Error("variation_note_required");
  const finalRecipe = applyVariationDiff(source, diff);

  return {
    user_id: userId,
    title: source.title,
    description: source.description,
    important_note: source.important_note,
    ingredients: finalRecipe.ingredients,
    alternative_ingredients: source.alternative_ingredients,
    steps: finalRecipe.steps,
    servings: source.servings,
    prep_time: source.prep_time,
    cook_time: source.cook_time,
    difficulty: source.difficulty,
    cuisine: source.cuisine,
    meal_type: source.meal_type,
    category: source.category,
    dietary_tags: source.dietary_tags,
    calories_per_serving: source.calories_per_serving,
    protein_grams: source.protein_grams,
    carbs_grams: source.carbs_grams,
    fat_grams: source.fat_grams,
    hero_image_url: null,
    image_source: null,
    chef_id: source.chef_id ?? null,
    source_url: source.source_url,
    is_public: false,
    original_recipe_id: source.id,
    variation_note: variationNote,
    variation_diff: diff,
    title_zh: source.title_zh,
    description_zh: source.description_zh,
    important_note_zh: source.important_note_zh,
    ingredients_zh: null,
    steps_zh: null,
  };
}
