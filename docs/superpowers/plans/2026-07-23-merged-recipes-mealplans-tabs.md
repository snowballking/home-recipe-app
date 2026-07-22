# Merged Recipes & Meal Plans Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the 6-tab nav into 4 tabs (Explore · Recipes · Chefs · Meal Plans), with a Market/Mine segmented toggle inside the Recipes and Meal Plans tabs, and make the logo/post-login land on `/market`.

**Architecture:** No new routes. The toggle is a navigation control cross-linking the four existing pages (`/market` ↔ `/dashboard/recipes`, `/explore` ↔ `/dashboard/plans`). One new client component (`CollectionToggle`) reads `useAuth()` and always occupies fixed height so layout never jumps. Nav links gain a `match: string[]` so one tab highlights for both its Market and Mine routes.

**Tech Stack:** Next.js (App Router — read `node_modules/next/dist/docs/` before writing code, per AGENTS.md), Supabase auth via existing `useAuth()` context, Tailwind, in-repo i18n (`lib/i18n/translations.ts`).

**Spec:** `docs/superpowers/specs/2026-07-23-merged-recipes-mealplans-tabs-design.md`

## Global Constraints

- **NEVER `git push`** — pushes auto-deploy to production. Nathan tests in dev and says "push" first. Local commits only.
- **No DB changes** in this feature. (Single Supabase project serves dev AND production.)
- **This repo has no test framework.** Verification cycle is: `npx tsc --noEmit` (run PLAIN — piping to grep reports grep's exit code), `npm run build`, and live browser checks via Chrome automation. Every task ends with tsc + a browser check; final task runs the full build.
- Dev server should already be running at http://localhost:3000 (`npm run dev` if not). The dev browser has Nathan's session — do NOT log out of it; use a private/incognito context if a logged-out view is needed, or `/market` in a fresh tab without cookies.
- `curl` is not installed on this Mac — use `node -e` with `fetch` for HTTP checks.
- i18n: every user-facing string needs `en` + `zh` values in `lib/i18n/translations.ts`.
- Keep `/dashboard/page.tsx` redirecting to `/dashboard/recipes` (it is a "my dashboard" URL; spec explicitly keeps it).

---

### Task 1: Nav — four tabs, dual-route highlighting, brand → /market

**Files:**
- Modify: `lib/i18n/translations.ts:8-15` (nav key block)
- Modify: `app/components/nav-bar.tsx` (navLinks array ~line 25-40, `isActive` ~line 42, brand link ~line 47)

**Interfaces:**
- Consumes: existing `t()` from `useLanguage()`, `useAuth()` (already wired in nav-bar).
- Produces: translation keys `nav.recipes`, `nav.recipes_short`, `nav.meal_plans`, `nav.meal_plans_short` (Task 2+ must NOT reference the deleted `nav.my_recipes*` / `nav.my_meal_plans*` / `nav.recipes_market*` / `nav.meal_plans_market*` keys). Nav link shape becomes `{ href, label, shortLabel, match: string[] }`.

- [ ] **Step 1: Confirm the old nav keys have no other consumers**

Run: `grep -rn "nav.recipes_market\|nav.my_recipes\|nav.meal_plans_market\|nav.my_meal_plans" app lib`
Expected: matches ONLY in `app/components/nav-bar.tsx` and `lib/i18n/translations.ts`. If anything else matches, stop and update that consumer too in this task.

- [ ] **Step 2: Replace the nav translation keys**

In `lib/i18n/translations.ts`, replace lines 8–15:

```ts
  "nav.recipes_market": { en: "Recipes\nMarket", zh: "食谱\n市场" },
  "nav.recipes_market_short": { en: "Recipes Market", zh: "食谱市场" },
  "nav.my_recipes": { en: "My\nRecipes", zh: "我的\n食谱" },
  "nav.my_recipes_short": { en: "My Recipes", zh: "我的食谱" },
  "nav.meal_plans_market": { en: "Meal Plans\nMarket", zh: "餐计划\n市场" },
  "nav.meal_plans_market_short": { en: "Meal Plans Market", zh: "餐计划市场" },
  "nav.my_meal_plans": { en: "My\nMeal Plans", zh: "我的\n餐计划" },
  "nav.my_meal_plans_short": { en: "My Meal Plans", zh: "我的餐计划" },
```

with:

```ts
  "nav.recipes": { en: "Recipes", zh: "食谱" },
  "nav.recipes_short": { en: "Recipes", zh: "食谱" },
  "nav.meal_plans": { en: "Meal\nPlans", zh: "餐计划" },
  "nav.meal_plans_short": { en: "Meal Plans", zh: "餐计划" },
```

(Mobile renders `label` with `whitespace-pre-line`, so `"Meal\nPlans"` stacks on narrow screens; single-word labels don't need `\n`.)

- [ ] **Step 3: Rework the nav link list and active logic**

In `app/components/nav-bar.tsx`, replace the `navLinks` array and `isActive`:

```tsx
  const navLinks = [
    { href: "/discover", label: t("nav.explore"), shortLabel: t("nav.explore_short"), match: ["/discover"] },
    { href: "/market", label: t("nav.recipes"), shortLabel: t("nav.recipes_short"), match: ["/market", "/dashboard/recipes"] },
    { href: "/chefs", label: t("nav.chefs"), shortLabel: t("nav.chefs_short"), match: ["/chefs"] },
    { href: "/explore", label: t("nav.meal_plans"), shortLabel: t("nav.meal_plans_short"), match: ["/explore", "/dashboard/plans"] },
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function isLinkActive(match: string[]) {
    return match.some((m) => pathname === m || pathname.startsWith(m + "/"));
  }
```

Notes:
- The `...(user ? [My Recipes, My Meal Plans] : [])` spread is REMOVED — the tab list is now identical for every auth state (tab count can never flicker).
- Keep the old `isActive(href)` — the Admin link (`isActive("/admin/users")`) still uses it.
- In the link-rendering `.map()`, change the active check from `isActive(link.href)` to `isLinkActive(link.match)`. The rest of the link JSX (classes, stacked/short label spans, grid) is unchanged.
- Prefix-matching `"/dashboard/recipes"` and `"/dashboard/plans"` deliberately excludes `/dashboard/profile` and `/dashboard` itself — no tab highlights there (spec requirement).

- [ ] **Step 4: Point the brand link at /market for signed-in users**

In the same file (~line 47), change:

```tsx
        <Link
          href={user ? "/dashboard/recipes" : "/"}
```

to:

```tsx
        <Link
          href={user ? "/market" : "/"}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output (clean). A failure here most likely means a missed consumer of a deleted translation key — fix it, don't suppress.

- [ ] **Step 6: Browser check**

With the dev server running, in the logged-in Chrome session:
1. Load http://localhost:3000/market → nav shows exactly 4 tabs: Explore / Recipes / Chefs / Meal Plans; **Recipes** highlighted.
2. Navigate to http://localhost:3000/dashboard/recipes → **Recipes** still highlighted (dual-route match works).
3. http://localhost:3000/dashboard/plans → **Meal Plans** highlighted; http://localhost:3000/explore → **Meal Plans** highlighted.
4. http://localhost:3000/dashboard/profile → NO tab highlighted.
5. Click the JuFAN brand → lands on `/market`.
6. Hard-refresh `/market` → tab count stays 4 throughout load (no 4→6 flicker — the list no longer depends on auth).

- [ ] **Step 7: Commit**

```bash
git add lib/i18n/translations.ts app/components/nav-bar.tsx
git commit -m "feat: merge nav to 4 tabs — Recipes and Meal Plans with dual-route highlight"
```

---

### Task 2: CollectionToggle component + insertion into all four pages

**Files:**
- Create: `app/components/collection-toggle.tsx`
- Modify: `lib/i18n/translations.ts` (add 2 keys near the `market.*` block, ~line 25)
- Modify: `app/market/page.tsx` (~line 86, first child of content container)
- Modify: `app/dashboard/recipes/page.tsx` (~line 85)
- Modify: `app/explore/page.tsx` (~line 85)
- Modify: `app/dashboard/plans/page.tsx` (~line 157)

**Interfaces:**
- Consumes: `useAuth()` from `@/lib/auth/auth-context` (`{ user, loading }`), `useLanguage()` from `@/lib/i18n/language-context`, translation keys `collection.market` / `collection.mine` (added in this task).
- Produces: `export function CollectionToggle({ kind, active }: { kind: "recipes" | "plans"; active: "market" | "mine" })` — pages render it as `<CollectionToggle kind="recipes" active="market" />` etc.

- [ ] **Step 1: Add the toggle translation keys**

In `lib/i18n/translations.ts`, directly above `"market.title"` (~line 25), insert:

```ts
  // ── Market/Mine toggle (merged Recipes & Meal Plans tabs) ──
  "collection.market": { en: "Market", zh: "市场" },
  "collection.mine": { en: "Mine", zh: "我的" },
```

- [ ] **Step 2: Create the component**

Create `app/components/collection-toggle.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";

const ROUTES = {
  recipes: { market: "/market", mine: "/dashboard/recipes" },
  plans: { market: "/explore", mine: "/dashboard/plans" },
} as const;

interface CollectionToggleProps {
  kind: keyof typeof ROUTES;
  active: "market" | "mine";
}

/**
 * Market/Mine segmented pill at the top of the merged Recipes and Meal Plans
 * tabs. Always occupies the same height in every auth state (invisible while
 * auth resolves or when signed out) so page layout never jumps.
 */
export function CollectionToggle({ kind, active }: CollectionToggleProps) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const hidden = loading || !user;

  const segment = (side: "market" | "mine") =>
    `flex-1 rounded-full px-4 py-1.5 text-center text-xs sm:text-sm font-medium transition-colors ${
      active === side
        ? "bg-indigo-600 text-white"
        : "text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
    }`;

  return (
    <div
      aria-hidden={hidden || undefined}
      className={`mx-auto flex w-full max-w-xs rounded-full border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900${
        hidden ? " invisible pointer-events-none" : ""
      }`}
    >
      <Link href={ROUTES[kind].market} className={segment("market")}>
        {t("collection.market")}
      </Link>
      <Link href={ROUTES[kind].mine} className={segment("mine")}>
        {t("collection.mine")}
      </Link>
    </div>
  );
}
```

Design notes (do not "improve" these away):
- `invisible` (not conditional render / not `hidden`) — element keeps its box, so zero layout shift when auth resolves; matches the spec's flicker-proofing requirement.
- `<Link>` halves (not buttons) — switching Market↔Mine is real navigation between existing routes; Next prefetches on viewport so the switch is snappy.
- Toggle is FIRST child of each page's content container so the pill sits in the same visual spot on both sides of the switch.

- [ ] **Step 3: Insert into `/market`**

In `app/market/page.tsx` add the import:

```tsx
import { CollectionToggle } from "@/app/components/collection-toggle";
```

and change (~line 86):

```tsx
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {/* Header */}
```

to:

```tsx
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-5 sm:mb-6">
          <CollectionToggle kind="recipes" active="market" />
        </div>

        {/* Header */}
```

- [ ] **Step 4: Insert into `/dashboard/recipes`**

In `app/dashboard/recipes/page.tsx` add the same import, and change (~line 85):

```tsx
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {/* Header */}
```

to:

```tsx
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-5 sm:mb-6">
          <CollectionToggle kind="recipes" active="mine" />
        </div>

        {/* Header */}
```

(Do NOT touch the "+ New recipe" button, filters, or anything else on this page.)

- [ ] **Step 5: Insert into `/explore`**

In `app/explore/page.tsx` add the same import, and change (~line 85):

```tsx
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
```

to:

```tsx
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 sm:mb-6">
          <CollectionToggle kind="plans" active="market" />
        </div>

        {/* Header */}
```

- [ ] **Step 6: Insert into `/dashboard/plans`**

In `app/dashboard/plans/page.tsx` add the same import, and change (~line 157):

```tsx
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
```

to:

```tsx
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-5 sm:mb-6">
          <CollectionToggle kind="plans" active="mine" />
        </div>

        {/* Header */}
```

(This container is `max-w-2xl` — narrower than the others. The toggle is `max-w-xs mx-auto`, so it still centers at the same screen position. Do NOT touch the approval queue, status badges, grocery links, or "+ New plan".)

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 8: Browser check**

Logged-in session:
1. http://localhost:3000/market → pill visible at top, **Market** side filled indigo; click **Mine** → lands on `/dashboard/recipes` with **Mine** filled, pill in the same spot, Recipes tab still highlighted.
2. Same round-trip for Meal Plans: `/explore` ↔ `/dashboard/plans`.
3. Hard-refresh `/market` and watch the toggle area: space is reserved from first paint; the pill fades in without pushing content down.
4. Switch language to 中文 → pill shows 市场 / 我的.
5. Logged-out check (incognito tab): `/market` shows NO visible pill but layout matches the logged-in page (empty reserved row); `/dashboard/recipes` redirects to `/login` (pre-existing behavior).
6. Mobile viewport (~390px wide): pill is comfortably tappable; 4 nav tabs fit, "Meal Plans" stacks on two lines.

- [ ] **Step 9: Commit**

```bash
git add app/components/collection-toggle.tsx lib/i18n/translations.ts app/market/page.tsx app/dashboard/recipes/page.tsx app/explore/page.tsx app/dashboard/plans/page.tsx
git commit -m "feat: Market/Mine segmented toggle on merged Recipes and Meal Plans tabs"
```

---

### Task 3: Post-login and redirect destinations → /market (option B)

**Files:**
- Modify: `app/page.tsx:41` and `app/page.tsx:54`
- Modify: `app/auth/callback/route.ts:7`
- Modify: `app/pending-approval/page.tsx:23`
- Modify: `app/admin/users/page.tsx:47`
- Modify: `app/admin/reports/page.tsx:52`

**Interfaces:**
- Consumes: nothing from earlier tasks (independent).
- Produces: no exports — behavior change only. `app/dashboard/page.tsx` is deliberately NOT changed.

- [ ] **Step 1: Home-page sign-in destinations**

In `app/page.tsx`, change line 41:

```tsx
    router.push("/dashboard/recipes");
```
to:
```tsx
    router.push("/market");
```

and line 54:

```tsx
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/dashboard/recipes")}`,
```
to:
```tsx
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/market")}`,
```

- [ ] **Step 2: OAuth callback default**

In `app/auth/callback/route.ts`, change the `safeNextPath` fallback (line 7):

```ts
    return "/dashboard/recipes";
```
to:
```ts
    return "/market";
```

- [ ] **Step 3: Pending-approval bounce for approved users**

In `app/pending-approval/page.tsx` line 23, change:

```tsx
    redirect("/dashboard/recipes");
```
to:
```tsx
    redirect("/market");
```

- [ ] **Step 4: Non-admin bounces on admin pages**

In `app/admin/users/page.tsx` line 47 and `app/admin/reports/page.tsx` line 52, change:

```tsx
        if (!profile?.is_admin) { router.push("/dashboard/recipes"); return; }
```
to:
```tsx
        if (!profile?.is_admin) { router.push("/market"); return; }
```

- [ ] **Step 5: Confirm nothing else targets the old destination**

Run: `grep -rn '"/dashboard/recipes"' app lib | grep -v 'dashboard/recipes/'`
Expected: remaining hits ONLY in `app/dashboard/page.tsx` (kept by spec) and `app/dashboard/recipes/[id]/edit/page.tsx` (in-flow redirects back to My Recipes — correct, unchanged). `app/components/nav-bar.tsx` should no longer appear (fixed in Task 1).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 7: Browser check**

1. In an incognito tab, log in with the dev test account (ask Nathan if credentials aren't at hand — do NOT log out the main session) → lands on `/market`.
2. Logged-in main session: visit http://localhost:3000/dashboard → still redirects to `/dashboard/recipes` (unchanged, by design).

If no second test account is available, verify step 1 by code-reading the four changed call sites plus a `node -e` fetch of `http://localhost:3000/auth/callback?next=` confirming the redirect Location is `/market`, and note in the task report that interactive login wasn't exercised.

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx app/auth/callback/route.ts app/pending-approval/page.tsx app/admin/users/page.tsx app/admin/reports/page.tsx
git commit -m "feat: logo and post-login land on the Recipes market"
```

---

### Task 4: Full verification sweep (no code changes expected)

**Files:** none (verification only; fixes, if any, are committed with a `fix:` message referencing the broken task)

**Interfaces:** consumes the finished work of Tasks 1–3.

- [ ] **Step 1: Typecheck + production build**

Run: `npx tsc --noEmit` (plain — no pipes)
Expected: no output.
Run: `npm run build`
Expected: "Compiled successfully". If the build warns about page rendering modes, note it but don't chase pre-existing warnings.

- [ ] **Step 2: End-to-end browser walkthrough (desktop viewport)**

1. `/market`: 4 tabs, Recipes highlighted, Market pill active; filters/search/category groups all work as before.
2. Pill → Mine: `/dashboard/recipes` — "+ New recipe" present, own recipes listed, Recipes tab still highlighted.
3. `/explore`: Meal Plans tab highlighted, Market pill active, plans list works.
4. Pill → Mine: `/dashboard/plans` — plans, status badges, approval section (if any pending), "+ New plan" all present.
5. `/dashboard/profile`: no nav tab highlighted.
6. Brand logo → `/market`.
7. A recipe detail page and a plan detail page still render with working breadcrumbs.

- [ ] **Step 3: Mobile viewport walkthrough (~390px)**

Repeat checks 1–4 at mobile width: 4 tabs fit ("Meal Plans" stacked), pill tappable with a thumb-sized target, no horizontal overflow, no layout jump on refresh.

- [ ] **Step 4: Flicker checks (the regressions this feature must not reintroduce)**

1. Hard-refresh `/market` logged in: tab count constant at 4; toggle space reserved from first paint.
2. Click between all 4 tabs repeatedly: no nav flicker.
3. Incognito `/market`: identical layout, no visible pill, nothing jumps when auth resolves to "no user".

- [ ] **Step 5: Report**

Summarize results to Nathan in plain English (what was verified, anything odd). Remind: 26+ local commits remain unpushed; production deploy only on his explicit "push".
