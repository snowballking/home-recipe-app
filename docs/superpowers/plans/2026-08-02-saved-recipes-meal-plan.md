# Saved Recipes and Meal-Plan Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give signed-in users a reliable private Saved Recipes page and make their saved recipes the default source when filling a weekly meal plan.

**Architecture:** Replace the profile-anchor collection with a protected client route that loads the current user's `recipe_saves` under existing RLS. Extract pure helpers for saved-row normalization and picker source filtering, then consume them from the dedicated collection page and existing meal-plan modal. This leaves the large planner page responsible for data orchestration and UI only.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase browser client, Vitest, React Testing Library, user-event.

## Global Constraints

- Follow `docs/superpowers/specs/2026-08-02-saved-recipes-meal-plan-design.md` exactly.
- Do not add a database migration or change RLS; `recipe_saves` remains private to its owner.
- Keep All, My Recipes, Community, category filtering, search, and recipe-to-slot insertion behavior intact.
- Saved must be the first source tab and the default only when at least one saved ID exists; otherwise default to All.
- Add English and Simplified Chinese text for each newly visible label.
- Do not stage `.superpowers/` or `app/components/report-recipe-button 2.tsx`.
- Run focused tests, the full test suite, TypeScript checking, and the production build before deploying.

---

### Task 1: Add testable saved-recipe and picker-source helpers

**Files:**
- Create: `lib/saved-recipes.ts`
- Create: `lib/recipe-picker-source.ts`
- Create: `tests/saved-recipes-data.test.ts`
- Create: `tests/recipe-picker-source.test.ts`

**Interfaces:**
- Consumes: `Recipe` from `lib/types.ts` and lightweight Supabase row shapes.
- Produces: `getSavedRecipeIds`, `normalizeSavedRecipeRows`, `getDefaultRecipePickerSource`, and `filterRecipesForPicker`.

- [ ] **Step 1: Write the failing saved-recipe data tests**

Create `tests/saved-recipes-data.test.ts` with a saved recipe, a null joined recipe, and a duplicate ID:

```tsx
import { describe, expect, it } from "vitest";
import { getSavedRecipeIds, normalizeSavedRecipeRows } from "@/lib/saved-recipes";

const recipe = { id: "laksa", user_id: "chef-1", title: "Laksa" } as any;

it("keeps available recipes in saved order", () => {
  expect(normalizeSavedRecipeRows([
    { recipe_id: "laksa", recipes: recipe },
    { recipe_id: "removed", recipes: null },
  ])).toEqual([recipe]);
});

it("returns each saved recipe id once", () => {
  expect(getSavedRecipeIds([{ recipe_id: "laksa" }, { recipe_id: "laksa" }])).toEqual(["laksa"]);
});
```

- [ ] **Step 2: Run the data test and confirm it fails because the helper module is absent**

Run: `npx vitest run tests/saved-recipes-data.test.ts`

Expected: FAIL with a module-resolution error for `@/lib/saved-recipes`.

- [ ] **Step 3: Implement the minimal saved-recipe helper**

Create `lib/saved-recipes.ts`:

```ts
import type { Recipe } from "@/lib/types";

export interface SavedRecipeIdRow { recipe_id: string }
export interface SavedRecipeRow extends SavedRecipeIdRow { recipes?: Recipe | null }

export function getSavedRecipeIds(rows: SavedRecipeIdRow[] | null | undefined): string[] {
  return [...new Set((rows ?? []).map((row) => row.recipe_id))];
}

export function normalizeSavedRecipeRows(rows: SavedRecipeRow[] | null | undefined): Recipe[] {
  return (rows ?? []).flatMap((row) => row.recipes ? [row.recipes] : []);
}
```

- [ ] **Step 4: Run the data test until green**

Run: `npx vitest run tests/saved-recipes-data.test.ts`

Expected: PASS.

- [ ] **Step 5: Write the failing picker-source tests**

Create `tests/recipe-picker-source.test.ts` with one owned recipe and one saved community recipe:

```ts
expect(getDefaultRecipePickerSource(["community-1"])).toBe("saved");
expect(getDefaultRecipePickerSource([])).toBe("all");
expect(filterRecipesForPicker(recipes, "me", "saved", ["community-1"])).toEqual([communityRecipe]);
expect(filterRecipesForPicker(recipes, "me", "mine", [])).toEqual([ownRecipe]);
expect(filterRecipesForPicker(recipes, "me", "community", [])).toEqual([communityRecipe]);
```

- [ ] **Step 6: Run the picker-source test and confirm it fails because the helper module is absent**

Run: `npx vitest run tests/recipe-picker-source.test.ts`

Expected: FAIL with a module-resolution error for `@/lib/recipe-picker-source`.

- [ ] **Step 7: Implement the minimal picker-source helper**

Create `lib/recipe-picker-source.ts`:

