# Mobile Navigation, Discover Categories, and Profile Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve mobile navigation legibility, compress Discover filters into a three-column phone layout, and replace the ambiguous logout arrow with an explicit avatar menu.

**Architecture:** Keep `NavBar` as the client-side owner of route, account-menu, locale, and sign-out state. Add small internal SVG and profile-menu helpers so desktop and mobile markup remain readable. Keep `DiscoverPage` data loading and filtering untouched while changing only its responsive category-control presentation. Lock each behavior with focused React Testing Library tests before production code changes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase browser client, Vitest, React Testing Library, user-event.

## Global Constraints

- Follow the approved design in `docs/superpowers/specs/2026-08-02-mobile-navigation-discover-profile-menu-design.md`.
- Keep Home, Discover, Create, Plans, and Cart destinations and route behavior unchanged.
- Keep the raised Create control and desktop navigation styling unchanged.
- Keep all eleven Discover category controls visible; do not introduce horizontal scrolling or a disclosure control.
- Keep logout's existing Supabase sign-out, `/login` redirect, refresh, and duplicate-click lock.
- Add English and Simplified Chinese text for every new visible label.
- Keep implementation commits local. Do not push or deploy until the user approves the development preview.
- Do not stage the existing `.superpowers/` directory or `app/components/report-recipe-button 2.tsx`.

---

### Task 1: Replace the header logout arrow with an accessible avatar menu

**Files:**
- Create: `tests/nav-bar.test.tsx`
- Modify: `app/components/nav-bar.tsx`
- Modify: `lib/i18n/translations.ts`

- [ ] **Step 1: Write the failing profile-menu tests**

Mock `next/navigation`, `@/lib/auth/auth-context`, and `@/lib/supabase/client`, render `NavBar` inside `LanguageProvider`, and verify the signed-in avatar is a button with `aria-haspopup="menu"` and `aria-expanded="false"`.

Open the trigger and assert a `role="menu"` contains:

```tsx
expect(screen.getByRole("link", { name: "My Profile" })).toHaveAttribute("href", "/user/user-1");
expect(screen.getByRole("link", { name: "Edit Profile" })).toHaveAttribute("href", "/dashboard/profile");
expect(screen.getByRole("menuitem", { name: "Log out" })).toBeTruthy();
expect(screen.queryByLabelText("Log Out")).toBeNull();
```

Add interaction cases for Escape, outside pointer interaction, link selection, and logout. The logout case must assert `signOut`, `router.push("/login")`, and `router.refresh()` are each called once.

- [ ] **Step 2: Run the focused test and confirm it fails for the missing menu**

Run: `npx vitest run tests/nav-bar.test.tsx`

Expected: FAIL because the current avatar is a link and the standalone arrow is still present.

- [ ] **Step 3: Add bilingual menu labels**

Add these keys near the existing navigation translations:

```ts
"nav.my_profile": { en: "My Profile", zh: "我的主页" },
"nav.edit_profile": { en: "Edit Profile", zh: "编辑个人资料" },
"nav.logging_out": { en: "Logging out…", zh: "正在退出…" },
```

- [ ] **Step 4: Implement the avatar menu inside `NavBar`**

Add `useEffect` and `useRef` imports. Use a small internal `ProfileMenu` helper with this contract:

```tsx
interface ProfileMenuProps {
  userId: string;
  displayName: string;
  onLogout: () => Promise<void>;
  loggingOut: boolean;
}
```

The helper owns only `open` state, its container ref, the outside-pointer listener, and the Escape listener. Its trigger keeps the existing orange initial styling and exposes `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls="profile-menu"`. Render an absolutely positioned menu below the avatar with `role="menu"`; navigation links use `role="menuitem"` and close the menu on selection. The logout button uses `t("nav.log_out")`, switches to `t("nav.logging_out")`, and disables itself while signing out.

Keep `handleLogout` in `NavBar` and replace the avatar link plus `↗` button with:

```tsx
<ProfileMenu
  userId={user.id}
  displayName={displayName}
  onLogout={handleLogout}
  loggingOut={loggingOut}
/>
```

- [ ] **Step 5: Run the focused test until green**

Run: `npx vitest run tests/nav-bar.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the profile-menu slice locally**

```bash
git add app/components/nav-bar.tsx lib/i18n/translations.ts tests/nav-bar.test.tsx
git diff --cached --check
git commit -m "feat: add profile account menu"
```

### Task 2: Enlarge and clarify the mobile primary navigation

**Files:**
- Modify: `tests/nav-bar.test.tsx`
- Modify: `app/components/nav-bar.tsx`

- [ ] **Step 1: Add failing mobile-navigation contract tests**

Assert the mobile navigation still exposes all five destinations, and Home, Discover, Plans, and Cart each render an inline SVG marked with a stable test id:

```tsx
for (const key of ["home", "discover", "plans", "cart"] as const) {
  expect(screen.getByTestId(`mobile-nav-icon-${key}`).getAttribute("class")).toContain("h-6");
  expect(screen.getByTestId(`mobile-nav-icon-${key}`).getAttribute("class")).toContain("w-6");
  expect(screen.getByTestId(`mobile-nav-label-${key}`).getAttribute("class")).toContain("text-xs");
}
```

Also assert Home, Discover, and Plans keep their current hrefs, Cart stays disabled, and Create remains the central `CreateMenu` control.

- [ ] **Step 2: Run the focused test and confirm it fails on the old text glyphs**

Run: `npx vitest run tests/nav-bar.test.tsx`

Expected: FAIL because the current icons are text characters at `text-base` and labels use `text-[11px]`.

- [ ] **Step 3: Implement semantic inline SVG icons and larger labels**

Replace the `ICONS` string map with an internal component:

```tsx
function PrimaryNavIcon({ icon }: { icon: Exclude<PrimaryNavigationKey, "create"> }) {
  const paths = {
    home: <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
    discover: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    plans: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    cart: <><path d="M3 3h2l2.4 11.5a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 2-1.6L21 7H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
  };

  return <svg data-testid={`mobile-nav-icon-${icon}`} className="h-6 w-6" /* shared stroke attributes */>{paths[icon]}</svg>;
}
```

Use 24-by-24 SVGs, `text-xs` labels with medium/semibold weight, and a minimum 48-pixel standard-tab tap height. Preserve active, inactive, disabled, dark-mode, safe-area, and route behavior. Do not change the raised Create styling.

- [ ] **Step 4: Run the focused test until green**

Run: `npx vitest run tests/nav-bar.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the navigation slice locally**

