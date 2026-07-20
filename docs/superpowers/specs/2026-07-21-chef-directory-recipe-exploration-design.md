# Chef Directory + Recipe Exploration — Design

**Date:** 2026-07-21
**Approved by:** Nathan (owner) — chose curated chef pages, full-screen swipe deck, 6-tab nav with browsing-first order.

## Goal

1. A **Chefs** nav tab: directory of curated chef profiles, each grouping the recipes that came from that chef, with follow support.
2. A **Recipe Exploration** nav tab: full-screen swipeable deck for browsing Latest / Popular public recipes.
3. Existing user-profile chef setup (`profiles.is_chef`, user follow) stays unchanged.

## Context (verified against live data, 2026-07-21)

- ~99 recipes: 70 imported from YouTube, 10 from Xiaohongshu (xhslink.com), ~9 from food blogs, 10 own recipes.
- Recipes store only `source_url` — no creator name. YouTube oEmbed (`https://www.youtube.com/oembed?url=...&format=json`, no API key) returns `author_name` + `author_url` (channel link); verified working for sample recipe URLs.
- Xiaohongshu short links and blogs cannot be auto-resolved reliably → those start unassigned; admin assigns manually.
- `/explore` route is already taken by Meal Plans Market → exploration deck lives at `/discover`.
- Existing follow system (`follows` table) is user→user; chefs are a separate curated entity with their own follow table.

## Data model (migration 026 — additive only; shared Supabase project serves production)

### `chefs` table
| column | type | notes |
|---|---|---|
| id | uuid pk default gen_random_uuid() | |
| name | text not null | channel/creator name (may contain Chinese) |
| bio | text null | admin-editable |
| avatar_url | text null | check `~* '^https?://'`; admin uploads via existing image API |
| channel_url | text null unique | check `~* '^https?://'`; link to YouTube/XHS/blog |
| source_site | text | check in ('youtube','xiaohongshu','website','other') |
| linked_profile_id | uuid null → profiles(id) on delete set null | future: link a real signed-up chef account |
| created_at | timestamptz default now() | |

RLS: select → public (`using (true)`); insert/update/delete → admins only (`profiles.is_admin` exists-check, same pattern as content_reports).

### `recipes.chef_id`
`uuid null references chefs(id) on delete set null` + index. Nullable — own recipes and unassigned imports have no chef.

### `chef_follows` table
`(user_id uuid → auth.users on delete cascade, chef_id uuid → chefs on delete cascade, created_at, pk (user_id, chef_id))`.
RLS: select → public (needed for follower counts); insert/delete → `auth.uid() = user_id`.

### SECURITY DEFINER helper
`upsert_chef_for_channel(p_name text, p_channel_url text, p_source_site text) returns uuid` — finds chef by `channel_url` or inserts one, returns id. Granted to `authenticated`, revoked from `public, anon`. Needed because the import flow runs as a normal user but chef writes are admin-only under RLS. Validates `p_channel_url ~* '^https?://'`.

## Chef bootstrap + ongoing assignment

- **One-time bootstrap (done during implementation, not shipped code):** for each distinct YouTube `source_url`, fetch oEmbed → group by `author_url` → insert chefs → set `recipes.chef_id`. Executed locally via script + Supabase MCP. XHS/blog recipes left unassigned.
- **Ongoing:** the existing recipe-import API route (already deployed file — avoids the Vercel new-route env-var gotcha) additionally fetches YouTube oEmbed when the source is a YouTube URL, calls `upsert_chef_for_channel`, and returns `chef_id` so the recipe insert includes it. oEmbed failure is non-fatal (recipe imports fine, chef_id null).
- **Admin curation:** `/admin/chefs` — create/edit/delete chefs (name, bio, avatar upload, channel_url), plus an "assign recipes" section listing public recipes with their chef dropdown (covers XHS/blog cleanup).

## Pages & components

### `/chefs` (directory, public)
Grid of chef cards: avatar (initial fallback), name, public-recipe count, follower count, Follow button. Name search box. Counts via PostgREST FK-count joins (FKs exist). Chefs with zero public recipes still listed (admin may pre-create).

### `/chefs/[id]` (profile, public)
Header: avatar, name, bio, "Watch on YouTube ↗" (label per source_site; scheme-validated href), follower count, large ChefFollowButton. If `linked_profile_id`, link to the app user profile. Below: grid of that chef's **public** recipes using existing RecipeCard.

### `ChefFollowButton` component
Same UX as existing FollowButton (follow/unfollow, count, login redirect for signed-out) but against `chef_follows`.

### `/discover` (Recipe Exploration, public)
- Full-screen vertical card deck via CSS scroll-snap (`snap-y snap-mandatory`, cards `100dvh` minus navbar, `snap-start`) — native swipe on mobile, mouse-wheel/arrow-keys on desktop, no gesture library.
- Top toggle: **🆕 Latest** (created_at desc) / **🔥 Popular** (client-side score `save_count*3 + rating_count*2 + comment_count`, tie-break avg_rating — no page-view tracking exists).
- Fetch up to 100 public recipes with chef name join. Card: hero image full-bleed (gradient+emoji fallback when none), locale-aware title (`title_zh`), cuisine chip, ⭐ rating, "by <chef or author>" linking to chef page when assigned, AI-image badge when `image_source='ai_generated'`, **♡ Save** toggle (recipe_saves, prompts login when signed out), **Open →** to `/recipe/[id]`. First image eager, rest lazy.

### Recipe page attribution
On `/recipe/[id]`, when `chef_id` is set: small "👨‍🍳 By <chef name> →" chip linking to `/chefs/[id]` (reinforces source attribution).

### Nav
Order: **Explore (`/discover`) · Recipes Market · Chefs (`/chefs`) · Meal Plans Market · My Recipes · My Meal Plans**. Same responsive grid/stacking as today.

### i18n
All new UI strings get typed keys in `lib/i18n/translations.ts`, EN + Simplified Chinese (nav.explore, nav.chefs, chefs.*, discover.*, etc.).

## Types

`lib/types.ts`: `Chef` interface, `ChefFollow`, `Recipe.chef_id: string | null`, optional `Recipe.chefs?: { id; name } | null` for joins.

## Error handling

- oEmbed fetch: 5s timeout, non-fatal on failure (import proceeds without chef).
- All chef `channel_url`/`avatar_url` renders scheme-validated (`/^https?:\/\//i`) client-side + DB checks.
- Deck with zero recipes: friendly empty state.

## Out of scope (YAGNI)

- View/impression tracking; recommendation algorithm.
- Chef claiming flow (linked_profile_id column reserved, no UI beyond a link).
- Notifications on chef follow; chef-only feeds.
- Auto-resolving Xiaohongshu/blog creators.

## Verification & rollout

- `npx tsc --noEmit` + `npm run build` must pass; smoke-test key routes on dev server.
- Migration additive-only; applied via MCP to the shared live DB (safe for deployed code, which never queries the new tables/columns).
- No push to origin/main until Nathan tests at localhost:3000 and approves.
