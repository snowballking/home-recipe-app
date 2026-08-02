import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { RecipeActions } from "@/app/recipe/[id]/recipe-content";

describe("RecipeActions", () => {
  it("keeps variation creation on recipe detail for signed-in non-owners", () => {
    render(
      <LanguageProvider>
        <RecipeActions recipeId="base-recipe" isOwner={false} isLoggedIn />
      </LanguageProvider>,
    );

    expect(screen.getByRole("link", { name: /Make it your own/ }).getAttribute("href"))
      .toBe("/dashboard/recipes/new?fork=base-recipe");
  });
});
