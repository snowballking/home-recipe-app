import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavBar } from "@/app/components/nav-bar";
import { LanguageProvider } from "@/lib/i18n/language-context";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  isAdmin: false,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/discover",
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "freddie@example.com" },
    isAdmin: mocks.isAdmin,
    displayName: "Freddie",
    loading: false,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: mocks.signOut } }),
}));

function renderNavBar() {
  return render(
    <LanguageProvider>
      <NavBar />
    </LanguageProvider>,
  );
}

describe("NavBar profile menu", () => {
  beforeEach(() => {
    mocks.push.mockClear();
    mocks.refresh.mockClear();
    mocks.signOut.mockClear();
    mocks.isAdmin = false;
  });

  it("opens explicit profile actions from the avatar instead of showing a standalone logout arrow", async () => {
    const user = userEvent.setup();
    renderNavBar();

    const trigger = screen.getByRole("button", { name: "Profile" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByLabelText("Log Out")).toBeNull();

    await user.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "My Profile" }).getAttribute("href")).toBe("/user/user-1");
    expect(screen.getByRole("menuitem", { name: "Saved Recipes" }).getAttribute("href")).toBe("/dashboard/saved-recipes");
    expect(screen.getByRole("menuitem", { name: "Edit Profile" }).getAttribute("href")).toBe("/dashboard/profile");
    expect(screen.getByRole("menuitem", { name: "Log Out" })).toBeTruthy();
  });

  it("closes the profile menu with Escape and an outside click", async () => {
    const user = userEvent.setup();
    renderNavBar();
    const trigger = screen.getByRole("button", { name: "Profile" });

    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();

    await user.click(trigger);
    await user.click(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes the menu after a profile navigation choice", async () => {
    const user = userEvent.setup();
    renderNavBar();

    await user.click(screen.getByRole("button", { name: "Profile" }));
    const profileLink = screen.getByRole("menuitem", { name: "My Profile" });
    profileLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
    await user.click(profileLink);

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("signs out once and redirects to login from the menu", async () => {
    const user = userEvent.setup();
    renderNavBar();

    await user.click(screen.getByRole("button", { name: "Profile" }));
    await user.click(screen.getByRole("menuitem", { name: "Log Out" }));

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledTimes(1);
      expect(mocks.push).toHaveBeenCalledWith("/login");
      expect(mocks.refresh).toHaveBeenCalledTimes(1);
    });
  });
});

describe("NavBar mobile primary navigation", () => {
  it("links mobile users to Chefs and keeps Cart as a header coming-soon control", async () => {
    renderNavBar();
    const mobileNav = screen.getByRole("navigation", { name: "Mobile primary" });
    const header = screen.getByRole("banner");

    expect(header.getAttribute("class")).toContain("bg-[#f2d6ab]");
    expect(mobileNav.getAttribute("class")).toContain("bg-[#f2d6ab]");
    expect(within(mobileNav).getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/market");
    expect(within(mobileNav).getByRole("link", { name: "Discover" }).getAttribute("href")).toBe("/discover");
    expect(within(mobileNav).getByRole("link", { name: "Plans" }).getAttribute("href")).toBe("/explore");
    expect(within(mobileNav).getByRole("link", { name: "Chefs" }).getAttribute("href")).toBe("/chefs");
    const createButton = within(mobileNav).getByRole("button", { name: "Create" });
    expect(createButton).toBeTruthy();
    expect(createButton.textContent?.trim()).toBe("＋");
    expect(createButton.getAttribute("class")).toContain("h-10");
    expect(createButton.getAttribute("class")).toContain("w-10");
    expect(createButton.parentElement?.getAttribute("class")).toContain("-mt-3");
    expect(within(mobileNav).queryByRole("button", { name: "Cart" })).toBeNull();

    const cart = within(header).getByRole("button", { name: "Cart" });
    expect(cart.getAttribute("title")).toBe("Universal cart coming soon");

    await userEvent.setup().click(cart);
    expect(within(header).getByRole("status").textContent).toBe("Coming Soon");

    for (const key of ["home", "discover", "plans", "chefs"] as const) {
      const iconClass = within(mobileNav).getByTestId(`mobile-nav-icon-${key}`).getAttribute("class") ?? "";
      const labelClass = within(mobileNav).getByTestId(`mobile-nav-label-${key}`).getAttribute("class") ?? "";
      expect(iconClass).toContain("h-6");
      expect(iconClass).toContain("w-6");
      expect(labelClass).toContain("text-xs");
    }
  });

  it("keeps the compact Create action accessible in Chinese", async () => {
    const user = userEvent.setup();
    renderNavBar();

    await user.click(screen.getByRole("button", { name: "中文" }));

    const mobileNav = screen.getByRole("navigation", { name: "Mobile primary" });
    const createButton = within(mobileNav).getByRole("button", { name: "创建" });
    expect(createButton.textContent?.trim()).toBe("＋");
    expect(createButton.getAttribute("class")).toContain("h-10");
    expect(createButton.getAttribute("class")).toContain("w-10");
    expect(createButton.parentElement?.getAttribute("class")).toContain("-mt-3");

    await user.click(screen.getByRole("button", { name: "EN" }));
  });
});

describe("NavBar header actions", () => {
  it("keeps Cart immediately next to the locale control for administrators", () => {
    mocks.isAdmin = true;
    renderNavBar();

    const header = screen.getByRole("banner");
    const cart = within(header).getByRole("button", { name: "Cart" });
    const locale = within(header).getByRole("button", { name: "中文" });

    expect(within(header).getByRole("link", { name: /Admin/ })).toBeTruthy();
    expect(cart.parentElement?.nextElementSibling).toBe(locale);
  });
});
