import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/market/page";
import { LanguageProvider } from "@/lib/i18n/language-context";

const mocks = vi.hoisted(() => ({
  recipeSelect: vi.fn(),
  recipeLimit: vi.fn(),
  savesSelect: vi.fn(),
  feedCardProps: [] as Array<{ isSaved?: boolean }>,
}));

vi.mock("@/app/components/nav-bar", () => ({ NavBar: () => null }));
vi.mock("@/app/components/recipe-feed-card", () => ({
  RecipeFeedCard: (props: { isSaved?: boolean }) => {
    mocks.feedCardProps.push(props);
    return <div data-testid="mock-feed-card" />;
  },
}));

function query(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn> | ((resolve: (value: unknown) => unknown) => Promise<unknown>)> = {};
  for (const method of ["select", "eq", "order", "limit"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    from: vi.fn((table: string) => {
      if (table === "recipes") {
        const q = query({
          data: [{
            id: "prawn-mee",
            user_id: "chef-1",
            title: "Prawn mee",
            title_zh: null,
            description: "A family favourite.",
            description_zh: null,
            hero_image_url: null,
            image_source: null,
            original_recipe_id: null,
            save_count: 2,
            comment_count: 1,
            profiles: { displayname: "Mei" },
          }],
          error: null,
        });
        mocks.recipeSelect = q.select as typeof mocks.recipeSelect;
        mocks.recipeLimit = q.limit as typeof mocks.recipeLimit;
        return q;
      }
      if (table === "follows") return query({ data: [], error: null });
      if (table === "recipe_saves") {
        const q = query({ data: [{ recipe_id: "prawn-mee" }], error: null });
        mocks.savesSelect = q.select as typeof mocks.savesSelect;
        return q;
      }
      return query({ data: [], error: null });
    }),
  }),
}));

describe("Home feed loading", () => {
  it("loads a compact feed projection and one saved-id query", async () => {
    render(
      <LanguageProvider>
        <HomePage />
      </LanguageProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("mock-feed-card")).toBeTruthy());

    expect(mocks.recipeSelect).toHaveBeenCalledWith(
      "id,user_id,title,title_zh,description,description_zh,hero_image_url,image_source,original_recipe_id,save_count,comment_count,profiles(displayname)",
    );
    expect(mocks.recipeLimit).toHaveBeenCalledWith(24);
    expect(mocks.savesSelect).toHaveBeenCalledWith("recipe_id");
    expect(mocks.feedCardProps[0]?.isSaved).toBe(true);
  });
});
