# ROADMAP — Chef HideOut 私厨 (business overview & progress)

**What this is:** the **overarching progress tracker** for the whole venture — product, company, legal, business development (BD), and growth — so anyone (human or AI) can see where things stand at a glance. It is a **checklist, not a calendar:** items are grouped into phases, not weeks, and can be reprioritised or moved between phases agile-style. Tick items off as they land.

**Where the build detail lives:** this file says *what to work on and where it sits*. For *what each feature is and how to build it*, see **`FEATURES.md`** (referenced below as `→ FEATURES §n`). Historical build context and gotchas are in `SESSION_SUMMARY.md`.

---

## Snapshot

- **Owner:** Nathan (non-technical founder; accountant + corporate secretary — self-files ACRA).
- **Capacity:** ~25 h/week — roughly 15 h build (with Claude), 6 h business/BD, 4 h admin.
- **Budget:** S$300–1,000/month (steady state ≈ S$100–220; see Budget below). Ad spend is on top.
- **Goal:** soft-launch as a social meal-planning app, with grocery-fulfillment partnerships signed and ready for a monetization pilot.
- **Hard rules:** (1) **no push to production without Nathan's explicit approval** — pushes auto-deploy via Vercel; (2) **DB migrations hit the live database** (single Supabase project) — treat as production; (3) run typecheck + confirm the build passes before declaring work done.
- **Capacity rule:** if a chunk overruns, **cut or defer scope — never stack into "next week."**

---

## Phase 1 — Soft Launch

*Get the product and the company live, chefs onboarded, suppliers warmed up. This is the pre-launch scope.*

### Product — build → `FEATURES.md`
- [ ] Social layer + chef/user profile upgrades — `→ FEATURES §1`
- [ ] Festive/seasonal meal-plan category (user-tagged) — `→ FEATURES §1b`
- [ ] Meal-plan goal descriptions — `→ FEATURES §1b`
- [~] Forking / "overlays" MVP — **built, uncommitted, awaiting Nathan's test** — `→ FEATURES §1`
- [ ] Duplicate-import nudge — `→ FEATURES §2`
- [ ] RedNote/Instagram import-accuracy pass — `→ FEATURES §2`
- [ ] AI placeholder images + IP-safe publishing — `→ FEATURES §3`
- [ ] Nutrition engine: HPB DB + micronutrients — `→ FEATURES §4`
- [ ] Recipe content auto-translation (EN↔中文) — `→ FEATURES §7`
- [ ] CS chatbot + Telegram escalation to owner — `→ FEATURES §6`
- [ ] PWA + offline grocery list + hardening (load test, RLS review, backups) — `→ FEATURES §8`

### Company & Legal
- [ ] App name + domain + social handles — check in one pass: domain (.com + .sg), IG/RedNote/TikTok handles, ACRA name clash (bizfile.gov.sg), SG/regional trademark (IPOS). Register domain (~S$15–60/yr); grab handles immediately.
- [ ] ACRA incorporation (~S$315, Pte Ltd; Nathan self-files) — time to maximise the SUTE start-up tax exemption against actual revenue.
- [ ] Founder IP assignment doc — transfer app, GitHub repo, domain, brand from Nathan personally to the Pte Ltd (include in the pre-launch legal consult).
- [ ] Corporate accounts + rotate all API keys to company-owned (Vercel, Supabase, Google AI, Anthropic).
- [ ] Terms & Conditions + Privacy Policy — PDPA: consent, purpose limitation, export/delete rights, breach process.
- [ ] IP-lawyer consult (1 hr) before public launch — copyright on imported recipes/photos.

### Chefs & Content (BD)
- [ ] Informal chef soundings — casual chats with 3–5 favourite recipe owners; show the new profile pages; warm the pipeline.
- [ ] Chef outreach kit — warm pitch (EN + 简体) + one-page creator agreement naming the Pte Ltd (permission for recipes/photos/name, what chefs get, withdrawal terms).
- [ ] Formal chef outreach (post-ACRA) — target **3 signed creators** before soft launch; the signed agreement becomes the standard onboarding flow.

### Suppliers (BD)
- [ ] Stall-owner conversations — Toa Payoh West Market + Little India lamb/beef stall: price lists, delivery willingness, typical margins. No commitments — just data.
- [ ] Draft one-page supply agreement (once the company exists).
- [ ] **2–3 signed LOIs / pricing agreements** → these become the pilot suppliers.

