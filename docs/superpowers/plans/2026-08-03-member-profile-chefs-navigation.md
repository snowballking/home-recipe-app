# Member Profile and Chefs Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface all public member recipes with originals first in a compact three-column profile grid, and replace the mobile Cart entry with the existing Chefs directory while retaining Cart as a header coming-soon icon.

**Architecture:** Add a pure recipe-ordering helper so server-rendered profiles have deterministic source grouping without database-specific ordering semantics. Keep compact presentation inside the reusable recipe card behind an explicit prop. Extend the central navigation model with `chefs`, then let `NavBar` render it as a normal link and reuse Cart's current feedback behavior in an icon-only header control.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase, Vitest, Testing Library.

## Global Constraints

- Add all new user-visible copy in English and Simplified Chinese; this work reuses existing translations.
- Maintain public-only recipe access and never expose recipes belonging to another member.
- Keep the Cart interaction as a no-destination “Coming soon” message until grocery purchasing exists.
- Do not push or deploy to production; create only a Vercel preview after verification.
- Preserve unrelated `HANDOFF.md`, `.superpowers/`, and `app/components/report-recipe-button 2.tsx` working-tree changes.

---

### Task 1: Order and display public member recipes

**Files:**
- Create: `lib/profile-recipes.ts`
- Create: `tests/profile-recipes.test.ts`
- Modify: `app/user/[id]/page.tsx`
- Modify: `app/components/recipe-card.tsx`
- Create: `tests/user-profile-page.test.tsx`

**Interfaces:**
- Produces: `orderProfileRecipes(recipes: Recipe[]): Recipe[]`, which returns recipes whose `source_url` is null before imported recipes and keeps each group newest first.
- Consumes: the existing `Recipe` type and `RecipeCard` component.

- [ ] **Step 1: Write the failing ordering test**

```ts
expect(orderProfileRecipes([importedNew, originalOld, originalNew, importedOld]))
  .toEqual([originalNew, originalOld, importedNew, importedOld]);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/profile-recipes.test.ts`

Expected: FAIL because `lib/profile-recipes.ts` does not exist.

- [ ] **Step 3: Implement the minimal helper and profile query change**

```ts
export function orderProfileRecipes(recipes: Recipe[]): Recipe[] {
  return [...recipes].sort((left, right) => {
    const sourceOrder = Number(Boolean(left.source_url)) - Number(Boolean(right.source_url));
    if (sourceOrder !== 0) return sourceOrder;
    return Date.parse(right.created_at) - Date.parse(left.created_at);
  });
}
```

Fetch all public recipes for the displayed member, pass them through the helper, and render each with `compact` enabled.

- [ ] **Step 4: Write the failing profile rendering test**

```tsx
expect(screen.getAllByTestId('profile-recipe-card').map((card) => card.textContent))
  .toEqual(['Original recipe', 'Imported recipe']);
expect(screen.getByTestId('profile-recipe-grid')).toHaveClass('lg:grid-cols-3');
```

- [ ] **Step 5: Implement compact card presentation**

Add `compact?: boolean` to `RecipeCard` and use smaller image, padding, typography, and spacing only when it is true. Keep the default output unchanged.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- tests/profile-recipes.test.ts tests/user-profile-page.test.tsx`

Expected: PASS.

### Task 2: Make Chefs primary navigation and move Cart to the header

**Files:**
- Modify: `lib/navigation.ts`
- Modify: `app/components/nav-bar.tsx`
- Modify: `tests/navigation.test.ts`
- Modify: `tests/nav-bar.test.tsx`

**Interfaces:**
- Produces: the `chefs` `PrimaryNavigationKey` with `href: "/chefs"` and active matching for `/chefs` routes.
- Consumes: existing `nav.chefs` and `nav.cart` translations and the current Cart live-region feedback.

- [ ] **Step 1: Write the failing navigation-model test**

```ts
expect(getPrimaryNavigation('/chefs')).toContainEqual({
  key: 'chefs', href: '/chefs', active: true,
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/navigation.test.ts`

Expected: FAIL because the primary navigation has no `chefs` item.

- [ ] **Step 3: Add the Chefs route and icon**

Replace the `cart` item in the primary navigation model with `chefs`; add its localized label and chef SVG icon to `NavBar`.

- [ ] **Step 4: Write the failing NavBar behavior test**

```tsx
expect(screen.getByRole('link', { name: 'Chefs' }).getAttribute('href')).toBe('/chefs');
await user.click(screen.getByRole('button', { name: 'Cart' }));
expect(screen.getByRole('status')).toHaveTextContent('Coming soon');
```

- [ ] **Step 5: Implement Cart as icon-only header feedback**

Allow the Cart control to render icon-only in the header; keep the bottom bar free of Cart and preserve the live-region feedback.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- tests/navigation.test.ts tests/nav-bar.test.tsx`

Expected: PASS.

### Task 3: Validate and create the review preview

**Files:**
- Verify: the files modified in Tasks 1–2

**Interfaces:**
- Consumes: passing focused tests and repository verification commands.
- Produces: a Vercel preview URL for review; it must not be promoted or pushed to production.

- [ ] **Step 1: Run all verification gates**

Run: `npm test`, `npx tsc --noEmit`, and `npm run build`.

Expected: all commands exit successfully.

- [ ] **Step 2: Review final diff and status**

Run: `git diff --check` and `git status --short`.

Expected: only the spec, plan, and Task 1–2 files are intentional; unrelated working-tree files remain untouched.

- [ ] **Step 3: Deploy a Vercel preview and inspect it**

Create a preview deployment only, inspect its READY status, and provide the preview URL. Do not run `vercel --prod`, promote a deployment, or push `main`.
