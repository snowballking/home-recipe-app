import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalStyles = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("light theme defaults", () => {
  it("keeps the warm palette independent of the operating system color scheme", () => {
    expect(globalStyles).toContain("--background: #fff1e6;");
    expect(globalStyles).toContain("@custom-variant dark (&:where(.dark, .dark *));");
    expect(globalStyles).not.toContain("prefers-color-scheme: dark");
  });
});
