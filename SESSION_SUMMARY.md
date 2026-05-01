# HomeRecipe App — Development Session Summary

**Date:** April–May 2026
**Developer:** Nathan (non-technical founder, solo bootstrap)
**Stack:** Next.js 16.2.2 + React 19 + Supabase + TypeScript + Tailwind CSS
**Repo:** github.com/snowballking/home-recipe-app
**Deployed:** Vercel (auto-deploys from `main` branch)

---

## Project Overview

HomeRecipe is a family-oriented recipe management web app. Core features: recipe inventory with bilingual support (English/Chinese), calorie/nutrition tracking, meal planning with approval workflow, and automatic grocery list generation with AI consolidation.

---

## Architecture & Key Patterns

### Supabase + RLS

The app uses Supabase with Row Level Security (RLS). Key pattern for cross-user data access (e.g., an approver viewing another user's meal plan):

- **Server API routes** at `/api/approval-plans/` use the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- The service role client is built inline in the same file as the working GET route — **do not create separate route files** for different HTTP methods as new files sometimes fail to read env vars on Vercel
- All approver operations (GET, POST, DELETE, PATCH) are consolidated into `/api/approval-plans/[id]/route.ts`

### Client vs Server Supabase

- `lib/supabase/client.ts` — Browser client using `createBrowserClient` from `@supabase/ssr` with anon key
- `lib/supabase/server.ts` — Server client using `createServerClient` from `@supabase/ssr` with cookies
- `lib/supabase/admin.ts` — Service role client helper (exists but API routes create clients inline)
- API routes authenticate via session cookie first, then build service-role client for privileged queries

### Next.js 16 Notes

- App Router with `"use client"` components
- Route params are `Promise<{ id: string }>` — must `await params`
- `middleware.ts` enforces `is_approved` for protected paths; `/api/*` is NOT in the matcher
- Env vars without `NEXT_PUBLIC_` prefix are server-side only

### i18n

- Bilingual: English + Simplified Chinese
- `lib/i18n/language-context.tsx` provides `useLanguage()` hook with `locale` and `t()` function
- Recipes store `title_zh`, `description_zh`, `ingredients_zh`, `steps_zh` fields (populated by AI during import)

---

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=<supabase project url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<supabase service role key>
GEMINI_API_KEY=<google gemini api key>
```

---

## Features Implemented This Session

### 1. Meal Plan Approval Workflow

**Problem:** Nathan wanted a workflow where an admin creates a meal plan and sends it to a non-admin user (e.g., family member) for approval.

**Solution:**
- `meal_plans` table has `approver_id` (FK to profiles) and `approval_status` (pending_approval / approved / changes_requested)
- Owner assigns an approver via searchable picker in the plan detail page
- Owner clicks "Send for Approval" → status becomes `pending_approval`
- Approver sees the plan in their "My Meal Plans" page under "Meal Plans for Approval" section
- Approver can: approve, request changes, add day-level comments, edit dishes, add remarks

**Key files:**
- `app/dashboard/plans/page.tsx` — My Plans page, fetches approval plans via `/api/approval-plans`
- `app/dashboard/plans/[id]/page.tsx` — Plan detail page with full editing + approval UI
- `app/api/approval-plans/route.ts` — Lists all plans where user is approver (service role)
- `app/api/approval-plans/[id]/route.ts` — GET/POST/DELETE/PATCH for single plan operations (service role)

**Hard-won lessons:**
- Non-admin approvers can't see plans via direct Supabase query (RLS blocks cross-user reads) — must use server API route with service role key
- Multiple SELECT RLS policies are OR'd, but approver policies alone weren't enough — service role is the reliable path
- New API route files sometimes don't read env vars on Vercel — consolidate all HTTP methods into ONE route file
- PostgREST joins require FK relationships (`select("*, profiles(displayname)")` fails without FK)

### 2. Approver Can Edit Meal Plans

**What:** Approvers can directly add/swap/remove dishes and add per-meal remarks, same as the plan owner.

**How:**
- Frontend detects `isApprover` flag and routes slot operations through API instead of direct Supabase
- `POST /api/approval-plans/[id]` — add slot (service role, verifies approver)
- `DELETE /api/approval-plans/[id]` — remove slot (service role, verifies approver)
- `PATCH /api/approval-plans/[id]` — update meal_remarks, notes, approval_status (service role)
- Fallback: if user is both owner AND approver, uses direct Supabase client

### 3. Day Comments (Approver Feedback)

**What:** Approver can leave comments on specific days of a meal plan.

**Table:** `meal_plan_day_comments` (meal_plan_id, plan_date, user_id, comment)

**Issue fixed:** PostgREST join `select("*, profiles(displayname)")` returned 400 because `user_id` FK pointed to `auth.users`, not `profiles`. Fixed by:
- Migration 023: Added FK from `meal_plan_day_comments.user_id` to `profiles.id`
- Created SECURITY DEFINER functions: `insert_day_comment()`, `get_day_comments()`, `delete_day_comment()`
- Frontend tries RPC first, falls back to direct query + separate profile fetch

### 4. Overall Plan Notes

**What:** Both owner and approver can add overall remarks/notes on the whole meal plan.

**How:** Uses existing `notes` TEXT column on `meal_plans`. UI section appears above action buttons. Approver updates via PATCH API route.

### 5. Public Meal Plan — Remarks Visible

**What:** When a meal plan is shared/public, all users can see per-meal remarks and overall notes.

**File:** `app/plan/[id]/page.tsx` (server component)
- Overall notes shown in amber-tinted box below description
- Per-meal remarks shown as "Note: ..." tags under dishes in both desktop table and mobile card views
- Data already available from `plan.meal_remarks` and `plan.notes`

### 6. Recipe Links in Published Plans

**Fix:** Recipe clicks in published meal plans were 404'ing because they linked to `/dashboard/recipes/{id}` (auth-required). Changed to `/recipe/{id}` (public route) in `app/plan/[id]/dish-chip.tsx`.

### 7. Copy Grocery List to Clipboard

**What:** Button to copy grocery items as formatted plain text for pasting into iPhone Notes or other apps.

**How:** Added `copyToClipboard()` function in `app/dashboard/plans/[id]/grocery/page.tsx`. Formats items grouped by category with emoji headers (🥬 Produce, 🥩 Meat, etc.) and checkbox emojis (⬜/✅). Uses `navigator.clipboard.writeText()` with fallback for older browsers.

### 8. AI Grocery List Consolidation (Gemini)

**Problem:** Grocery lists had duplicate items (e.g., garlic repeated 4 times with different units: cloves, tsp, pieces).

**Solution:** Server-side API route `/api/grocery-ai` sends all raw ingredients to Gemini 2.5 Flash Lite, which:
- Merges all duplicates intelligently
- Normalizes units to practical shopping units
- Categorizes items (produce, dairy, meat, etc.)
- Rounds quantities to practical amounts

**Key file:** `app/api/grocery-ai/route.ts`
- Model: `gemini-2.5-flash-lite` (same as YouTube recipe extraction)
- Falls back to local JS consolidation if Gemini API fails
- Button shows "✨ Regenerate with AI" with spinner during processing

---

## SQL Migrations

All migrations are in `supabase/migrations/`. Run them in Supabase Dashboard → SQL Editor.

| Migration | Purpose |
|-----------|---------|
| 019 | `get_approval_plans()` SECURITY DEFINER function |
| 020 | Comprehensive: approval columns, RLS policies, RPC function, day comments table |
| 021 | Parameterized `get_plans_for_approver(uuid)`, fixed search_path |
| 022 | `get_slots_for_plan(uuid, uuid)` for approver slot access |
| 023 | FK from day_comments.user_id to profiles.id + comment RPC functions |
| 024 | RLS policies for approver to insert/delete slots and update plan fields |

**Consolidated script:** `RUN_THIS_IN_SUPABASE.sql` contains all essential SQL.

---

## File Map (Key Files)

```
app/
├── api/
│   ├── approval-plans/
│   │   ├── route.ts              # GET: list plans for approver
│   │   └── [id]/
│   │       └── route.ts          # GET/POST/DELETE/PATCH: all approver operations
│   ├── grocery-ai/
│   │   └── route.ts              # POST: Gemini AI grocery consolidation
│   ├── estimate-nutrition/
│   │   └── route.ts              # POST: Gemini AI nutrition estimation
│   └── debug-approval/
│       └── route.ts              # GET: diagnostic endpoint (can be removed)
├── dashboard/
│   ├── plans/
│   │   ├── page.tsx              # My Plans + Approval Plans listing
│   │   ├── new/page.tsx          # Create new meal plan (with approver picker)
│   │   └── [id]/
│   │       ├── page.tsx          # Plan detail: edit dishes, remarks, approval
│   │       └── grocery/page.tsx  # Grocery list: AI consolidation, copy, print
│   └── recipes/                  # Recipe CRUD pages
├── plan/
│   └── [id]/
│       ├── page.tsx              # Public meal plan view (server component)
│       ├── dish-chip.tsx         # Recipe chip (links to /recipe/[id])
│       └── meal-label.tsx        # Meal type label (client, for i18n)
├── recipe/[id]/page.tsx          # Public recipe view
└── components/
    ├── nav-bar.tsx               # Navigation
    └── meal-plan-comments.tsx    # Comment section component

lib/
├── types.ts                      # All TypeScript interfaces
├── supabase/
│   ├── client.ts                 # Browser Supabase client
│   ├── server.ts                 # Server Supabase client
│   └── admin.ts                  # Service role client helper
├── i18n/
│   ├── language-context.tsx      # i18n context provider
│   └── translations.ts          # Translation strings
└── extract/
    └── ai-extract.ts             # YouTube recipe extraction (Gemini)

supabase/
└── migrations/                   # SQL migration files (019-024)
```

---

## Known Issues & Gotchas

1. **Service role key in new files:** Newly created API route files on Vercel sometimes don't read `process.env.SUPABASE_SERVICE_ROLE_KEY`. Workaround: consolidate all methods into one existing, working route file.

2. **PostgREST FK joins:** `select("*, table(column)")` requires a foreign key relationship. Without it, you get 400 Bad Request. Workaround: fetch related data separately or use RPC functions.

3. **RPC 400 errors:** If SQL migrations haven't been run, RPC calls to non-existent functions return 400. The code has fallback logic for all RPC calls.

4. **Regenerate grocery list creates duplicate list rows:** `regenerateList()` deletes items but `generateGroceryList()` creates a new `grocery_lists` row. Minor issue, doesn't affect functionality.

5. **Day comments table:** `meal_plan_day_comments.user_id` has TWO foreign keys — one to `auth.users(id)` (original) and one to `profiles(id)` (added in migration 023). Both are needed.

---

## Deployment

- **Hosting:** Vercel (auto-deploy from GitHub `main` branch)
- **Database:** Supabase (hosted PostgreSQL with RLS)
- **AI:** Google Gemini 2.5 Flash Lite (recipe extraction, nutrition estimation, grocery consolidation)
- **Push to prod:** `git add . && git commit -m "message" && git push origin main`
