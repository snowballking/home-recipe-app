import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UserProfilePage from "@/app/user/[id]/page";
import type { Recipe } from "@/lib/types";

const recipeQuery = vi.hoisted(() => ({
  is: vi.fn(),
}));

const recipes = [
  {
    id: "imported",
    title: "Imported recipe",
    source_url: "https://example.com/imported",
    created_at: "2026-08-03T10:00:00Z",
    rating_count: 0,
    save_count: 0,
  },
  {
    id: "original",
    title: "Original recipe",
    source_url: null,
    created_at: "2026-08-02T10:00:00Z",
    rating_count: 0,
    save_count: 0,
  },
] as Recipe[];

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/app/components/nav-bar", () => ({ NavBar: () => null }));
vi.mock("@/app/components/follow-button", () => ({ FollowButton: () => null }));
vi.mock("@/app/user/[id]/change-password", () => ({ ChangePassword: () => null }));
vi.mock("@/app/components/recipe-card", () => ({
  RecipeCard: ({ recipe, compact }: { recipe: Recipe; compact?: boolean }) => (
    <div data-testid="profile-recipe-card">{recipe.title}:{compact ? "compact" : "regular"}</div>
  ),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "member-1",
                  displayname: "Member",
                  created_at: "2026-01-01T00:00:00Z",
                  is_chef: false,
                  is_admin: false,
                  is_approved: true,
                  bio: null,
                  specialties: [],
                  dietary_preferences: [],
                  external_links: {},
                  follower_count: 0,
                  following_count: 0,
                },
              }),
            }),
          }),
        };
      }

      if (table === "recipes") {
        const query = {
          select: vi.fn(),
          eq: vi.fn(),
          is: recipeQuery.is,
          order: vi.fn(),
        };
        query.select.mockReturnValue(query);
        query.eq.mockReturnValue(query);
        query.is.mockReturnValue(query);
        query.order.mockResolvedValue({ data: recipes });
        return query;
      }

      const plansQuery = {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
      };
      plansQuery.select.mockReturnValue(plansQuery);
      plansQuery.eq.mockReturnValue(plansQuery);
      plansQuery.order.mockReturnValue(plansQuery);
      plansQuery.limit.mockResolvedValue({ data: [] });
      return plansQuery;
    },
  }),
}));

describe("member public profile recipes", () => {
  it("includes public imports after originals in a compact three-column collection", async () => {
    recipeQuery.is.mockClear();
    render(await UserProfilePage({ params: Promise.resolve({ id: "member-1" }) }));

    expect(screen.getAllByTestId("profile-recipe-card").map((card) => card.textContent))
      .toEqual(["Original recipe:compact", "Imported recipe:compact"]);
    expect(screen.getByTestId("profile-recipe-grid").getAttribute("class")).toContain("lg:grid-cols-3");
    expect(recipeQuery.is).not.toHaveBeenCalledWith("source_url", null);
  });
});
