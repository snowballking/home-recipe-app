# Structured Recipe Variation Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the copied full-recipe variation form with a focused structured overlay editor while keeping complete materialised recipes for cooking and grocery consumers.

**Architecture:** A pure `lib/recipe-variation.ts` module owns the versioned overlay types, validation, application, and materialised insert payload. A focused client editor produces those operations without exposing inherited metadata. Recipe detail reads the stored overlay for a bilingual “What changed” panel, while legacy variations continue using their existing note banner.

**Tech Stack:** Next.js 16.2 App Router, React 19 client components, TypeScript, Supabase PostgREST, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Build and test only in the local development environment; do not push, deploy, or apply database migrations.
- Keep the existing `recipes.original_recipe_id`, `variation_note`, `variation_diff`, and materialised recipe-row model.
- New variations are private by default.
- Home cards do not contain **Make it your own**; recipe detail remains the creation entry point.
- Ingredient changes support replace, add, and remove.
- Instruction changes support rewrite, add before or after, and remove; no reordering.
- Every new interface string must be available in English and Simplified Chinese.
- Preserve unrelated changes in the dirty worktree and do not stage broad shared files.

---

### Task 1: Pure structured overlay engine

**Files:**
- Create: `lib/recipe-variation.ts`
- Create: `tests/recipe-variation.test.ts`

**Interfaces:**
- Consumes: `Ingredient` and `Recipe` from `lib/types.ts`.
- Produces: `VariationDiffV1`, `IngredientChange`, `StepChange`, `applyVariationDiff(base, diff)`, `validateVariationDiff(base, diff)`, `isVariationDiffV1(value)`, and `buildMaterializedVariationInput(source, userId, note, diff)`.

- [ ] **Step 1: Write failing tests for valid ingredient and step operations**

```ts
const diff: VariationDiffV1 = {
  version: 1,
  ingredientChanges: [
    { kind: "replace", originalIndex: 0, from: rice, to: brownRice },
    { kind: "remove", originalIndex: 1, ingredient: peanuts },
    { kind: "add", afterOriginalIndex: 1, ingredient: lime },
  ],
  stepChanges: [
    { kind: "add", afterOriginalIndex: null, step: "Rinse the rice." },
    { kind: "edit", originalIndex: 0, from: "Boil rice.", to: "Steam the rice." },
    { kind: "remove", originalIndex: 1, step: "Add peanuts." },
  ],
};
expect(applyVariationDiff(base, diff)).toEqual({
  ingredients: [brownRice, lime],
  steps: ["Rinse the rice.", "Steam the rice."],
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `npm test -- --run tests/recipe-variation.test.ts`

Expected: FAIL because `@/lib/recipe-variation` does not exist.

- [ ] **Step 3: Implement versioned types, validation, and deterministic application**

Validation must reject empty additions/edits, out-of-range indices, `afterOriginalIndex` values outside `null | 0..length-1`, and multiple terminal operations on the same original ingredient or step. Application iterates the base arrays once, inserts `null`-anchored additions before the first item, applies each original operation, and then inserts additions anchored after that original index.

- [ ] **Step 4: Add failing tests for invalid operations and materialised payload**

```ts
expect(validateVariationDiff(base, contradictoryDiff)).toContain("ingredient_conflict");
expect(() => applyVariationDiff(base, blankStepDiff)).toThrow("step_blank");

