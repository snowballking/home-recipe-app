import { describe, expect, it } from "vitest";
import { getPrimaryNavigation } from "@/lib/navigation";

describe("getPrimaryNavigation", () => {
  it("marks Home active for the community feed and keeps five mobile destinations", () => {
    const navigation = getPrimaryNavigation("/market");

    expect(navigation.map((item) => item.key)).toEqual([
      "home",
      "discover",
      "create",
      "plans",
      "cart",
    ]);
    expect(navigation.find((item) => item.key === "home")?.active).toBe(true);
    expect(navigation.find((item) => item.key === "discover")?.active).toBe(false);
  });
});
