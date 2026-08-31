# HANDOFF — 2026-08-03

This document is the practical starting point for the next contributor. Read
[`FEATURES.md`](FEATURES.md) before building a feature, and use
[`ROADMAP.md`](ROADMAP.md) for business context, priority, and sequencing.

## Current Goal

Finish the primary feature implementation and clear active blockers.

The latest primary feature—**Saved Recipes surfaced directly in weekly meal
planning**—is complete and deployed. The next contributor should continue the
Phase 1 soft-launch work from the prioritized list below, while keeping the
saved-recipe flow stable.

### Latest shipped outcome

- Production: <https://home-recipe-app.vercel.app/>
- Commit: `f0379ac8e6788450737f12b9ffc82a5a420701b9`
  (`feat: surface saved recipes in meal planning`)
- Saved Recipes now has a private, dedicated route:
  `/dashboard/saved-recipes`.
- In a meal-plan slot picker, **Saved** is the first source and opens by
  default when the user has saved recipes. **All**, **My Recipes**, and
  **Community** still work as before.
- The feature was verified with 42 passing tests, TypeScript checking, and a
  production build. Vercel marked the deployment `READY`; its runtime-error
  check was clean at release time.

## Active Status

The working state is saved remotely on `main`. Before any new commit, always
verify the state rather than assuming a clean worktree:

```bash
git status --short --branch
```

At handoff, `main` is aligned with `origin/main`; there are no tracked local
changes or staged changes. Two unrelated untracked items are present and must
not be swept into a feature commit:

- `.superpowers/`
- `app/components/report-recipe-button 2.tsx`

Inspect and deliberately decide how to handle either item before removing or
committing it. Do not use `git add .` or `git add -A` while they exist.

### Operational constraints

- Do **not** push or deploy without the owner's explicit approval. A push to
  `main` deploys through Vercel.
- Treat every Supabase migration as production-impacting: this project uses a
  live Supabase environment, not a disposable local database.
- Add every new user-visible string in English and Simplified Chinese through
  `lib/i18n/translations.ts`.
- Run focused tests, `npm test`, `npx tsc --noEmit`, and `npm run build` before
  saying a change is ready. The global `npm run lint` command currently has
  unrelated, pre-existing failures; use targeted linting on files you touch
  and record any remaining repository-wide issues separately.

## Key Decisions

### Saved Recipes architecture

1. **Dedicated private page, not a profile-page anchor**
   - The canonical collection is `/dashboard/saved-recipes`.
   - The old profile-based collection depended on server-side ownership
     rendering, which could hide a user's own saved recipes. The dedicated
     authenticated route gets the current user from `useAuth()` and reads only
     their records under the existing `recipe_saves` RLS policy.

2. **No schema or RLS change for saved recipes**
   - The feature reuses the existing `recipe_saves` table and owner-only RLS.
   - It intentionally does not introduce public collections or expose another
     user's saved records.

3. **Pure helpers separate data-shape handling from UI**
   - `lib/saved-recipes.ts` normalizes saved rows and ignores unavailable
     joined recipes.
   - It supports both object- and array-shaped Supabase joins, avoiding a
     brittle assumption about joined relation shapes.
   - `lib/recipe-picker-source.ts` owns the picker source contract and filters
     saved IDs with a `Set`, preserving the existing recipe-list order.

4. **Saved is a conditional default, never a dead end**
   - The meal-plan picker defaults to **Saved** only when at least one saved ID
     exists; otherwise it defaults to **All**.
   - Search, category filtering, recipe insertion, and the All/My Recipes/
     Community sources remain available. Selecting a saved recipe uses the
     existing recipe record—there is no copy or fork created just to plan it.

5. **Keep personal data loading parallel and private**
   - The meal-plan page fetches available recipes and saved IDs together, then
     passes only the saved ID list into the picker.
   - The standalone collection query uses the signed-in browser client, so RLS
     stays the source of truth for privacy.

### Product and business decisions

- `FEATURES.md` is the build source of truth; `ROADMAP.md` is the business
  overview and checklist. When they conflict, `FEATURES.md` governs feature
  behavior and `ROADMAP.md` governs priority and sequencing.
- Recipe variations are overlays on an original recipe, not standalone
  replacements. Users can choose a variation on recipe detail, and any added
  ingredients can flow into grocery planning.
- Grocery purchasing is deliberately phased: grocery-list first, then a
  concierge pilot with partners, then AI-assisted routing, and only later live
  inventory or supermarket APIs.
- Launch supports English and Simplified Chinese. Traditional Chinese/HK is
  Phase 3, not a soft-launch requirement.

## Failed Attempts and Gotchas

- **Saved Recipes inside the profile page was not reliable.** The owner-only
  server-rendered section meant users could not consistently find their saved
  collection. Keep the dedicated dashboard route as the single canonical
  entry point.
- **Do not assume a Supabase joined relation is always one object.** Depending
  on relation metadata, `recipes(*)` can be returned as an object or array;
  normalization must safely handle both as well as `null` rows for recipes no
  longer visible to the user.
- **A global lint failure is not automatically a regression.** It currently
  includes pre-existing issues outside the saved-recipes work. Run the full
  test/type/build gates and targeted linting, then distinguish new errors from
  existing debt before attempting broad cleanup.
- **Unauthenticated deployment checks are limited by Vercel SSO.** Use Vercel's
  deployment state and an authenticated browser session for a genuine
  signed-in production-flow check; do not mistake an SSO redirect for an app
  regression.
- **Do not repeat the old handoff's stale git state.** It described many
  unpushed commits and uncommitted forking work from an earlier session. Those
  notes are obsolete after the deployed `f0379ac` release.

## Immediate Next Steps

1. Run `git status --short --branch` and preserve the two unrelated untracked
   items listed above.
2. If the owner reports a Saved Recipes or meal-plan issue, reproduce it in a
   signed-in development session first. Cover the dedicated page, an empty
   collection, saved-first picker behavior, search/category filters, and the
   All/My Recipes/Community fallbacks before changing code.
3. Resume the highest-value Phase 1 product work from `ROADMAP.md`, starting
   with the remaining community/profile improvements and user-tagged
   festive/seasonal meal-plan category. Re-read the relevant section of
   `FEATURES.md` before proposing or implementing either.
4. Clear external blockers in parallel with product work:
   - confirm the HPB nutrition-data access route before the nutrition-engine
     work;
   - obtain a Telegram bot and owner chat ID before CS escalation;
   - complete company/legal and supplier prerequisites before payments or
     grocery fulfillment.
5. For every new feature, add bilingual UI strings, targeted tests, full
   test/type/build verification, and obtain explicit deployment approval before
   pushing.

## Useful References

- [Build specifications](FEATURES.md)
- [Business roadmap and priority checklist](ROADMAP.md)
- [Saved Recipes design](docs/superpowers/specs/2026-08-02-saved-recipes-meal-plan-design.md)
- [Saved Recipes implementation plan](docs/superpowers/plans/2026-08-02-saved-recipes-meal-plan.md)
- [Repository instructions](AGENTS.md)
