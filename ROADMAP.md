# HomeRecipe — Commercialization Roadmap (v2)

**Owner:** Nathan · **Capacity:** 25 h/week (~300 h over 12 weeks) · **Budget:** S$300–1,000/month
**Goal:** Soft launch as a social meal-planning app in week 12, with grocery fulfillment partnerships signed and ready for a month-4 pilot.
**Last updated:** 13 Jul 2026 (iteration 13)

---

## Launch scope (agreed)

| Must have (week 12) | Deferred to month 4+ |
|---|---|
| Micronutrient estimation (vitamins, magnesium, etc.) | Payments (HitPay/Stripe) + discount vouchers |
| Upgraded chef profiles | Concierge grocery ordering pilot |
| CS chatbot (AI guide for new users) | Supermarket API/partnership integrations |
| PWA (install on phone home screen) | Native iOS/Android apps |
| PDPA compliance + company-owned app | Physical fulfillment presence |

Rationale: payments and ordering only matter once supply partnerships are locked. Nathan chose partnerships-before-pilot, so weeks 1–12 focus product + BD groundwork; money flows start month 4.

---

## Capacity plan (25 h/week)

- ~15 h build (working with Claude as developer)
- ~6 h business: stall-owner BD, beta user recruitment, testing
- ~4 h admin: ACRA, policies, accounts

Rule: if a week overruns, cut scope — never stack into next week.

---

## Week-by-week

### Week 0 (before build starts) — Dev environment move (iter. 7)
- Set up Mac mini as the dedicated build machine: Node, GitHub Desktop, Claude Code, clone repo, copy `.env.local`.
- Workflow: all coding happens in Claude Code on the mini; planning/research/documents stay in Cowork on the MacBook; git carries code between machines (one machine at a time, always pull at session start, push at session end).
- Copy of ROADMAP.md lives in the repo so Claude Code has full project context.
- **Deliverable:** step-by-step guide → `SETUP_CLAUDE_CODE.md` (done).

### Weeks 1–2 — Social layer + content licensing (moved up, iter. 5)
- **Deliverable — app name + domain (iter. 8):** shortlist names, then check in one pass before committing: domain available (.com + .sg), Instagram/RedNote/TikTok handles free, no ACRA name clash (bizfile.gov.sg), no obvious SG/regional trademark conflict (IPOS search). Register the domain (~S$15–60/yr) and grab the social handles immediately — handles cost nothing and disappear fast. Chosen name feeds the ACRA registration in weeks 5–6.
- Chef profile upgrade: bio, specialty/cuisine tags, external links (IG/YouTube), recipe + follower showcase, "like/follow chef" surfaced prominently. (Follow, comments, ratings already exist — this is surfacing, not rebuilding.)
- User profile upgrade: dietary targets, saved recipes showcase, shared meal plans.
- Recipe comments polish: threading/photos already exist — improve visibility and engagement prompts.
- **IP risk reduction (product):** imported recipes private by default; publishing to Explore/Market requires own photo, AI placeholder, or licensed chef account; prominent source attribution; "report content" takedown link.
- **AI placeholder images (iter. 6):** when a recipe has no photo, generate one via Gemini image API (existing key, ~US$0.04–0.07/image) behind a swappable `generatePlaceholderImage()` abstraction — trial Seedream 4.0 (200 free images, US$0.03/image) if Chinese-dish realism underwhelms. Rules: "AI-generated image" badge; auto-replace when user uploads a real photo ("cooked it? add your photo" prompt); generate only on publish/view, not on every import. Removes the need for scraped photos on public recipes.
- **In parallel (research, no build):** confirm HPB nutrition-data access route (API vs dataset export) so weeks 3–4 start unblocked.