const payload = buildMaterializedVariationInput(source, "new-user", "Less oil", validDiff);
expect(payload).toMatchObject({
  user_id: "new-user",
  original_recipe_id: source.id,
  variation_note: "Less oil",
  variation_diff: validDiff,
  is_public: false,
  hero_image_url: null,
  image_source: null,
  ingredients: expectedIngredients,
  steps: expectedSteps,
});
expect(payload.ingredients_zh).toBeNull();
expect(payload.steps_zh).toBeNull();
```

- [ ] **Step 5: Implement the materialised payload and verify GREEN**

Run: `npm test -- --run tests/recipe-variation.test.ts`

Expected: all overlay-engine tests PASS.

---

### Task 2: Put the variation entry point only on recipe detail

**Files:**
- Modify: `app/components/recipe-feed-card.tsx`
- Modify: `tests/recipe-feed-card.test.tsx`
- Create: `tests/recipe-actions.test.tsx`
- Existing production reference: `app/recipe/[id]/recipe-content.tsx`

**Interfaces:**
- Consumes: existing `RecipeActions` detail component.
- Produces: Home cards without a fork CTA and a regression contract proving detail still contains it for signed-in non-owners.

- [ ] **Step 1: Change the Home-card test first**

Replace the old variation-link assertion with:

```ts
expect(screen.queryByRole("link", { name: /Make it your own/ })).toBeNull();
```

- [ ] **Step 2: Run the Home-card test and verify RED**

Run: `npm test -- --run tests/recipe-feed-card.test.tsx`

Expected: FAIL because the Home card still renders the link.

- [ ] **Step 3: Remove only the Home-card variation link**

Keep author, save, comments, and recipe-detail links unchanged.

- [ ] **Step 4: Add and run the recipe-detail action regression test**

```tsx
render(<LanguageProvider><RecipeActions recipeId="base" isOwner={false} isLoggedIn /></LanguageProvider>);
expect(screen.getByRole("link", { name: /Make it your own/ })).toHaveAttribute(
  "href",
  "/dashboard/recipes/new?fork=base",
);
```

Run: `npm test -- --run tests/recipe-feed-card.test.tsx tests/recipe-actions.test.tsx`

Expected: both files PASS.

---

### Task 3: Focused variation editor

**Files:**
- Create: `app/components/recipe-variation-editor.tsx`
- Create: `tests/recipe-variation-editor.test.tsx`
- Modify: `lib/i18n/translations.ts`

**Interfaces:**
- Consumes: a complete source `Recipe`, source author, `VariationDiffV1`, and the operation types from `lib/recipe-variation.ts`.
- Produces: `RecipeVariationEditor({ source, sourceAuthor, saving, error, onSave, onCancel })`, where `onSave(note, diff)` receives only validated overlay input.

- [ ] **Step 1: Write a failing component test for the focused surface**

Assert that the loaded editor shows the source credit, change-summary text area, Ingredient changes, Instruction changes, and Save variation. Assert that copied title, photo, nutrition, cuisine, and visibility controls are absent.

- [ ] **Step 2: Run the editor test and verify RED**

Run: `npm test -- --run tests/recipe-variation-editor.test.tsx`

Expected: FAIL because the editor component does not exist.

- [ ] **Step 3: Implement the editor shell and bilingual copy**

Add translation keys for the editor heading, inherited-content explanation, operation headings/actions, restore, validation errors, and save label. Render source ingredients and steps as read-only reference rows.

- [ ] **Step 4: Write failing interaction tests for ingredient operations**

The test must replace the first ingredient, remove the second, add a third, submit, and assert the literal `VariationDiffV1` passed to `onSave`.

- [ ] **Step 5: Implement ingredient replace/add/remove controls and verify GREEN**

Run: `npm test -- --run tests/recipe-variation-editor.test.tsx`

- [ ] **Step 6: Write failing interaction tests for instruction operations**

The test must rewrite one original step, remove another, add before the first step, add after an original step, and assert the literal operation order passed to `onSave`. Confirm no reorder control exists.

- [ ] **Step 7: Implement instruction controls, restore actions, and client validation**

Use `validateVariationDiff` before `onSave`. Preserve the user’s entries after validation errors.

- [ ] **Step 8: Run the editor and overlay-engine tests together**

Run: `npm test -- --run tests/recipe-variation.test.ts tests/recipe-variation-editor.test.tsx`

Expected: all tests PASS.

---

### Task 4: Wire focused editor into the new-recipe route

**Files:**
- Modify: `app/dashboard/recipes/new/page.tsx`

**Interfaces:**
- Consumes: `RecipeVariationEditor` and `buildMaterializedVariationInput`.
- Produces: `?fork=<recipe-id>` loads a source snapshot, shows only the focused editor, and inserts a private materialised variation with `variation_diff`.

- [ ] **Step 1: Add explicit source-loading state**

Store `forkSource: Recipe | null`, `forkLoading`, and `forkLoadError`. When a `fork` query is present, render loading/error states until the public or owned source is available; never flash the ordinary full recipe form.

- [ ] **Step 2: Add a dedicated variation save handler**

The handler gets the authenticated user, calls `buildMaterializedVariationInput(forkSource, user.id, note, diff)`, inserts the returned object into `recipes`, and routes to `/recipe/<new-id>`. On failure it keeps the editor mounted and displays the error.

- [ ] **Step 3: Render the focused editor for fork requests**

Return `RecipeVariationEditor` before the ordinary add/import form when `searchParams.get("fork")` exists. Leave the normal recipe-creation path unchanged.

- [ ] **Step 4: Run focused tests and TypeScript**

Run: `npm test -- --run tests/recipe-variation.test.ts tests/recipe-variation-editor.test.tsx tests/recipe-actions.test.tsx`

Run: `npx tsc --noEmit`

Expected: both commands exit 0.

---

### Task 5: Structured “What changed” detail panel

**Files:**
- Create: `app/components/recipe-variation-changes.tsx`
- Create: `tests/recipe-variation-changes.test.tsx`
- Modify: `app/recipe/[id]/page.tsx`
- Modify: `lib/i18n/translations.ts`

**Interfaces:**
- Consumes: stored `recipe.variation_diff`, `isVariationDiffV1`, and the selected variation’s complete materialised recipe.
- Produces: `RecipeVariationChanges({ diff })`, returning `null` for absent/legacy/invalid diffs and a bilingual operation summary for valid V1 overlays.

- [ ] **Step 1: Write a failing structured-panel component test**

Render a literal V1 diff and assert visible summaries for replaced, added, and removed ingredients plus edited, added, and removed steps. Render `null` and a legacy object and assert no structured panel.

- [ ] **Step 2: Run the panel test and verify RED**

Run: `npm test -- --run tests/recipe-variation-changes.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the bilingual structured panel**

