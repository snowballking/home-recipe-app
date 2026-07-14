# Social Layer + Content Licensing (Weeks 1–2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the weeks 1–2 ROADMAP scope: upgraded chef/user profiles, comment engagement polish, IP-risk reduction (private-by-default imports, publish gating, report/takedown), and AI placeholder images behind a swappable abstraction.

**Architecture:** One additive SQL migration (025) adds profile social columns, recipe image provenance, and a `content_reports` table. Publish gating is a pure helper (`canPublishRecipe`) used by both recipe forms. AI image generation lives in `lib/images/generate-placeholder.ts` (swappable provider) and is exposed as a **PUT method on the existing `/api/upload-image` route** (per the Vercel new-route-file env-var gotcha). All UI work extends existing pages.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (RLS + Storage), Gemini `gemini-2.5-flash-image` REST API, Tailwind 4.

## Global Constraints

- Next.js 16: route `params` are `Promise<{...}>` and must be awaited; `"use client"` components as in existing code. (AGENTS.md: consult `node_modules/next/dist/docs/` if unsure.)
- **Never create new API route files** — new files sometimes fail to read env vars on Vercel. Add methods to existing route files (SESSION_SUMMARY gotcha #1).
- PostgREST joins need FK relationships; fetch profiles separately where no FK exists (gotcha #2).
- No test infrastructure exists in this repo; per CLAUDE.md the verification bar is `npx tsc --noEmit` clean + `npm run build` passing before push. Each task ends with a typecheck.
- Owner is non-technical: plain-English summary at the end; migration applied to Supabase before pushing code that depends on it.
- i18n: add `t()` keys (EN + zh) only for components that already use `useLanguage` (recipe-card). Pages that are hardcoded English (forms, profiles, comments) stay English — matches existing convention.
- Migration numbering: ROADMAP reserved "025" for recipe forking (weeks 7–8); this migration takes 025, so forking becomes 026. Flag in final summary.

---

### Task 1: Migration 025 + TypeScript types

**Files:**
- Create: `supabase/migrations/025_social_layer_content_licensing.sql`
- Modify: `lib/types.ts`

**Interfaces produced:**
- `profiles.specialties text[]`, `profiles.external_links jsonb`, `profiles.dietary_preferences text[]`, `profiles.is_chef boolean`
- `recipes.image_source text` ∈ `('user_upload','ai_generated','imported')`, nullable
- `public.content_reports` table; `admin_list_users()` now returns `is_chef`
- TS: `Profile.specialties: string[]`, `Profile.external_links: ExternalLinks`, `Profile.dietary_preferences: string[]`, `Profile.is_chef: boolean`; `Recipe.image_source: ImageSource | null`; `ImageSource`, `ExternalLinks`, `ContentReport`, `REPORT_REASONS`

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================
-- 025: Social layer + content licensing (weeks 1-2)
-- ============================================================

-- 1. Profile upgrades (chef + user profiles)
alter table public.profiles
  add column if not exists specialties text[] default '{}',
  add column if not exists external_links jsonb default '{}'::jsonb,
  add column if not exists dietary_preferences text[] default '{}',
  add column if not exists is_chef boolean default false;

-- 2. Recipe image provenance (IP risk reduction)
alter table public.recipes
  add column if not exists image_source text
    check (image_source in ('user_upload', 'ai_generated', 'imported'));

-- Backfill: existing photos on recipes without a source URL were uploaded
-- by the author; photos on imported recipes came from the source site.
update public.recipes
set image_source = case when source_url is null then 'user_upload' else 'imported' end
where hero_image_url is not null and image_source is null;

-- 3. Content reports (takedown requests)
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null check (reason in ('copyright', 'inappropriate', 'spam', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz default now()
);

create index if not exists idx_content_reports_status on public.content_reports(status);

alter table public.content_reports enable row level security;

create policy "Users can report content" on public.content_reports
  for insert with check (auth.uid() = reporter_id);

create policy "Admins can view reports" on public.content_reports
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "Admins can update reports" on public.content_reports
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- 4. admin_list_users now returns is_chef (return type changes -> drop first)
drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  displayname text,
  is_approved boolean,
  is_admin boolean,
  is_chef boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true) then
    return;
  end if;

  return query
  select p.id, u.email::text, p.displayname, p.is_approved, p.is_admin, p.is_chef, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.is_approved asc, p.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;
```

- [ ] **Step 2: Update `lib/types.ts`**

Add above `Profile`:

```ts
export type ImageSource = "user_upload" | "ai_generated" | "imported";

export interface ExternalLinks {
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}
```

Extend `Profile` (after `household_members`):

```ts
  specialties: string[];
  external_links: ExternalLinks;
  dietary_preferences: string[];
  is_chef: boolean;
```

Extend `Recipe` (after `hero_image_url`):

```ts
  image_source: ImageSource | null;
```

Add near legacy types:

```ts
export interface ContentReport {
  id: string;
  recipe_id: string;
  reporter_id: string | null;
  reason: "copyright" | "inappropriate" | "spam" | "other";
  details: string | null;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  recipes?: Recipe;
}

export const REPORT_REASONS = [
  { value: "copyright", label: "Copyright / this is my content" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "spam", label: "Spam or misleading" },
  { value: "other", label: "Other" },
] as const;
```

- [ ] **Step 3: Apply migration to Supabase** (MCP `apply_migration`; verify columns via `list_tables`)
- [ ] **Step 4: `npx tsc --noEmit` → clean**
- [ ] **Step 5: Commit** `feat: migration 025 - social profile columns, image provenance, content reports`

---

### Task 2: Publish-policy helper + AI placeholder image generation

**Files:**
- Create: `lib/recipes/publish-policy.ts`
- Create: `lib/images/generate-placeholder.ts`
- Modify: `app/api/upload-image/route.ts` (add `PUT` handler)

**Interfaces produced:**
- `canPublishRecipe({ imageSource, isChef }): { allowed: boolean; reason?: "needs_own_photo" }`
- `generatePlaceholderImage(input: PlaceholderImageInput, apiKey: string): Promise<{ imageBase64: string; mimeType: string }>`
- `PUT /api/upload-image` body `{ title, description?, cuisine?, ingredients? }` → `{ url }` (uploads generated PNG to `recipe-images` storage)

- [ ] **Step 1: `lib/recipes/publish-policy.ts`**

```ts
// IP-risk policy (ROADMAP weeks 1-2): publishing a recipe to the public
// Market requires the author's own photo, an AI placeholder image, or a
// licensed chef account. Scraped/imported photos may not be published.
import type { ImageSource } from "@/lib/types";

export function canPublishRecipe(opts: {
  imageSource: ImageSource | null;
  isChef: boolean;
}): { allowed: boolean; reason?: "needs_own_photo" } {
  if (opts.isChef) return { allowed: true };
  if (opts.imageSource === "user_upload" || opts.imageSource === "ai_generated") {
    return { allowed: true };
  }
  return { allowed: false, reason: "needs_own_photo" };
}
```

- [ ] **Step 2: `lib/images/generate-placeholder.ts`** — swappable provider behind one function. Gemini image REST call (`gemini-2.5-flash-image`), prompt built from title/cuisine/description/ingredients, returns first `inlineData` part. 60s timeout. Alternative providers (e.g. Seedream 4.0) slot in behind the same signature.

```ts
// AI placeholder image generation (swappable provider).
// Current provider: Gemini image model. If Chinese-dish realism
// underwhelms, swap the implementation (e.g. Seedream 4.0) — keep the
// same function signature (ROADMAP iter. 6).

export interface PlaceholderImageInput {
  title: string;
  description?: string | null;
  cuisine?: string | null;
  ingredients?: { name: string }[];
}

const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

export async function generatePlaceholderImage(
  input: PlaceholderImageInput,
  geminiApiKey: string
): Promise<{ imageBase64: string; mimeType: string }> {
  const ingredientList = (input.ingredients ?? [])
    .slice(0, 10)
    .map((i) => i.name)
    .filter(Boolean)
    .join(", ");

  const prompt = [
    `Photorealistic food photography of "${input.title}"`,
    input.cuisine ? `(${input.cuisine} cuisine)` : "",
    input.description ? `— ${input.description}` : "",
    ingredientList ? `Key ingredients: ${ingredientList}.` : "",
    "Overhead or 45-degree angle, natural soft lighting, served in appropriate",
    "tableware on a clean surface. No text, no watermarks, no people, no hands.",
  ].filter(Boolean).join(" ");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(60_000),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Gemini image API error:", res.status, errBody);
    throw new Error(`Image generation returned HTTP ${res.status}`);
  }

  const data = await res.json();
  const parts: { inlineData?: { mimeType: string; data: string } }[] =
    data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData) {
    throw new Error("Image generation returned no image data.");
  }
  return {
    imageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
  };
}
```

- [ ] **Step 3: `PUT` handler in `app/api/upload-image/route.ts`** — auth via session, require `title`, call `generatePlaceholderImage` with `process.env.GEMINI_API_KEY`, upload buffer to `recipe-images` as `${user.id}/ai-${Date.now()}-<rand>.png`, return `{ url }`. Same error shape as POST.
- [ ] **Step 4: `npx tsc --noEmit` → clean**
- [ ] **Step 5: Commit** `feat: publish policy + AI placeholder image generation (PUT /api/upload-image)`

---

### Task 3: Recipe forms — private-by-default imports, image provenance, publish gating

**Files:**
- Modify: `app/dashboard/recipes/new/page.tsx`
- Modify: `app/dashboard/recipes/[id]/edit/page.tsx`

**Interfaces consumed:** `canPublishRecipe`, `PUT /api/upload-image`, `ImageSource`.

Both forms get identical logic:

- [ ] **Step 1 (new page):**
  - Add state: `imageSource: ImageSource | null` (new: `null`; also `isChef` fetched once from viewer profile).
  - `handleImageUpload` success → `setImageSource("user_upload")`.
  - Manual image-URL paste → `setImageSource("imported")` (unknown provenance = treat as imported). Remove photo → `null`.
  - `populateForm` (import): `r.hero_image_url` → `setImageSource("imported")`; `handleImport` success → `setIsPublic(false)` and success message notes the recipe starts private (copyright protection).
  - New `handleGenerateAiImage()`: `PUT /api/upload-image` with `{title, description, cuisine, ingredients}` → `setHeroImageUrl(url)`, `setImageSource("ai_generated")`; spinner state `generatingImage`.
  - Visibility section: when `isPublic && !canPublishRecipe(...).allowed`, render an amber panel: explanation ("To protect creators' copyright, public recipes need your own photo or an AI-generated image — imported photos can't be published.") + two buttons: "📷 Upload my photo" (opens file input) and "✨ Generate AI image (~free, takes ~10s)". Submit is blocked with an error while non-compliant.
  - `handleSubmit`: block if `isPublic && !allowed`; include `image_source: heroImageUrl ? imageSource : null` in insert.
- [ ] **Step 2 (edit page):** same states/handlers; initialize `imageSource` from `data.image_source` (fallback: infer `source_url ? "imported" : "user_upload"` when image exists but column null); include `image_source` in update payload.
- [ ] **Step 3: `npx tsc --noEmit` → clean**
- [ ] **Step 4: Commit** `feat: imported recipes private by default + publish gating + AI image generation in forms`

---

### Task 4: Recipe display — AI badge, report button, attribution/care badges

**Files:**
- Create: `app/components/report-recipe-button.tsx`
- Modify: `app/recipe/[id]/page.tsx`
- Modify: `app/components/recipe-card.tsx`
- Modify: `lib/i18n/translations.ts` (key `recipe_card.ai_image`)

**Interfaces consumed:** `content_reports` insert RLS, `REPORT_REASONS`, `Recipe.image_source`.

- [ ] **Step 1: `ReportRecipeButton`** (client): small "⚑ Report" text button → inline card with reason `<select>` (from `REPORT_REASONS`), optional details textarea, submit inserts `{recipe_id, reporter_id, reason, details}`; signed-out users get a login link; success state thanks the reporter ("Thanks — our team will review this within 48 hours.").
- [ ] **Step 2: Recipe page:**
  - Hero: if `image_source === "ai_generated"` show badge `✨ AI-generated image` (zinc/indigo pill, bottom-left of hero).
  - Owner + AI image: small banner under hero "Cooked it? Replace the AI image with your own photo →" linking to the edit page.
  - Comments anchor: wrap CommentSection block in `id="comments"`; add `💬 {comment_count}` link in the Rating & Save row (`href="#comments"`).
  - Footer (after source attribution): `<ReportRecipeButton recipeId={...} />` with a one-line note: "Believe this recipe infringes your rights? Report it and we'll take it down while we review."
- [ ] **Step 3: recipe-card:** badge stack gains `✨ {t("recipe_card.ai_image")}` when `recipe.image_source === "ai_generated"`. Add translations key `"recipe_card.ai_image": { en: "AI image", zh: "AI 图片" }`.
- [ ] **Step 4: `npx tsc --noEmit` → clean**
- [ ] **Step 5: Commit** `feat: AI image badges, report-content flow, comments anchor on recipe page`

---

### Task 5: Profile upgrades (edit + public page + author card)

**Files:**
- Modify: `app/dashboard/profile/page.tsx` (avatar upload, specialties picker from `CUISINES`, dietary preferences picker from `DIETARY_TAGS`, external links inputs: instagram/youtube/tiktok/website)
- Modify: `app/user/[id]/page.tsx` (chef badge, specialties chips, external link buttons, dietary preferences chips, "Shared Meal Plans" section (public plans by user), "Saved Recipes" section (owner only), follow button prominence)
- Modify: `app/recipe/[id]/page.tsx` (author card: 👨‍🍳 Chef badge + first 3 specialties)

**Interfaces consumed:** `Profile.specialties/external_links/dietary_preferences/is_chef`, `POST /api/upload-image`.

- [ ] **Step 1: Edit profile page** — avatar circle preview + "Change photo" (base64 → POST /api/upload-image → save `avatar_url` in upsert); specialties as toggle chips (CUISINES); dietary preferences as toggle chips (DIETARY_TAGS); external links as 4 labelled URL inputs stored as `external_links` jsonb (trimmed; empty keys dropped; must start with `http`).
- [ ] **Step 2: Public profile page** —
  - Chef badge next to name when `is_chef`: `👨‍🍳 Chef` (amber pill).
  - Specialties chips under bio; dietary preference chips (emerald) below.
  - External links row: buttons "📷 Instagram / ▶ YouTube / 🎵 TikTok / 🌐 Website" (`target="_blank" rel="noopener noreferrer"`).
  - Follow button: larger (`px-6 py-2`) — pass a `size` prop or wrap; keep FollowButton API (add optional `size?: "md" | "lg"` prop defaulting `"md"`).
  - New section "Shared Meal Plans": `meal_plans` where `user_id = id and is_public = true`, card list linking `/plan/{id}` (title, date range, 💬 count).
  - Owner-only section "Saved Recipes": `recipe_saves.select("*, recipes(*)")` (FK exists) → RecipeCard grid. Private to owner via RLS; label says "Only you can see this."
- [ ] **Step 3: Recipe page author card** — fetch already includes profile; add chef badge + specialties line ("Specialties: Chinese · Thai").
- [ ] **Step 4: `npx tsc --noEmit` → clean**
- [ ] **Step 5: Commit** `feat: chef/user profile upgrades — avatar, specialties, links, showcases`

---

### Task 6: Comments polish — photos + engagement prompts

**Files:**
- Modify: `app/components/comment-section.tsx`

**Interfaces consumed:** `comments.photo_url` column (exists since migration 001), `POST /api/upload-image`.

- [ ] **Step 1:** Comment form gains "📷 Add photo" button → upload via `/api/upload-image` → thumbnail preview with remove ✕; insert includes `photo_url`. `CommentItem` renders `photo_url` as a rounded image (max-h-64, object-cover, click opens in new tab).
- [ ] **Step 2:** Engagement prompt above the form: "Cooked this? Share a photo of how it turned out 📸" (small indigo-tinted banner, shown to signed-in users). Empty state copy becomes "No comments yet — cooked it? Be the first to share a photo or tip!"
- [ ] **Step 3: `npx tsc --noEmit` → clean**
- [ ] **Step 4: Commit** `feat: comment photos + engagement prompts`

---

### Task 7: Admin — licensed-chef toggle + reports queue

**Files:**
- Modify: `app/admin/users/page.tsx` (`is_chef` in `AdminUserRow`; CHEF badge; "Make Chef"/"Remove Chef" button on approved non-admin rows updating `profiles.is_chef`; header link to /admin/reports)
- Create: `app/admin/reports/page.tsx` (client page mirroring users page: admin check, `content_reports.select("*, recipes(id, title, user_id, is_public)")` (FK exists) ordered open-first; each row: reason, details, recipe link, date; actions: "Unpublish recipe" (`recipes.update({is_public:false})` — admin RLS caveat: admins may not have update rights on others' recipes; if the update fails, surface the error and fall back to instructing manual action) → mark resolved/dismissed via `content_reports.update({status})`)

**RLS check note:** recipes UPDATE policy is owner-only, so "Unpublish" by admin will fail under RLS → instead ship migration-025 add-on policy? NO — keep migration frozen; instead the reports page only sets report status, and shows the recipe link so the admin can contact the owner. Simpler and honest. (Unpublish button omitted.)

- [ ] **Step 1:** users page changes
- [ ] **Step 2:** reports page (status buttons: Resolve / Dismiss / Reopen)
- [ ] **Step 3: `npx tsc --noEmit` → clean**
- [ ] **Step 4: Commit** `feat: admin chef toggle + content reports queue`

---

### Task 8: Verification + ship

- [ ] **Step 1:** `npx tsc --noEmit` → clean
- [ ] **Step 2:** `npm run build` → passes
- [ ] **Step 3:** Manual smoke via dev server (`npm run dev`): recipe page renders, profile page renders (use /verify approach if a project verify skill exists)
- [ ] **Step 4:** Supabase advisors check (`get_advisors`) for new table/policies
- [ ] **Step 5:** Final commit + push to main (auto-deploys). Include plain-English summary for Nathan + note: forking migration becomes 026; existing public imported recipes were grandfathered (not auto-unpublished) — listed for manual review.

## Self-Review

- **Spec coverage:** chef profile upgrade (Task 5), user profile upgrade incl. dietary targets/saved/shared showcases (Task 5), comments polish (Tasks 4+6), private-by-default imports (Task 3), publish gating incl. licensed chef bypass (Tasks 1–3), prominent attribution (already exists; badges extended Task 4), report/takedown (Tasks 1, 4, 7), AI placeholder behind swappable abstraction with badge + auto-replace prompt + generate-on-publish-only (Tasks 2–4). Name/domain + HPB research are non-code (Nathan). ✓
- **Placeholders:** none — code included or precise anchored directives. ✓
- **Type consistency:** `canPublishRecipe`, `generatePlaceholderImage`, `ImageSource`, `ExternalLinks` used consistently. ✓
