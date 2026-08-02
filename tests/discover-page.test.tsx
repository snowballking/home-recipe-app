import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DiscoverPage from "@/app/discover/page";
import { LanguageProvider } from "@/lib/i18n/language-context";

vi.mock("@/app/components/nav-bar", () => ({ NavBar: () => null }));
vi.mock("@/app/components/recipe-card", () => ({ RecipeCard: () => null }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      }),
    };
    return { from: vi.fn(() => query) };
  },
}));

describe("DiscoverPage categories", () => {
  it("shows all filters in a compact three-column phone grid without changing selection behavior", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <DiscoverPage />
      </LanguageProvider>,
    );

    await waitFor(() => expect(screen.getByText("No public recipes yet")).toBeTruthy());

    const categoryGroup = screen.getByTestId("discover-categories");
    const groupClass = categoryGroup.getAttribute("class") ?? "";
    expect(groupClass).toContain("grid-cols-3");
    expect(groupClass).toContain("sm:flex");
    expect(groupClass).toContain("sm:flex-wrap");

    const categoryButtons = within(categoryGroup).getAllByRole("button");
    expect(categoryButtons).toHaveLength(11);
    expect(categoryButtons[0].textContent).toBe("All");
    expect(categoryButtons[0].getAttribute("class")).toContain("text-[10px]");
    expect(categoryButtons[0].getAttribute("class")).toContain("sm:text-sm");

    const breakfast = within(categoryGroup).getByRole("button", { name: /Breakfast/ });
    await user.click(breakfast);

    expect(breakfast.getAttribute("aria-pressed")).toBe("true");
    expect(categoryButtons[0].getAttribute("aria-pressed")).toBe("false");
  });
});