```bash
git add app/components/nav-bar.tsx tests/nav-bar.test.tsx
git diff --cached --check
git commit -m "feat: enlarge mobile primary navigation"
```

### Task 3: Compress Discover categories into a phone-sized three-column grid

**Files:**
- Create: `tests/discover-page.test.tsx`
- Modify: `app/discover/page.tsx`

- [ ] **Step 1: Write the failing Discover layout and behavior tests**

Mock `NavBar`, the Supabase recipes query chain, and `RecipeCard`. Render `DiscoverPage` inside `LanguageProvider`, then verify:

```tsx
const categories = screen.getByTestId("discover-categories");
expect(categories.getAttribute("class")).toContain("grid-cols-3");
expect(categories.getAttribute("class")).toContain("sm:flex");
expect(within(categories).getAllByRole("button")).toHaveLength(11);
```

Assert the All control and ten shared recipe categories are present, each category button uses compact mobile text and restores `sm:text-sm`, and clicking Breakfast sets `aria-pressed="true"` while All becomes false.

- [ ] **Step 2: Run the focused test and confirm it fails on the current wrapping layout**

Run: `npx vitest run tests/discover-page.test.tsx`

Expected: FAIL because the category group currently uses only `flex flex-wrap` and 14-pixel labels.

- [ ] **Step 3: Implement the responsive category grid**

Extract one shared category-button class string and apply it to All and every mapped category:

```tsx
const categoryButtonClass =
  "min-h-9 min-w-0 rounded-2xl px-1.5 py-1.5 text-[10px] font-semibold leading-tight transition-colors sm:min-h-0 sm:shrink-0 sm:rounded-full sm:px-3.5 sm:py-2 sm:text-sm";
```

Change the category container to:

```tsx
<div
  data-testid="discover-categories"
  className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:flex-1 sm:flex-wrap sm:gap-2"
>
```

Keep emojis, translated labels, database values, pressed-state behavior, and filter logic unchanged. Place the Latest/Popular control as a separate row on phones while keeping it beside the category group when space permits at `sm` and above. Use `min-w-0`, tight leading, and wrapping labels so the category region does not widen a 320-pixel viewport.

- [ ] **Step 4: Run the focused test until green**

Run: `npx vitest run tests/discover-page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the Discover slice locally**

```bash
git add app/discover/page.tsx tests/discover-page.test.tsx
git diff --cached --check
git commit -m "feat: compact discover category filters"
```

### Task 4: Verify the complete responsive experience

**Files:**
- Modify only if verification exposes an in-scope defect.

- [ ] **Step 1: Run focused tests together**

Run: `npx vitest run tests/nav-bar.test.tsx tests/discover-page.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run project verification**

Run:

```bash
npm test
npx tsc --noEmit
npm run build
```

Expected: all tests, type checking, and production build pass. Run `npm run lint` for evidence, but report the known pre-existing repository-wide findings separately rather than representing them as caused or fixed by this feature.

- [ ] **Step 3: Review changed React code against project best practices**

Check client boundaries, effect cleanup, event listener lifetime, accessible menu semantics, stable list keys, and unnecessary rerenders. Apply only in-scope corrections, then rerun the relevant tests.

- [ ] **Step 4: Verify in the development browser at phone size**

At 390 by 844, confirm:

- Home, Discover, Plans, and Cart icons are clear and labels are legible.
- Create remains raised and centered without clipping.
- Discover shows eleven category filters in three columns and four rows.
- No horizontal overflow exists, including at 320 pixels wide.
- Latest/Popular is visually separate from the category grid.
- The avatar opens a fully visible menu with My Profile, Edit Profile, and Log out.
- The menu closes on Escape, outside click, and navigation selection.

- [ ] **Step 5: Verify desktop regression safety**

At 1280 by 720, confirm desktop navigation and Discover wrapping remain visually consistent, the profile menu is correctly anchored below the avatar, and the mobile bottom bar is hidden.

- [ ] **Step 6: Inspect final scope and hand off the local preview**

Run:

```bash
git status --short
git diff --check
git log --oneline -5
```

Summarize the verified changes, known unrelated lint findings, and local preview URL. Do not push or deploy; ask the user to review the development version and explicitly approve a production push.
