import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  }),
}));

describe("login page", () => {
  it("presents the simple Chef HideOut community sign-in without the legacy landing content", async () => {
    render(<Home />);

    expect(await screen.findByLabelText("Chef HideOut 私厨")).toBeTruthy();
    expect(screen.getByText("Your cooking community")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Welcome back." })).toBeTruthy();
    expect(screen.getByText("Recipes, meal plans, and the people you cook with—all in one place.")).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Request an invite" }).getAttribute("href")).toBe("/signup");
    expect(screen.queryByRole("heading", { name: /Our Family Kitchen/i })).toBeNull();
    expect(screen.queryByText("Recipe Book")).toBeNull();
  });
});