### Weeks 3–4 — Nutrition engine
- HPB (Singapore) as primary nutrition source (**decided iter. 3**) — best coverage of Asian/local ingredients for SG + HK; USDA FoodData Central fallback for gaps. AI maps ingredients to DB entries; numbers come from the database, not the LLM.
- Schema migration: add micronutrient columns (or JSONB) to recipes.
- Update estimate-nutrition route to return micronutrients per serving.
- Finish ingredient unit normalization (audit existing recipes, enforce canonical metric units).
- **Traditional Chinese support (iter. 10 — decided: store in DB, translate at write time, not on demand).** Add `_zh_hant` columns mirroring existing `_zh` fields; AI-translate targeting "Traditional Chinese (Hong Kong)" (correct HK vocabulary — not mechanical character conversion); batch-backfill existing recipes; extend language switcher to EN / 简体 / 繁體. Rationale: recipes are read-heavy (translate once vs per-view), instant loads, chef-editable translations, HK SEO, PWA offline.
- **Translation model (iter. 11 — decided: native Chinese AI model).** Use Qwen or DeepSeek (both have cheap, internationally accessible APIs) for EN→中文 translation — stronger cultural/culinary nuance than US models. Selection by bake-off: translate 5 sample recipes with Qwen, DeepSeek and Gemini (baseline); native-speaker judgment for 简体, HK reader for 繁體 (mainland models must prove HK vocabulary, e.g. 薯仔 not 土豆). Wire behind a swappable `translate()` provider function, same pattern as image generation. Winner also becomes the candidate for RedNote extraction (weeks 7–8).
- Meal-plan goal descriptions: short "how this plan gets you to your target" field on shared plans; visible on Market page.
- **Informal chef soundings (no paperwork):** casual conversations with 3–5 favourite recipe owners — show them the new profile pages, gauge interest, warm the pipeline for formal outreach in weeks 7–8.
- Recruit 10–20 beta users (family, friends, the stall owners' customers).
- **BD track:** first conversations at Toa Payoh West Market + Little India lamb/beef stall — get price lists, delivery willingness, typical margins. No commitments yet, just data.

### Weeks 5–6 — Company formation
- ACRA incorporation (~S$315 one-time; Pte Ltd).
- **Founder IP assignment (iter. 12):** one-page document transferring the app, GitHub repo, domain and brand from Nathan personally to the Pte Ltd. (Decided: build under personal accounts until incorporation — ownership of AI-assisted code follows the author, not the subscription; include this doc in the pre-launch legal consult.)
- Corporate accounts for Vercel, Supabase, Google AI, Anthropic; rotate all API keys to company-owned.
- Terms & Conditions + Privacy Policy (PDPA: consent, purpose limitation, export/delete rights, breach process).
- Closed beta goes live; weekly feedback loop starts.
- **Deliverable — chef outreach kit (drafted by Claude, ready the week ACRA completes):** outreach message in English + Simplified Chinese (warm pitch: win-win platform, builds their online presence) + one-page creator agreement naming the Pte Ltd (permission for recipes/photos/name, what chefs get, withdrawal terms).

### Weeks 7–8 — CS chatbot + reliability
- In-app chat assistant: Claude API grounded in app FAQ/how-to content. (Evaluated vs openclaw/off-the-shelf — build simple first; swap later if needed.)
- Analytics (PostHog free tier) + error monitoring (Sentry free tier).
- RedNote/Instagram extraction accuracy pass; evaluate a Chinese-language model (e.g. Qwen) for RedNote if current pipeline underperforms.
- **Recipe variations / forking — "Make it your own" (iter. 13; full spec below, build in weeks 7–8):**
  - **Decision:** materialized fork (full recipe-row copy), NOT a delta-overlay table. Rationale: an overlay table would force base+overlay merging into every consumer of recipe data (nutrition, grocery generation, meal-plan slots, translation, search) — a permanent complexity tax. Full copy = zero downstream changes.
  - **Schema (migration 025):** reuse existing `recipes.original_recipe_id` as the fork pointer (immediate parent; fork chains allowed). Add `variation_note TEXT` (user's own words: what changed and why — required, prompt if empty) and `variation_diff JSONB` (auto-computed at save: ingredients added/removed/changed, steps changed, servings changed). Index on `original_recipe_id`; FK `ON DELETE SET NULL`.
  - **Fork flow:** button on public recipe pages (logged-in users; hidden on own recipes) → prefills the edit form with a copy (no DB insert until save) → `user_id` = forker, `is_public = false` (private by default, per IP policy), counters reset to 0, **`hero_image_url` NOT copied** (photo belongs to the original author — AI placeholder or own photo instead), `_zh`/`_zh_hant` fields copied then re-translated for any edited field → user edits + writes variation_note → save computes diff and inserts.
  - **Display:** original page shows "Variations (N)" listing public forks; fork page shows "Based on [author]'s [title]" banner linking the original + a "What changed" panel (note + human-readable diff); listing cards get a small "variation" tag.
  - **Duplicate-import nudge (ships together):** at import, if the `source_url` already exists (public or own) → suggest forking the existing recipe instead, with "continue anyway" fallback. Never hard-block — classic dishes have many legitimate versions.
  - **Edge cases:** private originals not forkable (RLS hides them); deleted original → fork survives, banner degrades; forking the same recipe twice allowed; forks are ordinary rows so existing RLS applies; server logic goes into existing route files only (Vercel constraint).
  - Fuzzy same-dish detection (pgvector embeddings) deliberately deferred to month 4+.
- **Formal chef outreach (post-ACRA):** send outreach message + creator agreement to the 3–5 warmed-up chefs; target 3 signed creators before soft launch. Signed agreement becomes the standard chef-onboarding flow.
- **BD track:** draft one-page supply agreement (now possible — company exists).

### Weeks 9–10 — PWA + hardening
- PWA: manifest, service worker, install prompt. Bonus: offline grocery list (works in wet markets with bad signal — real differentiator).
- Load testing, Supabase RLS review, backup policy.
- Beta iteration 2 based on feedback.

### Weeks 11–12 — Soft launch
- PDPA self-audit, final security pass (repeat of July review).
- Soft launch: chefs announce to their followings; beta users invite friends.
- **BD track goal:** 2–3 signed LOIs or pricing agreements (Toa Payoh West stalls + Little India butcher) → these become the month-4 pilot suppliers.

---

## Month 4+ (Later)

1. Payments via HitPay (PayNow + cards, SG-native) → voucher engine (5–7% new-user codes).
2. Concierge ordering pilot with signed stalls: order in app → WhatsApp/manual fulfillment → learn unit economics before building anything heavier.
3. Supermarket BD (FairPrice/Cold Storage/Sheng Siong have no public retail APIs — this is a partnership negotiation, sequenced after pilot volume data exists).
4. Ryan's Grocery-tier premium suppliers + chef advertising once traffic justifies.
5. Native apps only if PWA metrics show demand (push notifications are the usual trigger).
6. **Paid acquisition — Google Ads + Meta Ads (iter. 9).** Start only after: (a) company incorporated (business ad accounts run under the Pte Ltd), (b) soft-launch data shows people who sign up actually stay (retention/onboarding proven — otherwise ads pour water into a leaky bucket), (c) conversion tracking live (Meta Pixel + Google tag, added to the PDPA consent banner — tracking pixels are personal data). Start small: S$10–20/day test campaigns targeting SG families + gym-goers, measure cost per signup, scale only what pays back. Ad spend is on top of the S$300–1,000 ops budget.

---

## Dependencies

| Dependency | Blocks | Owner | Need by |
|---|---|---|---|
| HPB data access confirmed | Micronutrient build (weeks 3–4) | Claude (research) | Week 2 |
| ACRA incorporation | Agreements, corporate keys, T&Cs | Nathan | Week 6 |
| Beta users recruited | All feedback loops | Nathan | Week 4 |
| Stall pricing data | Month-4 pilot design | Nathan | Week 8 |
| Signed LOIs | Month-4 pilot start | Nathan | Week 12 |

## Top risks

1. **Solo capacity** — 25 h/week is the plan's hard ceiling; scope cuts, not overtime.
2. **Micronutrient accuracy for Asian ingredients** — USDA has gaps for local produce; mitigate with HPB data + "estimate" labeling.
3. **BD slower than code** — stall owners may want cash terms/volume proof; LOI (not contract) is the week-12 bar.
4. **PDPA exposure at launch** — policies + consent must ship before public launch, no exceptions.
5. **Copyright on scraped photos/recipes** — photos/videos are protected works; attribution is not a defense. Mitigate: private-by-default imports, creator agreements before public display, takedown process, user rights warranty in T&Cs. One-hour consult with SG IP lawyer before public launch.

## Budget fit (monthly, steady state)

Vercel Pro ~S$27 · Supabase Pro ~S$34 · AI APIs (Gemini + Claude) S$30–150 · Domain/email ~S$5 · PostHog/Sentry free tiers · **Total ≈ S$100–220/month** — comfortably inside S$300–1,000, leaving headroom for beta incentives and incorporation costs.

---

## Open decisions for next iteration

1. ~~Nutrition database~~ → **DECIDED: HPB primary, USDA fallback.**
2. Beta cohort: who are the first 10 — can stall owners refer regulars?
3. Chef supply: how many chefs/recipe owners committed to posting at launch? Which 5 to approach first with the creator agreement?
4. ~~Company name + ACRA timing~~ → **DECIDED: Nathan self-files (he's an accountant + corp sec — no service provider needed). Timing stays weeks 5–6 to maximize the SUTE start-up tax exemption years against actual revenue.** Company name still pending the naming exercise.
5. HK expansion: trilingual content (EN/简体/繁體) ships in weeks 3–4 so the product is HK-ready from day one; HK *market entry* (PDPO privacy compliance, local suppliers, marketing) stays post-SG-launch.
