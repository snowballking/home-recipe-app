import { expect, test } from "@playwright/test";

/**
 * Logged-out smoke tests.
 *
 * These deliberately only touch pages that render without reading any database
 * rows, so CI can run them against placeholder Supabase credentials. Anything
 * that needs a signed-in session belongs in a separate, credentialled suite.
 */

test("landing page renders the sign-in form", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Welcome back." })
  ).toBeVisible();
  await expect(page.locator("#login-email")).toBeVisible();
  await expect(page.locator("#login-password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" })
  ).toBeVisible();
});

test("landing page links through to the signup form", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Request an invite" }).click();

  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
});

test("middleware redirects logged-out users away from the dashboard", async ({
  page,
}) => {
  await page.goto("/dashboard/recipes");

  // Middleware sends them to /login, which is a legacy redirect onto "/" where
  // the sign-in form now lives.
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back." })
  ).toBeVisible();
});
