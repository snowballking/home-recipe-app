import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DiscoverPage from "@/app/discover/page";
import { LanguageProvider } from "@/lib/i18n/language-context";

const mocks = vi.hoisted(() => {
  const recipeQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };
  recipeQuery.select.mockReturnValue(recipeQuery);
  recipeQuery.eq.mockReturnValue(recipeQuery);
  recipeQuery.order.mockReturnValue(recipeQuery);
  recipeQuery.limit.mockResolvedValue({
    data: [
      { id: "assigned", title: "Chef laksa", chefs: { id: "chef-mei", name: "Chef Mei" }, profiles: { displayname: "Uploader" } },
      { id: "unassigned", title: "Community soup", chefs: null, profiles: { displayname: "Mei" } },
    ],
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
  });

  return {
    recipeSelect: recipeQuery.select,
    recipeQuery,
    recipeCardProps: [] as Array<{ recipe: { chefs?: { id: string; name: string } | null; author_name?: string } }>,
  };
});

vi.mock("@/app/components/nav-bar", () => ({ NavBar: () => null }));
vi.mock("@/app/components/recipe-card", () => ({
  RecipeCard: (props: { recipe: { chefs?: { id: string; name: string } | null; author_name?: string } }) => {
    mocks.recipeCardProps.push(props);
    return <div data-testid="mock-recipe-card" />;
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: vi.fn(() => mocks.recipeQuery) }),
}));

describe("DiscoverPage categories", () => {
  it("shows all filters in a compact three-column phone grid without changing selection behavior", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <DiscoverPage />
      </LanguageProvider>,
    );

    await waitFor(() => expect(screen.getAllByTestId("mock-recipe-card")).toHaveLength(2));

    expect(mocks.recipeSelect).toHaveBeenCalledWith("*, chefs(id,name), profiles(displayname)");
    expect(mocks.recipeCardProps[0]?.recipe.chefs).toEqual({ id: "chef-mei", name: "Chef Mei" });
    expect(mocks.recipeCardProps[1]?.recipe.chefs).toBeNull();
    expect(mocks.recipeCardProps[1]?.recipe.author_name).toBe("Mei");

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
