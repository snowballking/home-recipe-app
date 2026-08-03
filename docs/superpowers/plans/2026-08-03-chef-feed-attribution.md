# Chef Feed Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Show Chef-only, non-link attribution for assigned recipes on Home and Discover, while leaving unassigned recipes visible without a credit.

**Architecture:** Both feeds embed the optional chefs(id,name) relationship in their public recipe queries and stop loading uploader profiles. Home maps that relationship to a small Chef-credit object for RecipeFeedCard; Discover passes it through Recipe to RecipeCard, which renders a top-left overlay only for assigned Chefs.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Supabase JavaScript client, Vitest, Testing Library, Tailwind CSS.

## Global Constraints

- Do not add or modify database records; an administrator will assign unmatched recipes later.
- Recipes without a Chef remain visible on both feeds but have no creator credit.
- Feed credits must not link to Chef profiles; retain the existing Chef link on recipe-detail pages only.
- Add any new user-visible text in English and Simplified Chinese.
- Do not push or deploy to production. Create only a Vercel preview after verification.
- Preserve unrelated local changes, including HANDOFF.md, .superpowers/, and the duplicate report-button file.

---

### Task 1: Home Chef-only query and feed header

**Files:**

- Modify: app/market/page.tsx:12-61
- Modify: app/components/recipe-feed-card.tsx:7-57
- Modify: lib/i18n/translations.ts:388
- Modify: tests/market-page.test.tsx:7-90
- Modify: tests/recipe-feed-card.test.tsx:15-60

**Interfaces:**

- Consumes: the optional Recipe["chefs"] embedded relationship returned by select("...,chefs(id,name)").
- Produces: RecipeFeedRecipe.chef: { id: string; name: string } | null for the Home feed card.
- Produces: recipe.chef_role translation (Chef / 厨师) for the role badge.

- [ ] **Step 1: Write the failing Home query and mapping test**

Update the mocked public recipe in tests/market-page.test.tsx to use an embedded Chef and capture the complete RecipeFeedCard props:

~~~tsx
chefs: { id: "chef-mei", name: "Chef Mei" },
~~~

Require the exact projection and mapped card data:

~~~tsx
expect(mocks.recipeSelect).toHaveBeenCalledWith(
  "id,user_id,title,title_zh,description,description_zh,hero_image_url,image_source,original_recipe_id,save_count,comment_count,chefs(id,name)",
);
expect(mocks.feedCardProps[0]?.recipe.chef).toEqual({ id: "chef-mei", name: "Chef Mei" });
expect(mocks.recipeSelect).not.toHaveBeenCalledWith(expect.stringContaining("profiles(displayname)"));
~~~

- [ ] **Step 2: Run the Home test to verify it fails**

Run: npm test -- tests/market-page.test.tsx

Expected: FAIL because Home still selects profiles(displayname) and maps it to author_name rather than a chef object.

- [ ] **Step 3: Write failing feed-card attribution tests**

Replace the test fixture's author_name with a Chef object and assert that the visible credit is non-interactive:

~~~tsx
chef: { id: "chef-mei", name: "Chef Mei" },
...
expect(screen.getByText("By Chef Mei")).toBeTruthy();
expect(screen.getByText("Chef")).toBeTruthy();
expect(screen.queryByRole("link", { name: /Chef Mei/ })).toBeNull();
~~~

Add a second fixture with chef: null and author_name: "Mei"; assert both the uploader name and Chef credit are absent:

~~~tsx
expect(screen.queryByText("Mei")).toBeNull();
expect(screen.queryByText("By Chef Mei")).toBeNull();
~~~

- [ ] **Step 4: Run the feed-card test to verify it fails**

Run: npm test -- tests/recipe-feed-card.test.tsx

Expected: FAIL because RecipeFeedCard accepts author_name, renders an uploader-linked header, and defaults to Anonymous.

- [ ] **Step 5: Implement the Home query and Chef credit contract**

In app/market/page.tsx, replace the profile relation in HOME_RECIPE_FIELDS and remove the uploader mapping:

