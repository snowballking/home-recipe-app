# HANDOFF — 2026-08-02

Session handoff for whoever picks this up next (human or agent), starting with zero memory of this session.

> **⚠️ Read `FEATURES.md` before building any feature.** As of this session, `FEATURES.md` is the **build source of truth** — every feature + how to build it, tagged by phase and status. `ROADMAP.md` is now the business overview & progress checklist (what to work on next and where it sits), not the build spec. `CLAUDE.md` has been updated to say the same. Also read `CLAUDE.md` / `AGENTS.md` and the auto-memory index at `~/.claude/projects/.../memory/MEMORY.md` — the memories `no-push-without-approval`, `db-changes-hit-production`, `single-test-account-verification`, `recipe-forking-mvp-state`, `all-new-ui-strings-bilingual`, and the new `docs-structure` all apply.

## 1. The goal we are working toward

Ship the product to production for the Chef HideOut 私厨 (JuFAN) home-recipe app — **but only after Nathan personally tests in dev and explicitly says "push"** (hard rule; pushes auto-deploy via Vercel). The venture plan is Phase 1 Soft Launch → Phase 2 Monetization Pilot → Phase 3 Scale (see `ROADMAP.md`). **This session was planning/documentation, not feature code:** the owner asked to author a comprehensive features document and restructure the planning docs so an AI agent is directed to the right file for building.

## 2. Current state of the code

- **This session created exactly ONE commit:** `d802d76` — `docs: split planning into FEATURES.md (build) + ROADMAP.md (business checklist)` (3 files changed: new `FEATURES.md`, rewritten `ROADMAP.md`, edited `CLAUDE.md`). **Not pushed.**
- **Unpushed commit count:** `git log --oneline origin/main..HEAD | wc -l` = **37** (36 from prior sessions + this session's `d802d76`). Prior recent SHAs: `568964d`, `4a5a816`, `810e7a7`, `4efb63c`, `9d3d012`.
- **The docs commit staged ONLY the three doc files** — the prior session's forking/i18n work was deliberately left unstaged and untouched.
- **Working tree (`git status --short`)** still carries the **prior session's uncommitted forking + i18n + rebrand work** (12 modified files) + 1 new migration + 1 stray untracked file — none of it touched this session:
  - Modified: `app/components/comment-section.tsx`, `follow-button.tsx`, `nav-bar.tsx`, `recipe-card.tsx`, `report-recipe-button.tsx`, `save-recipe-button.tsx`; `app/dashboard/recipes/new/page.tsx`; `app/layout.tsx`; `app/recipe/[id]/page.tsx`, `recipe-content.tsx`; `lib/i18n/translations.ts`; `lib/types.ts`.
  - Untracked: `supabase/migrations/029_recipe_variations.sql` (already applied to the live DB in a prior session) and the stray `app/components/report-recipe-button 2.tsx` (still to be deleted — see §4).
- **DB:** no DB changes this session. Migration `029` remains live from a prior session (nullable `recipes.variation_note`, unused `variation_diff` jsonb, index on `original_recipe_id`); **not re-verified this session**.
- **Dev server:** a process is listening on `http://localhost:3000` (not re-verified as the app or its logged-in state this session).
- **Typecheck/build:** not run this session (no app code changed — only markdown docs + `CLAUDE.md`).

## 3. Files actively edited this session

- `FEATURES.md` — **new.** The build source of truth. 8 feature areas (community/social + "overlays"/forking; core UX + grocery list; chef credits + AI placeholder images; Asian-accurate nutrition engine; grocery shopping & fulfillment with a Mermaid flowchart; AI CS + Telegram escalation; bilingual EN/简体 + 繁體; PWA/native strategy). Includes a Mermaid fulfillment flowchart, phase tags, and migrated-in build detail (forking schema/edge cases, AI placeholder images, translation-model bake-off, duplicate-import nudge, PWA hardening).
- `ROADMAP.md` — **rewritten** from a week-by-week plan into a phased, agile **checklist** (Phase 1 Soft Launch / Phase 2 Monetization Pilot / Phase 3 Scale; `[ ]`/`[~]`/`[x]`, no weeks). Product items point to `→ FEATURES §n`. Business/legal/BD/risk/budget/dependencies/open-decisions context preserved.
- `CLAUDE.md` — first bullet replaced: now instructs sessions to read `FEATURES.md` before building a feature, and `ROADMAP.md` for progress/what's next.
- Memory `docs-structure.md` — **new** (+ index line in `MEMORY.md`): records that FEATURES.md = build doc, ROADMAP.md = business checklist, and the product decisions folded in this session.

## 4. Everything tried that failed (and the gotchas)

- **First recommendation on festive/seasonal meal plans was wrong.** I initially proposed platform/chef-**seeded** festive collections (CNY, Christmas, Deepavali, Hari Raya). Nathan corrected it: it must be **user-created and user-tagged** — users pick a festival/season **category** on their own shared plan, and same-tagged plans surface together. The community fills the categories; the platform does not seed them. `FEATURES.md §1b` and the Gaps section were rewritten accordingly.
- **Two other recommendations were confirmed, not changed:** CS escalation to the owner → **Telegram first** (bot + chat ID; free/trivial; WhatsApp later). Grocery fulfillment → **keep it phased** (concierge → AI-assisted routing → live inventory + partner APIs); do **not** build the live-inventory/API engine pre-launch.
- **Weeks vs phases:** Nathan does not want week/period labels — he wants a **checklist he can tick and move around agile-style**. `ROADMAP.md` was rebuilt with phases only (no weeks); `FEATURES.md` was retagged weeks→phases to stay consistent.
- **Commit hygiene gotcha:** the working tree mixes this session's docs with the prior session's untested forking work. Staged **only** `FEATURES.md ROADMAP.md CLAUDE.md` explicitly (never `git add .`/`-A`) so the forking work stays uncommitted for Nathan's review.
- **`Feature.md` vs `FEATURES.md`:** the owner's request referred to "Feature.md"; the actual file is **`FEATURES.md`** (plural, all-caps). Use the correct name.
- No dead-ends in the app code this session (no feature code was written).

## 5. The next step

1. **Next AI agent: read `FEATURES.md` first before building any feature** (owner's explicit instruction) — it is the build source of truth; use `ROADMAP.md` for priority/sequencing.
2. **Carried over — Nathan still to finish hands-on testing** of the forking MVP + Simplified-Chinese translation across all functions. Fix whatever he reports.
3. **Delete the stray file:** `rm "app/components/report-recipe-button 2.tsx"` (untracked English-only pre-translation duplicate; not imported anywhere).
4. **On Nathan's OK,** commit the prior session's work locally (suggested split: forking MVP + migration `029`; the i18n translation pass; the "Chef HideOut 私厨" title rebrand). Still **do not push**.
5. **Only on Nathan's explicit "push":** `git push origin main` (deploys all 37 commits). Watch the Vercel new-API-route env-var gotcha and sanity-check production.
6. **Agreed next build candidates** (all now spec'd in `FEATURES.md`): the **festive/seasonal category** (smallest — a `season`/`festival` field on meal plans + a filtered Market view), the **Telegram CS escalation**, and the previously-agreed **EN↔ZH auto-translation of recipe *content* fields** (extends `app/api/extract-recipe/route.ts`, not a new route).
7. **Owner decision still open (carried from a prior session):** whether imported recipes should appear on a member's `/user/[id]` profile (currently filtered to originals via `source_url is null`; forks would show, as they have no `source_url`).