### Beta, Analytics & Launch
- [ ] Recruit 10–20 beta users (family, friends, stall owners' regulars); weekly feedback loop.
- [ ] Analytics (PostHog free tier) + error monitoring (Sentry free tier).
- [ ] Usability pass on the core flows — see recipes, see plans, upload a recipe.
- [ ] PDPA self-audit + final security pass (repeat of the July review).
- [ ] **Soft launch** — chefs announce to their followings; beta users invite friends.

---

## Phase 2 — Monetization Pilot (month 4+)

*Money starts flowing once supply partnerships are locked. Learn the unit economics before building anything heavy.*

- [ ] Payments — HitPay (PayNow + cards, SG-native) → voucher engine (5–7% new-user codes). `→ FEATURES §5`
- [ ] Concierge grocery ordering pilot with signed stalls — order in app → WhatsApp/manual fulfillment → learn unit economics. `→ FEATURES §5`
- [ ] AI-assisted order routing — AI agent messages stalls over WhatsApp/Telegram and parses confirmations, human approves edge cases. `→ FEATURES §5`

---

## Phase 3 — Scale (later)

*Only once pilot volume and retention justify the spend.*

- [ ] Live inventory + supermarket partner APIs — FairPrice / Cold Storage / Sheng Siong have **no public retail APIs**; this is a partnership negotiation sequenced after volume data. `→ FEATURES §5`
- [ ] Native iOS/Android apps — demand-gated; push notifications are the usual trigger. `→ FEATURES §8`
- [ ] Paid acquisition — Google + Meta ads. Start only after: company incorporated, soft-launch retention proven, conversion tracking live (pixels added to the PDPA consent banner). Small first (S$10–20/day), scale only what pays back.
- [ ] 繁體 (Traditional Chinese) content — translate UI + recipe content for HK vocabulary. `→ FEATURES §7`
- [ ] HK market entry — PDPO privacy compliance, local suppliers, marketing (needs the 繁體 content above).
- [ ] Premium suppliers (e.g. Ryan's Grocery tier) + chef advertising once traffic justifies.

---

## Dependencies

| Dependency | Blocks | Owner |
|---|---|---|
| HPB nutrition-data access confirmed | Nutrition engine (`FEATURES §4`) | Claude (research) |
| ACRA incorporation | Creator agreements, corporate keys, T&Cs | Nathan |
| Beta users recruited | All feedback loops | Nathan |
| Stall pricing data | Phase 2 pilot design | Nathan |
| Signed LOIs | Phase 2 pilot start | Nathan |
| Telegram bot created + chat ID shared | CS escalation (`FEATURES §6`) | Nathan |

## Top risks

1. **Solo capacity** — 25 h/week is the ceiling; cut scope, don't work overtime.
2. **Micronutrient accuracy for Asian ingredients** — USDA has gaps for local produce; mitigate with HPB data + "estimate" labelling.
3. **BD slower than code** — stall owners may want cash terms / volume proof; an LOI (not a contract) is the launch bar.
4. **PDPA exposure at launch** — policies + consent must ship before public launch, no exceptions.
5. **Copyright on scraped photos/recipes** — attribution is not a defense. Mitigate: private-by-default imports, creator agreements before public display, takedown process, user-rights warranty in T&Cs, IP-lawyer consult before launch.

## Budget fit (monthly, steady state)

Vercel Pro ~S$27 · Supabase Pro ~S$34 · AI APIs (Gemini + Claude) S$30–150 · Domain/email ~S$5 · PostHog/Sentry free tiers → **≈ S$100–220/month**, comfortably inside S$300–1,000, leaving headroom for beta incentives and incorporation costs. Ad spend (Phase 3) is on top.

## Open decisions

- **Beta cohort** — who are the first 10? Can stall owners refer regulars?
- **Chef supply** — how many chefs committed to posting at launch? Which 5 to approach first with the creator agreement?
- **Company name** — pending the naming exercise (feeds ACRA).
- ~~繁體 / HK~~ → **DECIDED (2 Aug 2026): 繁體 content moves to Phase 3, built alongside HK market entry. EN + 简体 is the launch bar.**
- ~~Imported recipes on member profiles~~ → **DECIDED (2 Aug 2026): show them — the member's original recipes first, then imported ones.** `→ FEATURES §1`
- **Fork label wording** — pick one bilingual user-facing label for a fork (e.g. "My version" / 改良版) before the forking UI ships. `→ FEATURES §1`
- ~~Nutrition database~~ → **DECIDED: HPB primary, USDA fallback.**
- ~~ACRA timing / who files~~ → **DECIDED: Nathan self-files; time for SUTE tax exemption.**

---

*Checklist legend: `[ ]` to do · `[~]` in progress · `[x]` done. Move items between phases freely as priorities shift.*
