import { describe, expect, it } from "vitest";
import { getRecipeFamilyOptions } from "@/lib/recipe-family";

describe("getRecipeFamilyOptions", () => {
  it("keeps the original first and preserves each variation's credit", () => {
    const options = getRecipeFamilyOptions(
      { id: "original", title: "Prawn mee", title_zh: "虾面", authorName: "Mei" },
      [
        {
          id: "lighter",
          title: "Lighter prawn mee",
          title_zh: "低油虾面",
          authorName: "Arun",
          variationNote: "Used half the oil",
        },
      ],
    );

    expect(options).toEqual([
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
    ]);
  });
});