~~~ts
const HOME_RECIPE_FIELDS =
  "id,user_id,title,title_zh,description,description_zh,hero_image_url,image_source,original_recipe_id,save_count,comment_count,chefs(id,name)";

const withChefs = ((publicRecipes ?? []) as PublicRecipe[]).map((recipe) => ({
  ...recipe,
  chef: recipe.chefs ?? null,
}));
~~~

Pass withChefs to setRecipes. Define PublicRecipe with chefs?: { id: string; name: string } | null, and define RecipeFeedRecipe as the existing feed fields plus chef: { id: string; name: string } | null.

- [ ] **Step 6: Implement the non-link Chef header**

In RecipeFeedCard, remove author_name, the uploader profile link, and the Anonymous fallback. Render a header only when either an assigned Chef or a variation badge exists:

~~~tsx
{(recipe.chef || recipe.original_recipe_id) && (
  <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
    {recipe.chef ? (
      <div className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
          {recipe.chef.name[0]?.toUpperCase() ?? "?"}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">{t("recipe.by_chef")} {recipe.chef.name}</span>
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">{t("recipe.chef_role")}</span>
        </span>
      </div>
    ) : <span />}
    {recipe.original_recipe_id && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">🔀 {t("fork.variation_tag")}</span>}
  </div>
)}
~~~

Add recipe.chef_role to lib/i18n/translations.ts with { en: "Chef", zh: "厨师" }.

- [ ] **Step 7: Run the focused Home and feed-card tests to verify they pass**

Run: npm test -- tests/market-page.test.tsx tests/recipe-feed-card.test.tsx

Expected: PASS. The Home projection uses only chefs(id,name), Chef identity is passed to the card, the credit has no link, and no credit appears for an unassigned recipe.

- [ ] **Step 8: Commit the Home attribution change**

~~~bash
git add app/market/page.tsx app/components/recipe-feed-card.tsx lib/i18n/translations.ts tests/market-page.test.tsx tests/recipe-feed-card.test.tsx
git commit -m "feat: credit home recipes to chefs"
~~~

### Task 2: Discover Chef-only query and recipe-card overlay

**Files:**

- Modify: app/discover/page.tsx:11-47
- Modify: app/components/recipe-card.tsx:21-75
- Modify: tests/discover-page.test.tsx:7-48
- Create: tests/recipe-card.test.tsx

**Interfaces:**

- Consumes: Recipe.chefs?: { id: string; name: string } | null from the Discover query.
- Consumes: the recipe.chef_role translation added in Task 1.
- Produces: an optional non-link top-left Chef credit overlay in RecipeCard when showAuthor is true and a Chef relationship is present.

- [ ] **Step 1: Write the failing Discover query test**

In tests/discover-page.test.tsx, make the Supabase mock retain its recipes query's select spy and return two public recipes:

~~~tsx
{ id: "assigned", title: "Chef laksa", chefs: { id: "chef-mei", name: "Chef Mei" } },
{ id: "unassigned", title: "Community soup", chefs: null },
~~~

Make the RecipeCard mock record its props. After loading, require:

~~~tsx
expect(mocks.recipeSelect).toHaveBeenCalledWith("*, chefs(id,name)");
expect(mocks.recipeSelect).not.toHaveBeenCalledWith(expect.stringContaining("profiles(displayname)"));
expect(mocks.recipeCardProps[0]?.recipe.chefs).toEqual({ id: "chef-mei", name: "Chef Mei" });
expect(mocks.recipeCardProps[1]?.recipe.chefs).toBeNull();
~~~

- [ ] **Step 2: Run the Discover test to verify it fails**

Run: npm test -- tests/discover-page.test.tsx

Expected: FAIL because Discover requests profiles(displayname) and creates user-derived author_name values.

- [ ] **Step 3: Write failing recipe-card overlay tests**

Create tests/recipe-card.test.tsx. Render a recipe with a Chef relationship and assert the exact credit and role badge exist:

~~~tsx
const chefRecipe = { ...recipe, chefs: { id: "chef-mei", name: "Chef Mei" } } as Recipe;
render(<LanguageProvider><RecipeCard recipe={chefRecipe} /></LanguageProvider>);
expect(screen.getByText("By Chef Mei")).toBeTruthy();
expect(screen.getByText("Chef")).toBeTruthy();
expect(screen.queryByRole("link", { name: /Chef Mei/ })).toBeNull();
~~~

Render a second recipe with author_name: "Mei" and chefs: null, then require no author text:

~~~tsx
expect(screen.queryByText("Mei")).toBeNull();
expect(screen.queryByText(/^By /)).toBeNull();
~~~

- [ ] **Step 4: Run the recipe-card test to verify it fails**

Run: npm test -- tests/recipe-card.test.tsx

Expected: FAIL because RecipeCard currently renders a user-derived author_name below the title and has no Chef overlay.

- [ ] **Step 5: Implement the Discover Chef-only data flow**

Replace the PublicRecipe profile type with the existing Recipe type, then change the recipe query and remove the author mapping:

~~~ts
const { data } = await supabase
  .from("recipes")
  .select("*, chefs(id,name)")
  .eq("is_public", true)
  .order("created_at", { ascending: false })
  .limit(100);

setRecipes((data ?? []) as Recipe[]);
~~~

Do not query profiles or set author_name in Discover.

- [ ] **Step 6: Implement the conditional Discover credit overlay**

In RecipeCard, remove the current below-title block that uses recipe.author_name. In the image container, before the top-right badge stack, render this only for consumer-visible Chef credit:

~~~tsx
{showAuthor && recipe.chefs && (
  <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full bg-stone-950/75 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
    <span className="truncate">{t("recipe.by_chef")} {recipe.chefs.name}</span>
    <span className="shrink-0 rounded-full bg-orange-400 px-1.5 py-px text-[9px] font-bold text-stone-950">{t("recipe.chef_role")}</span>
  </div>
)}
~~~

Keep the existing source, variation, image, private, metadata, and tag behavior unchanged. Do not wrap the overlay in a link.

- [ ] **Step 7: Run the focused Discover and recipe-card tests to verify they pass**

Run: npm test -- tests/discover-page.test.tsx tests/recipe-card.test.tsx

Expected: PASS. Discover no longer requests uploader profiles, assigned recipes display Chef-only credit, and unassigned recipes display no creator credit.

- [ ] **Step 8: Commit the Discover attribution change**

~~~bash
git add app/discover/page.tsx app/components/recipe-card.tsx tests/discover-page.test.tsx tests/recipe-card.test.tsx
git commit -m "feat: credit discover recipes to chefs"
~~~

### Task 3: Full verification and review preview

**Files:**

- No source changes expected.

**Interfaces:**

- Consumes: the verified Home and Discover Chef-only feed behavior from Tasks 1 and 2.
- Produces: an updated review-only Vercel preview deployment; no production deployment.

- [ ] **Step 1: Run all automated tests**

Run: npm test

Expected: PASS with no failed test files or tests.

- [ ] **Step 2: Run type checking**

Run: npx tsc --noEmit

Expected: exit code 0.

- [ ] **Step 3: Run the production build**

Run: npm run build

Expected: exit code 0 and both /market and /discover appear in the generated route list.

- [ ] **Step 4: Inspect the exact working-tree changes**

Run:

~~~bash
git diff --check
git status --short
~~~

Expected: no whitespace errors; unrelated files remain unstaged and unchanged by this work.

- [ ] **Step 5: Create the review-only preview**

Run: npx --yes vercel deploy --yes --scope snowballkings-projects

Expected: a deployment with target preview, never production; record its URL for the reviewer.

- [ ] **Step 6: Smoke-test both affected feeds**

Open the preview's /market and /discover routes. Verify a recipe assigned to a Chef shows By Chef name and a Chef badge without a profile link; verify an unassigned recipe has no creator credit. Verify the existing recipe-details Chef link still works.

- [ ] **Step 7: Report the review handoff**

Provide the preview URL, verified test/build results, manual review points, and confirmation that nothing was pushed or deployed to production.

