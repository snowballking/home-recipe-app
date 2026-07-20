# Chef Directory + Recipe Exploration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated Chefs directory (auto-built from YouTube-imported recipes, admin-managed, followable) and a full-screen swipeable Recipe Exploration deck at `/discover`, with a reordered 6-tab nav.

**Architecture:** New `chefs` + `chef_follows` tables (additive migration 026) with `recipes.chef_id`; YouTube oEmbed supplies channel names (one-time bootstrap now, ongoing via the existing `/api/extract-recipe` route + a SECURITY DEFINER upsert function). Public pages `/chefs`, `/chefs/[id]`, `/discover` are client components following the `/market` page patterns; admin management lives at `/admin/chefs`.

**Tech Stack:** Next.js 16 App Router, Supabase (RLS, SECURITY DEFINER RPCs, MCP for applying migrations), YouTube oEmbed (no key), Tailwind, existing i18n system (`lib/i18n/translations.ts`, EN + zh).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-21-chef-directory-recipe-exploration-design.md`.
- **No push to origin/main** — commits stay local until Nathan tests on localhost:3000 and approves (pushes auto-deploy via Vercel).
- Single shared Supabase project `hlgojnqgabfxtrkihows` serves production — migration must stay **additive only**.
- No test framework exists in this repo: verification per task = `npx tsc --noEmit` (must exit 0); final task also runs `npm run build` and smoke-tests routes against the dev server.
- Do NOT create new API route files (Vercel env-var gotcha) — server logic goes into the existing `/api/extract-recipe` route.
- All user-controlled URLs rendered in `href`/`src` must be scheme-validated with `/^https?:\/\//i` client-side, plus DB CHECK constraints.
- Every new UI string gets a typed key in `lib/i18n/translations.ts` with `en` and `zh` values.
- Route params in Next 16 are `Promise<{id}>` — server components `await params`, client components use React's `use(params)`.
- The dev server runs in the background for Nathan; restart it if a build is run.

---

### Task 1: Migration 026 + TypeScript types

**Files:**
- Create: `supabase/migrations/026_chefs_directory.sql`
- Modify: `lib/types.ts` (append Chef types; extend `Recipe`)

**Interfaces:**
- Produces: tables `chefs`, `chef_follows`, column `recipes.chef_id`, RPCs `upsert_chef_for_channel(p_name, p_channel_url, p_source_site) → uuid` and `admin_set_recipe_chef(p_recipe_id, p_chef_id) → void`; TS types `Chef`, `ChefSourceSite`, `Recipe.chef_id`, `Recipe.chefs`.

- [ ] **Step 1: Write the migration file**

`supabase/migrations/026_chefs_directory.sql`:

```sql
-- ============================================================
-- 026: Chef directory + recipe exploration support
-- ============================================================

-- 1. Curated chefs (outside creators; NOT app users)
create table if not exists public.chefs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  avatar_url text check (avatar_url is null or avatar_url ~* '^https?://'),
  channel_url text unique check (channel_url is null or channel_url ~* '^https?://'),
  source_site text not null default 'other'
    check (source_site in ('youtube', 'xiaohongshu', 'website', 'other')),
  linked_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.chefs enable row level security;

create policy "Anyone can view chefs" on public.chefs
  for select using (true);
create policy "Admins can insert chefs" on public.chefs
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
create policy "Admins can update chefs" on public.chefs
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
create policy "Admins can delete chefs" on public.chefs
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- 2. Recipe → chef attribution
alter table public.recipes
  add column if not exists chef_id uuid references public.chefs(id) on delete set null;
create index if not exists idx_recipes_chef_id on public.recipes(chef_id);

-- 3. Follow a chef (mirrors user-to-user follows)
create table if not exists public.chef_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  chef_id uuid not null references public.chefs(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, chef_id)
);

alter table public.chef_follows enable row level security;

create policy "Anyone can view chef follows" on public.chef_follows
  for select using (true);
create policy "Users can follow chefs" on public.chef_follows
  for insert with check (auth.uid() = user_id);
create policy "Users can unfollow chefs" on public.chef_follows
  for delete using (auth.uid() = user_id);

-- 4. Import flow runs as a normal user but chef writes are admin-only,
--    so chef upsert happens through a SECURITY DEFINER function.
create or replace function public.upsert_chef_for_channel(
  p_name text, p_channel_url text, p_source_site text default 'youtube')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 then return null; end if;
  if p_channel_url is null or p_channel_url !~* '^https?://' then return null; end if;
  if p_source_site not in ('youtube', 'xiaohongshu', 'website', 'other') then
    p_source_site := 'other';
  end if;
  select id into v_id from public.chefs where channel_url = p_channel_url;
  if v_id is null then
    insert into public.chefs (name, channel_url, source_site)
    values (trim(p_name), p_channel_url, p_source_site)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

grant execute on function public.upsert_chef_for_channel(text, text, text) to authenticated;
revoke execute on function public.upsert_chef_for_channel(text, text, text) from public, anon;

-- 5. Admins assign recipes to chefs (recipes UPDATE policy is owner-only)
create or replace function public.admin_set_recipe_chef(p_recipe_id uuid, p_chef_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true) then
    raise exception 'Not authorized';
  end if;
  update public.recipes set chef_id = p_chef_id where id = p_recipe_id;
end;
$$;

grant execute on function public.admin_set_recipe_chef(uuid, uuid) to authenticated;
revoke execute on function public.admin_set_recipe_chef(uuid, uuid) from public, anon;
```

