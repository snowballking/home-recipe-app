import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavBar } from "@/app/components/nav-bar";
import { LanguageProvider } from "@/lib/i18n/language-context";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/discover",
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "freddie@example.com" },
    isAdmin: false,
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
