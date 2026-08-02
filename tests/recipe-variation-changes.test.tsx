import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecipeVariationChanges } from "@/app/components/recipe-variation-changes";
import { LanguageProvider } from "@/lib/i18n/language-context";
import type { VariationDiffV1 } from "@/lib/recipe-variation";

const diff: VariationDiffV1 = {
  version: 1,
  ingredientChanges: [
    {
      kind: "replace",
      originalIndex: 0,
      from: { name: "white rice", quantity: "1", unit: "cup" },
      to: { name: "brown rice", quantity: "1", unit: "cup" },
    },
    {
      kind: "add",
      afterOriginalIndex: 1,
      ingredient: { name: "lime", quantity: "1", unit: "" },
    },
    {
      kind: "remove",
      originalIndex: 2,
      ingredient: { name: "peanuts", quantity: "2", unit: "tbsp" },
    },
  ],
  stepChanges: [
    {
      kind: "edit",
      originalIndex: 0,
      from: "Boil the rice.",
      to: "Simmer the brown rice until tender.",
    },
    { kind: "add", afterOriginalIndex: null, step: "Rinse the rice first." },
    { kind: "add", afterOriginalIndex: 0, step: "Rest it for five minutes." },
    { kind: "remove", originalIndex: 1, step: "Toast the peanuts." },
  ],
};

function exactText(text: string) {
  return (_: string, element: Element | null) => element?.tagName === "P" && element.textContent === text;
}

describe("RecipeVariationChanges", () => {
  it("explains every structured ingredient and instruction change", () => {
    render(
      <LanguageProvider>
        <RecipeVariationChanges diff={diff} />
      </LanguageProvider>,
    );

    expect(screen.getByRole("heading", { name: "What changed" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ingredients" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Instructions" })).toBeTruthy();
    expect(screen.getByText(exactText("Replaced 1 cup white rice → 1 cup brown rice"))).toBeTruthy();
    expect(screen.getByText(exactText("Added 1 lime"))).toBeTruthy();
    expect(screen.getByText(exactText("Removed 2 tbsp peanuts"))).toBeTruthy();
    expect(screen.getByText("Rewrote step 1")).toBeTruthy();
    expect(screen.getByText("Simmer the brown rice until tender.")).toBeTruthy();
    expect(screen.getByText("Added before step 1")).toBeTruthy();
    expect(screen.getByText("Added after step 1")).toBeTruthy();
    expect(screen.getByText("Removed step 2")).toBeTruthy();
  });

  it("renders nothing for legacy or empty variation data", () => {
    const { rerender } = render(
      <LanguageProvider>
        <RecipeVariationChanges diff={{ legacy: true }} />
      </LanguageProvider>,
    );
    expect(screen.queryByRole("region", { name: "What changed" })).toBeNull();

    rerender(
      <LanguageProvider>
        <RecipeVariationChanges diff={{ version: 1, ingredientChanges: [], stepChanges: [] }} />
      </LanguageProvider>,
    );
    expect(screen.queryByRole("region", { name: "What changed" })).toBeNull();
  });
});