- [ ] **Step 2: Apply via Supabase MCP** — `apply_migration` (project `hlgojnqgabfxtrkihows`, name `chefs_directory`) with the SQL above. Additive-only: safe for deployed production code.

- [ ] **Step 3: Verify** — MCP `execute_sql`: `select count(*) from public.chefs; select column_name from information_schema.columns where table_name='recipes' and column_name='chef_id';` Expected: 0 chefs, `chef_id` present. Run MCP `get_advisors` (security) — no NEW findings vs the pre-existing baseline.

- [ ] **Step 4: Add types to `lib/types.ts`**

Append near the other social types:

```ts
// ── Chefs (curated creator profiles — NOT app users) ─────────
export type ChefSourceSite = "youtube" | "xiaohongshu" | "website" | "other";

export interface Chef {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  channel_url: string | null;
  source_site: ChefSourceSite;
  linked_profile_id: string | null;
  created_at: string;
}
```

In the `Recipe` interface add:

```ts
  chef_id?: string | null;
  chefs?: { id: string; name: string } | null; // joined via PostgREST
```

- [ ] **Step 5: Typecheck** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 6: Commit** — `git add supabase/migrations/026_chefs_directory.sql lib/types.ts && git commit -m "feat: chefs schema — chefs, chef_follows, recipe attribution (migration 026)"`

---

### Task 2: One-time chef bootstrap from existing YouTube recipes (data only, no repo code)

**Files:**
- Create (scratchpad only, not committed): `scratchpad/chef-bootstrap.mjs`

**Interfaces:**
- Consumes: `upsert_chef_for_channel` is NOT used here (runs as service via MCP SQL instead).
- Produces: populated `chefs` rows + `recipes.chef_id` set for all YouTube-imported recipes.

- [ ] **Step 1: Export YouTube source URLs** — MCP `execute_sql`: `select id, source_url from recipes where source_url ~* '(youtube\.com|youtu\.be)';` Save the JSON result to `scratchpad/yt-recipes.json` as `[{"id": "...", "source_url": "..."}, ...]`.

- [ ] **Step 2: Resolve channels via oEmbed** — `scratchpad/chef-bootstrap.mjs`:

