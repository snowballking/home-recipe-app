import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { RecipeFeedCard, type RecipeFeedRecipe } from "@/app/components/recipe-feed-card";

vi.mock("@/app/components/save-recipe-button", () => ({
  SaveRecipeButton: (props: { initialSaved?: boolean }) => (
    <button type="button" data-testid="mock-save-button" data-initial-saved={String(props.initialSaved ?? false)}>
      Save
    </button>
  ),
}));

describe("RecipeFeedCard", () => {
  it("presents a community recipe without turning variation creation into a feed action", () => {
    const recipe = {
      id: "prawn-mee",
      user_id: "mei",
      title: "Prawn mee",
      title_zh: null,
      description: "A family favourite.",
      description_zh: null,
      hero_image_url: "https://example.com/prawn-mee.jpg",
      image_source: null,
      chef: { id: "chef-mei", name: "Chef Mei" },
      original_recipe_id: null,
      comment_count: 3,
      save_count: 4,
    } satisfies RecipeFeedRecipe;

    render(
      <LanguageProvider>
        <RecipeFeedCard recipe={recipe} />
      </LanguageProvider>,
    );

    expect(screen.getByRole("heading", { name: "Prawn mee" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Prawn mee" }).getAttribute("src")).toBe("https://example.com/prawn-mee.jpg");
    expect(screen.getByRole("link", { name: /Comments/ }).getAttribute("href")).toBe("/recipe/prawn-mee#comments");
    expect(screen.getByText("By Chef Mei")).toBeTruthy();
    expect(screen.getByText("Chef")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Chef Mei/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Make it your own/ })).toBeNull();
  });

  it("omits uploader and Chef credit for recipes without an assigned Chef", () => {
    const recipe = {
      id: "prawn-mee",
      user_id: "mei",
      title: "Prawn mee",
      title_zh: null,
      description: "A family favourite.",
      description_zh: null,
      hero_image_url: "https://example.com/prawn-mee.jpg",
      image_source: null,
      author_name: "Mei",
      chef: null,
      original_recipe_id: null,
      comment_count: 3,
      save_count: 4,
    } satisfies RecipeFeedRecipe & { author_name: string };

    render(
      <LanguageProvider>
        <RecipeFeedCard recipe={recipe} />
      </LanguageProvider>,
    );

    expect(screen.queryByText("Mei")).toBeNull();
    expect(screen.queryByText("By Chef Mei")).toBeNull();
  });

  it("passes the initial saved state to the save control", () => {
    const recipe = {
      id: "prawn-mee",
      user_id: "mei",
      title: "Prawn mee",
      title_zh: null,
      description: "A family favourite.",
      description_zh: null,
      hero_image_url: null,
      image_source: null,
      chef: null,
      save_count: 4,
      comment_count: 3,
      original_recipe_id: null,
    } satisfies RecipeFeedRecipe;

    render(
      <LanguageProvider>
        <RecipeFeedCard recipe={recipe} isSaved />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("mock-save-button").getAttribute("data-initial-saved")).toBe("true");
  });
});
