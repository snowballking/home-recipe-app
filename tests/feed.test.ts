import { describe, expect, it } from "vitest";
import { filterDiscoverRecipes, filterFeedRecipes } from "@/lib/feed";

const recipes = [
  { id: "mei", user_id: "mei" },
  { id: "arun", user_id: "arun" },
];

describe("filterFeedRecipes", () => {
  it("keeps the community feed complete and narrows Following to followed cooks", () => {
    expect(filterFeedRecipes(recipes, "for-you", new Set(["mei"]))).toEqual(recipes);
    expect(filterFeedRecipes(recipes, "following", new Set(["mei"]))).toEqual([recipes[0]]);
  });
});

describe("filterDiscoverRecipes", () => {
  it("matches a search across recipe titles, cuisine, tags, and Chinese translations", () => {
    const discoverRecipes = [
      { title: "Prawn mee", title_zh: "虾面", description: null, description_zh: null, cuisine: "Singaporean", dietary_tags: ["halal"] },
      { title: "Miso eggplant", title_zh: null, description: "Smoky and sweet", description_zh: "香甜", cuisine: "Japanese", dietary_tags: ["vegetarian"] },
    ];

    expect(filterDiscoverRecipes(discoverRecipes, "  halal ")).toEqual([discoverRecipes[0]]);
    expect(filterDiscoverRecipes(discoverRecipes, "香甜")).toEqual([discoverRecipes[1]]);
  });
});
