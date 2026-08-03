import { describe, expect, it } from "vitest";
import { getPrimaryNavigation } from "@/lib/navigation";

describe("getPrimaryNavigation", () => {
  it("marks Home active for the community feed and keeps Chefs as the fifth mobile destination", () => {
    const navigation = getPrimaryNavigation("/market");

    expect(navigation.map((item) => item.key)).toEqual([
      "home",
      "discover",
      "create",
      "plans",
      "chefs",
    ]);
    expect(navigation.find((item) => item.key === "home")?.active).toBe(true);
    expect(navigation.find((item) => item.key === "discover")?.active).toBe(false);
  });

  it("marks Chefs active for the directory and chef detail routes", () => {
    expect(getPrimaryNavigation("/chefs").find((item) => item.key === "chefs")?.active).toBe(true);
    expect(getPrimaryNavigation("/chefs/chef-1").find((item) => item.key === "chefs")?.active).toBe(true);
  });
});
