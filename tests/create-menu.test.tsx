import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { CreateMenu } from "@/app/components/create-menu";

describe("CreateMenu", () => {
  it("opens recipe and meal-plan creation choices from one control", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <CreateMenu />
      </LanguageProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Add recipe" }).getAttribute("href")).toBe("/dashboard/recipes/new");
    expect(screen.getByRole("link", { name: "Start a meal plan" }).getAttribute("href")).toBe("/dashboard/plans/new");
  });

  it("renders the modal outside a navigation positioning context", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <nav data-testid="positioning-context">
          <CreateMenu />
        </nav>
      </LanguageProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(within(screen.getByTestId("positioning-context")).queryByRole("dialog")).toBeNull();
  });
});