```ts
import type { Recipe } from "@/lib/types";

export type RecipePickerSource = "saved" | "all" | "mine" | "community";

export function getDefaultRecipePickerSource(savedRecipeIds: string[]): RecipePickerSource {
  return savedRecipeIds.length > 0 ? "saved" : "all";
}

export function filterRecipesForPicker(
  recipes: Recipe[], currentUserId: string | null, source: RecipePickerSource, savedRecipeIds: string[],
): Recipe[] {
  if (source === "saved") {
    const savedIds = new Set(savedRecipeIds);
    return recipes.filter((recipe) => savedIds.has(recipe.id));
  }
  if (source === "mine") return recipes.filter((recipe) => recipe.user_id === currentUserId);
  if (source === "community") return recipes.filter((recipe) => recipe.user_id !== currentUserId);
  return recipes;
}
```

- [ ] **Step 8: Run both helper tests until green**

Run: `npx vitest run tests/saved-recipes-data.test.ts tests/recipe-picker-source.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit the helper slice**

```bash
git add lib/saved-recipes.ts lib/recipe-picker-source.ts tests/saved-recipes-data.test.ts tests/recipe-picker-source.test.ts
git diff --cached --check
git commit -m "feat: add saved recipe picker helpers"
```

### Task 2: Build the dedicated authenticated Saved Recipes page

**Files:**
- Create: `app/dashboard/saved-recipes/page.tsx`
- Modify: `app/components/saved-recipe-collection.tsx`
- Modify: `app/components/nav-bar.tsx`
- Modify: `app/user/[id]/page.tsx`
- Modify: `tests/nav-bar.test.tsx`
- Create: `tests/saved-recipes-page.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, browser `createClient`, `normalizeSavedRecipeRows`, `SavedRecipeCollection`, and `Recipe`.
- Produces: `/dashboard/saved-recipes` as the canonical private collection route and an updated account-menu link.

- [ ] **Step 1: Write the failing canonical-link and dedicated-page tests**

Change the Saved Recipes assertion in `tests/nav-bar.test.tsx`:

```tsx
expect(screen.getByRole("menuitem", { name: "Saved Recipes" }).getAttribute("href"))
  .toBe("/dashboard/saved-recipes");
```

Create `tests/saved-recipes-page.test.tsx`. Mock `useAuth` with `user: { id: "user-1" }`, mock `createClient`, and make the `recipe_saves` chain resolve to a joined `Laksa` recipe. Render the page inside `LanguageProvider`, then assert:

```tsx
await waitFor(() => expect(screen.getByRole("heading", { name: "Saved Recipes" })).toBeTruthy());
expect(mocks.select).toHaveBeenCalledWith("recipe_id, created_at, recipes(*)");
expect(mocks.eq).toHaveBeenCalledWith("user_id", "user-1");
expect(screen.getByText("Laksa")).toBeTruthy();
```

Add an empty-query case that asserts the existing `Browse recipes` link points to `/discover`.

- [ ] **Step 2: Run the focused page and navigation tests and confirm the intended failures**

Run: `npx vitest run tests/nav-bar.test.tsx tests/saved-recipes-page.test.tsx`

Expected: the nav assertion fails because it still targets `/user/user-1#saved-recipes`, and the page test fails because the route module is absent.

- [ ] **Step 3: Make the collection component suitable for a standalone page**

Extend `SavedRecipeCollection` with optional `headingLevel?: "h1" | "h2"`, defaulting to `h2`:

```tsx
const Heading = headingLevel === "h1" ? "h1" : "h2";
<Heading className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
  {t("saved.title")}
</Heading>
```

- [ ] **Step 4: Create the protected collection page**

Mark `app/dashboard/saved-recipes/page.tsx` as a client component. Read `user` and `loading` from `useAuth`; while auth or data is pending, render a labelled spinner. Once a user exists, issue exactly this browser-client query and normalize it:

```ts
const { data } = await supabase
  .from("recipe_saves")
  .select("recipe_id, created_at, recipes(*)")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });

setRecipes(normalizeSavedRecipeRows(data));
```

Use an `active` cleanup flag so a resolved request cannot update an unmounted page. Render the collection within `mx-auto max-w-6xl px-4 py-8` and pass `headingLevel="h1"`.

- [ ] **Step 5: Point the account menu to the canonical route and remove the stale profile collection**

In `app/components/nav-bar.tsx`, replace the Saved Recipes `href` with `/dashboard/saved-recipes`. In `app/user/[id]/page.tsx`, remove the `SavedRecipeCollection` import, `RecipeSave` type import, owner-only saved query, and trailing owner-only collection. Keep public profile content and owner controls intact.

- [ ] **Step 6: Run focused tests until green**

