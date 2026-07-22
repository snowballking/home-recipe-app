# Merged Recipes & Meal Plans tabs — design

**Date:** 2026-07-23
**Status:** Approved by Nathan (brainstorm session); pending spec review

## Goal

Collapse the six-tab nav into four tabs. "Recipes Market" + "My Recipes" become one
**Recipes** tab; "Meal Plans Market" + "My Meal Plans" become one **Meal Plans** tab.
Inside each merged tab, users must be able to tell at a glance whether they are looking
at the public Market or their own content, and switch between the two easily —
especially on a phone.

## Decisions made with Nathan

1. **Switch UI: segmented toggle** (option 1 of 3). A two-option pill at the top of the
   page content — the native iOS/Android pattern, two big thumb-friendly targets, shows
   one view at a time, adds no extra nav chrome rows on mobile.
2. **Default view: Market first.** Tapping the Recipes or Meal Plans tab always lands on
   the Market side, for logged-in and logged-out users alike.
3. **Home = discovery (option B).** The JuFAN logo and every post-login redirect now
   land on `/market`, consistent with Market-first.
4. **No `Mine · N` count badge in v1.** The count would need an async fetch on Market
   pages and would pop in after load, shifting the toggle width — the same flicker class
   we just eliminated in the nav. The filled active pill + labels are sufficient. Can be
   added later only with a flicker-free treatment.

## Approach: cross-link the four existing pages (no new routes)

The toggle is a navigation control, not client-side state. Market side links to
`/market` (or `/explore`); Mine side links to `/dashboard/recipes` (or
`/dashboard/plans`). All four pages keep their existing bodies, filters, and sub-routes
unchanged; each simply gains the toggle at the top.

Rejected alternatives:
- **Single unified route with both views in memory** — avoids a brief loading flash on
  toggle switch, but requires new routes, redirects for ~13 internal links, and merging
  two filter states. Not worth it.
- **Secondary tab row under the nav** — adds a third row of chrome on mobile before any
  content.
- **Stacked single page (Mine section above Market section)** — long scroll, two filter
  bars on one small screen.

Accepted trade-off: switching Market↔Mine is a real navigation, so there's a brief
load while the other side fetches. Use `<Link>` (prefetch) to keep it snappy; data is
always fresh.

## Components & changes

### 1. `CollectionToggle` (new, `app/components/collection-toggle.tsx`)

- Props: `kind: "recipes" | "plans"`, `active: "market" | "mine"`.
- Renders a centered pill with two `<Link>` halves:
  - kind=recipes → Market `/market`, Mine `/dashboard/recipes`
  - kind=plans → Market `/explore`, Mine `/dashboard/plans`
- Active half: filled indigo (match nav active style). Inactive half: plain, hover tint.
- **Auth handling (no pop-in):** uses `useAuth()`. The component always occupies the
  same height: while auth is resolving it renders an invisible placeholder, and if auth
  resolves to no user it keeps that empty placeholder rather than collapsing. Market
  page layout is therefore identical for every auth state — zero jump. (Cost: one short
  empty row for logged-out visitors; acceptable.) Mine pages already redirect logged-out
  users to `/login`, so the toggle there always has a user.
- i18n labels: `collection.market` (EN "Market" / zh "市场"), `collection.mine`
  (EN "Mine" / zh "我的").

### 2. Nav (`app/components/nav-bar.tsx`)

- Tab list becomes four entries for everyone (no auth-conditional tabs — a side benefit:
  the tab *count* no longer depends on auth at all):
  1. Explore → `/discover`
  2. Recipes → `/market`
  3. Chefs → `/chefs`
  4. Meal Plans → `/explore`
- Active-state rule (explicit, because Profile also lives under `/dashboard`):
  - Recipes active on `/market` and `/dashboard/recipes` (+ sub-paths)
  - Meal Plans active on `/explore` and `/dashboard/plans` (+ sub-paths)
  - Nothing extra lights on `/dashboard/profile` or `/dashboard` itself.
  - Implement via per-link `match: string[]` prefixes instead of the single-href
    `isActive`.
- Brand link: `/market` when logged in, `/` when logged out (option B).
- Labels: reuse/replace `nav.recipes_market*` / `nav.meal_plans_market*` keys with
  "Recipes" / "食谱" and "Meal Plans" / "餐计划"; delete `nav.my_recipes*` /
  `nav.my_meal_plans*` keys (no longer referenced). Keep the label/shortLabel structure;
  whether "Meal Plans" still stacks on mobile is an implementation detail — pick what
  fits at 4 equal-width tabs.

### 3. Page edits (toggle insertion only)

The toggle is inserted as the **first element of each page's content container** (above
the header) on all four pages, so the pill sits in the same visual spot on both sides
of a Market↔Mine switch.

- `app/market/page.tsx` — `<CollectionToggle kind="recipes" active="market" />`.
- `app/dashboard/recipes/page.tsx` — `kind="recipes" active="mine"`;
  keep "+ New recipe" button and all filters as-is.
- `app/explore/page.tsx` — `kind="plans" active="market"`.
- `app/dashboard/plans/page.tsx` — `kind="plans" active="mine"`; approval queue, status
  badges, grocery links, "+ New plan" untouched.

### 4. Post-login / redirect destinations → `/market`

- `app/page.tsx:41` (password sign-in push) and `:54` (OAuth `next=` param)
- `app/auth/callback/route.ts:7` (default next)
- `app/pending-approval/page.tsx:23` (approved-user redirect)
- `app/admin/users/page.tsx:47`, `app/admin/reports/page.tsx:52` (non-admin bounce)
- `app/dashboard/page.tsx:7` — keep redirecting to `/dashboard/recipes` (it's a "my
  dashboard" URL; sending it to Market would be surprising).

### 5. Out of scope

- No DB or migration changes. No changes to recipe/plan detail pages, create/edit
  flows, or the `/plan/[id]` and `/recipe/[id]` breadcrumbs (they link to `/explore`,
  which remains the Meal Plans market — still correct).
- Logged-out users simply see Market pages without a Mine option, as today.

## Testing / verification

- `npx tsc --noEmit` clean; `npm run build` passes (run plain, no pipes).
- Browser (Chrome automation) checks, mobile viewport included:
  1. Logged in: 4 tabs; Recipes tab → Market view with toggle; tap Mine → my recipes;
     correct tab stays highlighted on both sides; same for Meal Plans.
  2. `/dashboard/profile`: no nav tab highlighted.
  3. Logged out: 4 tabs, Market pages show no toggle, layout doesn't jump on load.
  4. Login → lands on `/market`; logo → `/market`.
  5. No flicker: toggle area stable during auth resolution; nav tab count stable.
