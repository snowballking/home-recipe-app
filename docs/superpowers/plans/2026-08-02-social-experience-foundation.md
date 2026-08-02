# Social Experience Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing recipe catalogue into the first usable social-cooking experience: a responsive social shell, a community Home feed, intentional Discover browsing, and a recipe-family detail page where people select a public variation over the original recipe.

**Architecture:** Keep Supabase as the current source of recipes, saves, follows, comments, plans, and materialised variations. Add small client components only where state is needed (navigation/create menu and variation selector); leave recipe data loading in server pages and feed browsing in a focused client page. This slice intentionally does not introduce the universal-cart schema: that is a separate plan because the shared Supabase database is live and the cart needs a reviewed migration before it can be durable across devices.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase, Vitest + Testing Library (new dev dependencies).

## Global Constraints

- Do not push. A push deploys automatically; Nathan must explicitly say `push` after testing.
- Do not apply any Supabase migration. The project uses one live database. This slice makes no database changes.
- Preserve inherited uncommitted work, especially recipe variations, bilingual strings, rebranding, and festival tags. Never use `git add .` or `git add -A`.
- Work in the current checkout with the user’s implementation approval because it contains required uncommitted variation work. Stage only the task’s named files.
- Every new user-facing string must have English and Simplified Chinese entries in `lib/i18n/translations.ts`.
- Follow Next 16 server/client boundaries: pages fetch data on the server where practical; interactive controls are narrowly scoped client components with serializable props.
- The browser must not imply a live grocery checkout before the separate cart and supplier work is complete.
- Run each new automated test red before production code, then green. Run `npx tsc --noEmit` and `npm run build` before handoff.

---

## File Structure

| File | Responsibility |
|---|---|
| `vitest.config.ts` | Vitest’s jsdom environment and `@/` alias. |
| `tests/setup.ts` | Testing-library cleanup after each test. |
| `lib/recipe-family.ts` | Pure, tested conversion of original + variants into selector options. |
| `app/components/recipe-variation-selector.tsx` | Accessible, bilingual recipe-family overlay/selector; navigation changes the selected recipe URL. |
| `app/components/create-menu.tsx` | Reusable Create dialog linking to the existing new-recipe and new-plan forms. |
| `app/components/nav-bar.tsx` | Responsive desktop header and five-item mobile navigation, composed with `CreateMenu`. |
| `app/components/recipe-feed-card.tsx` | Social post presentation of a public recipe, using existing save and variation actions. |
| `lib/feed.ts` | Pure helpers for applying the For you / Following feed membership rule. |
| `app/market/page.tsx` | Community Home feed, retaining the existing public-recipe query. |
| `app/discover/page.tsx` | Deliberate browse page, replacing the full-screen swipe deck. |
| `app/recipe/[id]/page.tsx` | Fetch the displayed recipe’s immediate original and sibling public variations; render the selector. |
| `app/recipe/[id]/recipe-content.tsx` | Remove the disconnected variations list in favour of the selector-driven recipe family. |
| `lib/i18n/translations.ts` | Bilingual navigation, creation, feed, browse, and variation-selector labels. |
| `app/globals.css` | Food-first colour tokens and base surface/text styling used by all redesigned pages. |

---

### Task 1: Establish a test runner and a tested recipe-family data model

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/recipe-family.test.ts`
- Create: `lib/recipe-family.ts`

**Interfaces:**
- Produces `RecipeFamilyMember`, `RecipeFamilyOption`, and `getRecipeFamilyOptions(original, variations)` from `lib/recipe-family.ts`.
- `getRecipeFamilyOptions` always places the original first, then public variations in the order supplied, and preserves each option’s attribution and variation note.
- Later tasks pass serializable `RecipeFamilyOption[]` values to `RecipeVariationSelector`.

- [ ] **Step 1: Install the test dependencies and add scripts**

Run:

```bash
npm install --save-dev vitest jsdom @testing-library/react @testing-library/user-event
```

Then add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Add the Vitest configuration and cleanup file**

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
```

Create `tests/setup.ts`:

```ts
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

- [ ] **Step 3: Write the failing recipe-family test**

Create `tests/recipe-family.test.ts` before creating `lib/recipe-family.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getRecipeFamilyOptions } from "@/lib/recipe-family";

