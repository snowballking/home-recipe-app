import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NewRecipePage from "@/app/dashboard/recipes/new/page";
import { LanguageProvider } from "@/lib/i18n/language-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "member-1" } } }),
    },
    from: () => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn().mockResolvedValue({
          data: { is_chef: false },
          error: null,
        }),
      };
      return query;
    },
  }),
}));

function renderPage() {
  return render(
    <LanguageProvider>
      <NewRecipePage />
    </LanguageProvider>,
  );
}

describe("new recipe mobile layout", () => {
  it("stacks the import action and allows both controls to shrink within the card", async () => {
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);
    await user.type(input, "https://youtube.com/shorts/example");

    const actions = screen.getByTestId("import-url-actions");
    const importButton = screen.getByRole("button", { name: "Import" });

    expect(actions.className).toContain("flex-col");
    expect(actions.className).toContain("sm:flex-row");
    expect(input.className).toContain("min-w-0");
    expect(importButton.className).toContain("w-full");
    expect(importButton.className).toContain("sm:w-auto");
  });

  it("keeps the save actions fixed above the mobile navigation", () => {
    renderPage();

    const actions = screen.getByTestId("recipe-save-actions");
    const saveButton = screen.getByRole("button", { name: "Save Recipe" });

    expect(actions.className).toContain("fixed");
    expect(actions.className).toContain("sm:static");
    expect(actions.style.bottom).toContain("4rem");
    expect(actions.style.bottom).toContain("safe-area-inset-bottom");
    expect(saveButton.className).toContain("flex-1");
  });
});