```js
import { readFileSync, writeFileSync } from "node:fs";
const recipes = JSON.parse(readFileSync(new URL("./yt-recipes.json", import.meta.url)));
const out = [];
for (const r of recipes) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(r.source_url)}&format=json`);
    if (!res.ok) { console.error("SKIP", r.source_url, res.status); continue; }
    const j = await res.json();
    out.push({ recipe_id: r.id, name: j.author_name, channel_url: j.author_url });
  } catch (e) { console.error("SKIP", r.source_url, e.message); }
  await new Promise((ok) => setTimeout(ok, 300)); // be polite to the endpoint
}
writeFileSync(new URL("./yt-channels.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(`resolved ${out.length}/${recipes.length}`);
```

Run: `node scratchpad/chef-bootstrap.mjs`. Expected: `resolved N/M` with only a few skips (deleted/private videos are skipped, left unassigned).

- [ ] **Step 3: Insert chefs + assign recipes** — generate one SQL batch from `yt-channels.json` (escape single quotes by doubling) and run via MCP `execute_sql`:

```sql
insert into public.chefs (name, channel_url, source_site)
select distinct v.name, v.channel_url, 'youtube'
from (values ('<name1>', '<channel_url1>'), ('<name2>', '<channel_url2>')) as v(name, channel_url)
on conflict (channel_url) do nothing;

update public.recipes r set chef_id = c.id
from (values ('<recipe_id1>'::uuid, '<channel_url1>'), ...) as m(recipe_id, channel_url)
join public.chefs c on c.channel_url = m.channel_url
where r.id = m.recipe_id;
```

- [ ] **Step 4: Verify** — MCP `execute_sql`: `select c.name, count(r.id) recipes from chefs c left join recipes r on r.chef_id = c.id group by c.name order by recipes desc; select count(*) from recipes where source_url ~* '(youtube\.com|youtu\.be)' and chef_id is null;` Expected: chef list with sensible counts; unassigned YouTube count equals only the oEmbed skips. No commit (data-only task).

---

### Task 3: Ongoing chef capture on import

**Files:**
- Modify: `app/api/extract-recipe/route.ts`
- Modify: `app/dashboard/recipes/new/page.tsx`

**Interfaces:**
- Consumes: `upsert_chef_for_channel` RPC (Task 1).
- Produces: `POST /api/extract-recipe` response gains optional top-level `chef_id: string | null`; new-recipe insert payload includes `chef_id`.

- [ ] **Step 1: Add oEmbed helper + RPC call to `app/api/extract-recipe/route.ts`**

Append helper at the bottom of the file:

```ts
/** Resolve the YouTube channel behind a video URL via oEmbed (no API key).
 *  Non-fatal: any failure returns null and the import proceeds without a chef. */
async function fetchYouTubeChannel(
  url: string
): Promise<{ name: string; channelUrl: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { author_name?: unknown; author_url?: unknown };
    if (typeof data.author_name !== "string" || typeof data.author_url !== "string") return null;
    return { name: data.author_name, channelUrl: data.author_url };
  } catch {
    return null;
  }
}
```

In the YouTube branch, extend the parallel fetch (currently `const [geminiRecipe, thumbnail] = await Promise.all([...])`) to:

```ts
      const [geminiRecipe, thumbnail, channel] = await Promise.all([
        extractFromYouTubeVideo(url, geminiKey),
        Promise.resolve(getYouTubeThumbnail(url)),
        fetchYouTubeChannel(url),
      ]);
      recipe = geminiRecipe;
      imageUrl = thumbnail;
      if (channel) {
        const { data: upsertedChefId } = await supabase.rpc("upsert_chef_for_channel", {
          p_name: channel.name,
          p_channel_url: channel.channelUrl,
          p_source_site: "youtube",
        });
        chefId = (upsertedChefId as string | null) ?? null;
      }
```

Declare `let chefId: string | null = null;` next to `let imageUrl: string | null = null;` and change the success response to `return Response.json({ recipe, pipeline: pipelineLabel, chef_id: chefId });`

- [ ] **Step 2: Capture chef_id in `app/dashboard/recipes/new/page.tsx`** — add state `const [chefId, setChefId] = useState<string | null>(null);` near `imageSource` state; in `handleImport` after the response JSON is parsed, add `setChefId(data.chef_id ?? null);`; in the `.insert({...})` payload (line ~383) add `chef_id: chefId,`.

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 4: Smoke test** — with the dev server running, import a YouTube recipe URL via `node -e` POST to `/api/extract-recipe` is not possible unauthenticated (401 expected — confirms route alive). Full verification happens in Nathan's manual dev test.

- [ ] **Step 5: Commit** — `git add app/api/extract-recipe/route.ts app/dashboard/recipes/new/page.tsx && git commit -m "feat: auto-attach YouTube chef on recipe import"`

---

### Task 4: i18n keys + ChefFollowButton + nav reorder

**Files:**
- Modify: `lib/i18n/translations.ts`
- Create: `app/components/chef-follow-button.tsx`
- Modify: `app/components/nav-bar.tsx:46-51`

**Interfaces:**
- Produces: `ChefFollowButton({ chefId, size?, onToggled? })`; translation keys `nav.explore(_short)`, `nav.chefs(_short)`, `chefs.*`, `discover.*`, `recipe.by_chef`; nav order Explore · Recipes Market · Chefs · Meal Plans Market · My Recipes · My Meal Plans.

- [ ] **Step 1: Add translation keys** to `lib/i18n/translations.ts` (after the existing `nav.*` block and at the end of the map):

```ts
  "nav.explore": { en: "Explore", zh: "探索" },
  "nav.explore_short": { en: "Explore", zh: "探索" },
  "nav.chefs": { en: "Chefs", zh: "厨师" },
  "nav.chefs_short": { en: "Chefs", zh: "厨师" },

  "chefs.title": { en: "Chefs", zh: "厨师" },
  "chefs.subtitle": { en: "Discover the creators behind the recipes", zh: "发现食谱背后的创作者" },
  "chefs.search": { en: "Search chefs...", zh: "搜索厨师..." },
  "chefs.recipes": { en: "recipes", zh: "个食谱" },
  "chefs.followers": { en: "followers", zh: "位粉丝" },
  "chefs.no_chefs": { en: "No chefs yet", zh: "暂无厨师" },
  "chefs.visit_channel": { en: "Visit channel", zh: "访问频道" },
  "chefs.watch_youtube": { en: "Watch on YouTube", zh: "在 YouTube 观看" },
  "chefs.no_recipes": { en: "No public recipes yet", zh: "暂无公开食谱" },

  "discover.latest": { en: "🆕 Latest", zh: "🆕 最新" },
  "discover.popular": { en: "🔥 Popular", zh: "🔥 热门" },
  "discover.save": { en: "♡ Save", zh: "♡ 收藏" },
  "discover.saved": { en: "♥ Saved", zh: "♥ 已收藏" },
  "discover.open": { en: "Open recipe →", zh: "查看食谱 →" },
  "discover.swipe_hint": { en: "Swipe up for more", zh: "上滑查看更多" },
  "discover.empty": { en: "No public recipes yet", zh: "暂无公开食谱" },

  "recipe.by_chef": { en: "By", zh: "作者" },
```

- [ ] **Step 2: Create `app/components/chef-follow-button.tsx`** (mirrors `follow-button.tsx` against `chef_follows`):

```tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ChefFollowButtonProps {
  chefId: string;
  size?: "md" | "lg";
  onToggled?: (nowFollowing: boolean) => void;
}

export function ChefFollowButton({ chefId, size = "md", onToggled }: ChefFollowButtonProps) {
  const supabase = createClient();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        setCurrentUserId(user.id);

        const { data } = await supabase
          .from("chef_follows")
          .select("user_id")
          .eq("user_id", user.id)
          .eq("chef_id", chefId)
          .maybeSingle();

        setIsFollowing(!!data);
      } catch {
        // Auth lock race — safe to ignore
      }
      setLoading(false);
    }
    check();
  }, [chefId]);

  async function toggleFollow() {
    if (!currentUserId) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);

    if (isFollowing) {
      await supabase
        .from("chef_follows")
        .delete()
        .eq("user_id", currentUserId)
        .eq("chef_id", chefId);
      setIsFollowing(false);
      onToggled?.(false);
    } else {
      await supabase.from("chef_follows").insert({ user_id: currentUserId, chef_id: chefId });
      setIsFollowing(true);
      onToggled?.(true);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      className={`rounded-lg font-medium transition-colors ${
        size === "lg" ? "px-6 py-2 text-base" : "px-4 py-1.5 text-sm"
      } ${
        isFollowing
          ? "border border-zinc-300 bg-white text-zinc-700 hover:border-red-300 hover:text-red-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-red-700 dark:hover:text-red-400"
          : "bg-indigo-600 text-white hover:bg-indigo-700"
      } disabled:opacity-50`}
    >
      {loading ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
```

- [ ] **Step 3: Reorder nav** — in `app/components/nav-bar.tsx` replace the `navLinks` array with:

```ts
  const navLinks = [
    { href: "/discover", label: t("nav.explore"), shortLabel: t("nav.explore_short") },
    { href: "/market", label: t("nav.recipes_market"), shortLabel: t("nav.recipes_market_short") },
    { href: "/chefs", label: t("nav.chefs"), shortLabel: t("nav.chefs_short") },
    { href: "/explore", label: t("nav.meal_plans_market"), shortLabel: t("nav.meal_plans_market_short") },
    ...(user
      ? [
          { href: "/dashboard/recipes", label: t("nav.my_recipes"), shortLabel: t("nav.my_recipes_short") },
          { href: "/dashboard/plans", label: t("nav.my_meal_plans"), shortLabel: t("nav.my_meal_plans_short") },
        ]
      : []),
  ];
```

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit** — `git add lib/i18n/translations.ts app/components/chef-follow-button.tsx app/components/nav-bar.tsx && git commit -m "feat: chef follow button, nav reorder, chef/discover i18n"`

---

### Task 5: Chef directory `/chefs` + profile `/chefs/[id]` + recipe-page attribution

**Files:**
- Create: `app/chefs/page.tsx`
- Create: `app/chefs/[id]/page.tsx`
- Modify: `app/recipe/[id]/page.tsx` (chef fetch ~line 37; attribution chip above the `source_url` block ~line 301)

**Interfaces:**
- Consumes: `ChefFollowButton`, `Chef` type, `chefs`/`chef_follows` tables, `RecipeCard`.
- Produces: public routes `/chefs`, `/chefs/[id]`; chef chip on recipe pages.

- [ ] **Step 1: Create `app/chefs/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";
import { ChefFollowButton } from "@/app/components/chef-follow-button";
import type { Chef } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";

type ChefRow = Chef & { recipes: { count: number }[]; chef_follows: { count: number }[] };

export default function ChefsPage() {
  const supabase = createClient();
  const { t } = useLanguage();
  const [chefs, setChefs] = useState<ChefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("chefs")
        .select("*, recipes(count), chef_follows(count)");
      const rows = ((data ?? []) as ChefRow[]).sort(
        (a, b) => (b.recipes[0]?.count ?? 0) - (a.recipes[0]?.count ?? 0)
      );
      setChefs(rows);
      setLoading(false);
    })();
  }, []);

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return chefs;
    return chefs.filter((c) => c.name.toLowerCase().includes(s));
  }, [chefs, search]);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <h1 className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          👨‍🍳 {t("chefs.title")}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">{t("chefs.subtitle")}</p>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("chefs.search")}
          className="mt-5 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />

        {loading ? (
          <p className="mt-10 text-center text-sm text-zinc-500">...</p>
        ) : visible.length === 0 ? (
          <p className="mt-10 text-center text-sm text-zinc-500">{t("chefs.no_chefs")}</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((chef) => (
              <div
                key={chef.id}
                className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white p-5 text-center shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Link href={`/chefs/${chef.id}`} className="flex flex-col items-center">
                  {chef.avatar_url && /^https?:\/\//i.test(chef.avatar_url) ? (
                    <img
                      src={chef.avatar_url}
                      alt={chef.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-900/40">
                      👨‍🍳
                    </span>
                  )}
                  <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {chef.name}
                  </h3>
                </Link>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {chef.recipes[0]?.count ?? 0} {t("chefs.recipes")} ·{" "}
                  {chef.chef_follows[0]?.count ?? 0} {t("chefs.followers")}
                </p>
                <div className="mt-3">
                  <ChefFollowButton chefId={chef.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/chefs/[id]/page.tsx`**

```tsx
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";
import { RecipeCard } from "@/app/components/recipe-card";
import { ChefFollowButton } from "@/app/components/chef-follow-button";
import type { Chef, Recipe } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";

export default function ChefProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const { t } = useLanguage();
  const [chef, setChef] = useState<Chef | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: chefData }, { data: recipeData }, { count }] = await Promise.all([
        supabase.from("chefs").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("recipes")
          .select("*")
          .eq("chef_id", id)
          .eq("is_public", true)
          .order("created_at", { ascending: false }),
        supabase.from("chef_follows").select("*", { count: "exact", head: true }).eq("chef_id", id),
      ]);
      setChef((chefData as Chef) ?? null);
      setRecipes((recipeData as Recipe[]) ?? []);
      setFollowerCount(count ?? 0);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
        <NavBar />
        <p className="mt-16 text-center text-sm text-zinc-500">...</p>
      </div>
    );
  }

  if (!chef) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
        <NavBar />
        <p className="mt-16 text-center text-sm text-zinc-500">{t("chefs.no_chefs")}</p>
      </div>
    );
  }

  const channelLabel =
    chef.source_site === "youtube" ? t("chefs.watch_youtube") : t("chefs.visit_channel");

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:flex sm:items-center sm:gap-6">
          {chef.avatar_url && /^https?:\/\//i.test(chef.avatar_url) ? (
            <img src={chef.avatar_url} alt={chef.name} className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 text-4xl dark:bg-amber-900/40">
              👨‍🍳
            </span>
          )}
          <div className="mt-4 flex-1 sm:mt-0">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{chef.name}</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {recipes.length} {t("chefs.recipes")} · {followerCount} {t("chefs.followers")}
            </p>
            {chef.bio && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{chef.bio}</p>}
            {chef.channel_url && /^https?:\/\//i.test(chef.channel_url) && (
              <a
                href={chef.channel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
              >
                ▶ {channelLabel} ↗
              </a>
            )}
            {chef.linked_profile_id && (
              <Link
                href={`/user/${chef.linked_profile_id}`}
                className="mt-1 block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                View app profile →
              </Link>
            )}
          </div>
          <div className="mt-4 sm:mt-0">
            <ChefFollowButton
              chefId={chef.id}
              size="lg"
              onToggled={(now) => setFollowerCount((c) => c + (now ? 1 : -1))}
            />
          </div>
        </div>

        {/* Recipes */}
        {recipes.length === 0 ? (
          <p className="mt-10 text-center text-sm text-zinc-500">{t("chefs.no_recipes")}</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} showAuthor={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Recipe-page chef chip** — in `app/recipe/[id]/page.tsx`, after the author-profile fetch (~line 37) add:

```ts
  // Curated chef attribution (imported recipes)
  let chef: { id: string; name: string } | null = null;
  if (recipe.chef_id) {
    const { data: chefData } = await supabase
      .from("chefs")
      .select("id, name")
      .eq("id", recipe.chef_id)
      .maybeSingle();
    chef = chefData;
  }
```

Immediately ABOVE the source-attribution block (`{typedRecipe.source_url && ...}`, ~line 301) insert:

```tsx
        {chef && (
          <div className="mt-6">
            <Link
              href={`/chefs/${chef.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
            >
              👨‍🍳 By {chef.name} →
            </Link>
          </div>
        )}
```

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Smoke test** — dev server running: `node -e` fetch `http://localhost:3000/chefs` → 200; fetch `/chefs/<some-chef-uuid-from-task-2>` → 200; fetch a recipe page with an assigned chef → 200 containing the chef name.

- [ ] **Step 6: Commit** — `git add app/chefs lib/types.ts app/recipe && git commit -m "feat: chef directory, chef profile pages, recipe chef attribution"`

---

### Task 6: Recipe Exploration deck `/discover`

**Files:**
- Create: `app/discover/page.tsx`

**Interfaces:**
- Consumes: `recipes` with `profiles(displayname)` + `chefs(id, name)` joins, `recipe_saves`, i18n `discover.*` keys.
- Produces: public route `/discover` (nav Explore tab target).

- [ ] **Step 1: Create `app/discover/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";
import { StarRating } from "@/app/components/star-rating";
import type { Recipe } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";

type DeckRecipe = Recipe & {
  profiles?: { displayname: string | null } | null;
  chefs?: { id: string; name: string } | null;
};

export default function DiscoverPage() {
  const supabase = createClient();
  const { locale, t } = useLanguage();
  const [recipes, setRecipes] = useState<DeckRecipe[]>([]);
  const [mode, setMode] = useState<"latest" | "popular">("latest");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("recipes")
        .select("*, profiles(displayname), chefs(id, name)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(100);
      setRecipes((data as DeckRecipe[]) ?? []);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const { data: saves } = await supabase
            .from("recipe_saves")
            .select("recipe_id")
            .eq("user_id", user.id);
          setSavedIds(new Set((saves ?? []).map((s) => s.recipe_id)));
        }
      } catch {
        // Auth lock race — safe to ignore
      }
      setLoading(false);
    })();
  }, []);

  const deck = useMemo(() => {
    if (mode === "latest") return recipes;
    // Popular = what users are saving / rating / commenting on (no view tracking)
    return [...recipes].sort((a, b) => {
      const score = (r: DeckRecipe) =>
        (r.save_count ?? 0) * 3 + (r.rating_count ?? 0) * 2 + (r.comment_count ?? 0);
      return score(b) - score(a) || (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
    });
  }, [recipes, mode]);

  async function toggleSave(recipeId: string) {
    if (!userId) {
      window.location.href = "/login";
      return;
    }
    if (savedIds.has(recipeId)) {
      await supabase.from("recipe_saves").delete().eq("user_id", userId).eq("recipe_id", recipeId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    } else {
      await supabase.from("recipe_saves").insert({ user_id: userId, recipe_id: recipeId });
      setSavedIds((prev) => new Set(prev).add(recipeId));
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950">
      <NavBar />

      <div className="relative flex-1 overflow-hidden">
        {/* Latest / Popular toggle — floats over the deck */}
        <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 gap-1 rounded-full bg-black/50 p-1 backdrop-blur">
          {(["latest", "popular"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === m ? "bg-white text-zinc-900" : "text-white/80 hover:text-white"
              }`}
            >
              {m === "latest" ? t("discover.latest") : t("discover.popular")}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-20 text-center text-sm text-zinc-400">...</p>
        ) : deck.length === 0 ? (
          <p className="mt-20 text-center text-sm text-zinc-400">{t("discover.empty")}</p>
        ) : (
          <div className="h-full snap-y snap-mandatory overflow-y-auto">
            {deck.map((r, i) => {
              const title = locale === "zh" && r.title_zh ? r.title_zh : r.title;
              const byline = r.chefs?.name ?? r.profiles?.displayname ?? null;
              const saved = savedIds.has(r.id);
              return (
                <section key={r.id} className="relative h-full w-full snap-start overflow-hidden">
                  {/* Background photo */}
                  {r.hero_image_url ? (
                    <img
                      src={r.hero_image_url}
                      alt={title}
                      loading={i === 0 ? "eager" : "lazy"}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-900 to-zinc-900 text-8xl">
                      🍽
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />

                  {r.image_source === "ai_generated" && (
                    <span className="absolute right-3 top-16 z-10 rounded-full bg-indigo-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                      ✨ {t("recipe_card.ai_image")}
                    </span>
                  )}

                  {/* Info + actions */}
                  <div className="absolute inset-x-0 bottom-0 z-10 p-5 pb-8">
                    <h2 className="text-2xl font-bold text-white drop-shadow">{title}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {r.cuisine && (
                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">
                          {r.cuisine}
                        </span>
                      )}
                      <StarRating rating={r.avg_rating} count={r.rating_count} size="sm" />
                    </div>
                    {byline && (
                      <p className="mt-1.5 text-sm text-white/80">
                        {t("recipe.by_chef")}{" "}
                        {r.chefs ? (
                          <Link href={`/chefs/${r.chefs.id}`} className="font-medium underline">
                            {byline}
                          </Link>
                        ) : (
                          <span className="font-medium">{byline}</span>
                        )}
                      </p>
                    )}
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => toggleSave(r.id)}
                        className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                          saved
                            ? "bg-rose-600 text-white"
                            : "bg-white/20 text-white backdrop-blur hover:bg-white/30"
                        }`}
                      >
                        {saved ? t("discover.saved") : t("discover.save")}
                      </button>
                      <Link
                        href={`/recipe/${r.id}`}
                        className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                      >
                        {t("discover.open")}
                      </Link>
                    </div>
                    {i === 0 && deck.length > 1 && (
                      <p className="mt-4 animate-bounce text-center text-xs text-white/60">
                        ↑ {t("discover.swipe_hint")}
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Smoke test** — `node -e` fetch `http://localhost:3000/discover` → 200.

- [ ] **Step 4: Commit** — `git add app/discover && git commit -m "feat: recipe exploration swipe deck at /discover"`

---

### Task 7: Admin chef management `/admin/chefs`

**Files:**
- Create: `app/admin/chefs/page.tsx`
- Modify: `app/admin/users/page.tsx` (header links row: add "👨‍🍳 Chefs" link next to the existing "⚑ Content Reports" link)

**Interfaces:**
- Consumes: `chefs` RLS admin policies (direct table writes), `admin_set_recipe_chef(p_recipe_id, p_chef_id)` RPC, `POST /api/upload-image` (`{ image: base64NoPrefix, mimeType, fileName? } → { url }`).
- Produces: admin route `/admin/chefs` (create/edit/delete chefs, avatar upload, recipe assignment).

- [ ] **Step 1: Create `app/admin/chefs/page.tsx`** (admin gate mirrors `app/admin/reports/page.tsx`; English-only like other admin pages):

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";
import type { Chef, ChefSourceSite } from "@/lib/types";

type RecipeRow = { id: string; title: string; source_url: string | null; chef_id: string | null };

const SOURCE_SITES: ChefSourceSite[] = ["youtube", "xiaohongshu", "website", "other"];

export default function AdminChefsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [editing, setEditing] = useState<Chef | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", channel_url: "", source_site: "youtube" as ChefSourceSite });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    const [{ data: chefData }, { data: recipeData }] = await Promise.all([
      supabase.from("chefs").select("*").order("name"),
      supabase
        .from("recipes")
        .select("id, title, source_url, chef_id")
        .not("source_url", "is", null)
        .order("created_at", { ascending: false }),
    ]);
    setChefs((chefData as Chef[]) ?? []);
    setRecipes((recipeData as RecipeRow[]) ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!profile?.is_admin) { router.push("/dashboard"); return; }
      setAuthorized(true);
      await loadData();
    })();
  }, []);

  function startEdit(chef: Chef) {
    setEditing(chef);
    setCreating(false);
    setForm({
      name: chef.name,
      bio: chef.bio ?? "",
      channel_url: chef.channel_url ?? "",
      source_site: chef.source_site,
    });
    setError("");
  }

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setForm({ name: "", bio: "", channel_url: "", source_site: "youtube" });
    setError("");
  }

  async function saveChef() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.channel_url && !/^https?:\/\//i.test(form.channel_url)) {
      setError("Channel link must start with http:// or https://");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      bio: form.bio.trim() || null,
      channel_url: form.channel_url.trim() || null,
      source_site: form.source_site,
    };
    const { error: dbError } = editing
      ? await supabase.from("chefs").update(payload).eq("id", editing.id)
      : await supabase.from("chefs").insert(payload);
    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    setEditing(null);
    setCreating(false);
    await loadData();
  }

  async function deleteChef(chef: Chef) {
    if (!confirm(`Delete chef "${chef.name}"? Their recipes stay but lose the chef link.`)) return;
    await supabase.from("chefs").delete().eq("id", chef.id);
    await loadData();
  }

  async function uploadAvatar(chef: Chef, file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type, fileName: file.name }),
      });
      const json = await res.json();
      if (res.ok && json.url) {
        await supabase.from("chefs").update({ avatar_url: json.url }).eq("id", chef.id);
        await loadData();
      } else {
        alert(json.error ?? "Upload failed");
      }
    };
    reader.readAsDataURL(file);
  }

  async function assignRecipe(recipeId: string, chefId: string) {
    await supabase.rpc("admin_set_recipe_chef", {
      p_recipe_id: recipeId,
      p_chef_id: chefId || null,
    });
    setRecipes((prev) => prev.map((r) => (r.id === recipeId ? { ...r, chef_id: chefId || null } : r)));
  }

  if (!authorized) return null;

  const unassigned = recipes.filter((r) => !r.chef_id);
  const assigned = recipes.filter((r) => r.chef_id);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">👨‍🍳 Chefs</h1>
            <p className="mt-1 text-sm text-zinc-500">Curated creator profiles shown in the Chefs tab</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/users" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
              ← Users
            </Link>
            <button
              onClick={startCreate}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + New Chef
            </button>
          </div>
        </div>

        {(creating || editing) && (
          <div className="mt-6 rounded-xl border border-indigo-200 bg-white p-4 dark:border-indigo-900 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {editing ? `Edit: ${editing.name}` : "New Chef"}
            </h2>
            <div className="mt-3 grid gap-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Chef / channel name"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <input
                value={form.channel_url}
                onChange={(e) => setForm({ ...form, channel_url: e.target.value })}
                placeholder="Channel link (https://...)"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <select
                value={form.source_site}
                onChange={(e) => setForm({ ...form, source_site: e.target.value as ChefSourceSite })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {SOURCE_SITES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Short bio (shown on their profile)"
                rows={3}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={saveChef}
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => { setEditing(null); setCreating(false); }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chef list */}
        <div className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {chefs.map((chef) => (
            <div key={chef.id} className="flex flex-wrap items-center gap-3 p-4">
              {chef.avatar_url && /^https?:\/\//i.test(chef.avatar_url) ? (
                <img src={chef.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">👨‍🍳</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{chef.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {chef.source_site} · {recipes.filter((r) => r.chef_id === chef.id).length} recipes
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => { avatarInputRef.current?.setAttribute("data-chef", chef.id); avatarInputRef.current?.click(); }}
                  className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700"
                >
                  📷 Photo
                </button>
                <button onClick={() => startEdit(chef)} className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700">
                  Edit
                </button>
                <button onClick={() => deleteChef(chef)} className="rounded-md border border-red-300 px-2 py-1 text-red-600 dark:border-red-900">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {chefs.length === 0 && <p className="p-4 text-sm text-zinc-500">No chefs yet.</p>}
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            const chefId = avatarInputRef.current?.getAttribute("data-chef");
            const chef = chefs.find((c) => c.id === chefId);
            if (file && chef) uploadAvatar(chef, file);
            e.target.value = "";
          }}
        />

        {/* Recipe assignment */}
        <h2 className="mt-10 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Recipe assignments
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Imported recipes without a chef ({unassigned.length}) — pick who created them.
        </p>
        {[...unassigned, ...assigned].map((r) => (
          <div
            key={r.id}
            className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-900 dark:text-zinc-100">{r.title}</p>
              <p className="truncate text-xs text-zinc-500">{r.source_url}</p>
            </div>
            <select
              value={r.chef_id ?? ""}
              onChange={(e) => assignRecipe(r.id, e.target.value)}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">— no chef —</option>
              {chefs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Link from admin users page** — in `app/admin/users/page.tsx`, next to the existing "⚑ Content Reports" header link add:

```tsx
            <Link
              href="/admin/chefs"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              👨‍🍳 Chefs
            </Link>
```

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 4: Commit** — `git add app/admin && git commit -m "feat: admin chef management — create/edit chefs, avatars, recipe assignment"`

---

### Task 8: Full verification

- [ ] **Step 1:** `npx tsc --noEmit` → exit 0.
- [ ] **Step 2:** Stop the background dev server task, run `npm run build` → must pass, then restart `npm run dev` in the background.
- [ ] **Step 3:** Smoke: `node -e` fetch 200s for `/discover`, `/chefs`, one `/chefs/[id]`, `/market`, one `/recipe/[id]`; `/admin/chefs` → 200 or 307 (redirect for anonymous is fine).
- [ ] **Step 4:** MCP `get_advisors` (security) — no NEW findings.
- [ ] **Step 5:** Report to Nathan in plain English what to test at localhost:3000; **do not push**.
