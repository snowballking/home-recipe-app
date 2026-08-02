import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { RecipeVariationSelector } from "@/app/components/recipe-variation-selector";

describe("RecipeVariationSelector", () => {
  it("lets a cook choose a named variation while keeping the original visible", () => {
    render(
      <LanguageProvider>
        <RecipeVariationSelector
          activeRecipeId="lighter"
          options={[
            {
              id: "original",
              title: "Prawn mee",
              titleZh: "虾面",
              authorName: "Mei",
              variationNote: null,
              isOriginal: true,
            },
            {
              id: "lighter",
              title: "Lighter prawn mee",
              titleZh: "低油虾面",
              authorName: "Arun",
              variationNote: "Used half the oil",
              isOriginal: false,
            },
          ]}
        />
      </LanguageProvider>,
    );

    expect(screen.getByRole("link", { name: /Original/i }).getAttribute("href")).toBe("/recipe/original");
    expect(screen.getByRole("link", { name: /Lighter prawn mee/i }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Used half the oil")).toBeTruthy();
  });

  it("does not add an empty overlay when there are no variations", () => {
    const { container } = render(
      <LanguageProvider>
        <RecipeVariationSelector
          activeRecipeId="original"
          options={[
            {
              id: "original",
              title: "Prawn mee",
              titleZh: "虾面",
              authorName: "Mei",
              variationNote: null,
              isOriginal: true,
            },
          ]}
        />
      </LanguageProvider>,
    );

    expect(container.firstChild).toBeNull();
  });
});