describe("getRecipeFamilyOptions", () => {
  it("keeps the original first and preserves each variation's credit", () => {
    const options = getRecipeFamilyOptions(
      { id: "original", title: "Prawn mee", title_zh: "虾面", authorName: "Mei" },
      [
        {
          id: "lighter",
          title: "Lighter prawn mee",
          title_zh: "低油虾面",
          authorName: "Arun",
          variationNote: "Used half the oil",
        },
      ],
    );

    expect(options).toEqual([
      {
        id: "original",
        title: "Prawn mee",
        titleZh: "虾面",
        authorName: "Mei",
        variationNote: null,
        isOriginal: true,
      },
      {
        id: "lighter",
        title: "Lighter prawn mee",
        titleZh: "低油虾面",
        authorName: "Arun",
        variationNote: "Used half the oil",
        isOriginal: false,
      },
    ]);
  });
});
```

- [ ] **Step 4: Run the test and verify the expected red failure**

Run:

```bash
npm test -- tests/recipe-family.test.ts
```

Expected: FAIL because `@/lib/recipe-family` does not exist.

- [ ] **Step 5: Implement the minimal data model**

Create `lib/recipe-family.ts`:

```ts
export interface RecipeFamilyMember {
  id: string;
  title: string | null;
  title_zh: string | null;
  authorName: string | null;
  variationNote?: string | null;
}

export interface RecipeFamilyOption {
  id: string;
  title: string | null;
  titleZh: string | null;
  authorName: string | null;
  variationNote: string | null;
  isOriginal: boolean;
}

export function getRecipeFamilyOptions(
  original: RecipeFamilyMember,
  variations: RecipeFamilyMember[],
): RecipeFamilyOption[] {
  return [
    {
      id: original.id,
      title: original.title,
      titleZh: original.title_zh,
      authorName: original.authorName,
      variationNote: null,
      isOriginal: true,
    },
    ...variations.map((variation) => ({
      id: variation.id,
      title: variation.title,
      titleZh: variation.title_zh,
      authorName: variation.authorName,
      variationNote: variation.variationNote ?? null,
      isOriginal: false,
    })),
  ];
}
```

- [ ] **Step 6: Verify green and commit the isolated test foundation**

Run:

```bash
npm test -- tests/recipe-family.test.ts
npx tsc --noEmit
```

Expected: both commands pass.

Commit only:

```bash
git add package.json package-lock.json vitest.config.ts tests/setup.ts tests/recipe-family.test.ts lib/recipe-family.ts
git commit -m "test: add recipe family test foundation"
```

### Task 2: Build the selectable variation overlay

**Files:**
- Create: `tests/recipe-variation-selector.test.tsx`
- Create: `app/components/recipe-variation-selector.tsx`
- Modify: `lib/i18n/translations.ts`

**Interfaces:**
- Consumes `RecipeFamilyOption[]` from `getRecipeFamilyOptions` and `activeRecipeId: string`.
- Produces `RecipeVariationSelector`, which renders links to `/recipe/<option.id>` and marks the active option with `aria-current="page"`.
- The user-facing selector calls the original recipe “Original” / “原版” and labels the collection “Variations” / “改良版本”.

- [ ] **Step 1: Write the selector test before its component exists**

Create `tests/recipe-variation-selector.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { RecipeVariationSelector } from "@/app/components/recipe-variation-selector";

