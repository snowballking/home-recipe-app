import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NewRecipePage from "@/app/dashboard/recipes/new/page";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { canPublishRecipe } from "@/lib/recipes/publish-policy";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

const database = vi.hoisted(() => ({
  inserted: [] as Record<string, unknown>[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "member-1" } } }),
    },
    from: (table: string) => {
      let operation: "read" | "insert" = "read";
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        insert: vi.fn((payload: Record<string, unknown>) => {
          operation = "insert";
          database.inserted.push(payload);
          return query;
        }),
        single: vi.fn(async () => operation === "insert"
          ? { data: { id: "imported-recipe" }, error: null }
          : table === "profiles"
            ? { data: { is_chef: false }, error: null }
            : { data: null, error: null }),
      };
      return query;
    },
  }),
}));

describe("recipe image publishing policy", () => {
  it("allows an imported image with a copyright caution", () => {
    expect(canPublishRecipe({ imageSource: "imported", isChef: false })).toEqual({
      allowed: true,
      warning: "imported_image_copyright",
    });
  });

  it("blocks a public recipe that has no usable image", () => {
    expect(canPublishRecipe({ imageSource: null, isChef: false })).toEqual({
      allowed: false,
      reason: "needs_image",
    });
  });
});

describe("linked recipe imports", () => {
  beforeEach(() => {
    database.inserted.length = 0;
    navigation.push.mockClear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        recipe: {
          title: "Imported noodle soup",
          description: "A warming bowl of noodles.",
          ingredients: [{ name: "noodles", quantity: "200", unit: "g" }],
          steps: ["Cook the noodles."],
          servings: 2,
          difficulty: "beginner",
          hero_image_url: "https://img.youtube.com/vi/example/maxresdefault.jpg",
        },
        chef_id: null,
      }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves an imported recipe as public with its linked image", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <NewRecipePage />
      </LanguageProvider>,
    );

    await user.type(
      screen.getByPlaceholderText(/youtube\.com\/watch/i),
      "https://youtube.com/watch?v=example",
    );
    await user.click(screen.getByRole("button", { name: "Import" }));

    expect(await screen.findByText(/Recipe extracted with AI/i)).toBeTruthy();
    expect(screen.getByText(/You can continue with this imported image/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Save Recipe" }));

    await waitFor(() => expect(database.inserted).toHaveLength(1));
    expect(database.inserted[0]).toMatchObject({
      title: "Imported noodle soup",
      source_url: "https://youtube.com/watch?v=example",
      hero_image_url: "https://img.youtube.com/vi/example/maxresdefault.jpg",
      image_source: "imported",
      is_public: true,
    });
    expect(navigation.push).toHaveBeenCalledWith("/recipe/imported-recipe");
  });
});