Run: `npx vitest run tests/nav-bar.test.tsx tests/saved-recipes-page.test.tsx tests/saved-recipes-data.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the dedicated-page slice**

```bash
git add app/dashboard/saved-recipes/page.tsx app/components/saved-recipe-collection.tsx app/components/nav-bar.tsx app/user/'[id]'/page.tsx tests/nav-bar.test.tsx tests/saved-recipes-page.test.tsx
git diff --cached --check
git commit -m "feat: add dedicated saved recipes page"
```

### Task 3: Make Saved the first source in the meal-plan recipe picker

**Files:**
- Modify: `app/dashboard/plans/[id]/page.tsx`
- Modify: `lib/i18n/translations.ts`
- Modify: `tests/recipe-picker-source.test.ts`

**Interfaces:**
- Consumes: `getSavedRecipeIds`, `RecipePickerSource`, `getDefaultRecipePickerSource`, and `filterRecipesForPicker`.
- Produces: a Saved-first picker with default selection, count, preserved filtering, and unchanged slot insertion.

- [ ] **Step 1: Extend the failing picker test with source edge cases**

Add tests that preserve input order, return no Saved recipes for no IDs, and retain the All fallback:

```ts
expect(filterRecipesForPicker([communityRecipe, ownRecipe], "me", "saved", ["community-1"]))
  .toEqual([communityRecipe]);
expect(filterRecipesForPicker(recipes, "me", "saved", [])).toEqual([]);
expect(getDefaultRecipePickerSource([])).toBe("all");
```

- [ ] **Step 2: Run the focused source test and confirm it fails until the new behavior is covered**

Run: `npx vitest run tests/recipe-picker-source.test.ts`

Expected: FAIL if the edge case is missing from the helper contract.

- [ ] **Step 3: Keep the source helper green, adding only required behavior**

Use a `Set` of saved IDs and filter the provided list in its existing order. Do not alter All, My Recipes, or Community behavior.

- [ ] **Step 4: Add localized picker-source labels**

Add beside the meal-plan translations:

```ts
"meal_plan.saved_source": { en: "Saved", zh: "已收藏" },
"meal_plan.all_source": { en: "All", zh: "全部" },
"meal_plan.mine_source": { en: "My Recipes", zh: "我的食谱" },
"meal_plan.community_source": { en: "Community", zh: "社区食谱" },
```

- [ ] **Step 5: Wire saved IDs and source filtering into the existing modal**

In `MealPlanDetailPage`, add `const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([])`. In `loadData`, request recipes and saved IDs together:

```ts
const [recipesResult, savedResult] = await Promise.all([
  supabase.from("recipes").select("*, profiles(displayname)")
    .or(`user_id.eq.${user.id},is_public.eq.true`).order("title", { ascending: true }),
  supabase.from("recipe_saves").select("recipe_id").eq("user_id", user.id),
]);
setSavedRecipeIds(getSavedRecipeIds(savedResult.data));
```

Pass `savedRecipeIds` into `RecipePickerModal`. Initialize it with `getDefaultRecipePickerSource(savedRecipeIds)`, apply `filterRecipesForPicker` before category and search filters, and render source tabs in this order: `saved`, `all`, `mine`, `community`. Use `t(...)` labels; Saved includes its count, e.g. `Saved (3)`. Do not alter `addRecipeToSlot` or the active-cell lifecycle.

- [ ] **Step 6: Run focused picker tests until green**

Run: `npx vitest run tests/recipe-picker-source.test.ts tests/saved-recipes-data.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the picker slice**

```bash
git add app/dashboard/plans/'[id]'/page.tsx lib/i18n/translations.ts lib/recipe-picker-source.ts tests/recipe-picker-source.test.ts
git diff --cached --check
git commit -m "feat: prioritize saved recipes in meal plans"
```

### Task 4: Verify, review, and deploy the saved-recipe flow

**Files:**
- Modify only if verification reveals an in-scope defect.

- [ ] **Step 1: Run all feature-focused tests**

Run:

```bash
npx vitest run tests/nav-bar.test.tsx tests/saved-recipes-data.test.ts tests/saved-recipes-page.test.tsx tests/recipe-picker-source.test.ts
```

Expected: PASS with no failures.

- [ ] **Step 2: Run complete project verification**

Run:

```bash
npm test
npx tsc --noEmit
npm run build
```

Expected: all tests pass, type checking exits 0, and production build exits 0. If `npm run lint` has unrelated existing warnings, record them separately.

- [ ] **Step 3: Review the changed implementation for React and data safety**

Check effect cleanup, private-data boundaries, null joined recipes, stable default selection, and unchanged All/My/Community semantics. Apply only in-scope fixes and rerun the affected tests.

- [ ] **Step 4: Verify the signed-in flow in the development browser**

Confirm profile menu → Saved Recipes opens the dedicated page; a saved recipe and empty collection render correctly; meal-plan slot selection opens Saved first when saves exist; search/category filters narrow Saved results; selecting a saved recipe adds it; and All, My Recipes, Community remain usable.

- [ ] **Step 5: Commit any verification-only fixes and prepare deployment**

Run `git status -sb`, stage only the saved-recipe feature files and this plan, run `git diff --cached --check`, then commit:

```bash
git commit -m "feat: surface saved recipes in meal planning"
```

- [ ] **Step 6: Push and verify production**

Push `main` with `git push origin main`. Wait for Vercel to deploy, then request production `/dashboard/saved-recipes` and a meal-plan detail route to confirm successful server responses. Report the production URL and verification evidence to the user.