describe("RecipeVariationSelector", () => {
  it("lets a cook choose a named variation while keeping the original visible", () => {
    render(
      <LanguageProvider>
        <RecipeVariationSelector
          activeRecipeId="lighter"
          options={[
            { id: "original", title: "Prawn mee", titleZh: "虾面", authorName: "Mei", variationNote: null, isOriginal: true },
            { id: "lighter", title: "Lighter prawn mee", titleZh: "低油虾面", authorName: "Arun", variationNote: "Used half the oil", isOriginal: false },
          ]}
        />
      </LanguageProvider>,
    );

    expect(screen.getByRole("link", { name: /Original/i }).getAttribute("href")).toBe("/recipe/original");
    expect(screen.getByRole("link", { name: /Lighter prawn mee/i }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Used half the oil")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run red**

Run:

```bash
npm test -- tests/recipe-variation-selector.test.tsx
```

Expected: FAIL because the selector component does not exist.

- [ ] **Step 3: Add bilingual selector copy**

Add these keys to `lib/i18n/translations.ts` beside the existing `fork.*` block:

```ts
"fork.recipe_versions": { en: "Recipe versions", zh: "食谱版本" },
"fork.original": { en: "Original", zh: "原版" },
"fork.variation_by": { en: "Variation by", zh: "改良者" },
"fork.selected_version": { en: "Selected version", zh: "已选版本" },
"fork.change_summary": { en: "What changed", zh: "改动说明" },
```

- [ ] **Step 4: Implement the selector**

Create `app/components/recipe-variation-selector.tsx` as a client component. It must:

1. Return `null` when `options.length < 2`.
2. Render a warm neutral panel with `role="navigation"` and `aria-label={t("fork.recipe_versions")}`.
3. Render the original as the first link and each variation as a link beneath it, using `href={`/recipe/${option.id}`}`.
4. Add `aria-current="page"` and coral emphasis to the selected link; show the variation note and “Variation by <name>” when available.
5. Read `titleZh` when `locale === "zh"`, otherwise `title`, and never hide the original option when a variation is selected.

Use only `Link`, `useLanguage`, and `RecipeFamilyOption`; do not fetch inside the component.

- [ ] **Step 5: Verify green and commit**

Run:

```bash
npm test -- tests/recipe-variation-selector.test.tsx
npx tsc --noEmit
```

Commit only:

```bash
git add app/components/recipe-variation-selector.tsx tests/recipe-variation-selector.test.tsx lib/i18n/translations.ts
git commit -m "feat: add selectable recipe variations"
```

### Task 3: Connect recipe pages into a coherent recipe family

**Files:**
- Modify: `app/recipe/[id]/page.tsx`
- Modify: `app/recipe/[id]/recipe-content.tsx`

**Interfaces:**
- Consumes `getRecipeFamilyOptions` and `RecipeVariationSelector` from Tasks 1–2.
- On an original page, queries its public direct variations. On a direct variation page, fetches its public original and that original’s public direct variations.
- The page continues to render the selected recipe’s materialised ingredients and steps; the family selector makes the original context and each sibling version visible.

- [ ] **Step 1: Add a regression test for no selector with only an original**

Extend `tests/recipe-variation-selector.test.tsx` before page code changes:

```tsx
it("does not add an empty overlay when there are no variations", () => {
  const { container } = render(
    <LanguageProvider>
      <RecipeVariationSelector
        activeRecipeId="original"
        options={[{ id: "original", title: "Prawn mee", titleZh: "虾面", authorName: "Mei", variationNote: null, isOriginal: true }]}
      />
    </LanguageProvider>,
  );

  expect(container.firstChild).toBeNull();
});
```

- [ ] **Step 2: Run red**

Run:

```bash
npm test -- tests/recipe-variation-selector.test.tsx
```

Expected: FAIL until the selector has its `options.length < 2` guard.

- [ ] **Step 3: Make the selector guard pass and update the recipe-family queries**

In `app/recipe/[id]/page.tsx`:

1. Fetch the authenticated user before variation queries.
2. When `typedRecipe.original_recipe_id` exists, fetch that parent as `familyOriginal`; otherwise use `typedRecipe` as `familyOriginal`.
3. Query `recipes` where `original_recipe_id = familyOriginal.id`, `is_public = true`, ordered newest first. Select `id`, `title`, `title_zh`, `user_id`, and `variation_note`.
4. Fetch profiles for the distinct original/variation user IDs and map `displayname` to `authorName`.
5. Call `getRecipeFamilyOptions` and render `<RecipeVariationSelector activeRecipeId={typedRecipe.id} options={familyOptions} />` between the title/description block and the existing `ForkBanner`.
6. Keep the selected recipe (`typedRecipe`) as the source for hero image, nutrition, ingredients, steps, saves, comments, and the existing Make it yours action.
7. Replace the old bottom `<VariationsSection>` with no output, then delete the unused `VariationsSection` export from `recipe-content.tsx`.

The selector must be the one place variants are browsed; do not leave a second disconnected variations list at the bottom of the page.

- [ ] **Step 4: Verify green, typecheck, and manually test the real data path**

Run:

```bash
npm test -- tests/recipe-variation-selector.test.tsx
npx tsc --noEmit
```

Then, in the logged-in development browser:

1. Open an original recipe with at least one public variation. Confirm the “Recipe versions” panel lists Original first and each variation with its credit/note.
2. Choose a variation. Confirm the URL changes to that variation; the selector remains visible, the variation is marked selected, and its adjusted ingredients/steps show.
3. Choose Original. Confirm the original’s ingredients/steps return.
4. Load a recipe that has no variations. Confirm no empty selector appears.
5. Switch to Simplified Chinese. Confirm labels and a translated title use Chinese when stored.

- [ ] **Step 5: Commit**

```bash
git add app/recipe/[id]/page.tsx app/recipe/[id]/recipe-content.tsx app/components/recipe-variation-selector.tsx tests/recipe-variation-selector.test.tsx lib/recipe-family.ts
git commit -m "feat: show recipe variations as selectable overlays"
```

### Task 4: Create the responsive social application shell

**Files:**
- Create: `tests/create-menu.test.tsx`
- Create: `app/components/create-menu.tsx`
- Modify: `app/components/nav-bar.tsx`
- Modify: `app/globals.css`
- Modify: `lib/i18n/translations.ts`

**Interfaces:**
- `CreateMenu` exposes the existing recipe and meal-plan creation paths without duplicating their forms.
- `NavBar` uses `/market` for Home, `/discover` for Discover, `/explore` for Plans, and `/cart` only after the separate cart plan lands. Until then it renders the cart item as an inaccessible `aria-disabled` affordance with an honest bilingual “Cart coming soon” tooltip rather than a broken link.

- [ ] **Step 1: Write the failing Create menu interaction test**

Create `tests/create-menu.test.tsx`:

```tsx
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { CreateMenu } from "@/app/components/create-menu";

describe("CreateMenu", () => {
  it("opens recipe and meal-plan creation choices from one control", async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><CreateMenu /></LanguageProvider>);

    await user.click(screen.getByRole("button", { name: /Create/i }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Add recipe/i }).getAttribute("href")).toBe("/dashboard/recipes/new");
    expect(screen.getByRole("link", { name: /Start a meal plan/i }).getAttribute("href")).toBe("/dashboard/plans/new");
  });
});
```

- [ ] **Step 2: Run red**

Run:

```bash
npm test -- tests/create-menu.test.tsx
```

Expected: FAIL because `CreateMenu` does not exist.

- [ ] **Step 3: Add bilingual shell copy**

Add bilingual keys to `lib/i18n/translations.ts`:

```ts
"nav.home": { en: "Home", zh: "首页" },
"nav.discover": { en: "Discover", zh: "发现" },
"nav.plans": { en: "Plans", zh: "计划" },
"nav.create": { en: "Create", zh: "创建" },
"nav.cart": { en: "Cart", zh: "购物车" },
"nav.cart_coming_soon": { en: "Universal cart coming soon", zh: "通用购物车即将推出" },
"create.title": { en: "Create", zh: "创建" },
"create.add_recipe": { en: "Add recipe", zh: "添加食谱" },
"create.add_recipe_description": { en: "Write one from scratch or import a recipe link.", zh: "手动创建，或导入食谱链接。" },
"create.start_plan": { en: "Start a meal plan", zh: "开始餐计划" },
"create.start_plan_description": { en: "Organise several meals when you are ready.", zh: "准备好后，再安排多顿餐食。" },
```

- [ ] **Step 4: Implement `CreateMenu` minimally**

Create a client component with an icon+label button. On click it renders a fixed backdrop and `role="dialog" aria-modal="true"` sheet. The sheet has:

1. an accessible close button using `t("common.close")`;
2. a primary coral `Link` to `/dashboard/recipes/new` carrying the recipe label and description;
3. a secondary bordered `Link` to `/dashboard/plans/new` carrying the meal-plan label and description;
4. backdrop click and Escape-key close behavior.

Do not create a third generic form, change existing routes, or use a new component library.

- [ ] **Step 5: Verify green, then update navigation and global theme**

Run:

```bash
npm test -- tests/create-menu.test.tsx
```

Then update `app/components/nav-bar.tsx`:

1. Desktop: brand at left, Home / Discover / Plans at centre, `CreateMenu`, an honest disabled Cart affordance, profile, locale toggle, and logout at right.
2. Mobile: retain the compact brand/account row; replace the second-row grid with fixed bottom navigation containing Home, Discover, Create, Plans, Cart. The middle Create button opens the same `CreateMenu` sheet.
3. Use `aria-current="page"` for active navigation links and keep existing auth/logout/profile behavior intact.
4. Use coral for Create and leaf green only for the future cart state; remove indigo as the dominant shell accent.

Update `app/globals.css` with CSS variables for cream surfaces, ink text, coral actions, and leaf grocery accents. Preserve `dark` variants already used by legacy pages; the light design must not depend on a browser dark-mode preference.

- [ ] **Step 6: Run full checks and browser checks**

Run:

```bash
npm test -- tests/create-menu.test.tsx
npx tsc --noEmit
```

In the development browser, test desktop and a narrow mobile viewport:

1. Desktop has Home, Discover, Plans, Create, Cart, and account controls without a duplicate navigation row.
2. Mobile has exactly five labelled destinations. Create opens the same creation choices on both layouts.
3. The recipe link reaches the current new-recipe form; the plan link reaches the current new-plan form.
4. Changing to Chinese updates every new shell/menu string.
5. Cart does not claim a live checkout or lead to a 404.

- [ ] **Step 7: Commit**

```bash
git add app/components/create-menu.tsx app/components/nav-bar.tsx app/globals.css lib/i18n/translations.ts tests/create-menu.test.tsx
git commit -m "feat: add responsive social app shell"
```

### Task 5: Rebuild `/market` as the community Home feed

**Files:**
- Create: `tests/feed.test.ts`
- Create: `lib/feed.ts`
- Create: `app/components/recipe-feed-card.tsx`
- Modify: `app/market/page.tsx`
- Modify: `lib/i18n/translations.ts`

**Interfaces:**
- `filterFeedRecipes(recipes, activeTab, followedUserIds)` returns all supplied recipes for `for-you` and only followed authors for `following`.
- `RecipeFeedCard` consumes a public `Recipe` with `author_name`, and reuses `SaveRecipeButton` plus the existing `Make it yours` route.
- `/market` remains the signed-in landing URL and becomes the Home destination.

- [ ] **Step 1: Write the failing feed-rule test**

Create `tests/feed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterFeedRecipes } from "@/lib/feed";

const recipes = [
  { id: "mei", user_id: "mei" },
  { id: "arun", user_id: "arun" },
];

describe("filterFeedRecipes", () => {
  it("keeps the community feed complete and narrows Following to followed cooks", () => {
    expect(filterFeedRecipes(recipes, "for-you", new Set(["mei"]))).toEqual(recipes);
    expect(filterFeedRecipes(recipes, "following", new Set(["mei"]))).toEqual([recipes[0]]);
  });
});
```

- [ ] **Step 2: Run red**

Run:

```bash
npm test -- tests/feed.test.ts
```

Expected: FAIL because `lib/feed.ts` does not exist.

- [ ] **Step 3: Implement and verify the pure feed rule**

Create `lib/feed.ts`:

```ts
export type FeedTab = "for-you" | "following";

export function filterFeedRecipes<T extends { user_id: string }>(
  recipes: T[],
  tab: FeedTab,
  followedUserIds: Set<string>,
): T[] {
  if (tab === "for-you") return recipes;
  return recipes.filter((recipe) => followedUserIds.has(recipe.user_id));
}
```

Run:

```bash
npm test -- tests/feed.test.ts
```

Expected: PASS.

- [ ] **Step 4: Add the feed card and Home labels**

Add bilingual keys:

```ts
"home.eyebrow": { en: "Community kitchen", zh: "社区厨房" },
"home.title": { en: "What are you cooking next?", zh: "下一顿想做什么？" },
"home.for_you": { en: "For you", zh: "为你推荐" },
"home.following": { en: "Following", zh: "已关注" },
"home.empty_following": { en: "Follow a cook to fill this feed.", zh: "关注一位厨友，这里就会有新内容。" },
"home.open_recipe": { en: "View recipe", zh: "查看食谱" },
"home.comments": { en: "Comments", zh: "评论" },
```

Create `RecipeFeedCard` with this order: author + avatar/link, a large food image, title/caption, like/comment/save row using existing save button and a comments link, then “View recipe” and “Make it yours” actions. It must label public variations with existing `fork.variation_tag` and retain original-credit context when `original_recipe_id` exists.

- [ ] **Step 5: Convert `/market` without changing the database query contract**

In `app/market/page.tsx`:

1. Keep the current public recipe query and profile displayname mapping.
2. Fetch the current user’s `follows.following_id` after auth resolves; empty/unauthenticated produces an empty set.
3. Replace category-grouped catalogue rendering with centred social-feed cards and For you / Following tabs.
4. Apply `filterFeedRecipes` after the existing query. Show the bilingual Following empty state only when the Following tab has no results.
5. Keep search and structured cuisine/category browsing out of Home; those remain Discover’s job.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test -- tests/feed.test.ts
npx tsc --noEmit
```

In browser: confirm Home defaults to For you, a public recipe’s card reaches its detail page, save/fork controls still work, and Following shows only followed creators or its honest empty state.

Commit only:

```bash
git add lib/feed.ts tests/feed.test.ts app/components/recipe-feed-card.tsx app/market/page.tsx lib/i18n/translations.ts
git commit -m "feat: turn recipes market into community home feed"
```

### Task 6: Replace the swipe deck with deliberate Discover browsing

**Files:**
- Modify: `app/discover/page.tsx`
- Modify: `app/components/recipe-card.tsx`
- Modify: `lib/i18n/translations.ts`

**Interfaces:**
- Discover continues to query public recipes, supports search and sort, and renders the existing `RecipeCard` in an editorial grid.
- `RecipeCard` keeps its existing props and becomes a calmer browse card, so `/dashboard/recipes` keeps working without callers changing.

- [ ] **Step 1: Write a failing pure search-normalisation test**

Extend `tests/feed.test.ts` with the intended helper import before writing it:

```ts
import { normaliseDiscoverSearch } from "@/lib/feed";

it("normalises a discover query before it reaches the recipe filter", () => {
  expect(normaliseDiscoverSearch("  Prawn   Mee ")).toBe("Prawn Mee");
});
```

- [ ] **Step 2: Run red**

Run:

```bash
npm test -- tests/feed.test.ts
```

Expected: FAIL because `normaliseDiscoverSearch` has not been exported.

- [ ] **Step 3: Implement the smallest helper and verify green**

Add to `lib/feed.ts`:

```ts
export function normaliseDiscoverSearch(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
```

Run:

```bash
npm test -- tests/feed.test.ts
```

- [ ] **Step 4: Rebuild the Discover UI**

Update the existing `app/discover/page.tsx` rather than adding a route:

1. Remove the full-height snap/swipe deck and black background.
2. Use the food-first cream surface, heading, search field, latest/popular tabs, and responsive `RecipeCard` grid.
3. Use `normaliseDiscoverSearch` before constructing the Supabase title filter; retain the existing public, latest/popular, save-state query behaviour.
4. Add a direct “View recipe” link through each card instead of a full-screen overlay.

Refresh `RecipeCard` styling to cream/white surfaces, coral interactive emphasis, and a stronger image/creator/caption hierarchy without changing its props or dropping the existing original, private, AI-image, variation, rating, or tag metadata.

Add bilingual keys:

```ts
"discover.title": { en: "Discover recipes", zh: "发现食谱" },
"discover.subtitle": { en: "Search by dish, cuisine, or mood.", zh: "按菜式、菜系或心情搜索。" },
"discover.search": { en: "Search recipes", zh: "搜索食谱" },
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- tests/feed.test.ts
npx tsc --noEmit
npm run build
```

Browser-check: Discover is scrollable rather than snap-only on desktop and mobile; search still filters; Latest/Popular still change ordering; every card opens a recipe; Chinese copy changes when locale changes.

Commit only:

```bash
git add app/discover/page.tsx app/components/recipe-card.tsx lib/feed.ts tests/feed.test.ts lib/i18n/translations.ts
git commit -m "feat: redesign discover for intentional browsing"
```

## Spec Coverage Review

- Social Home with For you / Following: Task 5.
- Original recipe as the base with selectable public variations: Tasks 1–3.
- Final adjusted ingredients and steps on a selected variation: Task 3 retains the existing materialised selected recipe data.
- Responsive desktop/mobile shell and global Create: Task 4.
- Deliberate browsing rather than a TikTok-style deck: Task 6.
- Bilingual UI and copy: every task that adds text changes `lib/i18n/translations.ts`.
- Universal persistent cart, supplier choice, payment, and checkout: intentionally excluded and must be delivered by a follow-up database-backed cart plan; this prevents a fake checkout or an unreviewed live migration.

## Self-Review

- No new database tables, policies, or migrations are included.
- Tests are written before their production helpers/components and each task has an explicit red/green command.
- Every interface consumed by a later task is named and produced in an earlier task.
- The plan has no placeholder steps; browser checks cover the Supabase-connected interactions that pure unit tests cannot responsibly fake.
