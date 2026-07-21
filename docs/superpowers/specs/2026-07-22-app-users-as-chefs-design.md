# Design — Credit app users as chefs in the Chefs directory

Date: 2026-07-22

## Problem

The app has two parallel "creator" concepts:

1. **`chefs` table** — external creators auto-built from YouTube imports. Shown in the Chefs tab (`/chefs`), each with a profile page at `/chefs/[id]`. Recipes attribute via `recipes.chef_id`.
2. **App-user profiles** (`profiles`, `is_chef`, `follower_count`, `recipe_count`) — signed-up users who upload original recipes. They have profile pages at `/user/[id]` with user-to-user follows, but they **never appear in the Chefs directory**.

Result: users who upload their own original recipes get no "chef" credit in the Chefs tab, while imported recipes do. This design closes that gap.

## Approach (chosen)

Make the Chefs tab a directory of **everyone who publishes recipes** — external creators **and** app members who upload their own. App members' cards link to their existing `/user/[id]` profile (which already groups their recipes and has a Follow button). No duplicate identities, no second follow system, no new tables.

Rejected alternatives: (a) auto-create a `chefs` row per user — creates a duplicate identity and a second follow system per user; (b) only fix the recipe detail page — doesn't surface users in the directory at all.

## Scope decisions

- **Who qualifies:** any app user with ≥1 public **original** recipe, included automatically (no admin opt-in, no `is_chef` requirement). "Original" means a recipe the user created themselves — `source_url IS NULL AND chef_id IS NULL`. Imported recipes (which carry a `source_url`, and once assigned a `chef_id` pointing at the real external creator) do not count toward a member's chef credit, and members whose public recipes are all imports never appear. The member's `/user/[id]` profile likewise lists only their original recipes, and its "Recipes" stat reflects that count.
- **Dedup:** a profile already linked to an external chef (`chefs.linked_profile_id`) is excluded from the app-member list so nobody appears twice.
- **Labels:** external chef cards show a "Featured" cue; app-member cards show a "Community" cue, so it's clear why one card opens `/chefs/[id]` and another opens `/user/[id]`.
- **Sorting:** merged list sorted by public-recipe count descending (same as today). Name search covers both.

## Components

### 1. Database — `list_app_chefs()` RPC (migration 027)

Read-only `SECURITY DEFINER` SQL function returning, for each qualifying app user:
`id, displayname, avatar_url, recipe_count (public only), follower_count`.

- Joins `profiles` → `recipes` on `is_public = true`, groups by profile, `having count > 0`.
- Excludes profiles referenced by any `chefs.linked_profile_id`.
- Exposes only already-public data (profiles are `select using (true)`; recipe counts are public). Grant execute to `authenticated` and `anon`.

### 2. Chefs directory page (`app/chefs/page.tsx`)

- Continue loading external chefs (`chefs` + recipe/follow counts) as today.
- Additionally call `list_app_chefs()`.
- Merge both into one array, each tagged with a `kind: "external" | "app"` discriminator; sort by recipe count desc.
- Render each card by kind:
  - `external` → link `/chefs/[id]`, `ChefFollowButton` (unchanged behavior).
  - `app` → link `/user/[id]`, normal user `FollowButton`.
- Small label chip per card ("Featured" / "Community"). Name search filters the merged list.

### 3. No new profile page

App members reuse the existing `/user/[id]` page — that is their chef profile.

### 4. Recipe detail page

Unchanged. Original recipes already show the uploader card there. (Optional future polish: add the 👨‍🍳 badge to that card — out of scope now.)

## Out of scope

- No new tables or schema changes beyond the read-only RPC.
- No merging of the two follow systems.
- No auto-creation of `chefs` rows for app users.

## Verification

- `npx tsc --noEmit` clean; `npm run build` passes.
- `/chefs` renders both external chefs and the 5 current app-member creators, cards link to the correct destinations, follow buttons work per kind, no duplicates.
