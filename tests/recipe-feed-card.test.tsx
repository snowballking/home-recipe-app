import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/lib/i18n/language-context";
import type { Recipe } from "@/lib/types";
import { RecipeFeedCard } from "@/app/components/recipe-feed-card";

vi.mock("@/app/components/save-recipe-button", () => ({
  SaveRecipeButton: () => <button type="button">Save</button>,
}));

describe("RecipeFeedCard", () => {
  it("presents a community recipe without turning variation creation into a feed action", () => {
    const recipe = {
      id: "prawn-mee",
      user_id: "mei",
      title: "Prawn mee",
      description: "A family favourite.",
      hero_image_url: "https://example.com/prawn-mee.jpg",
      author_name: "Mei",
      original_recipe_id: null,
      comment_count: 3,
      save_count: 4,
    } as Recipe;

    render(
      <LanguageProvider>
        <RecipeFeedCard recipe={recipe} />
      </LanguageProvider>,
    );

    expect(screen.getByRole("heading", { name: "Prawn mee" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Prawn mee" }).getAttribute("src")).toBe("https://example.com/prawn-mee.jpg");
    expect(screen.getByRole("link", { name: /Comments/ }).getAttribute("href")).toBe("/recipe/prawn-mee#comments");
    expect(screen.queryByRole("link", { name: /Make it your own/ })).toBeNull();
  });
});
