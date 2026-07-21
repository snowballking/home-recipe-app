# HANDOFF — 2026-07-22

Session handoff for whoever picks this up next (human or agent). Read `CLAUDE.md` / `AGENTS.md` first; product plan is in `ROADMAP.md`, historical gotchas in `SESSION_SUMMARY.md`.

## 1. Goal we are working toward

Ship the ROADMAP "Weeks 1–2: Social layer + content licensing" scope **plus** Nathan's follow-up feature batch, to production — but **only after Nathan personally tests everything in dev and explicitly says "push"**.

The follow-up batch (built this session, spec in `docs/superpowers/specs/2026-07-21-chef-directory-recipe-exploration-design.md`, plan in `docs/superpowers/plans/2026-07-21-chef-directory-recipe-exploration.md`):

1. **Chefs tab** — curated chef directory (`/chefs`) auto-built from YouTube-imported recipes; chef profile pages (`/chefs/[id]`) grouping each chef's recipes, with follow support (`chef_follows` table).
2. **Recipe Exploration tab** — full-screen swipe deck at `/discover` with Latest/Popular toggle, save + open actions.
3. **Admin → Chefs** (`/admin/chefs`) — create/edit/delete chefs, avatar upload, assign recipes to chefs.
4. **Auto-chef on import** — `/api/extract-recipe` resolves the YouTube channel via oEmbed and attaches `chef_id` to new imports.
5. **Rebrand** — site title changed from "HomeRecipe" to **"JuFAN 煮饭"** (browser tab + nav logo).

## 2. Current state of the code

- **All work is DONE and verified**: `npx tsc --noEmit` clean, `npm run build` passes, all new routes return 200, Supabase security advisors show nothing unexpected (the two new SECURITY DEFINER functions appear in the routine listing but enforce permissions internally).
- **21 local commits on `main` are NOT pushed.** `git push` auto-deploys to production via Vercel. **DO NOT PUSH** until Nathan approves — this is a hard rule he stated explicitly (see memory `no-push-without-approval`). The 21 commits = 12 from the previous session (weeks 1–2 social layer: publish gating, AI placeholder images, content reports, profile upgrades, comment photos) + 9 from this session (chefs/discover/rebrand).
- **Database (LIVE — single Supabase project `hlgojnqgabfxtrkihows` serves BOTH dev and production):**
  - Migrations 025 (social layer) and 026 (`supabase/migrations/026_chefs_directory.sql`: `chefs`, `chef_follows`, `recipes.chef_id`, RPCs `upsert_chef_for_channel` + `admin_set_recipe_chef`) are **already applied** to the live DB via Supabase MCP. Both additive-only, so the currently deployed old code is unaffected.
  - Bootstrap data is live: **36 chef rows**, **69 of 70 YouTube recipes** have `chef_id` set. 1 YouTube recipe unassigned (its video is private → oEmbed 401); ~10 Xiaohongshu recipes + a few blog recipes also unassigned — Nathan assigns those manually in Admin → Chefs.
- **Dev server** is running in the background (task id `b4km18phx`, `npm run dev`, http://localhost:3000) for Nathan's testing.
- Migration numbering note: ROADMAP originally reserved 025 for recipe forking; forking is now 027+.

## 3. Files actively edited this session (all committed, working tree clean)

- `supabase/migrations/026_chefs_directory.sql` — new schema (mirror of what was applied live)
- `lib/types.ts` — `Chef`, `ChefSourceSite`, `Recipe.chef_id`/`Recipe.chefs`
- `lib/i18n/translations.ts` — `nav.explore*`, `nav.chefs*`, `chefs.*`, `discover.*`, `recipe.by_chef` (EN + zh)
- `app/api/extract-recipe/route.ts` — `fetchYouTubeChannel()` oEmbed helper; response now includes top-level `chef_id`
- `app/dashboard/recipes/new/page.tsx` — captures `chef_id` from import response, includes it in insert
- `app/components/chef-follow-button.tsx` — new; mirrors `follow-button.tsx` against `chef_follows`
- `app/components/nav-bar.tsx` — 6-tab order (Explore · Recipes Market · Chefs · Meal Plans Market · My Recipes · My Meal Plans); brand text → "JuFAN 煮饭"
- `app/chefs/page.tsx`, `app/chefs/[id]/page.tsx` — new public pages
- `app/discover/page.tsx` — new swipe deck (CSS scroll-snap, no gesture library)
- `app/recipe/[id]/page.tsx` — "👨‍🍳 By <chef> →" attribution chip above the source-attribution block
- `app/admin/chefs/page.tsx` — new admin management page; `app/admin/users/page.tsx` — header link to it
- `app/layout.tsx` — metadata title → "JuFAN 煮饭"

## 4. Things tried that failed (and the fixes)

- **Generating bootstrap SQL inline in zsh** — nested quote escaping broke (`unmatched "`). Fix: wrote the generator as a scratchpad `.mjs` file instead of a `node -e` one-liner. Lesson: for anything with quotes, write a script file.
- **False-alarm typecheck failure** — `npx tsc --noEmit | grep -v "npm notice"; echo $?` reports **grep's** exit code (1 when tsc output is empty), not tsc's. Fix: run `npx tsc --noEmit; echo $?` plain.
- **1 of 70 oEmbed lookups returned 401** (`https://youtu.be/_rnCuCyCvl0` — video is private/deleted). Not retryable; recipe intentionally left unassigned for manual admin assignment.
- **`curl` is not available on this Mac** (discovered last session) — use `node -e` with `fetch` for HTTP smoke tests.
- Carried over from last session: `git push origin main` was **rejected by Nathan** ("No pushing of new codes into production environment") — never retry without his explicit approval; new API route files on Vercel sometimes fail to read env vars, so server logic goes into existing route files (why AI image gen is a PUT on `/api/upload-image` and oEmbed lives in `/api/extract-recipe`).

## 5. Next step

1. **Wait for Nathan's dev-test feedback** on: Explore deck, Chefs tab, chef profiles + follow, Admin → Chefs (edit bios/photos, assign the ~13 unassigned recipes), "By chef" chip on recipe pages, JuFAN 煮饭 rebrand. Fix whatever he reports.
2. **On his explicit "push"**: `git push origin main` (auto-deploys). After deploy, sanity-check production and watch for the Vercel env-var gotcha on any new behavior.
3. Then next roadmap item; also consider low-priority cleanups: `HANDOFF.md` removal/refresh, domain/repo rename to match JuFAN, and enabling leaked-password protection in Supabase Auth (advisor WARN, pre-existing).