Use snapshot values stored in each operation. Do not derive the explanation by diffing the materialised arrays at render time.

- [ ] **Step 4: Insert the panel beneath the existing base-recipe credit banner**

Pass `typedRecipe.variation_diff`. Keep `ForkBanner` so legacy variations continue showing `variation_note`.

- [ ] **Step 5: Run all variation tests and TypeScript**

Run: `npm test -- --run tests/recipe-variation.test.ts tests/recipe-variation-editor.test.tsx tests/recipe-variation-changes.test.tsx tests/recipe-family.test.ts tests/recipe-actions.test.tsx tests/recipe-feed-card.test.tsx`

Run: `npx tsc --noEmit`

Expected: all commands exit 0.

---

### Task 6: Development-environment verification

**Files:**
- No production changes expected.

**Interfaces:**
- Consumes: the completed local implementation.
- Produces: fresh automated and visual evidence that the overlay flow works without deployment.

- [ ] **Step 1: Run full automated verification**

Run: `npm test`

Run: `npx tsc --noEmit`

Run: `npm run build`

Expected: tests, typecheck, and production build exit 0. Record existing unrelated warnings separately.

- [ ] **Step 2: Verify Home and recipe detail in the browser**

Confirm Home cards have no **Make it your own**, while a signed-in non-owner recipe detail still has the action.

- [ ] **Step 3: Verify the editor at desktop and mobile widths**

Open `/dashboard/recipes/new?fork=<public-recipe-id>`, create ingredient and instruction changes, confirm no copied metadata controls are present, and do not save if that would mutate the shared live database.

- [ ] **Step 4: Verify a structured detail panel without live database mutation**

Use component tests as the source of truth if the shared database has no existing V1 overlay. Do not create or publish test data in the shared database.

- [ ] **Step 5: Review the working tree**

Run `git diff --check` for changed implementation files and `git status --short`. Do not stage or commit shared dirty application files unless their ownership is unambiguous.
