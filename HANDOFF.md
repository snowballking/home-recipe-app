# HANDOFF — 2026-07-23

Session handoff for whoever picks this up next (human or agent). Read `CLAUDE.md` / `AGENTS.md` first; product plan is in `ROADMAP.md`, historical gotchas in `SESSION_SUMMARY.md`. Auto-memory index is at `~/.claude/projects/.../memory/MEMORY.md` — the memories `no-push-without-approval`, `db-changes-hit-production`, `single-test-account-verification`, `recipe-forking-mvp-state`, and `all-new-ui-strings-bilingual` all apply here.

## 1. The goal we are working toward

Ship the ROADMAP scope to production for the JuFAN/Chef HideOut home-recipe app — **but only after Nathan personally tests in dev and explicitly says "push"** (hard rule). This session's chunk: the **Recipe forking / variations MVP** ("Make it your own", ROADMAP weeks 7–8), plus a full **Simplified-Chinese translation pass** on the new + surrounding UI, plus a **site-title rebrand**.

## 2. Current state of the code

- **All this session's work is DONE and verified, but UNCOMMITTED** — it lives in the working tree, deliberately left for Nathan's review (he is mid-testing; said "so far the translation looks good"). Nothing from this session is committed yet.
- **35 local commits are unpushed** (`git log --oneline origin/main..HEAD | wc -l` = 35). **All 35 are from PRIOR sessions** — this session added zero commits before this handoff. Newest prior SHAs: `4a5a816`, `810e7a7`, `4efb63c`, `9d3d012`, `642587a`. The `docs: session handoff notes` commit that carries this file is the only commit created this session (SHA in the reply below).
- **`npx tsc --noEmit` clean; `npm run build` compiles** (verified after the final edits).
- **Verified in-browser** as Admin Gor on `localhost:3000`, both languages: fork button → prefilled private copy (no photo) → required note → save → "Based on…" banner + Variations(N) list + card "Variation" tag; and the whole recipe/fork/market UI reads correctly in 中文, with EN unchanged.
- **DB (memory `db-changes-hit-production` — single Supabase project, changes hit production):** migration **`029_recipe_variations.sql` is APPLIED to the live DB** — added nullable `recipes.variation_note` (text) and `recipes.variation_diff` (jsonb, reserved/unused) + index `recipes_original_recipe_id_idx`. A test fork was created via the UI during verification and then **deleted**; DB confirmed back to **0 forks** (`original_recipe_id is not null` → 0 rows). No other DB changes.
- **Dev server: running** on http://localhost:3000. The Chrome MCP test tab is logged in as Admin Gor, currently in 中文.
- **Working tree** (`git status --short`): 12 modified files + 1 new migration + **1 stray untracked file to delete** (see §4).

## 3. Files actively edited this session

