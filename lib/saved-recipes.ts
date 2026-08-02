import type { Recipe } from "@/lib/types";

export interface SavedRecipeIdRow {
  recipe_id: string;
}

export interface SavedRecipeRow extends SavedRecipeIdRow {
  recipes?: Recipe | null;
}

export function getSavedRecipeIds(rows: SavedRecipeIdRow[] | null | undefined): string[] {
  return [...new Set((rows ?? []).map((row) => row.recipe_id))];
}

export function normalizeSavedRecipeRows(rows: SavedRecipeRow[] | null | undefined): Recipe[] {
  return (rows ?? []).flatMap((row) => row.recipes ? [row.recipes] : []);
}
