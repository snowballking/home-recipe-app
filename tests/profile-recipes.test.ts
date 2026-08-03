import { describe, expect, it } from "vitest";
import { orderProfileRecipes } from "@/lib/profile-recipes";
import type { Recipe } from "@/lib/types";

function recipe(id: string, sourceUrl: string | null, createdAt: string): Recipe {
  return { id, source_url: sourceUrl, created_at: createdAt } as Recipe;
}

describe("orderProfileRecipes", () => {
  it("shows originals before imports while keeping each group newest first", () => {
    const importedNew = recipe("imported-new", "https://example.com/new", "2026-08-03T10:00:00Z");
    const originalOld = recipe("original-old", null, "2026-08-01T10:00:00Z");
    const originalNew = recipe("original-new", null, "2026-08-02T10:00:00Z");
    const importedOld = recipe("imported-old", "https://example.com/old", "2026-07-31T10:00:00Z");

    expect(orderProfileRecipes([importedNew, originalOld, originalNew, importedOld]).map((item) => item.id))
      .toEqual(["original-new", "original-old", "imported-new", "imported-old"]);
  });
});