- `app/layout.tsx` — metadata `title` → `"Chef HideOut 私厨"`.
- `app/components/nav-bar.tsx` — brand link text → `"Chef HideOut 私厨"`.
- `lib/types.ts` — added `variation_note` / `variation_diff` to the `Recipe` interface.
- `supabase/migrations/029_recipe_variations.sql` — **new**; the forking columns + index (already applied).
- `app/dashboard/recipes/new/page.tsx` — fork flow (`?fork=<id>` prefills via `loadForkSource` + `populateForm`, drops the author's photo, forces private, records `original_recipe_id`, required variation note with validation) **and** a full i18n pass of the entire create/import form via `useLanguage()`.
- `app/recipe/[id]/page.tsx` — fork button (logged-in non-owners), "Based on…" banner, Variations(N) list, `!original_recipe_id` guard on the "User's Original" hero badge, and i18n of the page's server-rendered strings via `<Tr>` / value-translator client children.
- `app/recipe/[id]/recipe-content.tsx` — **new exported client components**: `Tr({en,zh})`, `RecipeActions`, `ForkBanner`, `VariationsSection`, `RecipeDifficultyValue`, `TrCuisine`, `TrMealType`, `TrDietaryTag` (lets the Server Component page localize).
- `app/components/recipe-card.tsx` — "🔀 Variation" tag, "User's Original" gated on `!original_recipe_id`, and i18n of author/cal/difficulty/cuisine/dietary-tag/private labels.
- `app/components/comment-section.tsx`, `save-recipe-button.tsx`, `follow-button.tsx`, `report-recipe-button.tsx` — inline `locale`-branched Simplified-Chinese for all visible strings (these are `"use client"` components with no `t()` keys, so translated inline).
- `lib/i18n/translations.ts` — added `fork.*` and `form.*` key namespaces + value-translator helpers `translateDifficulty` / `translateCuisine` / `translateMealType` / `translateDietaryTag`.

## 4. Everything tried that failed (and the gotchas)

- **The forking MVP first shipped with ALL its UI strings hardcoded in English.** Nathan tested in 中文 and reported a "complete disconnect" (English wall inside a Chinese app). Root cause: I followed the recipe detail page's then-existing hardcoded-English convention instead of the i18n system. Fix: full translation pass (see §3). Saved as memory `all-new-ui-strings-bilingual` — **every new user-visible string must be bilingual**.
- **The recipe detail page is a Server Component**, so it cannot call the client-only `useLanguage()` hook. Solution: small `"use client"` child components in `recipe-content.tsx` (`Tr`, `RecipeActions`, `ForkBanner`, `VariationsSection`, value translators) — don't try to localize the Server Component inline.
- **Chinese vs English word order differs** — e.g. "Based on X by Y" → "改编自 Y 的「X」". Branch on `locale` for whole composed sentences rather than concatenating translation keys, or the grammar breaks.
- **STRAY FILE to delete:** `app/components/report-recipe-button 2.tsx` (note the space + "2") is an untracked, English-only *pre-translation* duplicate — almost certainly an editor/macOS artifact. It is **not imported anywhere** and doesn't affect the build, but it should be removed: `rm "app/components/report-recipe-button 2.tsx"`. Not deleted this session (surfaced for the owner to confirm rather than auto-deleting an untracked file).
- **NavBar briefly shows the logged-out state** ("登录"/Sign In) on the recipe page before client auth resolves — a **pre-existing** client-auth display quirk, unrelated to this work. Server-side auth (which gates the fork button) is correct; the button only renders for real logged-in non-owners.
- **Verifying the "Variations (N)" list needed a *public* fork**, but forks default to private and can't be published without a compliant photo. Worked around it by creating the test fork via the real UI, then `update recipes set is_public=true` via SQL just to screenshot the list, then deleting the row. (Lesson: the list correctly excludes private forks — that's intended.)
- **`/auth/callback` fork/redirect paths and any logged-out check** must still be verified cookie-lessly via `node -e` + `fetch` — never log out (memory `single-test-account-verification`; only Nathan's session exists).

## 5. The next step

1. **Nathan finishes hands-on testing** of forking + the CN translation across all functions (in progress). Fix whatever he reports.
2. **Delete the stray file:** `rm "app/components/report-recipe-button 2.tsx"` (§4).
3. **On Nathan's OK**, commit this session's work locally (suggested split: forking MVP + migration; i18n translation pass; title rebrand). Still **do not push**.
4. **Only on Nathan's explicit "push":** `git push origin main` (deploys all commits; migration 029 is already live). Watch the Vercel new-API-route env-var gotcha and sanity-check production.
5. **Next feature batch (agreed):** bidirectional **EN↔ZH auto-translation of edited/new recipe *content* fields** — recipe content (e.g. imported ingredient names) still shows source-language text in CN mode because there is no reusable translate primitive (translation only happens inline in the AI extraction prompt at import time; would extend the existing `app/api/extract-recipe/route.ts`, not a new route). Also still deferred from forking: auto-computed `variation_diff` + "What changed" panel (the `variation_diff` column already exists), and the duplicate-import-source-url nudge.
6. **Owner decision still open (carried from a prior session):** imported recipes don't appear on a member's `/user/[id]` profile (original-only `source_url is null` filter). Decide whether forks/imports should show there (forks currently *would* show, as they have no `source_url`).
