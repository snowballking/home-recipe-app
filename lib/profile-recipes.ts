import type { Recipe } from "@/lib/types";

/**
 * Keeps a member's own creations ahead of imported recipes while preserving
 * newest-first ordering within each group.
 */
export function orderProfileRecipes(recipes: Recipe[]): Recipe[] {
  return [...recipes].sort((left, right) => {
    const sourceOrder = Number(Boolean(left.source_url)) - Number(Boolean(right.source_url));
    if (sourceOrder !== 0) return sourceOrder;
    return Date.parse(right.created_at) - Date.parse(left.created_at);
  });
}
